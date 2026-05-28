// Dynamically determines backend URL.
// In Option 1 (Render/Railway full-stack), we leave VITE_BACKEND_URL empty, defaulting to window.location.origin.
// In Option 2 (Vercel Frontend), set VITE_BACKEND_URL environment variable to your Render/Railway backend URL.

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
export const API_BASE = import.meta.env.VITE_BACKEND_URL || "";
