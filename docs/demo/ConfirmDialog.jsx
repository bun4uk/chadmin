// ConfirmDialog.jsx — ESC cancel, Enter confirm. Matches frontend/src/components/ConfirmDialog.tsx
function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  const confirmColor = danger ? '#ff6b6b' : 'var(--accent-on-surface)';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[var(--bg-0)] border-2 rounded shadow-lg p-5 max-w-md w-[90%]"
        style={{ borderColor: 'var(--accent-on-surface)', boxShadow: '0 4px 12px rgba(0,0,0,.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--accent-on-surface)' }}>{title}</h3>
        <p className="text-sm mb-4 whitespace-pre-line" style={{ color: 'var(--fg-2)' }}>{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border transition"
            style={{ color: 'var(--fg-2)', borderColor: 'var(--fg-4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="px-3 py-1 rounded border transition"
            style={{ color: confirmColor, borderColor: confirmColor, background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = confirmColor; e.currentTarget.style.color = 'var(--bg-0)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = confirmColor; }}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmDialog = ConfirmDialog;
