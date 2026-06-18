import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { menuData } from "./data/menuData.js";
import { askClaude } from "./services/aiService.js";
import { authMiddleware, requireAdmin } from "./middleware/auth.js";

dotenv.config();

let currentMenu = menuData.map(item => ({ ...item, isOutOfStock: false }));

const app = express();
const PORT = process.env.PORT || 5000;

// Setup CORS
app.use(cors({
  origin: "*", // Allow any client to connect for easy development testing
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));
app.use(express.json());
app.use(authMiddleware);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
  }
});

// Pre-seeded database for orders (in-memory)
let orders = [];

// Active help requests tracker
let activeHelpRequests = {};

// Helper to calculate analytics stats
function getAnalytics() {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === today);
  
  const revenue = todayOrders.reduce((acc, curr) => acc + curr.total, 0);
  
  // Count items sold today
  const itemCounts = {};
  todayOrders.forEach(order => {
    order.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  
  // Sort and get top items
  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeTables = [...new Set(orders.filter(o => o.status !== "Served").map(o => o.tableNumber))];

  return {
    totalOrdersToday: todayOrders.length,
    revenueToday: Number(revenue.toFixed(2)),
    pendingOrdersCount: orders.filter(o => o.status === "Pending" || o.status === "Preparing").length,
    activeTablesCount: activeTables.length,
    activeTablesList: activeTables,
    popularItems
  };
}

// REST Routes

// Get Menu
app.get("/api/menu", (req, res) => {
  res.json(currentMenu);
});

// Add new menu item
app.post("/api/menu", (req, res) => {
  const { name, category, price, description, image, isVeg, isPopular } = req.body;
  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: "Name, category, and price are required." });
  }

  let prefix = "x";
  if (category === "Noodles") prefix = "n";
  else if (category === "Rice") prefix = "r";
  else if (category === "Manchurian & Starters") prefix = "m";
  else if (category === "Egg Specials") prefix = "e";
  else if (category === "Biryani") prefix = "b";
  else if (category === "Hot Beverages") prefix = "hb";
  else if (category === "Cool Drinks") prefix = "cd";
  else if (category === "Water Bottles") prefix = "w";
  
  const categoryIds = currentMenu
    .filter(item => item.id.startsWith(prefix))
    .map(item => {
      const num = parseInt(item.id.substring(prefix.length), 10);
      return isNaN(num) ? 0 : num;
    });
  const maxId = categoryIds.length > 0 ? Math.max(...categoryIds) : 0;
  const newId = `${prefix}${maxId + 1}`;

  let finalImage = image;
  if (!image || !image.trim()) {
    if (category === "Noodles") finalImage = "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80";
    else if (category === "Rice") finalImage = "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80";
    else if (category === "Manchurian & Starters") finalImage = "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80";
    else if (category === "Egg Specials") finalImage = "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80";
    else if (category === "Biryani") finalImage = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80";
    else if (category === "Hot Beverages") finalImage = "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80";
    else if (category === "Cool Drinks") finalImage = "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=600&q=80";
    else if (category === "Water Bottles") finalImage = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80";
    else finalImage = "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80";
  }

  const newItem = {
    id: newId,
    name,
    category,
    emoji: req.body.emoji || "🍽️",
    price: Number(price),
    fullPrice: req.body.fullPrice !== undefined ? Number(req.body.fullPrice) : null,
    hasVariants: req.body.hasVariants !== undefined ? !!req.body.hasVariants : false,
    rating: 5.0,
    reviews: 0,
    isVeg: isVeg === undefined ? true : !!isVeg,
    isPopular: !!isPopular,
    isOutOfStock: req.body.isOutOfStock === undefined ? false : !!req.body.isOutOfStock,
    description: description || "",
    image: finalImage
  };

  currentMenu.push(newItem);

  // Broadcast WebSocket update
  io.emit("menu_updated", currentMenu);

  res.status(201).json(newItem);
});

// Edit existing menu item
app.put("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, price, description, image, isVeg, isPopular } = req.body;

  const itemIndex = currentMenu.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ error: "Menu item not found." });
  }

  const updatedItem = {
    ...currentMenu[itemIndex],
    name: name !== undefined ? name : currentMenu[itemIndex].name,
    category: category !== undefined ? category : currentMenu[itemIndex].category,
    emoji: req.body.emoji !== undefined ? req.body.emoji : currentMenu[itemIndex].emoji,
    price: price !== undefined ? Number(price) : currentMenu[itemIndex].price,
    fullPrice: req.body.fullPrice !== undefined ? Number(req.body.fullPrice) : currentMenu[itemIndex].fullPrice,
    hasVariants: req.body.hasVariants !== undefined ? !!req.body.hasVariants : currentMenu[itemIndex].hasVariants,
    description: description !== undefined ? description : currentMenu[itemIndex].description,
    image: image !== undefined ? image : currentMenu[itemIndex].image,
    isVeg: isVeg !== undefined ? !!isVeg : currentMenu[itemIndex].isVeg,
    isPopular: isPopular !== undefined ? !!isPopular : currentMenu[itemIndex].isPopular,
    isOutOfStock: req.body.isOutOfStock !== undefined ? !!req.body.isOutOfStock : currentMenu[itemIndex].isOutOfStock
  };

  currentMenu[itemIndex] = updatedItem;

  // Broadcast WebSocket update
  io.emit("menu_updated", currentMenu);

  res.json(updatedItem);
});

