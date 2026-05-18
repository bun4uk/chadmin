import React, { useEffect } from 'react';
import { QueryProcess } from '../types';

interface Props {
  proc: QueryProcess;
  fixed: boolean;
  onFix: () => void;
  onClose: () => void;
}

const MemoryModal = ({ proc, fixed, onFix, onClose }: Props) => {
  const safe = (v: any) => v ?? '-';
  const list: [string, string][] = [
    ['Memory usage', proc.formatted_memory_usage],
    ['Peak RAM usage', proc.formatted_peak_memory_usage ?? proc.formatted_peak_memory],
    ['Read', safe(proc.formatted_read_bytes)],
    ['Written', safe(proc.formatted_written_bytes)],
    ['Rows read', proc.read_rows != null ? String(proc.read_rows.toLocaleString()) : '-'],
    ['Rows written', proc.written_rows != null ? String(proc.written_rows.toLocaleString()) : '-'],
  ];

  useEffect(() => {
    if (!fixed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fixed, onClose]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${fixed ? '' : 'pointer-events-none'}`}
      style={fixed ? { background: 'rgba(0,0,0,0.6)' } : undefined}
      onClick={() => {
        if (!fixed) onFix();
        else onClose();
      }}
    >
      <div
        className="overflow-auto relative"
        style={{
          width: 'min(480px, calc(100vw - 16px))',
          maxHeight: '85vh',
          padding: 16,
          background: 'var(--bg-0)',
          border: '1px solid var(--accent-on-surface)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-2)',
          color: 'var(--fg-1)',
          fontSize: 'var(--fs-body)',
          pointerEvents: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <div className="ml-auto" style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>
            Memory · <span style={{ color: 'var(--accent-on-surface)', fontFamily: 'var(--font-mono)' }}>{proc.query_id}</span>
          </div>
        </div>
        <div className="grid gap-y-1" style={{ gridTemplateColumns: 'auto 1fr' }}>
          {list.map(([label, val]) => (
            <React.Fragment key={label}>
              <span className="pr-4 font-medium whitespace-nowrap" style={{ color: 'var(--accent-on-surface)' }}>
                {label}
              </span>
              <span className="tabular text-right break-all" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                {val}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemoryModal;
