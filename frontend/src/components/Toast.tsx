import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastCounter = 0;

let moduleAddToast: ((msg: string, type?: ToastType) => void) | null = null;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastCounter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 4000);
  }, []);

  useEffect(() => {
    moduleAddToast = addToast;
    return () => {
      if (moduleAddToast === addToast) moduleAddToast = null;
    };
  }, [addToast]);

  const api = useMemo<ToastContextValue>(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('Toast context missing');
  return ctx;
};

export const showSuccess = (msg: string) => moduleAddToast?.(msg, 'success');
export const showError = (msg: string) => moduleAddToast?.(msg, 'error');
export const showInfo = (msg: string) => moduleAddToast?.(msg, 'info');
export const showWarning = (msg: string) => moduleAddToast?.(msg, 'warning');
