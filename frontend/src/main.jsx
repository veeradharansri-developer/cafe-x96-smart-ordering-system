import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'
import { CartProvider } from './context/CartContext'

createRoot(document.getElementById('root')).render(
  <SocketProvider>
    <CartProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </CartProvider>
  </SocketProvider>
)

