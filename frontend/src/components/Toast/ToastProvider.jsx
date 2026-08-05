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

// Little pop-up messages, so we can confirm something worked without blocking
// the page. Mounted once in main.jsx, used anywhere with the useToast() hook:
//
//   const toast = useToast();
//   toast.success('Product marked as featured');
//   toast.error(message);
//
// They stack in the top-right, dismiss themselves, pause while you hover, and
// show three at most (the rest wait their turn). Raising one with an id that is
// already showing replaces it instead of stacking a near-duplicate.
//
// Written by hand rather than pulling in a toast library.
const ToastContext = createContext(null);

// Errors stay longer — they matter more.
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

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
      // Goes up each time the same id is raised again. The toast never
      // unmounts, so this is how it knows to restart its timer.
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

// In a portal so it always draws on top, whatever the page it was raised from
// is doing with z-index.
function ToastContainer({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null;

  const visible = toasts.slice(0, MAX_VISIBLE);

  return createPortal(
    <div className={styles.container}>
      {/*
        Two regions on purpose: a screen reader should interrupt for an error
        but wait its turn for a success, and one region can only do one of those.
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

// One toast. It runs its own countdown, which pauses while you hover it or tab
// into it — otherwise it could disappear halfway through reading it.
function ToastItem({ toast, onDismiss }) {
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);

  // Has to come BEFORE the timer effect, so a re-raised toast already has its
  // full time back when the countdown restarts.
  useEffect(() => {
    remainingRef.current = toast.duration;
  }, [toast.seq, toast.duration]);

  // The countdown. Re-raising the toast restarts it; pausing kills the timer and
  // resuming starts a fresh one with whatever time was left.
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
