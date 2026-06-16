# Cafe x96 — System Design Document

> **Version**: 1.0  
> **Last Updated**: June 2026  
> **Stack**: React 19 + Vite 8 (Frontend) · Express 4 + Socket.IO 4 (Backend) · Claude AI (Chatbot)

---

## 1. Overview
(DESIGN.md)
Cafe x96 is a **full-stack smart ordering system** designed for a real cafe environment. Customers scan a QR code at their table, browse a beautiful mobile menu, and place orders — all without waiting for a waiter. Staff see orders in real-time on a dashboard, and the kitchen gets a live preparation queue.

### Key Features

| Feature | Description |
|---|---|
| **QR Code Table Sessions** | Each table has a unique QR code. Scanning it opens the menu pre-linked to that table number. |
| **Live Menu Browsing** | Customers browse an animated, categorised menu with search, variant selection (Single/Full), and cart management. |
| **AI Chatbot (Bean)** | A Claude-powered (or fallback) chatbot helps customers with recommendations, dietary info, and menu questions. |
| **Real-Time Order Tracking** | After placing an order, customers see a 4-step progress tracker (Pending → Preparing → Ready → Served). |
| **Admin Dashboard** | Staff see live analytics, order management (Kanban-style columns), table assistance alerts, QR code generator, and a full menu editor. |
| **Kitchen Display** | Chefs see a priority queue of active orders with elapsed timers, urgency color-coding, and item checklists. |
| **Call Assistance** | Customers can ring a bell to request staff help. The alert appears with sound on the admin dashboard. |

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                    │
│                                                        │
│  ┌──────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Menu     │  │  Admin         │  │  Kitchen       │ │
│  │  Page     │  │  Dashboard     │  │  Display       │ │
│  └────┬─────┘  └───────┬────────┘  └───────┬────────┘ │
│       │                │                    │          │
│       └────────┬───────┴────────────┬───────┘          │
│                │                    │                   │
│     REST API (fetch)        WebSocket (Socket.IO)      │
│                │                    │                   │
│         ┌──────┴────────────┬───────┘                  │
│         │   localStorage    │   (fallback persistence) │
│         │   localOrderStore │                           │
│         └───────────────────┘                           │
└───────────────────────┬────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │     EXPRESS SERVER     │
            │     (Port 5000)        │
            │                        │
            │  ┌──────────────────┐  │
            │  │  REST API Routes │  │
            │  │  /api/menu       │  │
            │  │  /api/orders     │  │
            │  │  /api/chat       │  │
            │  │  /api/help       │  │
            │  │  /api/admin/init │  │
            │  └──────────────────┘  │
            │                        │
            │  ┌──────────────────┐  │
            │  │  Socket.IO       │  │
            │  │  Rooms: admins,  │  │
            │  │  table:1..10     │  │
            │  └──────────────────┘  │
            │                        │
            │  ┌──────────────────┐  │
            │  │  Claude AI       │  │
            │  │  (Anthropic SDK) │  │
            │  └──────────────────┘  │
            │                        │
            │  In-Memory Data Store  │
            │  (orders[], menuData)  │
            └────────────────────────┘
```

---

## 3. Data Model

### 3.1 Menu Item Schema

```js
{
  id: "n1",                    // Category prefix + number (n=Noodles, r=Rice, etc.)
  name: "Veg Noodles",
  category: "Noodles",         // One of: Noodles, Rice, Manchurian & Starters,
                               //         Egg Specials, Biryani, Hot Beverages,
                               //         Cool Drinks, Water Bottles
  emoji: "🍜",
  price: 60,                   // Single / default price in INR
  fullPrice: 100,              // Full variant price (null if no variants)
  hasVariants: true,           // If true, shows Single/Full toggle on MenuCard
  rating: 4.5,
  reviews: 88,
  isVeg: true,
  isPopular: false,
  isOutOfStock: false,
  description: "...",
  image: "https://..."
}
```

### 3.2 Order Schema

```js
{
  id: "ord-101",               // Sequential: ord-{orders.length + 101}
  tableNumber: "3",
  customerName: "Jane Doe",
  items: [
    { id: "b1", name: "Chicken Biryani", price: 130.00, quantity: 1 }
  ],
  notes: "No onions please",
  timestamp: "2026-06-09T...",
  total: 130.00,
  status: "Pending"            // Pending → Preparing → Ready → Served
}
```

### 3.3 ID Prefix System

| Category | Prefix | Example |
|---|---|---|
| Noodles | `n` | n1, n2, n3 |
| Rice | `r` | r1, r2 |
| Manchurian & Starters | `m` | m1, m2 |
| Egg Specials | `e` | e1, e2 |
| Biryani | `b` | b1 |
| Hot Beverages | `hb` | hb1, hb2 |
| Cool Drinks | `cd` | cd1, cd2 |
| Water Bottles | `w` | w1, w2 |

---

## 4. Frontend Architecture

### 4.1 Component Tree

```
main.jsx
├── SocketProvider          (WebSocket connection manager)
├── CartProvider            (Cart state + order submission)
├── ThemeProvider           (Dark/light mode toggle)
└── BrowserRouter
    └── App.jsx
        ├── Route "/" → MenuPage
        │   ├── Toast               (notification system)
        │   ├── CategoryTabs        (horizontal scrolling category filter)
        │   ├── MenuCard[]          (item cards with variant support)
        │   ├── CartDrawer          (slide-up cart + order tracking)
        │   └── AIChatbot           (floating chat widget)
        │
        ├── Route "/admin" → StaffLayout → AdminDashboard
        │   ├── Analytics Cards     (revenue, orders, tables)
        │   ├── Kanban Order Board  (4-column: Pending→Preparing→Ready→Served)
        │   ├── Table Assistance    (10-table grid with help alerts)
        │   ├── QR Code Generator   (modal with download)
        │   ├── Menu Editor         (CRUD grid with stock toggle)
        │   └── Popular Items Chart (horizontal bar chart)
        │
        └── Route "/kitchen" → StaffLayout → KitchenDisplay
            ├── Preparation Queue   (cards with elapsed timers)
            └── Item Checklists     (checkbox per item)
