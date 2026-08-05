import { useCallback, useEffect, useId, useRef, useState } from 'react';

import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './MobileMenu.module.css';

// The hamburger menu, used by both the storefront header and the admin shell.
// Only the links differ, so everything else lives here once:
//
//   <MobileMenu label="Main menu">
//     {(close) => <Link to="/cart" onClick={close}>Cart</Link>}
//   </MobileMenu>
//
// While it is open, focus stays inside, Escape closes it, clicking the backdrop
// closes it, clicking anything in the panel closes it (so tapping a link takes
// you there and dismisses the menu), and focus goes back to the button. We also
// lock body scrolling so the page behind cannot slide around.
function MobileMenu({ label = 'Menu', title, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const panelId = useId();

  const close = useCallback(() => setIsOpen(false), []);

  useFocusTrap({ active: isOpen, containerRef: panelRef, onEscape: close });

  // Lock body scroll while the drawer is open so the page underneath cannot
  // scroll (or overflow sideways) behind it.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`${styles.toggle} ${className}`.trim()}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.bars} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            id={panelId}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={title || label}
            tabIndex={-1}
          >
            <div className={styles.panelHeader}>
              {title && <p className={styles.panelTitle}>{title}</p>}
              <button
                type="button"
                className={styles.closeButton}
                onClick={close}
                aria-label="Close menu"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/*
              Activating any link or button inside the panel closes it, which
              covers every nav item without each nav remembering an onClick.
              Clicks on plain text (e.g. the signed-in email) leave it open.
            */}
            <div
              className={styles.panelBody}
              onClick={(event) => {
                if (event.target.closest('a, button')) close();
              }}
            >
              {typeof children === 'function' ? children(close) : children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileMenu;
