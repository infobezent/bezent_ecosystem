import { useEffect, type ReactNode } from 'react';
import { BezentIcon } from '../../icons';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Standard BEZENT Modal Dialog primitive. Traps focus, handles Esc key,
 * renders accessible dialog semantics with backdrop overlay.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="bezent-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bezent-modal-title' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`bezent-modal bezent-modal--${size} ${className || ''}`.trim()}>
        {Boolean(title || onClose) && (
          <div className="bezent-modal__header">
            <div className="bezent-modal__title-group">
              {title && (
                <h2 id="bezent-modal-title" className="bezent-modal__title">
                  {title}
                </h2>
              )}
              {description && <p className="bezent-modal__desc">{description}</p>}
            </div>

            <button
              type="button"
              className="bezent-modal__close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <BezentIcon name="close" size={18} color="currentColor" />
            </button>
          </div>
        )}

        <div className="bezent-modal__body">{children}</div>

        {footer && <div className="bezent-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