```

### 4.2 State Management

| Context | Purpose | Persistence |
|---|---|---|
| **CartContext** | Cart items, active order, table ID, checkout flow | `localStorage` (cart), `sessionStorage` (tableId) |
| **SocketContext** | Socket.IO connection, `isConnected` flag | In-memory only |
| **ThemeContext** | Dark/light mode toggle | `localStorage` |

### 4.3 Cart Item Keys (Variant Handling)

For items with variants (e.g., Veg Noodles), the cart key is composite:
- `n1_single` → Veg Noodles (Single, ₹60)
- `n1_full` → Veg Noodles (Full, ₹100)

For items without variants (e.g., Chai), the key is just `hb1`.

This prevents "Single" and "Full" from merging into one cart line.

---

## 5. Backend Architecture

### 5.1 REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/menu` | Returns the full live menu array |
| `POST` | `/api/menu` | Add a new menu item (auto-generates ID) |
| `PUT` | `/api/menu/:id` | Edit an existing menu item |
| `DELETE` | `/api/menu/:id` | Delete a menu item |
| `GET` | `/api/orders` | Returns all orders |
| `POST` | `/api/orders` | Place a new order (validates out-of-stock) |
| `PATCH` | `/api/orders/:id/status` | Update order status (Pending→Preparing→Ready→Served) |
| `POST` | `/api/help` | Customer requests table assistance |
| `POST` | `/api/help/resolve` | Staff resolves assistance request |
| `POST` | `/api/chat` | Send message history to Claude AI for response |
| `GET` | `/api/admin/init` | Returns orders + helpRequests + analytics for dashboard init |

### 5.2 Socket.IO Events

| Event | Direction | Room | Payload |
|---|---|---|---|
| `join` | Client → Server | — | Room name (e.g., `"admins"`, `"table:3"`) |
| `new_order` | Server → `admins` | admins | `{ order, analytics }` |
| `order_placed` | Server → `table:X` | table:X | Order object |
| `order_status_updated` | Server → `table:X` | table:X | Updated order object |
| `order_updated` | Server → `admins` | admins | `{ order, analytics }` |
| `menu_updated` | Server → all | broadcast | Full menu array |
| `request_help` | Client → Server | — | Table number string |
| `help_requested` | Server → `admins` | admins | `{ tableNumber, timestamp, activeHelpRequests }` |
| `resolve_help` | Client → Server | — | Table number string |
| `help_resolved` | Server → `admins` | admins | `{ tableNumber, activeHelpRequests }` |

### 5.3 AI Service (Bean Chatbot)

- **With API Key**: Messages are sent to Anthropic's Claude 3.5 Sonnet with a system prompt containing the full live menu. Claude only recommends in-stock items.
- **Without API Key**: A local fallback function pattern-matches keywords (coffee, tea, spicy, veg, etc.) and returns hardcoded responses with real menu items and prices.
- **On API Error**: Falls back to local responses with an `*(offline mode)` note.

---

## 6. Offline / Fallback Design

The system is designed to work even when the backend is unreachable (e.g., deployed frontend-only on Vercel):

| Component | Fallback Strategy |
|---|---|
| **Menu Data** | Frontend bundles a local copy of `menuData.js`. If the API `/api/menu` call fails, the local data is used. |
| **Order Placement** | If `POST /api/orders` fails, a local order is created with `ord-local-{timestamp}` ID and stored in `localStorage`. |
| **Order Status Updates** | If `PATCH /api/orders/:id/status` fails, the status is persisted via `localOrderStore.js` using `localStorage` + `CustomEvent`. |
| **Cross-View Sync** | `localOrderStore.js` dispatches `localOrdersUpdated` custom events for same-tab sync and `StorageEvent` for cross-tab sync. Admin and Kitchen views listen for these. |
| **AI Chat** | Falls back to pattern-matching local responses. |

