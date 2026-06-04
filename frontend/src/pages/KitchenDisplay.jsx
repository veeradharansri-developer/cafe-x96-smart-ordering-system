import { useState, useEffect, useCallback } from "react";
import { useAuth } from '../context/AuthContext';
import { useSocket } from "../context/SocketContext";
import { playOrderChime } from "../utils/sound";
import { API_BASE } from "../utils/config";
import { getLocalOrders, updateLocalOrderStatus } from "../utils/localOrderStore";
import { Clock, ChefHat, Check, AlertCircle } from "lucide-react";


export default function KitchenDisplay() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    window.location.search = ""; // Redirect to default view (Customer Menu)
    return null;
  }
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);


  // Elapsed time ticker
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Load active (Pending/Preparing) orders — local store + API
  const loadOrders = useCallback(() => {
    const local = getLocalOrders().filter(
      (o) => o.status === "Pending" || o.status === "Preparing"
    );
    if (local.length > 0) setOrders(local);

    fetch(`${API_BASE}/api/orders`)
      .then((res) => res.json())
      .then((data) => {
        const apiActive = data.filter(
          (o) => o.status === "Pending" || o.status === "Preparing"
        );
        const apiIds = new Set(apiActive.map((o) => o.id));
        const localOnly = local.filter((o) => !apiIds.has(o.id));
        setOrders([...localOnly, ...apiActive]);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    loadOrders();

    // Listen for new local orders broadcast by customer view
    const handleLocalUpdate = () => {
      const local = getLocalOrders().filter(
        (o) => o.status === "Pending" || o.status === "Preparing"
      );
      setOrders((prev) => {
        // Find brand-new orders
        const prevIds = new Set(prev.map((o) => o.id));
        const newOrders = local.filter((o) => !prevIds.has(o.id));
        if (newOrders.length > 0) playOrderChime();
        // Update existing order statuses
        const updated = prev.map((o) => {
          const localVer = local.find((l) => l.id === o.id);
          if (!localVer) return o; // no local version → keep
          // If local says Ready/Served → remove from kitchen
          if (localVer.status === "Ready" || localVer.status === "Served") return null;
          return localVer;
        }).filter(Boolean);
        const updatedIds = new Set(updated.map((o) => o.id));
        return [...newOrders.filter((o) => !updatedIds.has(o.id)), ...updated];
      });
    };

    window.addEventListener("localOrdersUpdated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
    return () => {
      window.removeEventListener("localOrdersUpdated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, [loadOrders]);

  // Socket updates (when real backend is connected)
  useEffect(() => {
    if (!socket) return;
    socket.emit("join", "admins");

    socket.on("new_order", (data) => {
      setOrders((prev) => [data.order, ...prev]);
      playOrderChime();
    });

    socket.on("order_updated", (data) => {
      const { id, status } = data.order;
      if (status === "Ready" || status === "Served") {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
      }
    });

    return () => {
      socket.off("new_order");
      socket.off("order_updated");
    };
  }, [socket]);

  // Status button handler — try API, fallback to localStorage
  const handleUpdateStatus = async (orderId, nextStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      nextStatus === "Ready" || nextStatus === "Served"
        ? prev.filter((o) => o.id !== orderId)
        : prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("API failed");
    } catch {
      // No backend — persist to localStorage so Admin Dashboard reflects it too
      updateLocalOrderStatus(orderId, nextStatus);
    }
  };

  const getElapsedTimeStr = (timestamp) => {
    const elapsedMs = currentTime - new Date(timestamp).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    if (elapsedMins < 1) return "Just now";
    return `${elapsedMins}m ago`;
  };

  const getTimerUrgencyColor = (timestamp) => {
    const elapsedMs = currentTime - new Date(timestamp).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    if (elapsedMins >= 15) return "border-rose-500 text-rose-400 bg-rose-500/5 animate-pulse";
    if (elapsedMins >= 8) return "border-amber-500 text-amber-300 bg-amber-500/5";
    return "border-white/10 text-cream/70";
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const preparingOrders = orders.filter((o) => o.status === "Preparing");

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-gold flex items-center gap-2">
            <ChefHat size={30} /> Kitchen Preparation Queue
          </h1>
          <p className="text-sm text-cream/50">High-priority display for chefs. Prepare items in order of arrival.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending: {pendingOrders.length}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Cooking: {preparingOrders.length}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-center text-cream/20">
          <ChefHat size={60} className="stroke-[1.5]" />
          <h3 className="font-display font-bold text-lg mt-4 text-cream/40">Kitchen is Clean!</h3>
          <p className="text-sm mt-1">No orders currently waiting for preparation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const urgencyClass = getTimerUrgencyColor(order.timestamp);
            return (
              <div
                key={order.id}
                className={`glass-panel border rounded-3xl p-5 flex flex-col justify-between h-[360px] shadow-xl ${urgencyClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-extrabold text-gold text-lg">{order.id}</span>
                    <span className="px-3.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold-light font-extrabold text-sm">
                      Table {order.tableNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-cream/60 mb-4 pb-2 border-b border-white/5">
                    <span className="font-semibold text-cream">Chef note: {order.customerName}</span>
                    <span className="flex items-center gap-1 font-mono font-bold">
                      <Clock size={12} /> {getElapsedTimeStr(order.timestamp)}
                      <span className="ml-2 text-amber-300">ETA: {Math.max(15 - Math.floor((currentTime - new Date(order.timestamp).getTime()) / 60000), 0)}m</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" className="accent-gold w-4 h-4 rounded border-white/10 bg-white/5 cursor-pointer" />
                          <span className="font-semibold text-cream">{item.name}</span>
                        </label>
                        <span className="font-mono font-extrabold text-gold text-sm">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="mt-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-1">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{order.notes}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  {order.status === "Pending" ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "Preparing")}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <ChefHat size={16} /> Start Preparing
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "Ready")}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all animate-pulse"
                    >
                      <Check size={16} /> Mark Completed / Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
