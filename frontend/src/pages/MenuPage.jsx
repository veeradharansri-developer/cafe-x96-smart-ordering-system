import { useState, useEffect, useCallback, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import { API_BASE } from "../utils/config";
import { menuData as localMenuData } from "../data/menuData";
import {
  Search, Bell, ShoppingBag, X, Utensils, HelpCircle, Sparkles
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
      (item.description || "").toLowerCase().includes(q) ||
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

  // Find cart item for a given display item
  const getCartItem = (item) => {
    // Try to find any variant of this item in cart
    return cartItems.find((c) => c.id === item.id || c.baseId === item.id || c.id.startsWith(`${item.id}_`)) || null;
  };

  const getCartItemByKey = (key) => cartItems.find((c) => c.id === key) || null;

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ background: "linear-gradient(160deg, #0c0804 0%, #080604 60%, #0a0804 100%)" }}>

      {/* ── Toast Container ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4">

        {/* Hero Banner */}
        <section className="mb-5 relative rounded-2xl overflow-hidden p-5" style={{ background: "linear-gradient(135deg, #1a0e04 0%, #251409 60%, #1a0e04 100%)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="absolute top-2 right-3 text-5xl opacity-10 select-none">🍽️</div>

          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Fresh &amp; Made to Order</span>
          </div>
          <h2
            className="font-black text-2xl leading-tight mb-1 select-none"
            style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Cafe x96<br />Smart Menu
          </h2>
          <p className="text-xs text-amber-100/40 max-w-xs leading-relaxed">
            Noodles · Rice · Starters · Biryani · Beverages — freshly prepared &amp; served hot to your table.
          </p>
        </section>

        {/* Search Bar */}
        <section className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={15} className="text-amber-100/30" />
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search noodles, biryani, chai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm text-amber-100 placeholder-amber-100/25 focus:outline-none transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(245,158,11,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(245,158,11,0.15)")}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-100/30 hover:text-amber-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </section>

        {/* Category Tabs */}
        <section className="mb-5">
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </section>

        {/* Menu Sections */}
        {loadingMenu ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.06)" }} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-100/20">
            <HelpCircle size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-semibold">No items found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="space-y-8 pb-4">
            {Object.entries(grouped).map(([category, items]) => {
              const meta = CATEGORY_META[category] || { emoji: "🍴" };
              return (
                <section key={category} id={`cat-${category.replace(/\s/g, "-")}`}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2.5 mb-3 sticky top-[57px] py-2 z-30" style={{ background: "rgba(10,7,3,0.95)", backdropFilter: "blur(12px)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                      {meta.emoji}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-amber-100">{category}</h3>
                      <p className="text-[10px] text-amber-100/30">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(to right, rgba(245,158,11,0.15), transparent)" }} />
                  </div>

                  {/* Items Grid */}
                  <div className="space-y-3">
                    {items.map((item) => {
                      // For variant items, pass the specific cart item (single or full)
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

      {/* ── Floating Cart Button ─────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2" style={{ background: "linear-gradient(to top, rgba(8,6,4,1) 70%, transparent)" }}>
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl shadow-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #ea580c, #f59e0b)", boxShadow: "0 8px 32px rgba(234,88,12,0.35)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-black text-white">
                  {totalItems}
                </div>
                <span className="text-white font-black text-sm">View Cart</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-base font-mono">₹{cartTotal.toFixed(0)}</span>
                <ShoppingBag size={16} className="text-white/70" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Active Order Mini Badge ──────────────────────────────────── */}
      {activeOrder && totalItems === 0 && (
        <div className="fixed bottom-4 right-4 z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 8px 24px rgba(59,130,246,0.3)" }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Track Order
          </button>
        </div>
      )}

      {/* ── Cart Drawer ──────────────────────────────────────────────── */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
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
      />
    </div>
  );
}
