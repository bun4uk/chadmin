import React, { useEffect } from 'react';
import hljs from 'highlight.js/lib/core';
import sqlLang from 'highlight.js/lib/languages/sql';
import { format as fmtSql } from 'sql-formatter';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('sql', sqlLang);

interface Props {
  queryId: string;
  sql: string;
  fixed: boolean;
  onFix: () => void;
  onClose: () => void;
  onCopyId: () => void;
  onCopySql: () => void;
  onKill?: (queryId: string) => void;
}

const QueryModal = ({ queryId, sql, fixed, onFix, onClose, onCopyId, onCopySql, onKill }: Props) => {
  const [isFormatted, setIsFormatted] = React.useState<boolean>(false);
  const [formatError, setFormatError] = React.useState<string | null>(null);

  const sourceSql = React.useMemo(() => {
    if (!isFormatted) return sql;
    try {
      const out = fmtSql(sql, { language: 'clickhouse' });
      setFormatError(null);
      return out;
    } catch (e) {
      setFormatError((e as Error).message.split('\n')[0]);
      return sql;
    }
  }, [isFormatted, sql]);

  const highlighted = React.useMemo(() => hljs.highlight(sourceSql, { language: 'sql' }).value, [sourceSql]);

  const [copyIdAck, setCopyIdAck] = React.useState(false);
  const [copySqlAck, setCopySqlAck] = React.useState(false);
  const [formatAck, setFormatAck] = React.useState(false);

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
          width: 'min(75%, calc(100vw - 16px))',
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
          <button
            className="btn-accent"
            onClick={() => { onCopyId(); setCopyIdAck(true); }}
            onMouseLeave={() => setCopyIdAck(false)}
          >
            {copyIdAck ? 'copied' : 'Copy ID'}
          </button>
          <button
            className="btn-accent"
            onClick={() => { onCopySql(); setCopySqlAck(true); }}
            onMouseLeave={() => setCopySqlAck(false)}
          >
            {copySqlAck ? 'copied' : 'Copy SQL'}
          </button>
          <button
            className="btn-accent"
            disabled={isFormatted}
            onClick={() => { setIsFormatted(true); setFormatAck(true); }}
            onMouseLeave={() => setFormatAck(false)}
          >
            {formatAck ? 'done' : 'Format SQL'}
          </button>
          {onKill && (
            <button
              className="btn-danger"
              onClick={() => { onKill(queryId); onClose(); }}
            >
              Kill query
            </button>
          )}
          <div className="ml-auto" style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>
            SQL query · <span style={{ color: 'var(--accent-on-surface)', fontFamily: 'var(--font-mono)' }}>{queryId}</span>
          </div>
        </div>
        {formatError && (
          <div className="mb-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--warning)' }}>
            Could not format (showing raw): {formatError}
          </div>
        )}
        <pre className="sql-pre">
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
};

export default QueryModal;
