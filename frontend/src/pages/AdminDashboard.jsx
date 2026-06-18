import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { playOrderChime, playHelpAlert } from "../utils/sound";
import { API_BASE } from "../utils/config";
import { getLocalOrders, updateLocalOrderStatus, calcLocalAnalytics } from "../utils/localOrderStore";
import QRCode from "qrcode";
import StaffSidebar from "../components/StaffSidebar";
import { 
  DollarSign, ShoppingBag, Clock, Users, ArrowRight,
  AlertTriangle, CheckCircle, Smartphone, HelpCircle, X, Download,
  Plus, Edit2, Trash2, Leaf, Heart, Star, Sparkles, Search,
  Bell, Filter, ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "dashboard";
  });

  // Real-time State Lists
  const [orders, setOrders] = useState(() => {
    const localOrders = getLocalOrders();
    return localOrders.length > 0 ? localOrders : [];
  });
  const [menu, setMenu] = useState([]);
  const [helpRequests, setHelpRequests] = useState({});
  const [analytics, setAnalytics] = useState(() => {
    const localOrders = getLocalOrders();
    return calcLocalAnalytics(localOrders.length > 0 ? localOrders : []);
  });

  // UI state controllers
  const [toasts, setToasts] = useState([]);
  const [qrModal, setQrModal] = useState({ isOpen: false, table: null, qrUrl: "" });
  const [editorModal, setEditorModal] = useState({ isOpen: false, item: null });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Menu Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Noodles");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formIsOutOfStock, setFormIsOutOfStock] = useState(false);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Merge local orders into state and recalculate analytics
  const mergeLocalOrders = useCallback((apiOrders = []) => {
    const local = getLocalOrders();
    if (local.length === 0) return apiOrders;
    // Merge: API orders take priority; add any local-only orders
    const apiIds = new Set(apiOrders.map((o) => o.id));
    const localOnly = local.filter((o) => !apiIds.has(o.id));
    return [...localOnly, ...apiOrders];
  }, []);

  const refreshFromLocal = useCallback(() => {
    setOrders((prev) => {
      mergeLocalOrders(prev.filter((o) => !o.id.startsWith("ord-local-")));
      const local = getLocalOrders();
      // Update status of any local orders that changed
      const updatedPrev = prev.map((o) => {
        const localVersion = local.find((l) => l.id === o.id);
        return localVersion || o;
      });
      // Add new local orders not in prev
      const prevIds = new Set(updatedPrev.map((o) => o.id));
      const newLocal = local.filter((o) => !prevIds.has(o.id));
      const all = [...newLocal, ...updatedPrev];
      setAnalytics(calcLocalAnalytics(all));
      return all;
    });
  }, [mergeLocalOrders]);

  // Initialize Dashboard state from APIs + local store
  useEffect(() => {


    // Try to also load from backend API
    fetch(`${API_BASE}/api/admin/init`)
      .then((res) => res.json())
      .then((data) => {
        const apiOrders = data.orders || [];
        const merged = mergeLocalOrders(apiOrders);
        setOrders(merged);
        setHelpRequests(data.activeHelpRequests || {});
        setAnalytics(calcLocalAnalytics(merged));
      })
      .catch(() => { /* keep local orders */ });

    fetch(`${API_BASE}/api/menu`)
      .then((res) => res.json())
      .then((data) => setMenu(data))
      .catch(() => {});

    // Listen for local order events (same-tab: CustomEvent, cross-tab: storage)
    const handleLocalUpdate = (e) => {
      if (e && e.type === "storage" && e.key !== "cafe_x96_local_orders") return;
      refreshFromLocal();
    };
    window.addEventListener("localOrdersUpdated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
    return () => {
      window.removeEventListener("localOrdersUpdated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, [mergeLocalOrders, refreshFromLocal]);

  // Listen to Socket.IO events for live dashboard refreshes
  useEffect(() => {
    if (socket) {
      socket.emit("join", "admins");

      // On new order
      socket.on("new_order", (data) => {
        setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
        setAnalytics(data.analytics);
        playOrderChime();
        addToast(`New Order ${data.order.id} placed at Table ${data.order.tableNumber}!`, "order");
      });

      // On status update
      socket.on("order_updated", (data) => {
        setOrders((prev) => prev.map((o) => o.id === data.order.id ? data.order : o));
        setAnalytics(data.analytics);
        addToast(`Order ${data.order.id} status updated to ${data.order.status}.`, "info");
      });

      // On table help request
      socket.on("help_requested", (data) => {
        setHelpRequests(data.activeHelpRequests);
        playHelpAlert();
        addToast(`Table ${data.tableNumber} is requesting staff assistance!`, "help");
      });

      // On table help resolved
      socket.on("help_resolved", (data) => {
        setHelpRequests(data.activeHelpRequests);
      });

      // On live menu updates
      socket.on("menu_updated", (updatedMenu) => {
        setMenu(updatedMenu);
        addToast("Menu database updated in real-time!", "success");
      });
    }

    return () => {
      if (socket) {
        socket.off("new_order");
        socket.off("order_updated");
        socket.off("help_requested");
        socket.off("help_resolved");
        socket.off("menu_updated");
      }
    };
  }, [socket]);

  // Order status transition trigger
  const updateStatus = async (orderId, currentStatus) => {
    let nextStatus;
    if (currentStatus === "Pending") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Served";
    else return;

    // Optimistically update UI immediately
    setOrders((prev) => {
      const updated = prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o);
      setAnalytics(calcLocalAnalytics(updated));
      return updated;
    });

    // Keep local storage in sync
    updateLocalOrderStatus(orderId, nextStatus);

    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error("API failed");
    } catch {
      // Backend unreachable but local storage was already updated
      addToast(`Order ${orderId} → ${nextStatus}`, "success");
    }
  };

  // Resolve table help
  const handleResolveHelp = async (tableNum) => {
    try {
      await fetch(`${API_BASE}/api/help/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: tableNum })
      });
      addToast(`Help request resolved for Table ${tableNum}`, "success");
    } catch (error) {
      console.error("Failed to resolve help:", error);
    }
  };

  // Generate Table QR Code modal
  const openQrModal = async (tableNum) => {
    const tableUrl = `${window.location.origin}/menu?table=${tableNum}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(tableUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1e293b", // Slate dark
          light: "#f8fafc" // Cloud light
        }
      });
      setQrModal({ isOpen: true, table: tableNum, qrUrl: qrDataUrl });
    } catch (err) {
      console.error("Failed to generate QR Code:", err);
    }
  };

  // Open Add/Edit Item Modal
  const handleOpenEditor = (item = null) => {
    if (item) {
      setEditorModal({ isOpen: true, item });
      setFormName(item.name);
      setFormCategory(item.category);
      setFormPrice(item.price);
      setFormDescription(item.description);
      setFormImage(item.image);
      setFormIsVeg(item.isVeg);
      setFormIsPopular(item.isPopular);
      setFormIsOutOfStock(!!item.isOutOfStock);
    } else {
      setEditorModal({ isOpen: true, item: null });
      setFormName("");
      setFormCategory("Noodles");
      setFormPrice("");
      setFormDescription("");
      setFormImage("");
      setFormIsVeg(true);
      setFormIsPopular(false);
      setFormIsOutOfStock(false);
    }
  };

  // Save Menu Item (REST calls)
  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;

    const payload = {
      name: formName,
      category: formCategory,
      price: Number(formPrice),
      description: formDescription,
      image: formImage,
      isVeg: formIsVeg,
      isPopular: formIsPopular,
      isOutOfStock: formIsOutOfStock
    };

    try {
      let response;
      if (editorModal.item) {
        // Edit Item
        response = await fetch(`${API_BASE}/api/menu/${editorModal.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Item
        response = await fetch(`${API_BASE}/api/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error("API failed to save item");
      }

      const savedItem = await response.json();
      setMenu((prev) => {
        const exists = prev.some((i) => i.id === savedItem.id);
        if (exists) {
          return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
        } else {
          return [...prev, savedItem];
        }
      });

      setEditorModal({ isOpen: false, item: null });
      addToast(
        editorModal.item
          ? `Updated "${formName}" successfully`
          : `Added "${formName}" successfully`,
        "success"
      );
    } catch (error) {
      console.error("Error saving menu item:", error);
      addToast("Failed to save menu item. Try again.", "error");
    }
  };

  // Delete Menu Item (REST Call)
  const handleDeleteMenuItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/menu/${itemId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setMenu((prev) => prev.filter((i) => i.id !== itemId));
        addToast(`Deleted "${itemName}"`, "success");
      } else {
        throw new Error("Failed deleting item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      addToast("Failed to delete menu item.", "error");
    }
  };

  // Toggle Out of Stock Status (REST Call)
  const handleToggleStock = async (item) => {
    const updatedStatus = !item.isOutOfStock;
    const payload = {
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      image: item.image,
      isVeg: item.isVeg,
      isPopular: item.isPopular,
      isOutOfStock: updatedStatus
    };

    try {
      const response = await fetch(`${API_BASE}/api/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed status change");
      
      const updatedItem = await response.json();
      setMenu((prev) => prev.map((m) => (m.id === updatedItem.id ? updatedItem : m)));
      addToast(`"${item.name}" is now ${updatedStatus ? "Out of Stock" : "In Stock"}`, "success");
    } catch (error) {
      console.error("Failed to toggle stock:", error);
      addToast("Failed to toggle stock status.", "error");
    }
  };

  // Helper to filter orders by columns
  const getOrdersByStatus = (status) => {
    return orders.filter((o) => o.status === status);
  };

  // Helper to filter menu editor grid
  const filteredMenuItems = menu.filter((item) => {
    const matchesCategory = selectedCategoryFilter === "All" || item.category === selectedCategoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", "Noodles", "Rice", "Manchurian & Starters", "Egg Specials", "Biryani", "Hot Beverages", "Cool Drinks", "Water Bottles"];

  const adminPalette = {
    "--color-primary": "#42603A",
    "--color-primary-hover": "#5A7A54",
    "--color-primary-light": "#DCE6D3",
    "--color-primary-container": "#E9F0E4",
    "--color-secondary": "#7F9C72",
    "--color-secondary-container": "#ECF2E7",
    "--color-on-secondary-container": "#35482F",
    "--color-accent": "#D4A259",
    "--color-accent-warm": "#B78F3E",
    "--color-accent-coral": "#CDA15A",
    "--color-accent-gold": "#D4A259",
    "--color-accent-amber": "#F4E0A3",
    "--color-accent-rose": "#F4E5C8",
    "--color-background": "#FDF8ED",
    "--color-on-background": "#2C2A24",
    "--color-surface": "#ffffff",
    "--color-on-surface": "#2C2A24",
    "--color-surface-variant": "#F5EFE2",
    "--color-on-surface-variant": "#645B52",
    "--color-surface-container-lowest": "#FBF4E6",
    "--color-surface-container-low": "#F2E8D6",
    "--color-surface-container": "#FDF8ED",
    "--color-surface-container-high": "#F7EFE0",
    "--color-surface-container-highest": "#E9E0D0",
    "--color-outline": "rgba(132,103,61,0.18)",
    "--color-outline-variant": "rgba(132,103,61,0.1)",
    "--color-border": "rgba(132,103,61,0.18)"
  };

  return (
    <div className="flex-1 flex min-h-screen bg-background text-on-background" style={adminPalette}>
      {/* Left Sidebar Navigation */}
      <StaffSidebar activeItem={activeTab === "menu-editor" ? "menu" : activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-grow p-8 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Toast Alert layout container */}
        <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl border shadow-lg flex items-center gap-3 w-80 text-xs font-semibold animate-in slide-in-from-right duration-300 pointer-events-auto bg-white ${
                toast.type === "help"
                  ? "border-error/30 text-error shadow-error/10"
                  : toast.type === "order"
                  ? "border-amber-200 text-amber-700 shadow-amber-100"
                  : toast.type === "success"
                  ? "border-emerald-500/30 text-emerald-600 shadow-emerald-100"
                  : "border-accent-gold/40 text-accent-gold shadow-amber-100"
              }`}
            >
              {toast.type === "help" ? <AlertTriangle size={18} className="animate-pulse" /> : <CheckCircle size={18} />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-border">
          <div className="relative w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              placeholder="Search orders, tables, or customers..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-white border border-border focus:border-accent-gold focus:outline-none transition-all custom-shadow text-on-background"
            />
          </div>

          <div className="flex items-center gap-3">
            {Object.keys(helpRequests).length > 0 && (
              <span className="animate-pulse px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} /> {Object.keys(helpRequests).length} Assistance
              </span>
            )}
            
            <button className="relative p-2 rounded-full hover:bg-surface-variant transition-colors cursor-pointer">
              <Bell size={18} className="text-secondary" />
              {orders.filter(o => o.status === 'Pending').length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">
                  {orders.filter(o => o.status === 'Pending').length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-success font-bold text-[11px] tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live Status
            </div>
          </div>
        </div>

        {/* VIEW: DASHBOARD (Overview) */}
        {activeTab === "dashboard" && (
          <>
            <div className="mb-6">
              <h2 className="font-display font-medium text-[26px] text-on-background mb-0.5">Operations Overview</h2>
              <p className="text-xs text-secondary">Monitoring real-time performance of Café X96.</p>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                { label: "TOTAL REVENUE", value: `₹${analytics.revenueToday.toFixed(2)}`, icon: DollarSign, iconBg: "bg-surface-variant", badge: "+12.5%", badgeColor: "text-success" },
                { label: "ACTIVE ORDERS", value: orders.filter(o => o.status !== "Served").length, icon: ShoppingBag, iconBg: "bg-surface-variant", badge: "Live", badgeColor: "text-secondary" },
                { label: "AVG. PREP TIME", value: "12.4m", icon: Clock, iconBg: "bg-surface-variant", badge: "-2 min", badgeColor: "text-amber-700" },
                { label: "TABLE OCCUPANCY", value: `${(analytics.activeTablesCount / 10 * 100).toFixed(0)}%`, icon: Users, iconBg: "bg-surface-variant", badge: `${(analytics.activeTablesCount / 10 * 100).toFixed(0)}%`, bar: true }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="bg-white p-5 rounded-card border border-border flex flex-col justify-between h-32 custom-shadow">
                    <div className="flex justify-between items-start">
                      <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                        <Icon size={18} className="text-on-background" />
                      </div>
                      {card.bar ? null : (
                        <span className={`text-[11px] font-semibold ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-[10px] text-outline font-bold tracking-wider uppercase mb-0.5">{card.label}</p>
                      <h3 className="font-display font-bold text-2xl text-on-background">{card.value}</h3>
                      {card.bar && (
                        <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-accent-gold rounded-full transition-all duration-700" style={{ width: card.badge }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Orders Kanban Columns inside Dashboard */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base text-on-background">Live Orders Board</h3>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-secondary hover:border-accent-gold/30 hover:text-accent-gold transition-all cursor-pointer bg-white">
                    <span className="flex items-center gap-1.5"><Filter size={12} /> Filter</span>
                  </button>
                  <button className="px-4 py-2 rounded-full bg-coffee text-white text-xs font-bold hover:bg-primary transition-all cursor-pointer">
                    New Manual Order
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: "Pending", status: "Pending", dotColor: "bg-accent" },
                  { title: "Preparing", status: "Preparing", dotColor: "bg-primary" },
                  { title: "Ready", status: "Ready", dotColor: "bg-primary" },
                  { title: "Served", status: "Served", dotColor: "bg-neutral-400" }
                ].map((col, idx) => {
                  const colOrders = getOrdersByStatus(col.status);
                  return (
                    <div key={idx} className="bg-white rounded-card p-4 flex flex-col h-[480px] overflow-hidden border border-border custom-shadow">
                      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
                        <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                        <h4 className="font-semibold text-xs text-on-background">{col.title} ({colOrders.length})</h4>
                      </div>

                      <div className="flex-grow overflow-y-auto space-y-3 pr-0.5">
                        {colOrders.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-secondary/30 py-16">
                            <CheckCircle size={24} className="opacity-30" />
                            <p className="text-[10px] font-medium mt-1">Empty</p>
                          </div>
                        ) : (
                          colOrders.map((order) => (
                            <div 
                              key={order.id} 
                              className={`p-3.5 rounded-input border border-border bg-white hover:border-primary/20 transition-all relative ${col.status === "Served" ? "opacity-60" : ""}`}
                            >
                              <div className="flex justify-between items-center text-[11px] font-bold mb-2">
                                <span className="text-on-background">#{order.id.replace('ord-', '')}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  order.tableNumber 
                                    ? 'bg-secondary-container/40 border-secondary-container text-on-secondary-container' 
                                    : 'bg-surface-variant border-border text-secondary'
                                }`}>
                                  {order.tableNumber ? 'Dine-in' : 'Takeaway'}
                                </span>
                              </div>
                              
                              <div className="text-xs text-on-background text-left space-y-1">
                                <p className="font-bold text-on-background">{order.customerName}, {order.items.map(i => i.name).join(', ')}</p>
                                <p className="text-[10px] text-secondary">
                                  {order.tableNumber ? `Table ${order.tableNumber}` : 'Pick-up counter'} · {new Date(order.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                {order.notes && (
                                  <div className="mt-1.5 p-1.5 rounded-lg bg-accent/40 border border-accent text-on-secondary-container text-[9px] font-medium leading-relaxed">
                                    📝 {order.notes}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                                <span className="font-bold text-xs text-on-background">₹{order.total}</span>
                                {col.status !== "Served" ? (
                                  <button
                                    onClick={() => updateStatus(order.id, order.status)}
                                    className="p-1 text-secondary hover:text-accent-gold transition-colors cursor-pointer"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                ) : (
                                  <CheckCircle size={14} className="text-success" />
                                )}
                              </div>

                              {col.status === "Ready" && (
                                <button
                                  onClick={() => updateStatus(order.id, order.status)}
                                  className="w-full mt-2 py-2 rounded-full bg-secondary hover:bg-primary text-white font-bold text-[10px] transition-all cursor-pointer"
                                >
                                  Mark Served
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Monitor & SVG Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
              {/* Table Assistance Grid */}
              <div className="bg-white p-6 rounded-card border border-border custom-shadow animate-in fade-in duration-300">
                <h3 className="font-display font-semibold text-base text-on-background mb-4">
                  Table Assistance & QR Codes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const tableNum = String(idx + 1);
                    const isAssistanceNeeded = !!helpRequests[tableNum];
                    const hasActiveOrder = orders.some(o => o.tableNumber === tableNum && o.status !== "Served");

                    return (
                      <div
                        key={tableNum}
                        className={`p-3 rounded-input border text-center flex flex-col justify-between items-center transition-all h-28 ${
                          isAssistanceNeeded
                            ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse shadow-sm"
                            : hasActiveOrder
                            ? "bg-secondary-container/30 border-secondary-container text-on-secondary-container"
                            : "bg-white border-border text-secondary"
                        }`}
                      >
                        <div>
                          <p className="text-[9px] font-bold tracking-wider text-outline">TABLE</p>
                          <p className="font-display font-bold text-lg leading-tight mt-0.5">{tableNum}</p>
                        </div>

                        <div className="w-full">
                          {isAssistanceNeeded ? (
                            <button
                              onClick={() => handleResolveHelp(tableNum)}
                              className="w-full py-1 rounded-full bg-amber-700 text-white font-bold text-[9px] cursor-pointer shadow-xs hover:bg-amber-800 transition-colors"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              onClick={() => openQrModal(tableNum)}
                              className="w-full py-1.5 rounded-full bg-surface-variant hover:bg-accent text-on-surface text-[9px] font-semibold flex items-center justify-center gap-0.5 transition-all cursor-pointer border border-border"
                            >
                              <Smartphone size={8} /> QR Code
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Analytics Sold items */}
              <div className="bg-white p-6 rounded-card border border-border custom-shadow flex flex-col justify-between animate-in fade-in duration-300">
                <div>
                  <h3 className="font-display font-semibold text-base text-on-background mb-1">Popular Items Sold</h3>
                  <p className="text-xs text-secondary mb-4">Real-time metrics on top sales from live checkouts.</p>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {analytics.popularItems.length === 0 ? (
                    <div className="text-center py-10 text-secondary/35">
                      <HelpCircle size={32} className="mx-auto mb-2" />
                      <p className="text-xs">No sales metrics recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {analytics.popularItems.slice(0, 4).map((item, idx) => {
                        const maxCount = Math.max(...analytics.popularItems.map(i => i.count));
                        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-on-background">{item.name}</span>
                              <span className="text-coffee font-mono">{item.count} sold</span>
                            </div>
                            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent-gold rounded-full transition-all duration-700" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* VIEW: LIVE ORDERS FEED COLUMN */}
        {activeTab === "orders" && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="font-display font-medium text-[26px] text-on-background mb-0.5">Live Orders Board</h2>
                <p className="text-xs text-secondary">View and manage active table checkouts.</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-secondary hover:border-accent-gold/30 hover:text-accent-gold transition-all cursor-pointer bg-white">
                  <span className="flex items-center gap-1.5"><Filter size={12} /> Filter</span>
                </button>
                <button className="px-4 py-2 rounded-full bg-coffee text-white text-xs font-bold hover:bg-primary transition-all cursor-pointer">
                  New Manual Order
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "Pending", status: "Pending", dotColor: "bg-accent" },
                { title: "Preparing", status: "Preparing", dotColor: "bg-primary" },
                { title: "Ready", status: "Ready", dotColor: "bg-primary" },
                { title: "Served", status: "Served", dotColor: "bg-neutral-400" }
              ].map((col, idx) => {
                const colOrders = getOrdersByStatus(col.status);
                return (
                  <div key={idx} className="bg-white rounded-card p-4 flex flex-col h-[520px] overflow-hidden border border-border custom-shadow">
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <h4 className="font-semibold text-xs text-on-background">{col.title} ({colOrders.length})</h4>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3 pr-0.5">
                      {colOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-secondary/30 py-16">
                          <CheckCircle size={24} className="opacity-30" />
                          <p className="text-[10px] font-medium mt-1">Empty</p>
                        </div>
                      ) : (
                        colOrders.map((order) => (
                          <div 
                            key={order.id} 
                            className={`p-3.5 rounded-input border border-border bg-white hover:border-primary/20 transition-all relative ${col.status === "Served" ? "opacity-60" : ""}`}
                          >
                            <div className="flex justify-between items-center text-[11px] font-bold mb-2">
                              <span className="text-on-background">#{order.id.replace('ord-', '')}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                order.tableNumber 
                                  ? 'bg-secondary-container/40 border-secondary-container text-on-secondary-container' 
                                  : 'bg-surface-variant border-border text-secondary'
                              }`}>
                                {order.tableNumber ? 'Dine-in' : 'Takeaway'}
                              </span>
                            </div>
                            
                            <div className="text-xs text-on-background text-left space-y-1">
                              <p className="font-bold text-on-background">{order.customerName}, {order.items.map(i => i.name).join(', ')}</p>
                              <p className="text-[10px] text-secondary">
                                {order.tableNumber ? `Table ${order.tableNumber}` : 'Pick-up counter'} · {new Date(order.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                              {order.notes && (
                                <div className="mt-1.5 p-1.5 rounded-lg bg-accent/40 border border-accent text-on-secondary-container text-[9px] font-medium leading-relaxed">
                                  📝 {order.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                              <span className="font-bold text-xs text-on-background">₹{order.total}</span>
                              {col.status !== "Served" ? (
                                <button
                                  onClick={() => updateStatus(order.id, order.status)}
                                  className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              ) : (
                                <CheckCircle size={14} className="text-success" />
                              )}
                            </div>

                            {col.status === "Ready" && (
                              <button
                                onClick={() => updateStatus(order.id, order.status)}
                                className="w-full mt-2 py-2 rounded-full bg-secondary hover:bg-primary text-white font-bold text-[10px] transition-all cursor-pointer"
                              >
                                Mark Served
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: DETAILED ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="font-display font-medium text-[26px] text-on-background mb-0.5">Performance &amp; Analytics</h2>
              <p className="text-xs text-secondary">Historical charts and summary insights.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-card border border-border custom-shadow">
                <h3 className="font-display font-semibold text-base text-on-background mb-4">Live Activity Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-surface-variant/20 text-xs">
                    <span className="text-secondary font-medium">Completed Receipts</span>
                    <span className="font-bold text-on-background">{orders.filter(o => o.status === "Served").length} orders</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-surface-variant/20 text-xs">
                    <span className="text-secondary font-medium">Pending Assistance Calls</span>
                    <span className="font-bold text-amber-700">{Object.keys(helpRequests).length} active</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-surface-variant/20 text-xs">
                    <span className="text-secondary font-medium">Average Order Size</span>
                    <span className="font-bold text-on-background">
                      ₹{orders.length ? (analytics.revenueToday / orders.length).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-card border border-border custom-shadow flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-semibold text-base text-on-background mb-2">Item Sales Count</h3>
                </div>
                <div className="flex-grow space-y-3.5 mt-2">
                  {analytics.popularItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs border-b border-surface-variant/25 pb-2">
                      <span className="font-medium text-on-background">{item.name}</span>
                      <span className="font-bold text-primary font-mono">{item.count} items sold</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: MENU EDITOR */}
        {activeTab === "menu" && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-card border border-border custom-shadow">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-border focus:border-accent-gold focus:outline-none rounded-input pl-10 pr-4 py-2.5 text-xs text-on-background custom-shadow"
                />
              </div>
              
              <button
                onClick={() => handleOpenEditor(null)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 rounded-full bg-coffee hover:bg-primary text-white font-display font-bold text-xs transition-all duration-200 cursor-pointer shadow-sm"
              >
                <Plus size={16} /> Add New Menu Item
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-4.5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                    selectedCategoryFilter === cat
                      ? "bg-secondary-container border-transparent text-on-secondary-container font-bold active-tab shadow-xs"
                      : "bg-white border-border text-secondary hover:border-accent-gold/30 hover:text-accent-gold custom-shadow"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid list of editable items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenuItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white p-4 rounded-card border border-border flex flex-col justify-between h-[340px] relative overflow-hidden transition-all hover:border-primary/20 shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Image banner */}
                    <div className="h-28 w-full rounded-card overflow-hidden bg-neutral-900 border border-border relative mb-3.5">
                      <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-opacity ${item.isOutOfStock ? "opacity-45" : ""}`} />
                      
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/85 border border-accent-amber/20 text-[9px] font-bold text-white uppercase font-display tracking-wider">
                        {item.category}
                      </span>

                      <span className={`absolute top-2.5 right-2.5 w-4 h-4 border bg-white rounded flex items-center justify-center ${
                        item.isVeg ? "border-emerald-500" : "border-red-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? "bg-emerald-500" : "bg-red-500"
                        }`} />
                      </span>

                      {item.isOutOfStock && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="bg-amber-700/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info details */}
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="font-display font-bold text-sm text-on-background truncate">{item.name}</h4>
                        {item.isPopular && (
                          <span className="text-[8px] bg-accent-amber/20 text-accent-gold border border-accent-amber/20 px-1 rounded font-bold uppercase flex items-center gap-0.5">
                            <Sparkles size={8} /> Popular
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-coffee text-sm">₹{item.price.toFixed(0)}</span>
                          <span className="text-[10px] text-secondary flex items-center gap-0.5">
                            <Star size={10} className="text-accent fill-accent" /> {item.rating.toFixed(1)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleStock(item)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer uppercase ${
                            item.isOutOfStock
                              ? "bg-amber-100 border-amber-300 text-amber-700"
                              : "bg-emerald-100 border-emerald-300 text-emerald-600"
                          }`}
                        >
                          {item.isOutOfStock ? "Sold Out" : "In Stock"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="pt-3.5 border-t border-border/60 flex gap-2">
                    <button
                      onClick={() => handleOpenEditor(item)}
                      className="flex-1 py-2.5 rounded-full border border-primary/30 hover:bg-primary hover:text-white text-primary font-display font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 size={12} /> Edit Item
                    </button>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id, item.name)}
                      className="px-3.5 py-2.5 rounded-full border border-amber-300 hover:bg-amber-700 hover:text-white text-amber-700 font-display font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* MODAL: QR CODE GENERATOR */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-card bg-white p-6 border border-border shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setQrModal({ isOpen: false, table: null, qrUrl: "" })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-variant text-secondary hover:text-accent-gold transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h4 className="font-display font-bold text-xl text-coffee mb-1">Table {qrModal.table} QR Code</h4>

              <div className="w-56 h-56 mx-auto rounded-card overflow-hidden border border-border p-3 bg-white flex items-center justify-center shadow-md">
                {qrModal.qrUrl && (
                  <img
                    src={qrModal.qrUrl}
                    alt={`Table ${qrModal.table} QR Code`}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={qrModal.qrUrl}
                  download={`table-${qrModal.table}-qrcode.png`}
                  className="w-full py-3.5 rounded-full bg-secondary-container hover:bg-secondary-container/90 text-on-secondary-container font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} /> Download QR Image
                </a>
                <a
                  href={`/menu?table=${qrModal.table}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`${window.location.origin}/menu?table=${qrModal.table}`, "_blank");
                  }}
                  className="w-full py-3.5 rounded-full bg-white border border-border hover:border-accent-gold/30 text-secondary hover:text-accent-gold font-display font-medium text-xs flex items-center justify-center gap-1 transition-all"
                >
                  Open Live Customer View <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT MENU ITEM FORM */}
      {editorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-card bg-white p-6 border border-border shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditorModal({ isOpen: false, item: null })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-variant text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h4 className="font-display font-bold text-xl text-primary mb-2 text-left">
              {editorModal.item ? `Edit Item: ${editorModal.item.name}` : "Add New Menu Item"}
            </h4>
            <p className="text-[11px] text-secondary text-left mb-6 border-b border-border pb-2">
              Provide the menu detail configuration below. Real-time updates emit automatically.
            </p>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-bold">
                  Item Name <span className="text-accent-gold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Cardamom Mocha"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-border focus:border-primary rounded-input px-4 py-2.5 text-xs text-on-background focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-bold">
                    Category <span className="text-accent-gold">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white border border-border focus:border-accent-gold rounded-input px-3.5 py-2.5 text-xs text-on-background focus:outline-none"
                  >
                    <option value="Noodles">🍜 Noodles</option>
                    <option value="Rice">🍚 Rice</option>
                    <option value="Manchurian & Starters">🍗 Manchurian &amp; Starters</option>
                    <option value="Egg Specials">🍳 Egg Specials</option>
                    <option value="Biryani">🍛 Biryani</option>
                    <option value="Hot Beverages">☕ Hot Beverages</option>
                    <option value="Cool Drinks">🥤 Cool Drinks</option>
                    <option value="Water Bottles">💧 Water Bottles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-bold">
                    Price (₹ INR) <span className="text-accent-gold">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4.50"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-white border border-border focus:border-primary rounded-input px-4 py-2.5 text-xs text-on-background focus:outline-none transition-colors"
                  />
                </div>
              </div>


              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-bold">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... (or blank for default)"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-white border border-border focus:border-primary rounded-input px-4 py-2.5 text-xs text-on-background focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-bold">
                  Description
                </label>
                <textarea
                  placeholder="Describe this delicious menu item..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-border focus:border-primary rounded-input px-4 py-2.5 text-xs text-on-background focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-3.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span className="text-xs text-on-background flex items-center gap-1">
                    <Leaf size={12} className="text-emerald-600" /> Vegetarian Item
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsPopular}
                    onChange={(e) => setFormIsPopular(e.target.checked)}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span className="text-xs text-on-background flex items-center gap-1">
                    <Heart size={12} className="text-accent-gold" /> Popular Special
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsOutOfStock}
                    onChange={(e) => setFormIsOutOfStock(e.target.checked)}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span className="text-xs text-on-background flex items-center gap-1 text-amber-700">
                    <AlertTriangle size={12} className="text-amber-600" /> Out of Stock
                  </span>
                </label>
              </div>

              <div className="flex gap-3.5 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setEditorModal({ isOpen: false, item: null })}
                  className="flex-1 py-3 rounded-full bg-surface-variant hover:bg-accent text-secondary hover:text-accent-gold font-display font-semibold text-xs transition-colors cursor-pointer border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-coffee hover:bg-primary text-white font-display font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
