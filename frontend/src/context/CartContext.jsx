import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * CartContext — the client-side shopping cart for the storefront.
 *
 * The MVP has no cart API: the cart lives entirely on the client. It is shared
 * across the app through this context (so it survives navigation) and is also
 * mirrored to localStorage under "cart" so it survives a page reload.
 *
 * A cart item is:
 *   { productId, variantId, label, name, image, unitPrice, quantity }
 * where `unitPrice` is a number (the variant price when set, otherwise the
 * product base price) used only for client-side display and the subtotal.
 * A line is identified by its product + variant pair; `variantId` may be null
 * for a product without variants.
 */
const CartContext = createContext(null);

/** localStorage key under which the cart is persisted. */
const CART_STORAGE_KEY = 'cart';

/** Two items are the same cart line when both product and variant match. */
function isSameLine(a, b) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

/** Read the persisted cart, tolerating missing/corrupt data or no localStorage. */
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

  // Mirror the cart to localStorage on every change so it survives reloads.
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore write failures (e.g. private mode / quota) — the in-memory cart
      // still works for the session.
    }
  }, [items]);

  /**
   * Add a product/variant to the cart. If the same line already exists its
   * quantity is increased; otherwise a new line is appended.
   *
   * @param {{ productId: number, variantId: number|null, label: string|null,
   *   name: string, image: string|null, unitPrice: number }} item
   * @param {number} [quantity=1] - units to add (coerced to a positive integer)
   */
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

  /** Remove a line entirely. */
  const removeItem = useCallback((productId, variantId) => {
    setItems((prev) =>
      prev.filter((line) => !isSameLine(line, { productId, variantId })),
    );
  }, []);

  /**
   * Set the quantity of a line. A quantity of 0 or less removes the line.
   */
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

  /** Empty the cart. */
  const clearCart = useCallback(() => setItems([]), []);

  // Running totals derived from the items.
  const subtotal = useMemo(
    () => items.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0),
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

/** Access the cart. Must be used inside <CartProvider>. */
function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

export { CartContext, CartProvider, useCart };
