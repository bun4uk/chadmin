import React from 'react';
import type { TargetState } from '../types';

interface Props {
  state: TargetState;
}

const STATE_MAP: Record<TargetState, { label: string; bg: string; fg: string }> = {
  running:          { label: 'running',       bg: 'var(--state-running-bg)',  fg: 'var(--state-running-fg)' },
  partiallyRunning: { label: 'partial',       bg: 'var(--state-partial-bg)',  fg: 'var(--state-partial-fg)' },
  degraded:         { label: 'degraded',      bg: 'var(--state-degraded-bg)', fg: 'var(--state-degraded-fg)' },
  idle:             { label: 'idle',          bg: 'var(--state-idle-bg)',     fg: 'var(--state-idle-fg)' },
  stopped:          { label: 'stopped',       bg: 'var(--state-stopped-bg)',  fg: 'var(--state-stopped-fg)' },
  awaking:          { label: 'awaking…',      bg: 'var(--state-awaking-bg)',  fg: 'var(--state-awaking-fg)' },
  starting:         { label: 'starting…',     bg: 'var(--state-awaking-bg)',  fg: 'var(--state-awaking-fg)' },
  stopping:         { label: 'stopping…',     bg: 'var(--state-partial-bg)',  fg: 'var(--state-partial-fg)' },
  provisioning:     { label: 'provisioning',  bg: 'var(--state-awaking-bg)',  fg: 'var(--state-awaking-fg)' },
  terminating:      { label: 'terminating',   bg: 'var(--state-failed-bg)',   fg: 'var(--state-failed-fg)' },
  terminated:       { label: 'terminated',    bg: 'var(--state-stopped-bg)',  fg: 'var(--state-stopped-fg)' },
  softDeleting:     { label: 'soft-deleting', bg: 'var(--state-failed-bg)',   fg: 'var(--state-failed-fg)' },
  softDeleted:      { label: 'soft-deleted',  bg: 'var(--state-stopped-bg)',  fg: 'var(--state-stopped-fg)' },
  failed:           { label: 'failed',        bg: 'var(--state-failed-bg)',   fg: 'var(--state-failed-fg)' },
  unknown:          { label: 'unknown',       bg: 'var(--state-stopped-bg)',  fg: 'var(--state-stopped-fg)' },
};

const StateBadge = ({ state }: Props) => {
  const s = STATE_MAP[state] ?? STATE_MAP.unknown;
  return (
    <span
      className="label-caps inline-block whitespace-nowrap"
      style={{
        background: s.bg,
        color: s.fg,
        padding: '2px 8px',
        borderRadius: 'var(--r-pill)',
      }}
    >
      {s.label}
    </span>
  );
};

export default StateBadge;
