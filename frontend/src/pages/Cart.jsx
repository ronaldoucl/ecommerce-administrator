import { Link } from 'react-router-dom';

import Button from '../components/Button/Button';
import { useCart } from '../context/CartContext';
import { formatPrice, placeholderImage } from '../utils/format';
import styles from './Cart.module.css';

/**
 * Shopping cart page. Lists the items held in CartContext with a quantity
 * control and remove action per line, plus the running subtotal. Falls back to
 * an empty-cart state. Checkout itself is a Sprint 3 concern — this page only
 * links to it and performs no API call.
 */
function Cart() {
  const { items, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <section className={styles.empty}>
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Button as={Link} to="/">
          Continue shopping
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Your cart</h1>
        <button type="button" className={styles.clear} onClick={clearCart}>
          Clear cart
        </button>
      </header>

      <ul className={styles.list}>
        {items.map((item) => {
          const lineTotal = Number(item.unitPrice) * item.quantity;

          return (
            <li key={`${item.productId}:${item.variantId}`} className={styles.item}>
              <img
                className={styles.image}
                src={item.image || placeholderImage(item.name)}
                alt={item.name}
                width="80"
                height="80"
              />

              <div className={styles.info}>
                <p className={styles.name}>{item.name}</p>
                {item.label && <p className={styles.variant}>{item.label}</p>}
                <p className={styles.unitPrice}>{formatPrice(item.unitPrice)} each</p>
              </div>

              <div className={styles.qty} aria-label={`Quantity for ${item.name}`}>
                <button
                  type="button"
                  className={styles.qtyButton}
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  disabled={item.quantity <= 1}
                >
                  &minus;
                </button>
                <span className={styles.qtyValue} aria-live="polite">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className={styles.qtyButton}
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <p className={styles.lineTotal}>{formatPrice(lineTotal)}</p>

              <button
                type="button"
                className={styles.remove}
                onClick={() => removeItem(item.productId, item.variantId)}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      <footer className={styles.summary}>
        <div className={styles.subtotalRow}>
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <strong className={styles.subtotal}>{formatPrice(subtotal)}</strong>
        </div>
        <Button as={Link} to="/checkout">
          Proceed to checkout
        </Button>
      </footer>
    </section>
  );
}

export default Cart;
