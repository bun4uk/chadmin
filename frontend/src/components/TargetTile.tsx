import React, { useEffect, useState } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import StateBadge from './StateBadge';
import QueryModal from './QueryModal';
import MemoryModal from './MemoryModal';
import UserModal from './UserModal';
import { showSuccess, showError } from './Toast';
import { copy } from '../utils/clipboard';
import type { ProcessResponse, QueryProcess, Target } from '../types';

interface Props {
  target: Target;
  data?: ProcessResponse | null;
  killingIds: Set<string>;
  onKill: (queryId: string, targetId: string) => void;
  onWake?: (targetId: string) => void;
  isWaking?: boolean;
  error?: string | null;
}

const BASE_COLOR = { r: 156, g: 163, b: 175 };

function getRamColor(usedBytes: number, availBytes: number) {
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const coolR = isLight ? 90 : BASE_COLOR.r;
  const coolG = isLight ? 90 : BASE_COLOR.g;
  const coolB = isLight ? 85 : BASE_COLOR.b;
  if (!usedBytes || !availBytes) return `rgb(${coolR}, ${coolG}, ${coolB})`;
  const ratio = usedBytes / availBytes;
  const redStart = 0.2;
  const redFull = 0.7;
  let t = 0;
  if (ratio > redStart) {
    t = Math.min(1, (ratio - redStart) / (redFull - redStart));
  }
  const hotR = 255, hotG = 0, hotB = 0;
  const r = Math.round(coolR + (hotR - coolR) * t);
  const g = Math.round(coolG + (hotG - coolG) * t);
  const b = Math.round(coolB + (hotB - coolB) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getElapsedColor(sec: number) {
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  if (sec <= 30) return isLight ? '#000000' : '#ffffff';
  const ratio = Math.min(1, (sec - 30) / 270);
  if (isLight) {
    // black → red: rgb(0,0,0) → rgb(255,0,0)
    const r = Math.round(255 * ratio);
    return `rgb(${r}, 0, 0)`;
  }
  // white → red: rgb(255,255,255) → rgb(255,0,0)
  const gb = Math.round(255 * (1 - ratio));
  return `rgb(255, ${gb}, ${gb})`;
}

function computeLabel(target: Target): string | null {
  const parts: string[] = [];
  if (target.numReplicas) {
    parts.push(`${target.numReplicas}×`);
  }
  if (target.minMemoryGb != null && target.maxMemoryGb != null) {
    parts.push(target.minMemoryGb === target.maxMemoryGb ? `${target.minMemoryGb}GB` : `${target.minMemoryGb}-${target.maxMemoryGb}GB`);
  }
  return parts.length ? parts.join(' ') : null;
}

function locationLabel(target: Target): string | null {
  if (target.provider && target.region) return `${target.provider.toUpperCase()} ${target.region}`;
  if (target.region) return target.region;
  return null;
}

const TargetTile = ({ target, data, killingIds, onKill, onWake, isWaking, error }: Props) => {
  const [tick, setTick] = useState<number>(0);
  useEffect(() => setTick(0), [data]);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [modalQuery, setModalQuery] = useState<{ id: string; sql: string } | null>(null);
  const [modalFixed, setModalFixed] = useState(false);
  const [memModal, setMemModal] = useState<{ proc: QueryProcess } | null>(null);
  const [memFixed, setMemFixed] = useState(false);
  const [userModal, setUserModal] = useState<{ proc: QueryProcess } | null>(null);
  const [userFixed, setUserFixed] = useState(false);

  const compute = computeLabel(target);
  const location = locationLabel(target);

  const sleeping = data?.sleeping === true || !target.queryable;
  const nodes = data && !sleeping ? Object.entries(data.processes) : [];

  let sleepingHint = ' Not polling SQL.';
  if (isWaking) {
    sleepingHint = ' Wake signal sent — waiting for the service to come online…';
  } else if (target.mode === 'cloud') {
    sleepingHint = ' Not polling SQL — click Wake to resume.';
  }

  return (
    <section
      className="rounded"
      style={{
        background: 'var(--bg-1)',
        border: '2px solid var(--accent-on-surface)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-1)',
        color: 'var(--fg-1)',
      }}
    >
      <header
        className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap px-2 py-2 sm:px-4"
        style={{ borderBottom: '1px solid var(--border-2)' }}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2
            className="m-0 truncate font-semibold"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)', letterSpacing: '-0.01em' }}
          >
            {target.name}
          </h2>
          <StateBadge state={target.state} />
          {target.isPrimary && (
            <span
              className="label-caps"
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--accent-on-surface)',
                color: 'var(--accent-on-surface)',
              }}
            >
              primary
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{ color: 'var(--fg-3)', fontSize: 'var(--fs-xs)' }}
        >
          {compute && <span>{compute}</span>}
          {location && <span>{location}</span>}
          {target.clickhouseVersion && <span>CH {target.clickhouseVersion}</span>}
          {sleeping && onWake && target.mode === 'cloud' && (
            <button
              className="btn-accent btn-accent-sm"
              disabled={isWaking}
              onClick={() => onWake(target.id)}
            >
              {isWaking ? 'Waking…' : 'Wake'}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="p-2 sm:p-4 text-sm" style={{ color: 'var(--danger)' }}>
          Error: {error}
        </div>
      )}

      {!error && sleeping && (
        <div className="p-3 sm:p-6 flex items-center gap-3 italic" style={{ color: 'var(--fg-3)' }}>
          <span aria-hidden className="text-2xl not-italic">💤</span>
          <span>Service is {target.state}.{sleepingHint}</span>
        </div>
      )}

      {!error && !sleeping && !data && (
        <div className="p-2 sm:p-4" style={{ color: 'var(--fg-3)' }}>Loading…</div>
      )}

      {!error && !sleeping && data && nodes.length === 0 && (
        <div className="p-2 sm:p-4 italic" style={{ color: 'var(--fg-3)' }}>No active queries.</div>
      )}

      {!error && !sleeping && data && nodes.length > 0 && (
        <div className="grid gap-2 sm:gap-4 p-2 sm:p-4 grid-cols-1">
          {nodes.map(([nodeName, processes]) => {
            const valid = processes.filter(p => p.query_id && p.user && p.elapsed != null);
            const memMetrics = data.memory_metrics?.[nodeName];
            const cgTotal = memMetrics?.CGroupMemoryTotal;
            const cgUsed = memMetrics?.CGroupMemoryUsed;
            const cgTotalBytes = cgTotal ? Number(cgTotal.bytes) : 0;
            const availMetric = cgTotalBytes > 0 ? cgTotal : memMetrics?.OSMemoryTotal;
            const usedMetric = cgUsed ? cgUsed : memMetrics?.MemoryResident;
            const readableUsed = usedMetric?.readable_size;
            const readableAvail = availMetric?.readable_size;
            const usedBytes = usedMetric ? Number(usedMetric.bytes) : NaN;
            const availBytes = availMetric ? Number(availMetric.bytes) : NaN;
            const ramColor = getRamColor(usedBytes, availBytes);

            return (
              <div
                key={nodeName}
                className="p-2 sm:p-3"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                  <h3
                    className="m-0 truncate font-medium"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}
                    title={nodeName}
                  >
                    {nodeName}
                  </h3>
                  {readableUsed && readableAvail && (
                    <span
                      className="tabular whitespace-nowrap"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: ramColor }}
                    >
                      RAM {readableUsed} / {readableAvail}
                    </span>
                  )}
                  <span
                    className="whitespace-nowrap"
                    style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-2)' }}
                  >
                    Active queries: {valid.length}
                  </span>
                </div>
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <table className="w-full table-auto" style={{ fontSize: 'var(--fs-body)', minWidth: 420 }}>
                    <thead>
                      <tr>
                        <th className="text-left px-1 py-1 sm:w-80 label-caps" style={{ color: 'var(--accent-on-surface)' }}>ID</th>
                        <th className="text-left px-1 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>User</th>
                        <th className="text-left px-1 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>Elapsed</th>
                        <th className="text-left px-1 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>Memory</th>
                        <th className="text-center px-1 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>Actions</th>
                      </tr>
                    </thead>
                    <TransitionGroup component="tbody">
                      {valid.map(proc => {
                        const elapsedTotal = Math.round(proc.elapsed) + tick;
                        const nodeRef = React.createRef<HTMLTableRowElement>();
                        return (
                          <CSSTransition key={proc.query_id} timeout={300} classNames="fade" nodeRef={nodeRef}>
                            <TableRow
                              ref={nodeRef as any}
                              proc={proc}
                              elapsed={elapsedTotal}
                              onKill={(id) => onKill(id, target.id)}
                              isKilling={killingIds.has(proc.query_id) || !!proc.is_cancelled}
                              onHover={(id, sql) => setModalQuery({ id, sql })}
                              onLeave={() => { if (!modalFixed) setModalQuery(null); }}
                              onFix={(id, sql) => { setModalQuery({ id, sql }); setModalFixed(true); }}
                              modalFixed={modalFixed}
                              onMemHover={(p) => setMemModal({ proc: p })}
                              onMemLeave={() => { if (!memFixed) setMemModal(null); }}
                              onMemFix={(p) => { setMemModal({ proc: p }); setMemFixed(true); }}
                              memFixed={memFixed}
                              onUserHover={(p) => setUserModal({ proc: p })}
                              onUserLeave={() => { if (!userFixed) setUserModal(null); }}
                              onUserFix={(p) => { setUserModal({ proc: p }); setUserFixed(true); }}
                              userFixed={userFixed}
                            />
                          </CSSTransition>
                        );
                      })}
                    </TransitionGroup>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalQuery && (
        <QueryModal
          queryId={modalQuery.id}
          sql={modalQuery.sql}
          fixed={modalFixed}
          onFix={() => setModalFixed(true)}
          onClose={() => { setModalQuery(null); setModalFixed(false); }}
          onCopyId={() => copy(modalQuery.id).then(ok => ok ? showSuccess('ID copied') : showError('Copy failed'))}
          onCopySql={() => copy(modalQuery.sql).then(ok => ok ? showSuccess('SQL copied') : showError('Copy failed'))}
        />
      )}
      {memModal && (
        <MemoryModal
          proc={memModal.proc}
          fixed={memFixed}
          onFix={() => setMemFixed(true)}
          onClose={() => { setMemModal(null); setMemFixed(false); }}
        />
      )}
      {userModal && (
        <UserModal
          proc={userModal.proc}
          fixed={userFixed}
          onFix={() => setUserFixed(true)}
          onClose={() => { setUserModal(null); setUserFixed(false); }}
        />
      )}
    </section>
  );
};

