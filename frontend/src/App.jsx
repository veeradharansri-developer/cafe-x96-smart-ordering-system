import React, { useEffect, useState } from "react";
import { useCart } from "./context/CartContext";
import MenuPage from "./pages/MenuPage";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDisplay from "./pages/KitchenDisplay";
import AIChatbot from "./components/AIChatbot";
import { Coffee, Shield, ChefHat } from "lucide-react";

export default function App() {
  const { tableId, setTableNumber } = useCart();
  const [view, setView] = useState("menu"); // default view

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Check for QR table query parameter: ?table=X
    const tableParam = params.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
      // Clean up the URL search params so it looks neat
      params.delete("table");
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, document.title, newRelativePathQuery);
      setView("menu");
    }

    // 2. Check if testing a specific view directly: ?view=admin or ?view=kitchen
    const viewParam = params.get("view");
    if (viewParam === "admin" || viewParam === "kitchen") {
      setView(viewParam);
      // Clean up URL
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

      {/* Developer Navigation Dock (For easy switching between customer/admin/kitchen views) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-lg border border-gold/20 rounded-full px-5 py-2 flex items-center gap-6 shadow-2xl">
        <button
          onClick={() => setView("menu")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
            view === "menu"
              ? "bg-gold text-coffee-dark shadow-md"
              : "text-cream/60 hover:text-gold"
          }`}
        >
          <Coffee size={14} /> Customer Menu
        </button>

        <button
          onClick={() => setView("admin")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
            view === "admin"
              ? "bg-gold text-coffee-dark shadow-md"
              : "text-cream/60 hover:text-gold"
          }`}
        >
          <Shield size={14} /> Reception Admin
        </button>

        <button
          onClick={() => setView("kitchen")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
            view === "kitchen"
              ? "bg-gold text-coffee-dark shadow-md"
              : "text-cream/60 hover:text-gold"
          }`}
        >
          <ChefHat size={14} /> Kitchen Screen
        </button>
      </div>

    </div>
  );
}
