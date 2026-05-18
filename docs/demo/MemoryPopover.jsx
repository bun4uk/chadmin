// MemoryPopover.jsx — anchored popover
function MemoryPopover({ proc, anchor, onClose }) {
  const list = [
    ['Memory usage', proc.formatted_memory_usage],
    ['Peak RAM usage', proc.formatted_peak_memory_usage ?? proc.formatted_peak_memory],
    ['Read', proc.formatted_read_bytes ?? '-'],
    ['Written', proc.formatted_written_bytes ?? '-'],
    ['Rows read', proc.read_rows != null ? proc.read_rows.toLocaleString() : '-'],
    ['Rows written', proc.written_rows != null ? proc.written_rows.toLocaleString() : '-'],
  ];

  const pos = React.useMemo(() => {
    if (!anchor) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    const rect = anchor.getBoundingClientRect();
    const boxW = 260;
    let left = rect.left - boxW - 8;
    if (left < 8) left = rect.right + 8;
    if (left + boxW > window.innerWidth - 8) left = window.innerWidth - boxW - 8;
    let top = rect.top;
    if (top + 260 > window.innerHeight) top = window.innerHeight - 260 - 8;
    return { top, left };
  }, [anchor]);

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="rounded shadow-lg text-sm p-4 w-64 pointer-events-auto absolute"
        style={{ background: 'var(--bg-0)', color: 'var(--fg-1)', border: '1px solid var(--accent-on-surface)', ...pos, boxShadow: '0 4px 12px rgba(0,0,0,.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {list.map(([label, val]) => (
          <div key={label} className="py-1 flex justify-between gap-3">
            <span style={{ color: 'var(--accent-on-surface)' }} className="font-medium">{label}</span>
            <span className="font-bold font-mono text-xs">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.MemoryPopover = MemoryPopover;