// Delete menu item
app.delete("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  const itemIndex = currentMenu.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: "Menu item not found." });
  }

  const deletedItem = currentMenu[itemIndex];
  currentMenu = currentMenu.filter(item => item.id !== id);

  // Broadcast WebSocket update
  io.emit("menu_updated", currentMenu);

  res.json({ message: `Successfully deleted item ${deletedItem.name}`, deletedItem });
});

// Get all orders
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// Place new order
app.post("/api/orders", (req, res) => {
  const { tableNumber, customerName, items, notes } = req.body;
  
  if (!tableNumber || !customerName || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing required order fields" });
  }

  // Defensive validation: Check if any item in the order is currently out of stock
  for (const orderedItem of items) {
    const matchedItem = currentMenu.find(m => m.id === orderedItem.id);
    if (matchedItem && matchedItem.isOutOfStock) {
      return res.status(400).json({ error: `Ordering failed: "${orderedItem.name}" is currently out of stock!` });
    }
  }

  // Generate clean sequential order id
  const orderId = `ord-${orders.length + 101}`;
  
  // Calculate total
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const newOrder = {
    id: orderId,
    tableNumber: String(tableNumber),
    customerName,
    items,
    notes: notes || "",
    timestamp: new Date().toISOString(),
    total: Number(total.toFixed(2)),
    status: "Pending"
  };

  orders.push(newOrder);

  // Emit event to admins
  io.to("admins").emit("new_order", {
    order: newOrder,
    analytics: getAnalytics()
  });

  // Emit event to specific table room
  io.to(`table:${tableNumber}`).emit("order_placed", newOrder);

  res.status(201).json(newOrder);
});

// Update order status
app.patch("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Pending", "Preparing", "Ready", "Served"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  orders[orderIndex].status = status;
  const updatedOrder = orders[orderIndex];

  // Notify the customer table about the change
  io.to(`table:${updatedOrder.tableNumber}`).emit("order_status_updated", updatedOrder);

  // Notify admins
  io.to("admins").emit("order_updated", {
    order: updatedOrder,
    analytics: getAnalytics()
  });

  res.json(updatedOrder);
});

// Call for assistance
app.post("/api/help", (req, res) => {
  const { tableNumber } = req.body;
  if (!tableNumber) {
    return res.status(400).json({ error: "Table number is required" });
  }

  const tableStr = String(tableNumber);
  activeHelpRequests[tableStr] = new Date().toISOString();

  // Broadcast to admins
  io.to("admins").emit("help_requested", {
    tableNumber: tableStr,
    timestamp: activeHelpRequests[tableStr],
    activeHelpRequests
  });

  res.json({ message: "Help requested successfully", activeHelpRequests });
});

// Resolve assistance request
app.post("/api/help/resolve", (req, res) => {
  const { tableNumber } = req.body;
  const tableStr = String(tableNumber);
  
  if (activeHelpRequests[tableStr]) {
    delete activeHelpRequests[tableStr];
  }

  io.to("admins").emit("help_resolved", {
    tableNumber: tableStr,
    activeHelpRequests
  });

  res.json({ message: "Help request resolved", activeHelpRequests });
});

// Claude Chat Assistant Route
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages history array is required" });
  }

  try {
    const aiResponse = await askClaude(messages, currentMenu);
    res.json({ response: aiResponse });
  } catch (error) {
    res.status(500).json({ error: "Error processing chat query" });
  }
});

// Get current state for admin initialization
app.get("/api/admin/init", (req, res) => {
  res.json({
    orders,
    activeHelpRequests,
    analytics: getAnalytics()
  });
});

// Socket.IO Connection Setup
io.on("connection", (socket) => {
  // Join a room (admin or table-specific)
  socket.on("join", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Client request for help
  socket.on("request_help", (tableNumber) => {
    const tableStr = String(tableNumber);
    activeHelpRequests[tableStr] = new Date().toISOString();
    io.to("admins").emit("help_requested", {
      tableNumber: tableStr,
      timestamp: activeHelpRequests[tableStr],
      activeHelpRequests
    });
  });

  // Admin resolves help request
  socket.on("resolve_help", (tableNumber) => {
    const tableStr = String(tableNumber);
    if (activeHelpRequests[tableStr]) {
      delete activeHelpRequests[tableStr];
    }
    io.to("admins").emit("help_resolved", {
      tableNumber: tableStr,
      activeHelpRequests
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Serve static assets from the frontend build folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendDistPath));

// Catch-all route to serve React SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Cafe x96 Server running at http://localhost:${PORT}`);
});
