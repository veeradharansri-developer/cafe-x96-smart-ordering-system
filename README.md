# Cafe x96 Smart Ordering System ☕✨

Cafe x96 is a premium digital smart ordering system. Customers scan unique table QR codes to browse the menu on mobile, chat with an AI assistant (powered by Claude AI) for drink recommendations, and place orders. Orders flow instantly in real-time to the Receptionist Admin Dashboard and the Kitchen Display.

---

## 🚀 Getting Started

### 1. Configure the AI API Key
Rename or edit the `.env` file in the `backend/` folder:
```env
PORT=5000
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
```
> **Note:** If the key is not set or left as placeholder, the system automatically falls back to an **Intelligent Local Cafe Barista persona** matching Claude's behavior, ensuring the chatbot remains fully functional offline!

### 2. Run the Application
From the root workspace directory, run:
```bash
npm run dev
```
This runs both the React client dev server (`http://localhost:5173`) and the Express Node server (`http://localhost:5000`) concurrently.

---

## 📱 How to Test and Verify

Open multiple browser windows side-by-side to test the real-time websocket flows:

1. **Customer Mobile Menu**:
   - Open `http://localhost:5173/menu?table=4`
   - Notice the system auto-detects **Table 4** and hides the search query parameter.
   - You can browse products, search, filter, and add items to the cart.
   - Click **Call Assistance** (bell icon) in the header. Notice the staff notification badge instantly starts pulsing on the Admin Dashboard!

2. **Receptionist Admin Dashboard**:
   - Open `http://localhost:5173` and click the **Reception Admin** button in the floating bottom dock (or go to `http://localhost:5173/?view=admin`).
   - Here you'll see today's revenue counters, active tables, and live order status columns.
   - Click the **QR Code** button on any table. You can open a new table page or download the SVG QR code!

3. **Kitchen Screen**:
   - Open `http://localhost:5173` and click the **Kitchen Screen** button in the dock (or go to `http://localhost:5173/?view=kitchen`).
   - Chefs see items categorized by Pending or Preparing, with checkboxes to cross off prepped ingredients.

4. **Real-time Order Workflow**:
   - Add items to your cart on the customer menu and checkout by entering your name and prep instructions.
   - **Sound Alert & Confetti**: Upon checkout, confetti explodes on the customer view, and the Admin Dashboard/Kitchen Screen plays a sweet double-chime notification chime!
   - Shift the order status on the Admin Dashboard or Kitchen Screen (e.g. from `Pending` -> `Preparing` -> `Ready`).
   - Observe the Customer's **Active Order Stepper Timeline** updating instantly in real-time using Socket.IO without any manual page reload!

5. **AI Barista (Bean)**:
   - Click the gold chat button on the customer menu.
   - Chat with Bean! Try questions like:
     - *"What is your best coffee combo?"*
     - *"Do you have any vegetarian options?"*
     - *"Suggest a snack to go with cardamon tea."*
     - *"Is the paneer slider spicy?"*

---

## 📡 REST API & Socket.IO Reference

### REST Endpoints
* `GET /api/menu` - Fetch menu lists
* `GET /api/orders` - Fetch all orders
* `POST /api/orders` - Place new order (triggers websocket broadcasts)
* `PATCH /api/orders/:id/status` - Move order status step (triggers status broadcast)
* `POST /api/help` - Fire table call trigger
* `POST /api/help/resolve` - Dismiss table call trigger
* `POST /api/chat` - Talk to Claude AI Barista proxy

### WebSockets Event Map
* `new_order` - Emitted to `admins` when a checkout arrives (contains updated stats).
* `order_status_updated` - Emitted to `table:X` room when order shifts.
* `help_requested` - Emitted to `admins` when table rings bell.
* `help_resolved` - Emitted to `admins` when help is dismissed.