interface RowProps {
  proc: QueryProcess;
  onKill: (id: string) => void;
  elapsed: number;
  isKilling: boolean;
  onHover: (id: string, sql: string) => void;
  onLeave: () => void;
  onFix: (id: string, sql: string) => void;
  modalFixed: boolean;
  onMemHover: (proc: QueryProcess) => void;
  onMemLeave: () => void;
  onMemFix: (proc: QueryProcess) => void;
  memFixed?: boolean;
  onUserHover: (proc: QueryProcess) => void;
  onUserLeave: () => void;
  onUserFix: (proc: QueryProcess) => void;
  userFixed?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, RowProps>(
  (
    { proc, onKill, elapsed, isKilling, onHover, onLeave, onFix, modalFixed,
      onMemHover, onMemLeave, onMemFix, memFixed,
      onUserHover, onUserLeave, onUserFix, userFixed }, ref,
  ) => {
    const [formatted, setFormatted] = useState<boolean>(true);
    const [clicked, setClicked] = useState<boolean>(false);
    const [hovered, setHovered] = useState<boolean>(false);

    const formatDuration = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const parts: string[] = [];
      if (h) parts.push(`${h}h`);
      if (m || h) parts.push(`${m}m`);
      parts.push(`${s}s`);
      return parts.join(' ');
    };

    const elapsedText = formatted ? formatDuration(elapsed) : `${elapsed}s`;

    return (
      <tr
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderTop: '1px solid var(--border-3)',
          background: hovered ? 'var(--bg-hover)' : 'transparent',
          transition: 'background var(--dur-1) var(--ease-std)',
        }}
      >
        <td
          className="px-1 cursor-pointer max-w-[120px] sm:max-w-[260px] sm:w-60 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{
            color: 'var(--accent-on-surface)',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'underline dotted',
          }}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover(proc.query_id, proc.query); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') onLeave(); }}
          onClick={() => onFix(proc.query_id, proc.query)}
        >
          <span className="sm:hidden">{(proc.query_id ?? '').slice(0, 5)}..</span>
          <span className="hidden sm:inline">{proc.query_id}</span>
        </td>
        <td
          className="cursor-pointer"
          style={{ textDecoration: 'underline dotted' }}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !userFixed) onUserHover(proc); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !userFixed) onUserLeave(); }}
          onClick={() => onUserFix(proc)}
        >
          <span className="sm:hidden">{(proc.user ?? '').slice(0, 8)}..</span>
          <span className="hidden sm:inline">{proc.user}</span>
        </td>
        <td
          className="cursor-pointer tabular"
          style={{ color: getElapsedColor(elapsed), fontFamily: 'var(--font-mono)' }}
          onClick={() => setFormatted(f => !f)}
        >
          {elapsedText}
        </td>
        <td
          className="cursor-pointer"
          style={{
            textDecoration: 'underline dotted',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-sm)',
          }}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !memFixed) onMemHover(proc); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !memFixed) onMemLeave(); }}
          onClick={() => onMemFix(proc)}
        >
          {proc.formatted_memory_usage}
        </td>
        <td className="text-center">
          <button
            className="btn-danger btn-danger-sm"
            disabled={isKilling}
            onClick={() => { setClicked(true); onKill(proc.query_id); }}
          >
            {isKilling ? (clicked ? 'Killing...' : 'Killing') : 'Kill'}
          </button>
        </td>
      </tr>
    );
  },
);
TableRow.displayName = 'TableRow';

export default TargetTile;
