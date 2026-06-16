import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { playOrderChime } from "../utils/sound";
import { API_BASE } from "../utils/config";
import { getLocalOrders, updateLocalOrderStatus } from "../utils/localOrderStore";
import { ChefHat, Check, AlertCircle, CheckCircle } from "lucide-react";
import StaffSidebar from "../components/StaffSidebar";

export default function KitchenDisplay() {
  const { socket } = useSocket();
  const [orders, setOrders] = useState(() => {
    const local = getLocalOrders().filter(
      (o) => o.status === "Pending" || o.status === "Preparing" || o.status === "Ready"
    );
    return local.length > 0 ? local : [];
  });

  // Elapsed time ticker
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const loadOrders = useCallback(() => {
    const local = getLocalOrders().filter(
      (o) => o.status === "Pending" || o.status === "Preparing" || o.status === "Ready"
    );

    fetch(`${API_BASE}/api/orders`)
      .then((res) => res.json())
      .then((data) => {
        const apiActive = data.filter(
          (o) => o.status === "Pending" || o.status === "Preparing" || o.status === "Ready"
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
        (o) => o.status === "Pending" || o.status === "Preparing" || o.status === "Ready"
      );
      setOrders((prev) => {
        // Find brand-new orders
        const prevIds = new Set(prev.map((o) => o.id));
        const newOrders = local.filter((o) => !prevIds.has(o.id));
        if (newOrders.length > 0) playOrderChime();
        // Update existing order statuses
        const updated = prev.map((o) => {
          const localVer = local.find((l) => l.id === o.id);
          if (!localVer) return o;
          if (localVer.status === "Served") return null;
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

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    socket.emit("join", "admins");

    socket.on("new_order", (data) => {
      setOrders((prev) => [data.order, ...prev]);
      playOrderChime();
    });

    socket.on("order_updated", (data) => {
      const { id, status } = data.order;
      if (status === "Served") {
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

  // Status button handler
  const handleUpdateStatus = async (orderId, nextStatus) => {
    setOrders((prev) =>
      nextStatus === "Served"
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
      updateLocalOrderStatus(orderId, nextStatus);
    }
  };

  const getElapsedTimeStr = (timestamp) => {
    const elapsedMs = currentTime - new Date(timestamp).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    if (elapsedMins < 1) return "Just now";
    return `${elapsedMins} min ago`;
  };

  const getElapsedTimeMins = (timestamp) => {
    const elapsedMs = currentTime - new Date(timestamp).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const preparingOrders = orders.filter((o) => o.status === "Preparing");

  return (
    <div className="flex-grow flex min-h-screen bg-background text-on-background">
      {/* Left Sidebar Navigation */}
      <StaffSidebar activeItem="kitchen" />

      {/* Main Panel */}
      <div className="flex-grow p-8 flex flex-col h-screen overflow-y-auto">
        
        {/* Header stats bar */}
        <div className="flex items-center justify-between border-b border-surface-variant/40 pb-4 mb-6">
          <div>
            <h1 className="font-display font-medium text-2xl text-primary flex items-center gap-2">
              <ChefHat size={26} /> Kitchen Operations
            </h1>
            <p className="text-xs text-secondary">High-priority preparation queue. Cross-check items before handoff.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold bg-white border border-border px-4 py-2.5 rounded-full custom-shadow">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 
              Pending: {pendingOrders.length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> 
              Preparing: {preparingOrders.length}
            </span>
          </div>
        </div>

        {/* List Grid of Cards */}
        {orders.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center text-secondary/35">
            <ChefHat size={54} className="stroke-[1.5] opacity-30" />
            <h3 className="font-display font-bold text-lg mt-4 text-on-background/40">Kitchen is Clean!</h3>
            <p className="text-xs mt-1">No orders currently waiting for preparation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => {
              const mins = getElapsedTimeMins(order.timestamp);
              const isReady = order.status === "Ready";
              const isUrgent = !isReady && mins >= 8;

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-card p-5 flex flex-col justify-between h-[360px] custom-shadow transition-all hover:shadow-md ${
                    isUrgent 
                      ? "border-error/30 ring-2 ring-error/50"
                      : isReady
                      ? "border-emerald-200"
                      : "border-border"
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      {isUrgent ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-error text-white font-extrabold text-[9px] uppercase tracking-wider">
                          URGENT
                        </span>
                      ) : isReady ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#d5e9bf] text-primary font-extrabold text-[9px] uppercase tracking-wider">
                          READY
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-extrabold text-[9px] uppercase tracking-wider">
                          PENDING
                        </span>
                      )}

                      <span className="text-[11px] font-bold text-outline font-mono">
                        {order.id}
                      </span>
                    </div>

                    {/* Table Title and timer */}
                    <div className="flex items-center justify-between text-xs mb-4 pb-2 border-b border-surface-variant/20">
                      <div>
                        <h4 className="font-bold text-on-background text-sm">
                          {order.tableNumber ? `Table ${order.tableNumber}` : "To-Go #42"}
                        </h4>
                        <p className="text-[10px] text-secondary mt-0.5">{order.customerName} · {getElapsedTimeStr(order.timestamp)}</p>
                      </div>

                      {!isReady && (
                        <span className={`font-mono font-bold text-[11px] ${isUrgent ? "text-error" : "text-on-background"}`}>
                          PREP TIME {mins < 10 ? `0${mins}` : mins}:00
                        </span>
                      )}
                      {isReady && (
                        <CheckCircle size={18} className="text-primary fill-primary-container/20" />
                      )}
                    </div>

                    {/* Items Checklist */}
                    <div className="space-y-3.5 overflow-y-auto max-h-[160px] pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              defaultChecked={isReady}
                              disabled={isReady}
                              className="accent-primary w-4.5 h-4.5 rounded border-border bg-white cursor-pointer" 
                            />
                            <span className={`font-bold ${isReady ? "line-through text-outline" : "text-on-background"}`}>
                              {item.name}
                            </span>
                          </label>
                          <span className={`font-mono font-bold text-xs ${isReady ? "text-outline" : "text-primary"}`}>
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] flex items-start gap-1 leading-normal">
                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                        <span>{order.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-surface-variant/20 flex gap-2">
                    {order.status === "Pending" ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "Preparing")}
                        className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <ChefHat size={14} /> Start Preparing
                      </button>
                    ) : order.status === "Preparing" ? (
                      <>
                        {isUrgent && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "Ready")}
                            className="px-4 py-3.5 rounded-full border border-primary text-primary hover:bg-primary/5 font-semibold text-xs transition-all cursor-pointer"
                          >
                            Bump
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(order.id, "Ready")}
                          className="flex-grow py-3.5 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Check size={14} /> Mark Ready
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "Served")}
                        className="w-full py-3.5 rounded-full bg-[#8a8a8a] hover:bg-[#7a7a7a] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        Handed Off
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
