import { useState, useEffect } from "react";
import { useCart } from "./context/CartContext";
import MenuPage from "./pages/MenuPage";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDisplay from "./pages/KitchenDisplay";
import AIChatbot from "./components/AIChatbot";
import { Coffee, Shield, ChefHat } from "lucide-react";

export default function App() {
  const { tableId, setTableNumber, cartItems } = useCart();
  const [view, setView] = useState("menu"); // "menu", "admin", "kitchen"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check for QR table query parameter: ?table=X
    const tableParam = params.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    }
    
    // Check for view query parameter: ?view=admin
    const viewParam = params.get("view");
    if (viewParam === "admin" || viewParam === "kitchen") {
      setView(viewParam);
    }

    // Clean up query parameters in URL
    if (tableParam || viewParam) {
      params.delete("table");
      params.delete("view");
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, document.title, newRelativePathQuery);
    }
  }, [setTableNumber]);

  // Set default table number if none is set to ensure the app works immediately
  useEffect(() => {
    if (!tableId && view === "menu") {
      setTableNumber("1"); // Default to Table 1 if opened without QR code for testing
    }
  }, [tableId, view, setTableNumber]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      
      {/* Route Views */}
      <div className="flex-1 flex flex-col">
        {view === "menu" && <MenuPage />}
        {view === "admin" && <AdminDashboard />}
        {view === "kitchen" && <KitchenDisplay />}
      </div>

      {/* Floating Bean AI Bot - only render for customer menu */}
      {view === "menu" && <AIChatbot />}

      {/* Navigation Dock - Hidden from customers, only visible to staff */}
      {view !== "menu" && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-lg border border-gold/20 rounded-full px-5 py-2 flex items-center gap-6 shadow-2xl transition-all duration-300`}>
          <button
            onClick={() => setView("menu")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              view === "menu"
                ? "bg-gold text-coffee-dark shadow-md"
                : "text-cream/60 hover:text-gold"
            }`}
          >
            <Coffee size={14} /> Customer Menu
          </button>

          <button
            onClick={() => setView("admin")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              view === "admin"
                ? "bg-gold text-coffee-dark shadow-md"
                : "text-cream/60 hover:text-gold"
            }`}
          >
            <Shield size={14} /> Admin
          </button>

          <button
            onClick={() => setView("kitchen")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              view === "kitchen"
                ? "bg-gold text-coffee-dark shadow-md"
                : "text-cream/60 hover:text-gold"
            }`}
          >
            <ChefHat size={14} /> Kitchen
          </button>
        </div>
      )}

    </div>
  );
}