---

## 7. Styling & Design System

| Token | Value | Usage |
|---|---|---|
| `--color-gold` | `#d4af37` | Primary accent, buttons, highlights |
| `--color-gold-light` | `#f3e5ab` | Hover states, text gradients |
| `--color-gold-dark` | `#aa7c11` | Active states, pressed buttons |
| `--color-coffee` | `#4b382a` | Background accents |
| `--color-coffee-dark` | `#2c1d11` | Primary dark background |
| `--color-cream` | `#fdfaf6` | Primary text color |
| `--font-sans` | Inter | Body text |
| `--font-display` | Outfit | Headings, UI labels |

### Animations

- `pulse-gold-btn`: Pulsing glow effect on the chatbot FAB
- `float-animation`: Gentle floating for decorative elements
- `slide-up`: Entry animation for cards
- `scale-pop`: Pop effect when cart updates
- `glow-pulse`: Active cart button glow
- `skeleton-shimmer`: Loading skeleton shimmer

### Glassmorphism

The `.glass-panel` class provides translucent cards with blur:
```css
background: rgba(20, 16, 14, 0.7);
backdrop-filter: blur(16px) saturate(120%);
border: 1px solid rgba(212, 175, 55, 0.15);
```

---

## 8. Deployment Options

### Option 1: Full-Stack on Render/Railway (Recommended)

1. Push code to GitHub
2. Connect to Render.com
3. The `render.yaml` is already configured:
   - Build: `npm run install-all && npm run build --prefix frontend`
   - Start: `npm start` (serves Express + built React SPA)
4. Set `ANTHROPIC_API_KEY` environment variable for Claude AI

### Option 2: Split Deploy (Vercel Frontend + Render Backend)

1. Deploy frontend to Vercel
2. Deploy backend to Render
3. Set `VITE_BACKEND_URL` env var on Vercel to point to the Render backend URL
4. The frontend's `config.js` will use this for API and Socket.IO connections

### Option 3: Local Development

```bash
npm run dev    # Starts both frontend (5173) and backend (5000) with concurrently
```

The Vite dev server proxies `/api/*` and `/socket.io/*` to `localhost:5000` automatically.

---

## 9. Security Considerations

| Area | Current State | Production Recommendation |
|---|---|---|
| **Auth** | PIN-based staff login (`1234`) stored in `sessionStorage` | Implement JWT with bcrypt password hashing |
| **CORS** | `origin: "*"` | Restrict to specific domains |
| **API Protection** | `authMiddleware` reads `x-user-role` header | Implement proper token-based auth |
| **Data Storage** | In-memory arrays | Use MongoDB/PostgreSQL for persistence |
| **Input Validation** | Basic checks for required fields | Add express-validator or Zod schemas |

---

## 10. File Structure

```
CAFE X 96/
├── package.json             # Root workspace with concurrently
├── render.yaml              # Render.com deployment config
├── .gitignore
│
├── backend/
│   ├── package.json         # Express, Socket.IO, Anthropic SDK
│   ├── index.js             # Main server: REST routes + Socket.IO + static serving
│   ├── data/
│   │   └── menuData.js      # Source of truth: 50+ items across 8 categories
│   ├── services/
│   │   └── aiService.js     # Claude API + fallback responses
│   └── middleware/
│       └── auth.js          # Role-based auth middleware
│
└── frontend/
    ├── package.json         # React 19, Vite 8, TailwindCSS 4
    ├── vite.config.js       # Dev proxy config
    ├── index.html           # SPA entry point with SEO meta
    └── src/
        ├── main.jsx         # App bootstrap with providers
        ├── App.jsx          # Route definitions + StaffLogin + StaffLayout
        ├── index.css        # Design system: tokens, animations, glassmorphism
        ├── App.css          # Vite scaffold styles (unused)
        ├── context/
        │   ├── CartContext.jsx     # Cart + order + checkout logic
        │   ├── SocketContext.jsx   # Socket.IO connection
        │   └── ThemeContext.jsx    # Dark/light mode
        ├── components/
        │   ├── AIChatbot.jsx      # Floating chat widget
        │   └── menu/
        │       ├── MenuCard.jsx   # Item card with variant support
        │       ├── CartDrawer.jsx # Cart + order tracking drawer
        │       ├── CategoryTabs.jsx # Category filter pills
        │       └── Toast.jsx      # Notification toasts
        ├── pages/
        │   ├── MenuPage.jsx       # Customer menu view
        │   ├── AdminDashboard.jsx # Staff dashboard (orders + menu editor)
        │   └── KitchenDisplay.jsx # Kitchen preparation queue
        ├── data/
        │   └── menuData.js        # Frontend-bundled menu copy (offline fallback)
        └── utils/
            ├── config.js          # Backend URL configuration
            ├── localOrderStore.js # localStorage-based order persistence
            └── sound.js           # Web Audio API notification sounds
```
