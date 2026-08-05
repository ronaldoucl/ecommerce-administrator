import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import ConfirmModal from './ConfirmModal';

// Our replacement for window.confirm. Mounted once in main.jsx and used like:
//
//   const confirm = useConfirm();
//   confirm({
//     title: 'Delete product?',
//     message: 'The product is deactivated and hidden from the storefront.',
//     confirmLabel: 'Delete product',
//     tone: 'danger',
//     onConfirm: () => productService.remove(product.id),
//   });
//
// The provider runs the whole thing: while onConfirm is working the dialog shows
// a loading state with both buttons disabled. If it succeeds the dialog closes
// and the promise gives you true. If it FAILS the dialog stays open with the
// error inside, so you can try again instead of losing what you were doing.
// Cancelling gives you false.
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

// Returns a confirm() that resolves to true or false.
function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context;
}

export { ConfirmContext, ConfirmProvider, useConfirm };
export default ConfirmProvider;
