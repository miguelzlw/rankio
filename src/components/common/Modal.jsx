import { useEffect } from 'react';
import { X } from 'lucide-react';

// Modal com backdrop, X opcional, suporte a ESC e bloqueio de scroll do body.
// Use dismissable={false} pra modais que nao podem ser fechados pelo usuario
// (ex: contagem regressiva de reset).
export default function Modal({ open, onClose, title, children, footer, dismissable = true }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape' && dismissable) onClose?.();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        className="bg-surface text-text rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissable) && (
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            {title ? (
              <h2 className="font-semibold text-text">{title}</h2>
            ) : (
              <span />
            )}
            {dismissable && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-text p-1 transition"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-white/10 flex gap-2 justify-end">{footer}</div>
        )}
      </div>
    </div>
  );
}
