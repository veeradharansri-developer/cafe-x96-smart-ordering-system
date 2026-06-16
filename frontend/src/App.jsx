import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "./context/CartContext";
import MenuPage from "./pages/MenuPage";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDisplay from "./pages/KitchenDisplay";
import AIChatbot from "./components/AIChatbot";
import { Shield, ChefHat, Lock } from "lucide-react";

const StaffLogin = ({ onLogin }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === "1234") {
      sessionStorage.setItem("staff_auth", "true");
      onLogin();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <div className="glass-panel p-8 rounded-card border border-border shadow-lg max-w-sm w-full text-center bg-white">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h2 className="font-display font-bold text-2xl text-primary mb-2">Staff Access</h2>
        <p className="text-sm text-secondary mb-8">Please enter the PIN to access staff views.</p>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="Enter PIN (e.g. 1234)"
            className={`w-full bg-white border ${error ? "border-error/70" : "border-border focus:border-primary/60"} rounded-input px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none transition-all mb-4 text-on-background`}
            autoFocus
          />
          {error && <p className="text-xs text-error mb-4 animate-pulse">Incorrect PIN. Try again.</p>}
          <button type="submit" className="w-full py-3.5 rounded-full bg-primary text-white font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

const StaffLayout = ({ children, isAuthenticated, onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  if (!isAuthenticated) {
    return <StaffLogin onLogin={onLogin} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-background text-on-background">
      {children}

      {/* Navigation Dock - only visible to authenticated staff */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-md border border-outline-variant/50 rounded-full px-5 py-2 flex items-center gap-6 shadow-lg transition-all duration-300">
        <button
          onClick={() => navigate("/admin")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer ${
            currentPath === "/admin"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Shield size={14} /> Admin
        </button>

        <button
          onClick={() => navigate("/kitchen")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer ${
            currentPath === "/kitchen"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <ChefHat size={14} /> Kitchen
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const { tableId, setTableNumber } = useCart();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("staff_auth") === "true";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check for QR table query parameter: ?table=X
    const tableParam = params.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    }

    // Clean up query parameters in URL
    const viewParam = params.get("view");
    if (viewParam === "admin") {
      navigate("/admin");
    } else if (viewParam === "kitchen") {
      navigate("/kitchen");
    }

    if (tableParam || viewParam) {
      params.delete("table");
      params.delete("view");
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, document.title, newRelativePathQuery);
    }
  }, [setTableNumber, navigate]);

  // Set default table number if none is set to ensure the app works immediately
  useEffect(() => {
    if (!tableId) {
      setTableNumber("1"); // Default to Table 1 if opened without QR code for testing
    }
  }, [tableId, setTableNumber]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Routes>
        {/* Customer Route */}
        <Route
          path="/"
          element={
            <div className="flex-1 flex flex-col justify-between">
              <MenuPage />
              <AIChatbot />
            </div>
          }
        />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <StaffLayout isAuthenticated={isAuthenticated} onLogin={() => setIsAuthenticated(true)}>
              <AdminDashboard />
            </StaffLayout>
          }
        />

        {/* Kitchen Route */}
        <Route
          path="/kitchen"
          element={
            <StaffLayout isAuthenticated={isAuthenticated} onLogin={() => setIsAuthenticated(true)}>
              <KitchenDisplay />
            </StaffLayout>
          }
        />

        {/* Catch-all redirect to customer page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

