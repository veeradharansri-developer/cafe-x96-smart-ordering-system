import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { playOrderChime, playHelpAlert } from "../utils/sound";
import { API_BASE } from "../utils/config";
import QRCode from "qrcode";
import { 
  DollarSign, ShoppingBag, Clock, Users, ArrowRight, Check,
  AlertTriangle, CheckCircle, Smartphone, HelpCircle, X, Download,
  Plus, Edit2, Trash2, Tag, Leaf, Heart, Star, Sparkles
} from "lucide-react";

export default function AdminDashboard() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("orders"); // "orders" or "menu-editor"
  
  // Real-time State Lists
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [helpRequests, setHelpRequests] = useState({});
  const [analytics, setAnalytics] = useState({
    totalOrdersToday: 0,
    revenueToday: 0,
    pendingOrdersCount: 0,
    activeTablesCount: 0,
    popularItems: []
  });

  // UI state controllers
  const [toasts, setToasts] = useState([]);
  const [qrModal, setQrModal] = useState({ isOpen: false, table: null, qrUrl: "" });
  const [editorModal, setEditorModal] = useState({ isOpen: false, item: null });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Menu Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Coffee");
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

  // Initialize Dashboard state from APIs
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/init`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders);
        setHelpRequests(data.activeHelpRequests);
        setAnalytics(data.analytics);
      })
      .catch((err) => console.error("Failed to load admin initial data:", err));

    fetch(`${API_BASE}/api/menu`)
      .then((res) => res.json())
      .then((data) => setMenu(data))
      .catch((err) => console.error("Failed to load menu in admin:", err));
  }, []);

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
    let nextStatus = "";
    if (currentStatus === "Pending") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Served";
    else return;

    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error("Failed status change");
    } catch (error) {
      console.error("Failed to update status:", error);
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
          dark: "#2c1d11", // Coffee dark
          light: "#fdfaf6" // Cream light
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
      setFormCategory("Coffee");
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
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", "Coffee", "Tea", "Snacks", "Desserts", "Combos"];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Toast Alert layout container */}
      <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl flex items-center gap-3 w-80 text-xs font-semibold animate-in slide-in-from-right duration-300 pointer-events-auto ${
              toast.type === "help"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : toast.type === "order"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
            }`}
          >
            {toast.type === "help" ? <AlertTriangle size={18} className="animate-pulse" /> : <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl gold-gradient-text">
            Reception Dashboard
          </h1>
          <p className="text-sm text-cream/50">Manage tables, live menus, and customer requests in real-time.</p>
        </div>

        {/* Tab Routing and Notification banner */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "orders" ? "bg-gold text-coffee-dark shadow-md" : "text-cream/60 hover:text-gold"
              }`}
            >
              Live Orders Feed
            </button>
            <button
              onClick={() => setActiveTab("menu-editor")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "menu-editor" ? "bg-gold text-coffee-dark shadow-md" : "text-cream/60 hover:text-gold"
              }`}
            >
              Menu Editor
            </button>
          </div>

          {Object.keys(helpRequests).length > 0 && (
            <span className="animate-pulse px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> {Object.keys(helpRequests).length} Table Calls Active!
            </span>
          )}
        </div>
      </div>

      {/* VIEW: LIVE ORDERS FEED */}
      {activeTab === "orders" && (
        <>
          {/* Analytics Counter Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Today's Revenue", value: `$${analytics.revenueToday.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400 bg-emerald-500/10" },
              { label: "Orders Placed", value: analytics.totalOrdersToday, icon: ShoppingBag, color: "text-gold bg-gold/10" },
              { label: "Pending Preparation", value: analytics.pendingOrdersCount, icon: Clock, color: "text-blue-400 bg-blue-500/10" },
              { label: "Active Tables", value: analytics.activeTablesCount, icon: Users, color: "text-amber-400 bg-amber-500/10" }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-gold/10 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs text-cream/50 mb-1">{card.label}</p>
                    <h3 className="font-display font-bold text-2xl font-mono text-cream">{card.value}</h3>
                  </div>
                  <div className={`p-3.5 rounded-xl ${card.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Order Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { title: "Pending Queue", status: "Pending", color: "border-t-amber-500 bg-amber-500/5" },
              { title: "Preparing / Cooking", status: "Preparing", color: "border-t-blue-500 bg-blue-500/5" },
              { title: "Ready to Serve", status: "Ready", color: "border-t-emerald-500 bg-emerald-500/5" },
              { title: "Served History", status: "Served", color: "border-t-neutral-600 bg-neutral-600/5" }
            ].map((col, idx) => {
              const colOrders = getOrdersByStatus(col.status);
              return (
                <div key={idx} className={`glass-panel border-t-2 rounded-2xl p-4 flex flex-col h-[550px] overflow-hidden ${col.color} animate-in fade-in duration-300`}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <h3 className="font-display font-semibold text-sm text-cream">{col.title}</h3>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-cream/60">
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Order Cards */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                    {colOrders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-cream/20 py-12">
                        <CheckCircle size={32} />
                        <p className="text-[11px] mt-2">No orders in this state</p>
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <div 
                          key={order.id} 
                          className="glass-panel p-4 rounded-xl border border-white/5 shadow-md flex flex-col gap-2.5 transition-all hover:border-gold/25"
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gold font-mono">{order.id}</span>
                            <span className="px-2 py-0.5 rounded bg-gold/15 text-gold-light border border-gold/30">
                              Table {order.tableNumber}
                            </span>
                          </div>
                          
                          <div className="text-xs text-cream/70 text-left">
                            <p className="font-semibold text-cream">Name: {order.customerName}</p>
                            <div className="mt-2 space-y-1 pl-1">
                              {order.items.map((item, i) => (
                                <p key={i} className="text-cream/50 text-[11px]">
                                  - {item.name} <span className="text-gold font-mono">x{item.quantity}</span>
                                </p>
                              ))}
                            </div>
                            {order.notes && (
                              <div className="mt-2 p-1.5 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 text-[10px]">
                                Note: {order.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <span className="font-mono font-bold text-xs text-cream-dark">${order.total.toFixed(2)}</span>
                            {col.status !== "Served" && (
                              <button
                                onClick={() => updateStatus(order.id, order.status)}
                                className="p-1.5 rounded bg-gold hover:bg-gold-dark text-coffee-dark font-semibold text-xs flex items-center gap-1 transition-all duration-200 cursor-pointer"
                                title="Move to next stage"
                              >
                                <span>
                                  {col.status === "Pending" ? "Cook" :
                                   col.status === "Preparing" ? "Ready" : "Serve"}
                                </span>
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Table Assistance Monitor */}
            <div className="glass-panel p-6 rounded-3xl border border-gold/10 animate-in fade-in duration-300">
              <h3 className="font-display font-bold text-lg text-gold mb-4 flex items-center gap-2">
                Table Assistance & Session QR Codes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const tableNum = String(idx + 1);
                  const isAssistanceNeeded = !!helpRequests[tableNum];
                  const hasActiveOrder = orders.some(o => o.tableNumber === tableNum && o.status !== "Served");

                  return (
                    <div
                      key={tableNum}
                      className={`p-3.5 rounded-2xl border text-center flex flex-col justify-between items-center transition-all ${
                        isAssistanceNeeded
                          ? "bg-rose-500/20 border-rose-500 animate-pulse text-rose-200 shadow-lg shadow-rose-500/10"
                          : hasActiveOrder
                          ? "bg-gold/5 border-gold/40 text-gold-light"
                          : "bg-white/5 border-white/10 text-cream/70"
                      }`}
                    >
                      <div className="mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider">Table</p>
                        <p className="font-display font-extrabold text-xl">{tableNum}</p>
                      </div>

                      <div className="space-y-1.5 w-full">
                        {isAssistanceNeeded ? (
                          <button
                            onClick={() => handleResolveHelp(tableNum)}
                            className="w-full py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-cream font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Help Call
                          </button>
                        ) : (
                          <button
                            onClick={() => openQrModal(tableNum)}
                            className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-cream text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Smartphone size={10} /> QR Code
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic SVG Analytics Chart */}
            <div className="glass-panel p-6 rounded-3xl border border-gold/10 flex flex-col justify-between animate-in fade-in duration-300">
              <div>
                <h3 className="font-display font-bold text-lg text-gold mb-2">Popular Items Sold Today</h3>
                <p className="text-xs text-cream/50 mb-6">Real-time metrics on top sales from live checkouts.</p>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {analytics.popularItems.length === 0 ? (
                  <div className="text-center py-12 text-cream/20">
                    <HelpCircle size={36} className="mx-auto mb-2" />
                    <p className="text-xs">No analytics data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.popularItems.map((item, idx) => {
                      const maxCount = Math.max(...analytics.popularItems.map(i => i.count));
                      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-cream-dark">{item.name}</span>
                            <span className="font-bold text-gold font-mono">{item.count} sold</span>
                          </div>
                          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="h-full gold-gradient-bg rounded-full transition-all duration-700" 
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

      {/* VIEW: MENU EDITOR */}
      {activeTab === "menu-editor" && (
        <section className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header controllers */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-gold/10">
            {/* Search inputs */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 hover:border-gold/20 focus:border-gold/40 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all"
              />
            </div>
            
            {/* Action buttons */}
            <button
              onClick={() => handleOpenEditor(null)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-bold text-xs transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-gold/10 cursor-pointer"
            >
              <Plus size={16} /> Add New Menu Item
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-4.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? "bg-gold text-coffee-dark font-bold"
                    : "bg-white/5 border border-white/10 text-cream/70 hover:border-gold/25 hover:text-gold"
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
                className="glass-panel p-4 rounded-3xl border border-white/5 flex flex-col justify-between h-[340px] relative overflow-hidden transition-all hover:border-gold/20 shadow-lg"
              >
                <div>
                  {/* Image banner */}
                  <div className="h-28 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 relative mb-3.5">
                    <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-opacity ${item.isOutOfStock ? "opacity-45" : ""}`} />
                    
                    {/* Category overlay */}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/85 border border-gold/20 text-[9px] font-bold text-gold uppercase font-display tracking-wider">
                      {item.category}
                    </span>

                    {/* Veg indicator overlay */}
                    <span className={`absolute top-2.5 right-2.5 w-4 h-4 border bg-black/75 rounded flex items-center justify-center ${
                      item.isVeg ? "border-emerald-500" : "border-red-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.isVeg ? "bg-emerald-500" : "bg-red-500"
                      }`} />
                    </span>

                    {/* Out of Stock overlay text */}
                    {item.isOutOfStock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-rose-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-display font-bold text-sm text-cream truncate">{item.name}</h4>
                      {item.isPopular && (
                        <span className="text-[8px] bg-gold/10 text-gold border border-gold/30 px-1 rounded font-bold uppercase flex items-center gap-0.5">
                          <Sparkles size={8} /> Popular
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-cream/50 line-clamp-2 leading-relaxed h-8 mb-2">
                      {item.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gold text-sm">${item.price.toFixed(2)}</span>
                        <span className="text-[10px] text-cream/40 flex items-center gap-0.5">
                          <Star size={10} className="text-gold fill-gold" /> {item.rating.toFixed(1)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer uppercase ${
                          item.isOutOfStock
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {item.isOutOfStock ? "Sold Out" : "In Stock"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit and Delete Buttons footer */}
                <div className="pt-3.5 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => handleOpenEditor(item)}
                    className="flex-1 py-2 rounded-xl border border-gold/30 hover:bg-gold hover:text-coffee-dark text-gold font-display font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Edit2 size={12} /> Edit Item
                  </button>
                  <button
                    onClick={() => handleDeleteMenuItem(item.id, item.name)}
                    className="px-3.5 py-2 rounded-xl border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400 font-display font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>
      )}

      {/* MODAL: QR CODE GENERATOR */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl glass-panel p-6 border border-gold/30 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setQrModal({ isOpen: false, table: null, qrUrl: "" })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-cream/50 hover:text-cream transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h4 className="font-display font-extrabold text-xl gold-gradient-text mb-1">Table {qrModal.table} QR Code</h4>
              <p className="text-xs text-cream/50 mb-6">Scan to launch the Table {qrModal.table} mobile menu.</p>

              <div className="w-56 h-56 mx-auto rounded-2xl overflow-hidden border-2 border-gold/30 p-2 bg-cream flex items-center justify-center shadow-xl">
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
                  className="w-full py-3 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} /> Download QR Image
                </a>
                <a
                  href={`/menu?table=${qrModal.qrUrl}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`${window.location.origin}/menu?table=${qrModal.table}`, "_blank");
                  }}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold/30 text-cream font-display font-medium text-xs flex items-center justify-center gap-1 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-3xl glass-panel p-6 border border-gold/30 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setEditorModal({ isOpen: false, item: null })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-cream/50 hover:text-cream transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h4 className="font-display font-extrabold text-xl gold-gradient-text mb-2 text-left">
              {editorModal.item ? `Edit Item: ${editorModal.item.name}` : "Add New Menu Item"}
            </h4>
            <p className="text-[11px] text-cream/50 text-left mb-6 border-b border-gold/10 pb-2">
              Provide the menu detail configuration below. Real-time updates emit automatically.
            </p>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 text-left">
              
              {/* Form Input fields */}
              <div>
                <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                  Item Name <span className="text-gold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Cardamom Mocha"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-2.5 text-xs text-cream focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                    Category <span className="text-gold">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-coffee-dark border border-white/10 focus:border-gold/45 rounded-xl px-3.5 py-2.5 text-xs text-cream focus:outline-none"
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Tea">Tea</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Combos">Combos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                    Price ($ USD) <span className="text-gold">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4.50"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-2.5 text-xs text-cream focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                  Description
                </label>
                <textarea
                  placeholder="Brief summary of ingredients, brewing details..."
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-2.5 text-xs text-cream focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... (or blank for default)"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-2.5 text-xs text-cream focus:outline-none transition-colors"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="accent-gold w-4 h-4 rounded"
                  />
                  <span className="text-xs text-cream/80 flex items-center gap-1">
                    <Leaf size={12} className="text-emerald-500" /> Vegetarian Item
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsPopular}
                    onChange={(e) => setFormIsPopular(e.target.checked)}
                    className="accent-gold w-4 h-4 rounded"
                  />
                  <span className="text-xs text-cream/80 flex items-center gap-1">
                    <Heart size={12} className="text-gold" /> Popular Special
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsOutOfStock}
                    onChange={(e) => setFormIsOutOfStock(e.target.checked)}
                    className="accent-gold w-4 h-4 rounded"
                  />
                  <span className="text-xs text-cream/80 flex items-center gap-1 text-rose-400">
                    <AlertTriangle size={12} className="text-rose-500" /> Out of Stock
                  </span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3.5 pt-4 border-t border-gold/10 mt-6">
                <button
                  type="button"
                  onClick={() => setEditorModal({ isOpen: false, item: null })}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-cream/60 hover:text-cream font-display font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-bold text-xs transition-all cursor-pointer shadow-lg shadow-gold/10"
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
