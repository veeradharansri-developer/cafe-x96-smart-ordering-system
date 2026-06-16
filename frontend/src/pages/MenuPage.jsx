import { useState, useEffect, useCallback, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import { API_BASE } from "../utils/config";
import { menuData as localMenuData } from "../data/menuData";
import {
  Search, Bell, ShoppingBag, X, HelpCircle
} from "lucide-react";
import MenuCard from "../components/menu/MenuCard";
import CategoryTabs, { CATEGORY_META } from "../components/menu/CategoryTabs";
import CartDrawer from "../components/menu/CartDrawer";
import Toast from "../components/menu/Toast";

let toastCounter = 0;

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
    error: checkoutError,
  } = useCart();

  const { socket } = useSocket();

  const [menu, setMenu] = useState(localMenuData); // ← local data loads instantly
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("menu");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [loadingMenu] = useState(false); // no loading needed — data is already there
  const [toasts, setToasts] = useState([]);
  const searchRef = useRef(null);

  // ── Try to fetch fresh menu from API (for live admin edits) ────────────────
  useEffect(() => {
    if (!API_BASE && window.location.hostname !== 'localhost') return; // skip on Vercel
    fetch(`${API_BASE}/api/menu`)
      .then((r) => { if (!r.ok) throw new Error('no backend'); return r.json(); })
      .then((data) => { if (Array.isArray(data) && data.length > 0) setMenu(data); })
      .catch(() => { /* silently keep localMenuData */ });
  }, []);

  // Live menu updates via socket
  useEffect(() => {
    if (!socket) return;
    socket.on("menu_updated", setMenu);
    return () => socket.off("menu_updated");
  }, [socket]);

  // ── Toast helpers ───────────────────────────────────────────────────────────
  const addToast = useCallback((emoji, title, message) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, emoji, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Add to cart with toast ──────────────────────────────────────────────────
  const handleAddToCart = useCallback((item) => {
    addToCart(item);
    addToast(item.emoji || "🍽️", "Added to cart!", item.name);
  }, [addToCart, addToast]);

  // ── Help ────────────────────────────────────────────────────────────────────
  const handleCallHelp = () => {
    requestHelp();
    setHelpSent(true);
    addToast("🔔", "Help requested!", "Staff are on their way to your table.");
    setTimeout(() => setHelpSent(false), 5000);
  };

  // ── Checkout wrapper ────────────────────────────────────────────────────────
  const handlePlaceOrder = async (name, notes) => {
    const ok = await checkout(name, notes);
    if (ok) {
      setIsCartOpen(false);
      addToast("🎉", "Order placed!", "Your order is being prepared.");
    }
    return ok;
  };

  // ── Category & Search filtering ─────────────────────────────────────────────
  const categories = ["All", ...Object.keys(
    menu.reduce((acc, item) => { acc[item.category] = true; return acc; }, {})
  )];

  // Group menu by category, applying filters
  const filteredBySearch = menu.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  const grouped = {};
  filteredBySearch.forEach((item) => {
    if (selectedCategory !== "All" && item.category !== selectedCategory) return;
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const totalItems = cartItems.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col pb-24 bg-background text-on-background">

      {/* ── Toast Container ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Top Navigation Bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-lg border-b border-border px-5 py-3 flex justify-between items-center">
        <h1 className="font-display font-bold text-lg text-primary">Café <span className="text-accent-warm">X96</span></h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCallHelp}
            disabled={helpSent}
            title="Call Assistance"
            className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              helpSent
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "hover:bg-accent/40 text-accent-warm hover:text-accent-gold"
            }`}
          >
            <Bell size={18} className={helpSent ? "" : ""} />
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-full hover:bg-accent/40 text-coffee hover:text-primary transition-all cursor-pointer"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent-warm text-white text-[9px] font-black flex items-center justify-center badge-bounce shadow-sm">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-grow max-w-2xl mx-auto w-full px-margin-mobile pt-2">

        <section className="hero-banner px-6 py-10 mb-4 select-none flex justify-center items-center">
          <div className="hero-logo-card">
            <div className="hero-logo-frame">
              <img
                src="/logo.png"
                alt="Café X96 tea cup logo"
                className="hero-logo-img"
              />
            </div>
          </div>
        </section>

        {/* Search Bar & Filter */}
        <section className="mb-4">
          <div className="glass-panel p-4 sm:p-5 rounded-[28px] border-border shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-secondary mb-1">Find your flavor</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search the menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 rounded-full bg-white border border-border focus:border-primary focus:outline-none transition-all shadow-sm text-on-background"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-on-background transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <button className="flex items-center justify-center px-4 py-3 rounded-full bg-accent-warm text-white font-semibold shadow-sm hover:shadow-md transition-all border border-transparent">
                  <span className="material-symbols-outlined text-[20px] font-light">tune</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="mb-4">
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </section>

        {/* Menu Sections */}
        {loadingMenu ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-card animate-pulse bg-white border border-border" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <HelpCircle size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-semibold">No items found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {Object.entries(grouped).map(([category, items]) => {
              const meta = CATEGORY_META[category] || { emoji: "🍴" };
              return (
                <section key={category} id={`cat-${category.replace(/\s/g, "-")}`}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2.5 mb-3 sticky top-[57px] py-2.5 z-30 bg-background/95 backdrop-blur-md">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-sm bg-white border border-border">
                      {meta.emoji}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-on-background">{category}</h3>
                      <p className="text-[10px] text-secondary">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 h-px ml-2 bg-border" />
                  </div>

                  {/* Items Grid */}
                  <div className="space-y-3">
                    {items.map((item) => {
                      const singleKey = `${item.id}_single`;
                      const fullKey = `${item.id}_full`;
                      const singleCartItem = cartItems.find((c) => c.id === singleKey) || null;
                      const fullCartItem = cartItems.find((c) => c.id === fullKey) || null;
                      const singleOrOnlyCartItem = item.hasVariants ? singleCartItem : cartItems.find((c) => c.id === item.id) || null;

                      return (
                        <MenuCard
                           key={item.id}
                           item={item}
                           cartItem={singleOrOnlyCartItem}
                           fullCartItem={fullCartItem}
                           onAddToCart={handleAddToCart}
                           onUpdateQuantity={updateQuantity}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Bottom Navigation Bar ──────────────────────────────────────── */}
      {(() => {
        const currentTab = (isCartOpen || activeOrder) ? "orders" : activeNav;
        return (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-border px-6 py-2 flex justify-around items-center max-w-2xl mx-auto shadow-[0_-8px_30px_rgba(42,26,14,0.06)]">
            <button
              onClick={() => {
                setActiveNav("menu");
                setSelectedCategory("All");
                setIsCartOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-all duration-300 cursor-pointer ${
                currentTab === "menu" ? "text-primary" : "text-outline hover:text-primary"
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center ${
                currentTab === "menu"
                  ? "rounded-full bg-primary/10 text-primary"
                  : ""
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${currentTab === "menu" ? "font-medium" : "font-light"}`}>restaurant_menu</span>
              </div>
              <span className={`text-[9px] tracking-wide font-medium ${currentTab === "menu" ? "text-primary" : ""}`}>Menu</span>
            </button>

            <button
              onClick={() => {
                setActiveNav("search");
                setIsCartOpen(false);
                searchRef.current?.focus();
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-all duration-300 cursor-pointer ${
                currentTab === "search" ? "text-accent-warm" : "text-outline hover:text-accent-warm"
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center ${
                currentTab === "search"
                  ? "rounded-full bg-accent-warm/10 text-accent-warm"
                  : ""
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${currentTab === "search" ? "font-medium" : "font-light"}`}>search</span>
              </div>
              <span className={`text-[9px] tracking-wide font-medium ${currentTab === "search" ? "text-accent-warm" : ""}`}>Search</span>
            </button>

            <button
              onClick={() => {
                setActiveNav("orders");
                setIsCartOpen(true);
              }}
              className={`relative flex flex-col items-center gap-0.5 text-xs font-semibold transition-all duration-300 cursor-pointer ${
                currentTab === "orders" ? "text-accent-gold" : "text-outline hover:text-accent-gold"
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center ${
                currentTab === "orders"
                  ? "rounded-full bg-accent-gold/10 text-accent-gold"
                  : ""
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${currentTab === "orders" ? "font-medium" : "font-light"}`}>receipt_long</span>
                {(totalItems > 0 || activeOrder) && (
                  <span className={`absolute top-2 right-3 w-2.5 h-2.5 rounded-full shadow-sm ${
                    activeOrder && totalItems === 0 ? "bg-success animate-pulse" : "bg-accent-gold"
                  }`} />
                )}
              </div>
              <span className={`text-[9px] tracking-wide font-medium ${currentTab === "orders" ? "text-accent-gold" : ""}`}>Orders</span>
            </button>
          </div>
        );
      })()}

      {/* ── Cart Drawer ──────────────────────────────────────────────── */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          setActiveNav("menu");
        }}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onUpdateQuantity={updateQuantity}
        onRemoveFromCart={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
        loading={checkoutLoading}
        error={checkoutError}
        tableId={tableId}
        activeOrder={activeOrder}
        onResetOrder={resetActiveOrder}
        onRequestHelp={handleCallHelp}
      />
    </div>
  );
}
