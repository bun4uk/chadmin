// Toast.jsx — bottom-left stack, 4s auto-dismiss
const ToastCtx = React.createContext(null);
let toastCounter = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const addToast = React.useCallback((message, type = 'info') => {
    const id = ++toastCounter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const api = React.useMemo(() => ({ addToast }), [addToast]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 left-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-3 py-2 rounded border font-medium text-sm"
            style={
              t.type === 'success'
                ? { background: 'var(--accent-on-surface)', color: 'var(--bg-0)', borderColor: 'var(--accent-on-surface)' }
                : t.type === 'error'
                ? { background: '#ef4444', color: '#fff', borderColor: '#ef4444' }
                : { background: '#262622', color: '#fff', borderColor: 'var(--accent-on-surface)' }
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error('Toast context missing');
  return ctx;
}

window.ToastProvider = ToastProvider;
window.useToast = useToast;
