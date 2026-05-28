import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import confetti from "canvas-confetti";
import { API_BASE } from "../utils/config";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { socket } = useSocket();
  
  // Table ID state (persisted in session)
  const [tableId, setTableId] = useState(() => {
    return sessionStorage.getItem("tableId") || "";
  });

  // Cart items state
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("cartItems");
    return saved ? JSON.parse(saved) : [];
  });

  // Active placed order state
  const [activeOrder, setActiveOrder] = useState(() => {
    const saved = localStorage.getItem("activeOrder");
    return saved ? JSON.parse(saved) : null;
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
        if (activeOrder && activeOrder.id === updatedOrder.id) {
          setActiveOrder(updatedOrder);
        }
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
  }, [socket, tableId, activeOrder]);

  const addToCart = (product) => {
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

  // Submit order to API
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

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableNumber: tableId,
          customerName,
          items: cartItems,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to place order. Please try again.");
      }

      const placedOrder = await response.json();
      setActiveOrder(placedOrder);
      clearCart();
      
      // Celebrate!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#d4af37", "#f3e5ab", "#4b382a", "#8b5a2b"],
      });

      return true;
    } catch (err) {
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
