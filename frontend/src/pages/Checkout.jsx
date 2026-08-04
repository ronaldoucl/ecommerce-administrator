import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { checkoutService } from '../services';
import { formatPrice, parsePrice } from '../utils/format';
import styles from './Checkout.module.css';

// Mirror the backend rules (checkout.validator.js) so invalid input is caught
// client-side before any request is sent.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 100;
const SHIPPING_MIN = 5;
const SHIPPING_MAX = 500;
const QTY_MIN = 1;
const QTY_MAX = 99;

const EMPTY_FORM = { customerName: '', customerEmail: '', shippingInfo: '' };

/**
 * Collapse cart lines into the request body the backend expects: one entry per
 * variant with the summed quantity, carrying ONLY variantId and quantity. The
 * backend resolves and validates prices itself and rejects duplicate variantIds,
 * so prices are never sent and same-variant lines are merged here first.
 */
function buildItemsPayload(items) {
  const byVariant = new Map();

  for (const line of items) {
    const current = byVariant.get(line.variantId) ?? 0;
    byVariant.set(line.variantId, current + line.quantity);
  }

  return Array.from(byVariant, ([variantId, quantity]) => ({ variantId, quantity }));
}

/**
 * Simulated checkout page. Shows an order summary built from CartContext and a
 * customer form, validates client-side, then submits the cart to POST
 * /api/checkout. There is no real payment step.
 */
function Checkout() {
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { currency } = useSettings();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const shippingRef = useRef(null);

  // Any cart line with a quantity outside [1, 99] blocks checkout — the backend
  // rejects it, so surface it before submitting.
  const hasInvalidQuantity = useMemo(
    () => items.some((line) => line.quantity < QTY_MIN || line.quantity > QTY_MAX),
    [items],
  );

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setSubmitError('');
  };

  // Empty cart: show an empty state instead of the form.
  if (items.length === 0) {
    return (
      <section className={styles.empty}>
        <h1>Checkout</h1>
        <p>Your cart is empty, so there is nothing to check out.</p>
        <Button as={Link} to="/">
          Continue shopping
        </Button>
      </section>
    );
  }

  const validate = () => {
    const errors = {};

    const name = form.customerName.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      errors.customerName = `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
    }

    const email = form.customerEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      errors.customerEmail = 'Enter a valid email address.';
    }

    const shipping = form.shippingInfo.trim();
    if (shipping.length < SHIPPING_MIN || shipping.length > SHIPPING_MAX) {
      errors.shippingInfo = `Shipping address must be between ${SHIPPING_MIN} and ${SHIPPING_MAX} characters.`;
    }

    setFieldErrors(errors);

    // Focus the first invalid field so the user is taken straight to it.
    if (errors.customerName) nameRef.current?.focus();
    else if (errors.customerEmail) emailRef.current?.focus();
    else if (errors.shippingInfo) shippingRef.current?.focus();

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Hard re-entrancy guard: the disabled button already blocks a second click
    // after re-render, but this ensures a rapid double-submit can never fire two
    // requests (the backend has no idempotency key, so it would create two orders).
    if (isSubmitting) return;

    setSubmitError('');

    // Cart-level rules (not tied to a single field).
    if (hasInvalidQuantity) {
      setSubmitError(
        `Every item must have a quantity between ${QTY_MIN} and ${QTY_MAX}. Adjust your cart and try again.`,
      );
      return;
    }

    if (!validate()) return;

    const payload = {
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim(),
      shippingInfo: form.shippingInfo.trim(),
      items: buildItemsPayload(items),
    };

    setIsSubmitting(true);

    try {
      const order = await checkoutService.submitCheckout(payload);

      // Success (201): clear the cart, stash the order for a reload-safe
      // confirmation page, then navigate carrying the order in router state too.
      clearCart();
      try {
        sessionStorage.setItem('last_order', JSON.stringify(order));
      } catch {
        // Ignore storage failures (private mode / quota); router state still carries it.
      }
      navigate(`/confirmation/${order.reference}`, { state: { order } });
    } catch (err) {
      // 409 (insufficient stock), 400 and any other failure share this alert.
      // The cart and form data are left intact so the user can fix and retry.
      setSubmitError(err.message || 'Your order could not be placed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.grid}>
        {/* Order summary (stacks above the form on mobile, beside it on desktop). */}
        <Card className={styles.summary}>
          <h2 className={styles.sectionTitle}>Order summary</h2>
          <ul className={styles.lines}>
            {items.map((item) => {
              const lineTotal = parsePrice(item.unitPrice) * item.quantity;
              return (
                <li key={`${item.productId}:${item.variantId}`} className={styles.line}>
                  <div className={styles.lineInfo}>
                    <p className={styles.lineName}>{item.name}</p>
                    {item.label && <p className={styles.lineVariant}>{item.label}</p>}
                    <p className={styles.lineMeta}>
                      {formatPrice(item.unitPrice, currency)} × {item.quantity}
                    </p>
                  </div>
                  <p className={styles.lineTotal}>{formatPrice(lineTotal, currency)}</p>
                </li>
              );
            })}
          </ul>
          <div className={styles.subtotalRow}>
            <span>
              Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </span>
            <strong className={styles.subtotal}>{formatPrice(subtotal, currency)}</strong>
          </div>
        </Card>

        {/* Customer form */}
        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Your details</h2>
          <p className={styles.simulatedNote} role="note">
            This is a simulated checkout — no real payment is taken and no card
            details are collected.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label className={styles.field} htmlFor="customerName">
              Full name
              <input
                id="customerName"
                ref={nameRef}
                className={styles.input}
                type="text"
                autoComplete="name"
                value={form.customerName}
                onChange={(event) => setField('customerName', event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.customerName)}
              />
              {fieldErrors.customerName && (
                <span className={styles.fieldError} role="alert">
                  {fieldErrors.customerName}
                </span>
              )}
            </label>

            <label className={styles.field} htmlFor="customerEmail">
              Email
              <input
                id="customerEmail"
                ref={emailRef}
                className={styles.input}
                type="email"
                autoComplete="email"
                value={form.customerEmail}
                onChange={(event) => setField('customerEmail', event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.customerEmail)}
              />
              {fieldErrors.customerEmail && (
                <span className={styles.fieldError} role="alert">
                  {fieldErrors.customerEmail}
                </span>
              )}
            </label>

            <label className={styles.field} htmlFor="shippingInfo">
              Shipping address
              <textarea
                id="shippingInfo"
                ref={shippingRef}
                className={styles.textarea}
                rows={4}
                autoComplete="shipping street-address"
                placeholder="Full name, street, city, postal code, country"
                value={form.shippingInfo}
                onChange={(event) => setField('shippingInfo', event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.shippingInfo)}
              />
              {fieldErrors.shippingInfo && (
                <span className={styles.fieldError} role="alert">
                  {fieldErrors.shippingInfo}
                </span>
              )}
            </label>

            {submitError && (
              <p className={styles.alert} role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? 'Placing order…' : 'Place order'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default Checkout;
