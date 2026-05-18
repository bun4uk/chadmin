import React, { useEffect } from 'react';
import { QueryProcess } from '../types';

interface Props {
  proc: QueryProcess;
  fixed: boolean;
  onFix: () => void;
  onClose: () => void;
}

const FIELDS: [keyof QueryProcess | string, string][] = [
  ['is_initial_query', 'Is initial query'],
  ['address', 'Address'],
  ['port', 'Port'],
  ['initial_user', 'Initial user'],
  ['initial_query_id', 'Initial query ID'],
  ['initial_address', 'Initial address'],
  ['initial_port', 'Initial port'],
  ['interface', 'Interface'],
  ['os_user', 'OS user'],
  ['client_hostname', 'Client hostname'],
  ['client_name', 'Client name'],
  ['client_revision', 'Client revision'],
  ['client_version_major', 'Client ver major'],
  ['client_version_minor', 'Client ver minor'],
  ['client_version_patch', 'Client ver patch'],
  ['http_method', 'HTTP method'],
  ['http_user_agent', 'HTTP UA'],
  ['http_referer', 'HTTP referer'],
  ['forwarded_for', 'Forwarded for'],
  ['quota_key', 'Quota key'],
  ['distributed_depth', 'Distributed depth'],
];

const UserModal = ({ proc, fixed, onFix, onClose }: Props) => {
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
          width: 'min(560px, calc(100vw - 16px))',
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
            Connection · <span style={{ color: 'var(--accent-on-surface)', fontFamily: 'var(--font-mono)' }}>{proc.query_id}</span>
          </div>
        </div>
        <div className="grid gap-y-1" style={{ gridTemplateColumns: 'auto 1fr' }}>
          {FIELDS.map(([key, label]) => (
            <React.Fragment key={key as string}>
              <span className="pr-4 font-medium whitespace-nowrap" style={{ color: 'var(--accent-on-surface)' }}>
                {label}
              </span>
              <span className="text-right break-all" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                {(proc as any)[key] ?? '-'}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserModal;
