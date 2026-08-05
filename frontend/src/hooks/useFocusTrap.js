import { useEffect } from 'react';

// What counts as focusable inside an overlay. In one place so the modal and the
// mobile menu behave the same.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

// Keeps keyboard focus inside an overlay while it is open, which is what makes a
// modal usable without a mouse. While `active` is true it:
//   - moves focus into the overlay,
//   - makes Tab and Shift+Tab wrap around inside it instead of escaping,
//   - calls onEscape when you press Escape,
//   - gives focus back to whatever opened it on the way out.
//
// Used by both <ConfirmModal> and <MobileMenu>.
export function useFocusTrap({ active, containerRef, initialFocusRef, onEscape }) {
  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;

    // Prefer the safe button (Cancel), then the first focusable thing, then the
    // overlay itself.
    const target = initialFocusRef?.current ?? focusableElements(container)[0] ?? container;
    target?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusableElements(containerRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      // Tabbing off either end sends you round to the other one.
      if (event.shiftKey && (current === first || !containerRef.current?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, initialFocusRef, onEscape]);
}

export default useFocusTrap;
