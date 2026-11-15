import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, title = 'Success') => addToast({ type: 'success', title, message: msg }),
    error: (msg, title = 'Error') => addToast({ type: 'error', title, message: msg }),
    warning: (msg, title = 'Warning') => addToast({ type: 'warning', title, message: msg }),
    info: (msg, title = 'Information') => addToast({ type: 'info', title, message: msg }),
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          };

          const borders = {
            success: 'border-emerald-800/80 bg-[#1e2a21] text-emerald-100 shadow-xl shadow-black/50',
            error: 'border-red-800/80 bg-[#2d1b1b] text-red-100 shadow-xl shadow-black/50',
            warning: 'border-amber-800/80 bg-[#2a241b] text-amber-100 shadow-xl shadow-black/50',
            info: 'border-sky-800/80 bg-[#18232e] text-sky-100 shadow-xl shadow-black/50',
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${borders[t.type]} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
              role="alert"
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold text-[#ECECEC] leading-none mb-1">{t.title}</p>}
                <p className="text-sm text-[#A3A3A3] leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[#737373] hover:text-[#ECECEC] p-0.5 rounded transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

