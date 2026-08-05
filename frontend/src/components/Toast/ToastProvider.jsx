import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import styles from './Toast.module.css';

/**
 * Toast system — the app's single way of confirming an action or reporting a
 * failure without interrupting what the user is doing.
 *
 * Mounted once near the app root (see main.jsx); any screen raises a toast with
 * the `useToast()` hook:
 *
 *   const toast = useToast();
 *   toast.success('Product marked as featured');
 *   toast.error(message);
 *   toast.info('Nothing to update', { action: { label: 'Undo', onClick } });
 *
 * Behaviour: top-right stack, slide-in, auto-dismiss (errors linger longer),
 * manual close, pause-on-hover/focus, at most three visible at a time with the
 * rest queued. Raising a toast with an `id` that is already on screen REPLACES
 * it (and restarts its timer) instead of stacking a near-duplicate.
 *
 * No toast library is used — this is deliberately dependency-free.
 */
const ToastContext = createContext(null);

/** How long a toast stays on screen. Errors get longer, they matter more. */
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

/** Toasts beyond this many are queued and shown as earlier ones dismiss. */
const MAX_VISIBLE = 3;

let nextToastId = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((variant, message, options = {}) => {
    const { id, action = null, image = null, duration } = options;
    const toastId = id ?? `toast-${(nextToastId += 1)}`;

    const toast = {
      id: toastId,
      variant,
      message,
      action,
      image,
      duration: duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
      // Bumped every time the same id is raised again, so the toast component
      // knows to restart its dismiss timer even though it never unmounted.
      seq: 0,
    };

    setToasts((current) => {
      const existing = current.find((item) => item.id === toastId);
      if (existing) {
        return current.map((item) =>
          item.id === toastId ? { ...toast, seq: existing.seq + 1 } : item,
        );
      }
      return [...current, toast];
    });

    return toastId;
  }, []);

  const api = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * The stack itself, rendered in a portal so it always sits above page content
 * regardless of the stacking context of whatever raised it.
 */
function ToastContainer({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null;

  const visible = toasts.slice(0, MAX_VISIBLE);

  return createPortal(
    <div className={styles.container}>
      {/*
        Two regions so success/info are announced politely while errors
        interrupt — a single region can only carry one politeness setting.
      */}
      <div aria-live="polite" role="status" className={styles.region}>
        {visible
          .filter((toast) => toast.variant !== 'error')
          .map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
      </div>
      <div aria-live="assertive" role="alert" className={styles.region}>
        {visible
          .filter((toast) => toast.variant === 'error')
          .map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
      </div>
    </div>,
    document.body,
  );
}

/**
 * A single toast: optional thumbnail, message, optional action button and a
 * close button. Owns its own auto-dismiss timer, which pauses while the pointer
 * is over it or the keyboard focus is inside it, so it cannot vanish mid-read.
 */
function ToastItem({ toast, onDismiss }) {
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);

  // Declared BEFORE the timer effect so a re-raised toast has its full time back
  // by the time the countdown below restarts.
  useEffect(() => {
    remainingRef.current = toast.duration;
  }, [toast.seq, toast.duration]);

  // Runs the countdown. Re-raising the toast (`seq`) restarts it; pausing tears
  // it down and resuming starts a new one with the time that was left.
  useEffect(() => {
    if (isPaused) return undefined;

    startedAtRef.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remainingRef.current);

    return () => clearTimeout(timer);
  }, [toast.id, toast.seq, isPaused, onDismiss]);

  const pause = () => {
    if (isPaused) return;
    remainingRef.current = Math.max(500, remainingRef.current - (Date.now() - startedAtRef.current));
    setIsPaused(true);
  };

  const resume = () => setIsPaused(false);

  const handleAction = () => {
    onDismiss(toast.id);
    toast.action?.onClick?.();
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.variant]}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      // Escape dismisses the toast the user is currently interacting with.
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss(toast.id);
      }}
    >
      {toast.image && (
        <img className={styles.thumb} src={toast.image} alt="" width="44" height="44" />
      )}

      <div className={styles.body}>
        <p className={styles.message}>{toast.message}</p>
        {toast.action && (
          <button type="button" className={styles.action} onClick={handleAction}>
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        className={styles.close}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

/** Raise toasts from anywhere inside <ToastProvider>. */
function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export { ToastContext, ToastProvider, useToast };
export default ToastProvider;
