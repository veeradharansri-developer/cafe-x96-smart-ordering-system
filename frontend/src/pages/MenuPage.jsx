import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { API_BASE } from "../utils/config";
import { 
  Search, Star, Bell, ShoppingBag, Plus, Minus, Trash, 
  X, Check, Utensils, Award, MessageSquare, Sun, Moon,
  Clock, CheckCircle, ChefHat, HelpCircle, ChevronRight
} from "lucide-react";

export default function MenuPage() {
  const {
    tableId,
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    cartTotal,
    checkout,
    activeOrder,
    resetActiveOrder,
    requestHelp,
    loading: checkoutLoading,
    error: checkoutError
  } = useCart();

  const { isDarkMode, toggleTheme } = useTheme();
  
  const [menu, setMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Fetch Menu from API
  useEffect(() => {
    fetch(`${API_BASE}/api/menu`)
      .then((res) => res.json())
      .then((data) => {
        setMenu(data);
        setLoadingMenu(false);
      })
      .catch((err) => {
        console.error("Failed to load menu:", err);
        setLoadingMenu(false);
      });
  }, []);

  const handleCallHelp = () => {
    requestHelp();
    setHelpSent(true);
    setTimeout(() => setHelpSent(false), 5000);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    const success = await checkout(customerName, orderNotes);
    if (success) {
      setIsCartOpen(false);
      setOrderNotes("");
    }
  };

  const categories = ["All", "Coffee", "Tea", "Snacks", "Desserts", "Combos"];

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusStep = (status) => {
    switch (status) {
      case "Pending": return 1;
      case "Preparing": return 2;
      case "Ready": return 3;
      case "Served": return 4;
      default: return 1;
    }
  };

  return (
    <div className="min-height-100vh flex flex-col pb-24">
      {/* Premium Cafe Nav Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gold-dark/20 flex items-center justify-center border border-gold/40">
            <Utensils className="text-gold" size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-wide gold-gradient-text">
              Cafe x96
            </h1>
            <p className="text-[10px] text-cream/50 uppercase tracking-widest">Smart Ordering</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Table ID Badge */}
          {tableId && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold-light">
              Table {tableId}
            </span>
          )}

          {/* Call Help Button */}
          <button
            onClick={handleCallHelp}
            className={`p-2 rounded-full border transition-all duration-300 ${
              helpSent
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                : "bg-white/5 border-white/10 text-cream hover:bg-gold/15 hover:text-gold hover:border-gold/30"
            }`}
            title="Call Assistance"
          >
            <Bell size={18} className={helpSent ? "animate-bounce" : ""} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-cream hover:bg-gold/15 hover:text-gold hover:border-gold/30 transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* App Body Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4">
        {/* Help Toast Notification */}
        {helpSent && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-3 duration-300">
            <CheckCircle size={16} /> Table assistance call sent. Staff are on their way!
          </div>
        )}

        {/* ACTIVE ORDER STATUS TRACKING (If user has submitted order) */}
        {activeOrder && (
          <section className="mb-6 p-5 rounded-2xl glass-panel border border-gold/30 bg-coffee-dark/45 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between border-b border-gold/10 pb-3 mb-4">
              <div>
                <h3 className="font-display font-bold text-gold text-sm">Active Order</h3>
                <p className="text-[10px] text-cream/40 uppercase font-mono">{activeOrder.id}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                activeOrder.status === "Pending" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                activeOrder.status === "Preparing" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                activeOrder.status === "Ready" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse" :
                "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30"
              }`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="flex items-center justify-between relative px-2 mb-4">
              <div className="absolute left-6 right-6 top-[15px] h-[2px] bg-white/10 z-0">
                <div 
                  className="h-full bg-gold transition-all duration-500" 
                  style={{ width: `${((getStatusStep(activeOrder.status) - 1) / 3) * 100}%` }}
                />
              </div>

              {[
                { step: 1, label: "Sent", icon: Clock },
                { step: 2, label: "Cooking", icon: ChefHat },
                { step: 3, label: "Ready", icon: Award },
                { step: 4, label: "Served", icon: CheckCircle }
              ].map((s, index) => {
                const IconComponent = s.icon;
                const isCompleted = getStatusStep(activeOrder.status) >= s.step;
                const isActive = getStatusStep(activeOrder.status) === s.step;

                return (
                  <div key={index} className="flex flex-col items-center z-10 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isCompleted 
                        ? "bg-gold border-gold text-coffee-dark" 
                        : "bg-neutral-900 border-white/15 text-cream/40"
                    } ${isActive ? "ring-4 ring-gold/20 scale-110" : ""}`}>
                      <IconComponent size={14} className={isActive ? "animate-pulse" : ""} />
                    </div>
                    <span className={`text-[10px] mt-2 font-medium ${isCompleted ? "text-gold-light" : "text-cream/30"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Estimated Wait Indicator */}
            {activeOrder.status !== "Served" && (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs text-cream/80">
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-gold" /> Estimated Wait:</span>
                <span className="font-semibold text-gold-light font-mono">
                  {activeOrder.status === "Pending" ? "~10-15 mins" :
                   activeOrder.status === "Preparing" ? "~5-10 mins" :
                   activeOrder.status === "Ready" ? "Ready to Serve!" : "Served"}
                </span>
              </div>
            )}

            {/* Receipt Items breakdown */}
            <div className="mt-4 pt-3 border-t border-gold/10 text-xs">
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-cream/60">
                    <span>{item.name} <span className="text-gold font-mono">x{item.quantity}</span></span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between font-semibold mt-3 text-gold-light">
                <span>Total Amount Paid</span>
                <span className="font-mono text-sm">${activeOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {activeOrder.status === "Served" && (
              <button
                onClick={resetActiveOrder}
                className="w-full mt-4 py-2.5 rounded-xl border border-gold/20 text-gold hover:bg-gold hover:text-coffee-dark font-display font-medium text-xs transition-all duration-300"
              >
                Place New Order
              </button>
            )}
          </section>
        )}

        {/* HERO SECTION */}
        <section className="mb-6 text-center py-4">
          <h2 className="font-display font-extrabold text-3xl leading-tight gold-gradient-text tracking-tight mb-2">
            Futuristic Cafe Ordering
          </h2>
          <p className="text-xs text-cream/60 max-w-sm mx-auto">
            Order premium hand-crafted brews and fresh bakers. Freshly prepared and delivered instantly to your table.
          </p>
        </section>

        {/* SEARCH BAR */}
        <section className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cream/40">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search coffee, tea, pastries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 hover:border-gold/20 focus:border-gold/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-cream placeholder-cream/40 focus:outline-none transition-all duration-300"
          />
        </section>

        {/* CATEGORY CAROUSEL */}
        <section className="mb-6 overflow-x-auto -mx-4 px-4 flex gap-2 pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                selectedCategory === cat
                  ? "bg-gold text-coffee-dark shadow-lg shadow-gold/15"
                  : "bg-white/5 border border-white/10 text-cream/70 hover:border-gold/25 hover:text-gold"
              }`}
            >
              {cat}
            </button>
          ))}
        </section>

        {/* MENU CARD GRID */}
        <section className="space-y-4">
          {loadingMenu ? (
            // Skeleton State
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse border border-white/10"></div>
            ))
          ) : filteredMenu.length === 0 ? (
            <div className="text-center py-12 text-cream/40">
              <HelpCircle size={36} className="mx-auto mb-2 text-gold/30" />
              <p className="text-sm">No items found matching your query</p>
            </div>
          ) : (
            filteredMenu.map((item) => (
              <div
                key={item.id}
                className="glass-panel glass-panel-hover rounded-2xl overflow-hidden p-3 flex gap-3.5 items-center relative animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Product Image */}
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Veg Tag */}
                  <span className={`absolute top-1.5 left-1.5 w-4 h-4 border bg-black/75 rounded flex items-center justify-center ${
                    item.isVeg ? "border-emerald-500" : "border-red-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.isVeg ? "bg-emerald-500" : "bg-red-500"
                    }`} />
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <h3 className="font-display font-bold text-cream text-sm truncate">{item.name}</h3>
                    {item.isPopular && (
                      <span className="text-[9px] bg-gold/10 text-gold border border-gold/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90 flex-shrink-0">
                        Popular
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-cream/50 line-clamp-2 mb-2 leading-relaxed">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-gold text-sm">${item.price.toFixed(2)}</span>
                    
                    {/* Star Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-gold scale-75">
                        <Star size={12} fill="currentColor" />
                        <span className="text-cream text-xs font-semibold font-sans ml-1">{item.rating}</span>
                      </div>
                      
                      {/* Add Button */}
                      <button
                        onClick={() => addToCart(item)}
                        className="p-1.5 rounded-lg bg-gold hover:bg-gold-dark text-coffee-dark transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* STICKY BOTTOM CART BAR */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-black/85 backdrop-blur-md border-t border-gold/20 flex items-center justify-center">
          <div className="max-w-lg w-full flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-[10px] text-cream/50 uppercase tracking-widest">Shopping Cart</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-bold text-gold">${cartTotal.toFixed(2)}</span>
                <span className="text-xs text-cream/40">({cartItems.reduce((a,c) => a + c.quantity, 0)} items)</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-gold/10"
            >
              <ShoppingBag size={16} /> View Basket
            </button>
          </div>
        </div>
      )}

      {/* CART DRAWER MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="max-w-lg w-full rounded-t-3xl glass-panel border-t border-gold/30 p-6 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-4 mb-4">
              <h3 className="font-display font-bold text-gold text-lg flex items-center gap-2">
                <ShoppingBag size={20} /> Checkout Order
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full hover:bg-white/5 text-cream/60 hover:text-cream transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 mb-4 pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div>
                    <h4 className="font-display font-bold text-sm text-cream">{item.name}</h4>
                    <span className="text-xs text-gold font-mono font-semibold">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/45 border border-white/10 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 hover:text-gold transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-cream">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 hover:text-gold transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-cream/40 hover:text-red-400 transition-colors"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4 border-t border-gold/10 pt-4">
              {checkoutError && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg text-center">
                  {checkoutError}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                  Your Name <span className="text-gold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-3 text-sm text-cream placeholder-cream/40 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-cream/50 uppercase tracking-wider mb-1.5 font-bold">
                  Preparation Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g. Extra hot, no whipped cream, allergy warnings..."
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/45 rounded-xl px-4 py-3 text-sm text-cream placeholder-cream/40 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm py-2">
                <span className="text-cream/60">Total Bill</span>
                <span className="font-mono font-bold text-gold text-lg">${cartTotal.toFixed(2)}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gold hover:bg-gold-dark text-coffee-dark font-display font-bold text-sm transition-all duration-300 disabled:opacity-50"
              >
                {checkoutLoading ? (
                  <div className="w-5 h-5 border-2 border-coffee-dark border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Place Order (Table {tableId})</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
