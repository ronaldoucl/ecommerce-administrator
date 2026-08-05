import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import Button from '../Button/Button';
import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './ConfirmModal.module.css';

/**
 * Reusable confirmation dialog — the app's replacement for window.confirm.
 *
 * Accessible by construction: role="dialog" + aria-modal, labelled by its own
 * title, focus trapped inside while open, focus starting on the SAFEST button
 * (Cancel), Escape and backdrop click both cancelling, and focus returned to
 * the trigger on close (see useFocusTrap).
 *
 * It is usually driven through `useConfirm()` (see ConfirmProvider) rather than
 * rendered by hand, so every screen gets the same behaviour.
 *
 * @param {object} props
 * @param {boolean} props.open - whether the dialog is visible
 * @param {string} props.title - dialog heading, also its accessible name
 * @param {React.ReactNode} [props.message] - body copy
 * @param {React.ReactNode} [props.warning] - highlighted consequence line
 * @param {string} [props.confirmLabel='Confirm']
 * @param {string} [props.cancelLabel='Cancel']
 * @param {'default'|'danger'} [props.tone='default'] - danger styles the confirm button
 * @param {boolean} [props.isLoading=false] - disables both buttons and shows a spinner
 * @param {string} [props.error] - failure message kept in the dialog
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
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
