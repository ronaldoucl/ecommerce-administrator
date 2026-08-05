import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ToastProvider } from './components/Toast/ToastProvider.jsx';
import { ConfirmProvider } from './components/ConfirmModal/ConfirmProvider.jsx';

// ToastProvider and ConfirmProvider are mounted once here, so every screen can
// raise a toast (useToast) or ask for confirmation (useConfirm) without
// rendering its own overlay.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SettingsProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
