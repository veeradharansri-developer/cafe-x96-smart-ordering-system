import { useEffect, useRef, useState } from "react";
import { X, ShoppingBag, Minus, Plus, Trash2, AlertTriangle, CheckCircle, ChefHat, Clock, Award } from "lucide-react";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  onUpdateQuantity,
  onRemoveFromCart,
  onPlaceOrder,
  loading,
  error,
  tableId,
  activeOrder,
  onResetOrder,
}) {
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState("cart"); // "cart" | "order"
  const drawerRef = useRef(null);

  // Auto-switch to order tab when active order exists
  useEffect(() => {
    if (activeOrder) setTab("order");
  }, [activeOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    const ok = await onPlaceOrder(customerName, notes);
    if (ok) {
      setNotes("");
      setCustomerName("");
    }
  };

  const getStep = (status) => {
    const map = { Pending: 1, Preparing: 2, Ready: 3, Served: 4 };
    return map[status] || 1;
  };

  const totalItems = cartItems.reduce((a, c) => a + c.quantity, 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(160deg, #1a1007 0%, #0c0804 100%)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-amber-900/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <ShoppingBag size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-100">Your Order</h2>
              {tableId && <p className="text-[10px] text-amber-100/40">Table {tableId}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeOrder && (
              <button
                onClick={() => setTab(tab === "cart" ? "order" : "cart")}
                className="text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                {tab === "cart" ? "📦 Track Order" : "🛒 Back to Cart"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-amber-100/50 hover:text-amber-100 hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tab: Cart */}
        {tab === "cart" && (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-amber-100/20">
                  <ShoppingBag size={48} className="mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs mt-1">Add items to get started</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-amber-900/20"
                  >
                    <span className="text-xl">{item.emoji || "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-100 truncate">{item.name}</p>
                      <p className="text-[11px] text-amber-400 font-mono font-bold">₹{(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-900/20 border border-amber-900/30 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-amber-400/70 hover:text-amber-300 transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-amber-200">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-amber-400/70 hover:text-amber-300 transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(item.id)}
                      className="w-7 h-7 flex items-center justify-center text-amber-100/20 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Form */}
            {cartItems.length > 0 && (
              <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3 border-t border-amber-900/30 space-y-3 flex-shrink-0">
                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  required
                  placeholder="Your name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white/5 border border-amber-900/30 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-amber-100 placeholder-amber-100/25 focus:outline-none transition-colors"
                />

                <textarea
                  placeholder="Special instructions (optional)..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-amber-900/30 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-amber-100 placeholder-amber-100/25 focus:outline-none transition-colors resize-none"
                />

                {/* Bill summary */}
                <div className="flex items-center justify-between py-2 border-t border-amber-900/20">
                  <div className="text-xs text-amber-100/50">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} · Table {tableId}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-amber-100/40 uppercase tracking-wider">Total</p>
                    <p className="text-xl font-black text-amber-400 font-mono">₹{cartTotal.toFixed(0)}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !customerName.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm shadow-xl shadow-orange-900/30 hover:shadow-orange-900/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>🚀 Place Order · Table {tableId}</>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Tab: Order Tracking */}
        {tab === "order" && activeOrder && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-100/40 uppercase tracking-widest font-mono">{activeOrder.id}</p>
                <h3 className="font-black text-amber-100 text-sm">Order Status</h3>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                activeOrder.status === "Pending" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                activeOrder.status === "Preparing" ? "bg-blue-500/15 text-blue-300 border-blue-500/30" :
                activeOrder.status === "Ready" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 animate-pulse" :
                "bg-neutral-500/15 text-neutral-300 border-neutral-500/30"
              }`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between relative px-2 py-4">
              <div className="absolute left-6 right-6 top-[50%] h-0.5 bg-amber-900/30 z-0">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
                  style={{ width: `${((getStep(activeOrder.status) - 1) / 3) * 100}%` }}
                />
              </div>
              {[
                { step: 1, label: "Sent", icon: Clock },
                { step: 2, label: "Cooking", icon: ChefHat },
                { step: 3, label: "Ready", icon: Award },
                { step: 4, label: "Served", icon: CheckCircle },
              ].map((s) => {
                const Icon = s.icon;
                const done = getStep(activeOrder.status) >= s.step;
                const active = getStep(activeOrder.status) === s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center z-10">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      done ? "bg-gradient-to-br from-orange-500 to-amber-500 border-amber-400 text-white" :
                      "bg-[#1a1007] border-amber-900/30 text-amber-900"
                    } ${active ? "ring-4 ring-amber-500/20 scale-110" : ""}`}>
                      <Icon size={14} className={active ? "animate-pulse" : ""} />
                    </div>
                    <span className={`text-[10px] mt-1.5 font-bold ${done ? "text-amber-400" : "text-amber-900"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* ETA */}
            {activeOrder.status !== "Served" && (
              <div className="p-3 rounded-xl bg-amber-900/10 border border-amber-900/20 flex items-center justify-between text-xs">
                <span className="text-amber-100/50 flex items-center gap-1.5"><Clock size={12} className="text-amber-400" /> Est. Wait</span>
                <span className="font-black text-amber-400">
                  {activeOrder.status === "Pending" ? "~10–15 mins" :
                   activeOrder.status === "Preparing" ? "~5–10 mins" :
                   "Ready! 🎉"}
                </span>
              </div>
            )}

            {/* Items in order */}
            <div className="space-y-1.5 pt-2 border-t border-amber-900/20">
              <p className="text-[10px] text-amber-100/30 uppercase tracking-wider font-bold mb-2">Items Ordered</p>
              {activeOrder.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-amber-100/70">{item.name} <span className="text-amber-400 font-mono">×{item.quantity}</span></span>
                  <span className="text-amber-400 font-mono font-bold">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between font-black text-sm pt-2 border-t border-amber-900/20 text-amber-300">
                <span>Total Paid</span>
                <span className="font-mono">₹{activeOrder.total.toFixed(0)}</span>
              </div>
            </div>

            {activeOrder.status === "Served" && (
              <button
                onClick={onResetOrder}
                className="w-full py-3 rounded-2xl border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-colors"
              >
                Place New Order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getStep(status) {
  const map = { Pending: 1, Preparing: 2, Ready: 3, Served: 4 };
  return map[status] || 1;
}
