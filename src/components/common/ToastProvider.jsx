import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONES = {
  success: { Icon: CheckCircle2, cor: 'text-emerald-400', borda: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  error: { Icon: XCircle, cor: 'text-red-400', borda: 'border-red-500/30', bg: 'bg-red-500/10' },
  warning: { Icon: AlertTriangle, cor: 'text-amber-400', borda: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  info: { Icon: Info, cor: 'text-sky-400', borda: 'border-sky-500/30', bg: 'bg-sky-500/10' },
};

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const remover = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
    const tid = timeoutsRef.current.get(id);
    if (tid) {
      clearTimeout(tid);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const mostrar = useCallback((tipo, mensagem, duracao = 3500) => {
    const id = ++counter;
    setToasts((atual) => [...atual, { id, tipo, mensagem }]);
    if (duracao > 0) {
      const tid = setTimeout(() => remover(id), duracao);
      timeoutsRef.current.set(id, tid);
    }
    return id;
  }, [remover]);

  const api = {
    success: (msg, dur) => mostrar('success', msg, dur),
    error: (msg, dur) => mostrar('error', msg, dur ?? 5000),
    warning: (msg, dur) => mostrar('warning', msg, dur),
    info: (msg, dur) => mostrar('info', msg, dur),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const { Icon, cor, borda, bg } = ICONES[t.tipo] || ICONES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-xl border ${borda} ${bg} backdrop-blur-md bg-surface/90 px-3 py-2.5 shadow-lg shadow-black/30 animate-slide-down`}
            >
              <Icon size={18} className={`${cor} flex-shrink-0 mt-0.5`} />
              <p className="flex-1 text-sm text-text leading-snug">{t.mensagem}</p>
              <button
                onClick={() => remover(t.id)}
                className="text-slate-400 hover:text-text p-0.5 transition flex-shrink-0"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa de um <ToastProvider> em volta');
  return ctx;
}
