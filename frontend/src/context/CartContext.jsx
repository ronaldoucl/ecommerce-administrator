import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { parsePrice } from '../utils/format';

// The shopping cart. There is no cart API, so it lives entirely in the browser:
// this context shares it across pages, and we copy it to localStorage so it
// survives a reload.
//
// An item looks like:
//   { productId, variantId, label, name, image, unitPrice, quantity }
// A line is identified by product + variant together, and variantId can be null
// for a product with no variants. unitPrice is only used for the subtotal we
// show — the backend works out the real prices at checkout.
const CartContext = createContext(null);

const CART_STORAGE_KEY = 'cart';

// Same product AND same variant means it is the same line.
function isSameLine(a, b) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

// Reads the saved cart, shrugging off anything corrupt or missing.
function readStoredCart() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private mode or quota full. Not worth crashing over — the cart still
      // works for this session, it just will not survive a reload.
    }
  }, [items]);

  // Adds to the existing line if the same product+variant is already there.
  const addItem = useCallback((item, quantity = 1) => {
    const qty = Math.max(1, Math.trunc(Number(quantity) || 1));

    setItems((prev) => {
      const existing = prev.find((line) => isSameLine(line, item));
      if (existing) {
        return prev.map((line) =>
          isSameLine(line, item) ? { ...line, quantity: line.quantity + qty } : line,
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((productId, variantId) => {
    setItems((prev) =>
      prev.filter((line) => !isSameLine(line, { productId, variantId })),
    );
  }, []);

  // Setting the quantity to 0 (or less) removes the line.
  const updateQuantity = useCallback((productId, variantId, quantity) => {
    const qty = Math.trunc(Number(quantity) || 0);

    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter((line) => !isSameLine(line, { productId, variantId }));
      }
      return prev.map((line) =>
        isSameLine(line, { productId, variantId }) ? { ...line, quantity: qty } : line,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, line) => {
        const unitPrice = parsePrice(line.unitPrice);
        // Skip a bad price instead of adding it, or one broken line would turn
        // the whole subtotal into NaN on screen.
        return Number.isFinite(unitPrice) ? sum + unitPrice * line.quantity : sum;
      }, 0),
    [items],
  );
  const itemCount = useMemo(
    () => items.reduce((count, line) => count + line.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      subtotal,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, subtotal, itemCount, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

export { CartContext, CartProvider, useCart };
