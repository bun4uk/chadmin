// QueryModal.jsx — fullscreen SQL modal with hljs + sql-formatter (CDN)
function QueryModal({ queryId, sql, onClose, onKill }) {
  const [isFormatted, setFormatted] = React.useState(false);
  const [copyIdAck, setCopyIdAck] = React.useState(false);
  const [copySqlAck, setCopySqlAck] = React.useState(false);
  const [formatAck, setFormatAck] = React.useState(false);
  const [formatError, setFormatError] = React.useState(null);

  const sourceSql = React.useMemo(() => {
    if (!isFormatted) return sql;
    try {
      if (window.sqlFormatter) {
        setFormatError(null);
        return window.sqlFormatter.format(sql, { language: 'sql' });
      }
      return sql;
    } catch (e) {
      setFormatError(e.message.split('\n')[0]);
      return sql;
    }
  }, [isFormatted, sql]);

  const highlighted = React.useMemo(() => {
    if (window.hljs) return window.hljs.highlight(sourceSql, { language: 'sql' }).value;
    return sourceSql;
  }, [sourceSql]);

  const copy = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
  const { addToast } = window.useToast();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.6)'
      }}
      onClick={onClose}
    >
      <div
        className="rounded shadow-lg"
        style={{
          width: 'min(75%, calc(100vw - 16px))',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 16,
          position: 'relative',
          background: 'var(--bg-0)',
          border: '1px solid var(--accent-on-surface)',
          color: 'var(--fg-1)',
          fontSize: 14,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-2 mb-3 flex-wrap">
          <BtnAccent ack={copyIdAck} onClick={async () => {
            const ok = await copy(queryId);
            setCopyIdAck(true);
            addToast(ok ? 'ID copied' : 'Copy failed', ok ? 'success' : 'error');
          }} onLeave={() => setCopyIdAck(false)}>
            {copyIdAck ? 'copied' : 'Copy ID'}
          </BtnAccent>
          <BtnAccent ack={copySqlAck} onClick={async () => {
            const ok = await copy(sourceSql);
            setCopySqlAck(true);
            addToast(ok ? 'SQL copied' : 'Copy failed', ok ? 'success' : 'error');
          }} onLeave={() => setCopySqlAck(false)}>
            {copySqlAck ? 'copied' : 'Copy SQL'}
          </BtnAccent>
          <BtnAccent ack={formatAck} disabled={isFormatted} onClick={() => { setFormatted(true); setFormatAck(true); }} onLeave={() => setFormatAck(false)}>
            {formatAck ? 'done' : 'Format SQL'}
          </BtnAccent>
          {onKill && (
            <button
              className="btn-danger"
              onClick={() => { onKill(queryId); onClose(); }}
            >Kill query</button>
          )}
          <div className="ml-auto text-xs" style={{ color: 'var(--fg-3)' }}>
            SQL query · <span style={{ color: 'var(--accent-on-surface)' }}>{queryId}</span>
          </div>
        </div>
        {formatError && (
          <div className="text-xs mb-2" style={{ color: '#ffd591' }}>
            Could not format (showing raw): {formatError}
          </div>
        )}
        <pre className="sql-pre">
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}

function BtnAccent({ children, onClick, onLeave, ack, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseLeave={onLeave}
      className="btn-accent"
    >
      {children}
    </button>
  );
}

window.QueryModal = QueryModal;
