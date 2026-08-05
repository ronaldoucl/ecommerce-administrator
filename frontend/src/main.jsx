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

// Toast and Confirm go here once, at the top, so any page can call useToast() or
// useConfirm() without rendering its own overlay.
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
