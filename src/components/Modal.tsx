import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  ReactNode,
  RefObject,
} from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'danger';

export interface ModalProps {
  open: boolean;
  onClose: () => void;

  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;

  size?: ModalSize;
  variant?: ModalVariant;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  hideBackdrop?: boolean;

  initialFocusRef?: RefObject<HTMLElement>;
  ariaLabel?: string;

  className?: string; // panel
  backdropClassName?: string;
}

let scrollLocks = 0;
function lockScroll() {
  if (typeof document === 'undefined') return;
  if (scrollLocks === 0) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
  }
  scrollLocks++;
}
function unlockScroll() {
  if (typeof document === 'undefined') return;
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(','))).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.tabIndex !== -1 &&
      !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
  );
}

function ensurePortalContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('modal-root');
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('id', 'modal-root');
    document.body.appendChild(el);
  }
  return el;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  variant = 'default',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideBackdrop = false,
  initialFocusRef,
  ariaLabel,
  className,
  backdropClassName,
}: ModalProps) {
  const [render, setRender] = useState(open);
  const [animate, setAnimate] = useState(false);

  const prevActiveRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pointerDownOnBackdrop = useRef(false);

  const id = useId();
  const titleId = title ? `${id}-title` : undefined;
  const descId = subtitle ? `${id}-subtitle` : undefined;

  const portalTarget = useMemo(() => ensurePortalContainer(), []);

  // Mount/unmount with transition
  useEffect(() => {
    if (open) {
      setRender(true);
      // next frame => start enter animation
      requestAnimationFrame(() => setAnimate(true));
    } else {
      // start exit animation
      setAnimate(false);
      const t = setTimeout(() => setRender(false), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Scroll lock
  useEffect(() => {
    if (!render) return;
    lockScroll();
    return () => unlockScroll();
  }, [render]);

  // Focus management
  useEffect(() => {
    if (!render) return;
    prevActiveRef.current = (document.activeElement as HTMLElement) ?? null;

    const focusFirst = () => {
      const root = panelRef.current!;
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const focusables = getFocusableElements(root);
      if (focusables.length) {
        focusables[0].focus();
      } else {
        root.focus();
      }
    };
    const t = setTimeout(focusFirst, 0);
    return () => clearTimeout(t);
  }, [render, initialFocusRef]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (prevActiveRef.current && document.contains(prevActiveRef.current)) {
        prevActiveRef.current.focus();
      }
    };
  }, []);

  if (!render || !portalTarget) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEsc) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const root = panelRef.current;
      if (!root) return;
      const focusables = getFocusableElements(root);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const current = document.activeElement as HTMLElement | null;
      const currentIndex = current ? focusables.indexOf(current) : -1;

      let nextIndex = 0;
      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
      }
      e.preventDefault();
      focusables[nextIndex].focus();
    }
  };

  const onBackdropMouseDown = (e: React.MouseEvent) => {
    pointerDownOnBackdrop.current = e.target === e.currentTarget;
  };
  const onBackdropMouseUp = (e: React.MouseEvent) => {
    if (!closeOnBackdrop) return;
    if (pointerDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    pointerDownOnBackdrop.current = false;
  };

  const sizeClass: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-screen-xl',
  };

  const panelClasses = [
    'w-full',
    sizeClass[size],
    'max-h-screen',
    'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    'border border-slate-200 dark:border-slate-700',
    'rounded-xl shadow-2xl overflow-hidden',
    'flex flex-col',
    'transition-all duration-200 ease-out will-change-transform',
    animate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const backdropClasses = [
    'fixed inset-0 z-50',
    'grid place-items-center p-5 sm:p-6',
    hideBackdrop ? 'bg-transparent' : 'bg-black/50 dark:bg-black/60',
    'overflow-y-auto',
    'transition-opacity duration-150 ease-out',
    animate ? 'opacity-100' : 'opacity-0',
    backdropClassName || '',
  ]
    .filter(Boolean)
    .join(' ');

  const titleClasses =
    (variant === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-900 dark:text-slate-100') + ' text-[17px] font-semibold';

  const CloseIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"
      />
    </svg>
  );

  return createPortal(
    <div
      ref={backdropRef}
      className={backdropClasses}
      data-state={animate ? 'open' : 'closing'}
      onMouseDown={onBackdropMouseDown}
      onMouseUp={onBackdropMouseUp}
      aria-hidden={false}
    >
      <div
        ref={panelRef}
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-variant={variant}
      >
        {/* Variant accent */}
        {variant === 'danger' && <div className="h-1 w-full bg-red-500/80" />}

        {(title || showClose) && (
          <div className="flex items-start gap-3 px-5 pt-4 pb-3">
            <div className="min-w-0">
              {title && (
                <div className={titleClasses} id={titleId}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400" id={descId}>
                  {subtitle}
                </div>
              )}
            </div>
            <div className="flex-1" />
            {showClose && (
              <button
                className="h-9 w-9 inline-grid place-items-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                type="button"
                aria-label="Close"
                onClick={onClose}
              >
                {CloseIcon}
              </button>
            )}
          </div>
        )}

        <div className="px-5 pt-2 pb-4 overflow-auto flex-1">{children}</div>

        {footer && (
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalTarget
  );
}

export default Modal;