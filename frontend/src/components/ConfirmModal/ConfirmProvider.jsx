import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import ConfirmModal from './ConfirmModal';

/**
 * Confirmation flow shared by every screen — the app's replacement for
 * window.confirm, mounted once near the app root (see main.jsx).
 *
 *   const confirm = useConfirm();
 *
 *   confirm({
 *     title: 'Delete product?',
 *     message: 'The product is deactivated and hidden from the storefront.',
 *     warning: 'Existing orders keep referencing it.',
 *     confirmLabel: 'Delete product',
 *     tone: 'danger',
 *     onConfirm: () => productService.remove(product.id),
 *   });
 *
 * The provider owns the whole lifecycle: while `onConfirm` runs the dialog shows
 * its loading state with both buttons disabled; on success it closes and the
 * returned promise resolves to `true`; on failure the dialog STAYS OPEN with the
 * backend `{ message }` shown inside, so the user can retry or back out.
 * Cancelling resolves to `false`.
 *
 * @typedef {{ title: string, message?: React.ReactNode, warning?: React.ReactNode,
 *   confirmLabel?: string, cancelLabel?: string, tone?: 'default'|'danger',
 *   onConfirm?: () => (void|Promise<void>) }} ConfirmOptions
 */
const ConfirmContext = createContext(null);

const CLOSED = { open: false, options: null };

function ConfirmProvider({ children }) {
  const [state, setState] = useState(CLOSED);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Resolver of the promise handed back to the caller of confirm().
  const resolveRef = useRef(null);

  const settle = useCallback((result) => {
    setState(CLOSED);
    setIsLoading(false);
    setError('');
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(result);
  }, []);

  const confirm = useCallback((options) => {
    // A second call while a dialog is open cancels the previous one rather than
    // leaving its promise hanging forever.
    resolveRef.current?.(false);

    setState({ open: true, options });
    setIsLoading(false);
    setError('');

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const action = state.options?.onConfirm;

    if (!action) {
      settle(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await action();
      settle(true);
    } catch (err) {
      // Keep the dialog open and show why it failed, using the normalized
      // backend message from the service layer.
      setError(err?.message || 'The action could not be completed.');
      setIsLoading(false);
    }
  }, [state.options, settle]);

  const handleCancel = useCallback(() => {
    if (isLoading) return; // never abandon an action that is already running
    settle(false);
  }, [isLoading, settle]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={state.open}
        title={state.options?.title ?? ''}
        message={state.options?.message}
        warning={state.options?.warning}
        confirmLabel={state.options?.confirmLabel}
        cancelLabel={state.options?.cancelLabel}
        tone={state.options?.tone}
        isLoading={isLoading}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Ask for confirmation before running an action.
 * Must be used inside <ConfirmProvider>.
 *
 * @returns {(options: ConfirmOptions) => Promise<boolean>}
 */
function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context;
}

export { ConfirmContext, ConfirmProvider, useConfirm };
export default ConfirmProvider;
