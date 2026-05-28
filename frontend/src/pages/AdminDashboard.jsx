import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { playOrderChime, playHelpAlert } from "../utils/sound";
import { API_BASE } from "../utils/config";
import QRCode from "qrcode";
import { 
  DollarSign, ShoppingBag, Clock, Users, ArrowRight, Check,
  AlertTriangle, CheckCircle, Smartphone, HelpCircle, X, Download
} from "lucide-react";

export default function AdminDashboard() {
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [helpRequests, setHelpRequests] = useState({});
  const [analytics, setAnalytics] = useState({
    totalOrdersToday: 0,
    revenueToday: 0,
    pendingOrdersCount: 0,
    activeTablesCount: 0,
    popularItems: []
  });

  const [toasts, setToasts] = useState([]);
  const [qrModal, setQrModal] = useState({ isOpen: false, table: null, qrUrl: "" });

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initialize Dashboard state from API
  useEffect(() => {
    fetch(`${API_BASE}/api/admin/init`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders);
        setHelpRequests(data.activeHelpRequests);
        setAnalytics(data.analytics);
      })
      .catch((err) => console.error("Failed to load admin initial data:", err));
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
    }

    return () => {
      if (socket) {
        socket.off("new_order");
        socket.off("order_updated");
        socket.off("help_requested");
        socket.off("help_resolved");
      }
    };
  }, [socket]);

  // Status transitions
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

  // Generate Table QR Code
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

  // Helper to filter orders by columns
  const getOrdersByStatus = (status) => {
    return orders.filter((o) => o.status === status);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Toast Layout container */}
      <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl flex items-center gap-3 w-80 text-xs font-semibold animate-in slide-in-from-right duration-300 pointer-events-auto ${
              toast.type === "help"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : toast.type === "order"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
            }`}
          >
            {toast.type === "help" ? <AlertTriangle size={18} className="animate-pulse" /> : <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl gold-gradient-text">
            Reception Dashboard
          </h1>
          <p className="text-sm text-cream/50">Manage tables, live menus, and customer requests in real-time.</p>
        </div>
        <div className="flex gap-2">
          {Object.keys(helpRequests).length > 0 && (
            <span className="animate-pulse px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> {Object.keys(helpRequests).length} Table Calls Active!
            </span>
          )}
        </div>
      </div>

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
            <div key={idx} className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-gold/10">
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
            <div key={idx} className={`glass-panel border-t-2 rounded-2xl p-4 flex flex-col h-[550px] overflow-hidden ${col.color}`}>
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
                            className="p-1.5 rounded bg-gold hover:bg-gold-dark text-coffee-dark font-semibold text-xs flex items-center gap-1 transition-all duration-200"
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
        <div className="glass-panel p-6 rounded-3xl border border-gold/10">
          <h3 className="font-display font-bold text-lg text-gold mb-4 flex items-center gap-2">
            Table Assistance & Session QR Codes
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {Array.from({ length: 10 }).map((_, idx) => {
              const tableNum = String(idx + 1);
              const isAssistanceNeeded = !!helpRequests[tableNum];
              
              // Find if this table has active pending/prep orders
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
                        className="w-full py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-cream font-bold text-[10px] transition-colors"
                      >
                        Help Call
                      </button>
                    ) : (
                      <button
                        onClick={() => openQrModal(tableNum)}
                        className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-cream text-[10px] font-medium flex items-center justify-center gap-1 transition-all"
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
        <div className="glass-panel p-6 rounded-3xl border border-gold/10 flex flex-col justify-between">
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

      {/* QR CODE MODAL OVERLAY */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl glass-panel p-6 border border-gold/30 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setQrModal({ isOpen: false, table: null, qrUrl: "" })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-cream/50 hover:text-cream transition-colors"
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
                  className="w-full py-3 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={14} /> Download QR Image
                </a>
                <a
                  href={`/menu?table=${qrModal.qrUrl}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`/menu?table=${qrModal.table}`, "_blank");
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
    </div>
  );
}
