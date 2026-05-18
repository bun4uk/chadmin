// UserPopover.jsx — anchored popover with connection / client details
function UserPopover({ proc, anchor, onClose }) {
  // Build a realistic set of fields; fall back gracefully to '-'
  const list = [
    ['Is initial query', proc.is_initial_query ?? 1],
    ['Address', proc.address ?? '::ffff:10.27.182.107'],
    ['Port', proc.port ?? 56700],
    ['Initial user', proc.initial_user ?? proc.user],
    ['Initial query ID', proc.initial_query_id ?? proc.query_id],
    ['Initial address', proc.initial_address ?? '::ffff:10.27.182.107'],
    ['Interface', proc.interface ?? 'HTTP'],
    ['Client hostname', proc.client_hostname ?? 'clickhouse-scraper-2'],
    ['Client name', proc.client_name ?? 'clickhouse-scraper/1.22'],
    ['Client revision', proc.client_revision ?? 54460],
    ['HTTP UA', proc.http_user_agent ?? 'Go-http-client/2.0'],
  ];

  const pos = React.useMemo(() => {
    if (!anchor) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    const rect = anchor.getBoundingClientRect();
    const boxW = 380;
    const boxH = 360;
    let left = rect.right + 8;
    if (left + boxW > window.innerWidth - 8) left = rect.left - boxW - 8;
    if (left < 8) left = 8;
    let top = rect.top;
    if (top + boxH > window.innerHeight - 8) top = Math.max(8, window.innerHeight - boxH - 8);
    return { top, left };
  }, [anchor]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="rounded text-sm p-4 pointer-events-auto absolute"
        style={{ background: 'var(--bg-0)', color: 'var(--fg-1)', border: '1px solid var(--accent-on-surface)', width: 'min(380px, calc(100vw - 16px))', maxHeight: 360, overflow: 'auto', ...pos, boxShadow: '0 4px 12px rgba(0,0,0,.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {list.map(([label, val]) => (
          <div key={label} className="py-1 flex justify-between gap-3">
            <span style={{ color: 'var(--accent-on-surface)' }} className="font-medium whitespace-nowrap">{label}</span>
            <span className="font-mono text-xs break-all text-right">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.UserPopover = UserPopover;
