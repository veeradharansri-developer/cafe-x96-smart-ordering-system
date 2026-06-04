/**
 * localOrderStore.js
 * Shared in-browser order store — used when the backend is unreachable (e.g. on Vercel).
 * Works across Customer / Admin / Kitchen views via CustomEvents + localStorage.
 */

const KEY = "cafe_x96_local_orders";

// ── Read ────────────────────────────────────────────────────────────────────

export function getLocalOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Write ───────────────────────────────────────────────────────────────────

function _persist(orders) {
  localStorage.setItem(KEY, JSON.stringify(orders));
  // Dispatch event so same-tab listeners (Admin/Kitchen) update immediately
  window.dispatchEvent(new CustomEvent("localOrdersUpdated", { detail: orders }));
  // Also fire storage event polyfill for cross-tab (browsers only fire for OTHER tabs)
  try {
    window.dispatchEvent(new StorageEvent("storage", {
      key: KEY,
      newValue: JSON.stringify(orders),
      storageArea: localStorage,
    }));
  } catch (_) { /* ignore */ }
}

export function saveLocalOrder(order) {
  const orders = getLocalOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.unshift(order); // newest first
  }
  _persist(orders);
}

export function updateLocalOrderStatus(orderId, newStatus) {
  const orders = getLocalOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return;
  orders[idx] = { ...orders[idx], status: newStatus };
  _persist(orders);
  return orders[idx];
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function calcLocalAnalytics(orders) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.timestamp).toDateString() === today
  );
  const revenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const itemCounts = {};
  todayOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeTables = [
    ...new Set(
      orders
        .filter((o) => o.status !== "Served")
        .map((o) => o.tableNumber)
    ),
  ];

  return {
    totalOrdersToday: todayOrders.length,
    revenueToday: Number(revenue.toFixed(2)),
    pendingOrdersCount: orders.filter(
      (o) => o.status === "Pending" || o.status === "Preparing"
    ).length,
    activeTablesCount: activeTables.length,
    activeTablesList: activeTables,
    popularItems,
  };
}
