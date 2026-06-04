/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import confetti from "canvas-confetti";
import { API_BASE } from "../utils/config";
import { saveLocalOrder } from "../utils/localOrderStore";


const CartContext = createContext();

export function CartProvider({ children }) {
  const { socket } = useSocket();
  
  // Table ID state (persisted in session)
  const [tableId, setTableId] = useState(() => {
    return sessionStorage.getItem("tableId") || "";
  });

  // Cart items state
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cartItems");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse cartItems from localStorage", e);
      return [];
    }
  });

  // Active placed order state
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("activeOrder");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse activeOrder from localStorage", e);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync cart to localstorage
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  // Sync active order to localstorage
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem("activeOrder", JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem("activeOrder");
    }
  }, [activeOrder]);

  // Set table ID and save it
  const setTableNumber = (num) => {
    const tableStr = String(num);
    setTableId(tableStr);
    sessionStorage.setItem("tableId", tableStr);
  };

  // Join table room when socket and tableId are ready
  useEffect(() => {
    if (socket && tableId) {
      socket.emit("join", `table:${tableId}`);

      // Listen for updates to this table's order
      socket.on("order_status_updated", (updatedOrder) => {
        setActiveOrder((current) => {
          if (current && current.id === updatedOrder.id) {
            return updatedOrder;
          }
          return current;
        });
      });

      socket.on("order_placed", (placedOrder) => {
        if (placedOrder.tableNumber === tableId) {
          setActiveOrder(placedOrder);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("order_status_updated");
        socket.off("order_placed");
      }
    };
  }, [socket, tableId]);

  const addToCart = (product) => {
    if (product.isOutOfStock) return;
    // product.id may be "n1_single", "n1_full", or plain "e1" — use it as the unique cart key
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Helper — create a local simulated order (used when backend is unreachable)
  const _createLocalOrder = (customerName, notes) => {
    const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return {
      id: `ord-local-${Date.now()}`,
      tableNumber: String(tableId),
      customerName,
      items: cartItems,
      notes: notes || "",
      timestamp: new Date().toISOString(),
      total: Number(total.toFixed(2)),
      status: "Pending",
    };
  };

  // Submit order — tries backend first, falls back to local simulation
  const checkout = async (customerName, notes) => {
    if (!tableId) {
      setError("Table session is missing. Please scan a QR code.");
      return false;
    }
    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return false;
    }

    setLoading(true);
    setError(null);

    // ── Try real backend ───────────────────────────────────────────────────
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          tableNumber: tableId,
          customerName,
          items: cartItems,
          notes,
        }),
      });

      clearTimeout(timeout);

      // If backend route is missing, Vercel/Vite may return the HTML index page or 404
      const contentType = response.headers.get("content-type");
      if (response.status === 404 || (contentType && contentType.includes("text/html"))) {
        throw new Error("Backend not found");
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to place order. Please try again.");
      }

      const placedOrder = await response.json();
      setActiveOrder(placedOrder);
      // Broadcast order to kitchen via local storage
      saveLocalOrder(placedOrder);
      clearCart();

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f97316", "#fbbf24", "#1a0e04", "#7c2d12"],
      });

      return true;

    } catch (err) {
      // ── Backend unreachable — fall back to local order ─────────────────
      if (
        err.name === "AbortError" ||
        err.name === "SyntaxError" ||
        err.message === "Backend not found" ||
        err.message === "Failed to fetch" ||
        err.message.includes("fetch") ||
        err.message.includes("network") ||
        err.message.includes("NetworkError") ||
        err.message.includes("Unexpected token")
      ) {
        // Simulate the order locally so UX isn't broken on Vercel / offline
        const localOrder = _createLocalOrder(customerName, notes);
        setActiveOrder(localOrder);
        // Broadcast to Admin + Kitchen via localStorage
        saveLocalOrder(localOrder);
        clearCart();

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#f97316", "#fbbf24", "#1a0e04", "#7c2d12"],
        });

        setLoading(false);
        return true; // success
      }

      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Trigger assistance
  const requestHelp = async () => {
    if (!tableId) return;

    // Use socket if connected, fallback to API
    if (socket && socket.connected) {
      socket.emit("request_help", tableId);
    } else {
      try {
        await fetch(`${API_BASE}/api/help`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableNumber: tableId }),
        });
      } catch (err) {
        console.error("Failed to request assistance:", err);
      }
    }
  };

  const resetActiveOrder = () => {
    setActiveOrder(null);
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        tableId,
        setTableNumber,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        checkout,
        activeOrder,
        resetActiveOrder,
        requestHelp,
        loading,
        error,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
