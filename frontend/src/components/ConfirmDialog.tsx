import React, { useEffect } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-w-md w-[90%]"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 20,
          background: 'var(--bg-0)',
          border: '2px solid var(--accent-on-surface)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-2)',
          color: 'var(--fg-1)',
        }}
      >
        <h3 className="m-0 mb-2 font-semibold" style={{ fontSize: 'var(--fs-md)', color: 'var(--accent-on-surface)' }}>
          {title}
        </h3>
        <p className="whitespace-pre-line mb-4" style={{ fontSize: 'var(--fs-body)', color: 'var(--fg-2)' }}>
          {message}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 transition"
            onClick={onCancel}
            style={{
              fontSize: 'var(--fs-body)',
              color: 'var(--fg-2)',
              border: '1px solid var(--fg-4)',
              borderRadius: 'var(--r-md)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-accent'}
            style={{ padding: '4px 12px' }}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
