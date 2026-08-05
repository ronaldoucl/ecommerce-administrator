import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import Button from '../Button/Button';
import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './ConfirmModal.module.css';

// The confirmation dialog itself. You normally do not render this by hand — use
// useConfirm() from ConfirmProvider so every screen behaves the same.
//
// Accessibility is built in: it is a real dialog, labelled by its title, focus
// is trapped while it is open and starts on the SAFE button (Cancel), Escape and
// the backdrop both cancel, and focus goes back to whatever opened it.
function ConfirmModal({
  open,
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isLoading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Escape cancels — but never while the confirmed action is still running.
  useFocusTrap({
    active: open,
    containerRef: dialogRef,
    initialFocusRef: cancelRef,
    onEscape: () => {
      if (!isLoading) onCancel();
    },
  });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.backdrop}
      // A click on the backdrop cancels; clicks inside the dialog must not.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descriptionId : undefined}
        tabIndex={-1}
      >
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>

        {message && (
          <p className={styles.message} id={descriptionId}>
            {message}
          </p>
        )}

        {warning && <p className={styles.warning}>{warning}</p>}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className={styles.actionButton}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.actionButton}
          >
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmModal;
