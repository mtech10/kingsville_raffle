import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SIZES = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-4xl' };

/**
 * Accessible modal dialog: portal, scroll lock, Esc + backdrop close, focus trap, focus restore.
 * Give the element that should receive initial focus a `data-autofocus` attribute.
 */
export default function Modal({ open, onClose, labelledBy, size = 'lg', dismissible = true, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="fixed inset-0 animate-fade-in bg-emerald-950/80 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative flex min-h-full items-end justify-center sm:items-center sm:p-6"
        onMouseDown={(e) => {
          if (dismissible && e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={`relative w-full ${SIZES[size] ?? SIZES.lg} animate-pop-in overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
