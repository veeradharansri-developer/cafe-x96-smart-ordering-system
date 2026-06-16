# Manual Setup & Fix Guide — Cafe x96

> This guide documents all items that require manual configuration by the user (developer/admin) and cannot be automated.

---

## 1. Anthropic Claude API Key (Required for AI Chatbot)

The AI Chatbot "Bean" needs a valid Anthropic API key to use Claude AI.
**Without it, the chatbot works in offline mode with pre-programmed responses — which is perfectly functional.**

### Steps to Configure:

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### For Local Development:
5. Create a file named `.env` inside the `backend/` folder:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
6. Restart the backend server (`npm run dev`)

### For Render.com Deployment:
5. Go to your Render service → **Environment** tab
6. Add variable: `ANTHROPIC_API_KEY` = `sk-ant-your-key-here`
7. Redeploy

---

## 2. Staff PIN (Default: 1234)

The Admin Dashboard and Kitchen Display are protected by a PIN login.

**Default PIN**: `1234`

### To Change the PIN:
1. Open `frontend/src/App.jsx`
2. Find line 16: `if (pin === "1234") {`
3. Replace `"1234"` with your desired PIN
4. Rebuild (`npm run build --prefix frontend`)

> ⚠️ **Security Note**: This is a simple client-side PIN check suitable for internal/demo use. For production, implement proper server-side authentication with JWT tokens.

---

## 3. Number of Tables (Default: 10)

The system currently supports 10 tables (Table 1–10).

### To Change the Number of Tables:
1. Open `frontend/src/pages/AdminDashboard.jsx`
2. Find line 549: `Array.from({ length: 10 })`
3. Change `10` to your desired number of tables

---

## 4. Database Persistence (Currently In-Memory)

**Current behavior**: All orders and menu changes are stored in memory on the backend server. When the server restarts, data resets to the pre-seeded defaults.

### To Add Database Persistence:

**Option A: MongoDB (Recommended)**
1. Install: `npm install mongoose --prefix backend`
2. Create a MongoDB Atlas cluster at [https://cloud.mongodb.com](https://cloud.mongodb.com)
3. Add `MONGODB_URI` to your `.env` file
4. Replace the in-memory arrays (`orders[]`, `currentMenu[]`) in `backend/index.js` with Mongoose models

**Option B: SQLite (Simpler)**
1. Install: `npm install better-sqlite3 --prefix backend`
2. Create a local `.db` file
3. Replace in-memory arrays with SQLite queries

---

## 5. CORS Configuration (Currently Open)

**Current behavior**: CORS is set to `origin: "*"` which allows any client to connect.

### To Restrict for Production:
1. Open `backend/index.js`
2. Find line 21: `origin: "*"`
3. Replace with your domain:
   ```js
   origin: "https://your-cafe-domain.com"
   ```
4. Also update the Socket.IO CORS at line 30

---

## 6. QR Code Table URLs

The QR codes generated in the Admin Dashboard point to:
```
{current-origin}/?table={tableNumber}
```

### For Production:
- The QR codes will automatically use whatever domain the admin dashboard is running on
- If using a custom domain, ensure your DNS and SSL are configured before printing QR codes
- You can print QR codes by clicking "QR Code" on any table in the Admin Dashboard and using the "Download QR Image" button

---

## 7. Menu Images (Unsplash URLs)

All menu item images currently use Unsplash URLs. These are:
- ✅ Free to use (Unsplash license)
- ⚠️ Dependent on internet connectivity
- ⚠️ If an image fails to load, the item's emoji is shown as fallback

### To Use Custom Images:
1. Upload your food photos to a CDN (e.g., Cloudinary, S3)
2. Use the Menu Editor in the Admin Dashboard to update image URLs
3. Or edit `backend/data/menuData.js` directly for permanent changes

---

## 8. Deployment Checklist

Before going live, ensure you:

- [ ] Set a strong staff PIN (not "1234")
- [ ] Configure CORS to your specific domain
- [ ] Set `ANTHROPIC_API_KEY` in environment variables (or accept offline mode)
- [ ] Consider adding a database for order persistence
- [ ] Test QR codes print correctly with your production URL
- [ ] Verify all menu images load properly
- [ ] Run `npm run build --prefix frontend` to create production bundle
- [ ] Test the full order flow: scan QR → browse → add to cart → checkout → admin sees order → kitchen prepares → mark served

---

## 9. Troubleshooting Common Issues

### "Backend not found" or orders going to offline mode
- **Cause**: The Vite dev server can't reach the Express backend on port 5000
- **Fix**: Make sure you run `npm run dev` from the root (not from frontend/ or backend/ separately)

### Socket.IO connection errors in console
- **Cause**: Backend restarting causes brief disconnection
- **Fix**: This is normal during development. The client auto-reconnects within 2 seconds.

### Menu items not showing after admin edits
- **Cause**: Frontend may be using cached local menu data
- **Fix**: Refresh the customer page. Socket.IO should push live updates, but if the socket disconnects temporarily, a refresh resolves it.

### ESLint warnings about unused variables
- **Fix**: Run `npm run lint --prefix frontend` — should show 0 errors. Warnings are informational only.
