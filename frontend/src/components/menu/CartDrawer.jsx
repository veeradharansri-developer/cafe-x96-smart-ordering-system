import { useRef, useState } from "react";
import { X, ShoppingBag, Minus, Plus, Trash2, AlertTriangle, CheckCircle, ChefHat, Clock, Award, Bell } from "lucide-react";

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
  onRequestHelp,
}) {
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState(activeOrder ? "order" : "cart"); // "cart" | "order"
  const [prevActiveOrder, setPrevActiveOrder] = useState(activeOrder);

  if (activeOrder && activeOrder !== prevActiveOrder) {
    setPrevActiveOrder(activeOrder);
    setTab("order");
  }
  const drawerRef = useRef(null);


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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-card sm:rounded-card overflow-hidden shadow-2xl bg-background border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <ShoppingBag size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-background">Your Order</h2>
              {tableId && <p className="text-[10px] text-secondary">Table {tableId}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeOrder && (
              <button
                onClick={() => setTab(tab === "cart" ? "order" : "cart")}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                {tab === "cart" ? "📦 Track Order" : "🛒 Back to Cart"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-surface-variant flex items-center justify-center text-secondary hover:text-primary hover:bg-border transition-colors"
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
                <div className="flex flex-col items-center justify-center py-16 text-secondary">
                  <ShoppingBag size={48} className="mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs mt-1">Add items to get started</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border custom-shadow"
                  >
                    <span className="text-xl">{item.emoji || "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-background truncate">{item.name}</p>
                      <p className="text-[11px] text-primary font-semibold">₹{item.price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-variant border border-border rounded-xl">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-on-background">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(item.id)}
                      className="w-7 h-7 flex items-center justify-center text-secondary hover:text-error transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Form */}
            {cartItems.length > 0 && (
              <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3 border-t border-border space-y-3 flex-shrink-0">
                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-error-container text-on-error-container text-xs">
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
                  className="w-full bg-white border border-border focus:border-primary focus:outline-none rounded-input px-4 py-2.5 text-sm text-on-background placeholder-secondary transition-colors"
                />

                <textarea
                  placeholder="Special instructions (optional)..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-border focus:border-primary focus:outline-none rounded-input px-4 py-2.5 text-sm text-on-background placeholder-secondary transition-colors resize-none"
                />

                {/* Bill summary */}
                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div className="text-xs text-secondary">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} · Table {tableId}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-secondary uppercase tracking-wider font-bold">Total</p>
                    <p className="text-xl font-black text-primary">₹{cartTotal.toFixed(0)}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !customerName.trim()}
                  className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Place Order · Table {tableId}</>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Tab: Order Tracking */}
        {tab === "order" && activeOrder && (
          <div className="flex-grow overflow-y-auto px-5 py-4 space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-[9px] text-secondary uppercase tracking-widest font-mono font-bold">{activeOrder.id}</p>
                <h3 className="font-bold text-on-background text-sm">Order Status</h3>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                activeOrder.status === "Pending" ? "bg-secondary-container text-on-secondary-container border-secondary-container" :
                activeOrder.status === "Preparing" ? "bg-primary-light/15 text-primary border-primary/20 animate-pulse" :
                activeOrder.status === "Ready" ? "bg-success/15 text-success border-success/30 animate-bounce" :
                "bg-surface-variant text-secondary border-border"
              }`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Stepper Confirmed Area */}
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-16 h-16 rounded-full bg-accent/60 flex items-center justify-center mb-2.5">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                  <CheckCircle size={28} className="stroke-[2.5]" />
                </div>
              </div>
              <h3 className="font-display font-medium text-xl text-on-background">Order Confirmed</h3>
              <p className="text-xs text-secondary mt-0.5">We're starting on your order now.</p>
            </div>

            {/* Vertical Timeline Steps */}
            <div className="space-y-5 pl-4 py-2 relative before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {[
                { step: 1, title: "Confirmed", desc: `Today at ${new Date(activeOrder.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, icon: CheckCircle },
                { step: 2, title: "Preparing", desc: "Our chef is crafting your experience", icon: ChefHat },
                { step: 3, title: "Ready", desc: "Waiting for hand-off at counter", icon: Award },
                { step: 4, title: "Served", desc: "Enjoy your culinary moment", icon: CheckCircle },
              ].map((s) => {
                const Icon = s.icon;
                const done = getStep(activeOrder.status) >= s.step;
                const active = getStep(activeOrder.status) === s.step;
                return (
                  <div key={s.step} className="flex gap-4 items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      done ? "bg-primary-light border-primary text-white" : "bg-white border-border text-secondary"
                    } ${active ? "ring-4 ring-primary/20 scale-105" : ""}`}>
                      <Icon size={14} className={active ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${done ? "text-on-background" : "text-secondary"}`}>{s.title}</h4>
                      <p className="text-[10px] text-secondary mt-0.5">{active ? s.desc : (done ? "Completed" : "Awaiting")}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estimated Wait Card */}
            {activeOrder.status !== "Served" && (
              <div className="bg-white rounded-card p-4 border border-border custom-shadow mb-2">
                <div className="flex justify-between items-center mb-1 text-[10px] text-secondary tracking-wider font-bold">
                  <span>ESTIMATED WAIT</span>
                  <Clock size={14} className="text-secondary" />
                </div>
                <div className="text-2xl font-bold text-on-background mb-3">
                  {activeOrder.status === "Pending" ? "12-15" :
                   activeOrder.status === "Preparing" ? "5-10" : "0"}{" "}
                  <span className="text-sm font-semibold text-secondary">minutes</span>
                </div>
                <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${(getStep(activeOrder.status) / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Order Summary Card */}
            <div className="bg-white rounded-card border border-border overflow-hidden custom-shadow">
              <div className="p-3 border-b border-border">
                <h4 className="font-bold text-xs text-on-background">Order Summary</h4>
              </div>

              <div className="p-3 space-y-2">
                {activeOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-on-background">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-semibold text-on-background">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Subtotal Peach Section */}
              <div className="bg-surface-variant p-3.5 space-y-2 border-t border-border/40">
                <div className="flex justify-between text-[11px] text-secondary">
                  <span>Subtotal</span>
                  <span>₹{(activeOrder.total * 0.95).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-secondary">
                  <span>Tax (5%)</span>
                  <span>₹{(activeOrder.total * 0.05).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-sm pt-2 border-t border-border text-primary mt-1">
                  <span className="text-on-background font-semibold">Total Paid</span>
                  <span className="text-base font-mono">₹{activeOrder.total.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Call Help / Reset Buttons */}
            {activeOrder.status === "Served" ? (
              <button
                onClick={onResetOrder}
                className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-all mt-4 cursor-pointer"
              >
                Place New Order
              </button>
            ) : (
              <button
                onClick={onRequestHelp}
                className="w-full py-3 rounded-full border border-coffee text-coffee font-semibold text-xs flex items-center justify-center gap-2 hover:bg-coffee/5 transition-all mt-2 cursor-pointer"
              >
                <Bell size={12} /> Call Assistance
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
