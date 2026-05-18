import React from 'react';
import type { Target } from '../types';

interface Props {
  targets: Target[];
  currentId: string | null;
  onChange: (id: string) => void;
}

const TargetSelector = ({ targets, currentId, onChange }: Props) => {
  if (targets.length <= 1) return null;

  return (
    <select
      className="ch-select ch-select-brand"
      value={currentId ?? ''}
      onChange={e => onChange(e.target.value)}
    >
      {targets.map(t => (
        <option key={t.id} value={t.id} disabled={!t.queryable}>
          {t.name}{t.queryable ? '' : ` (${t.state})`}
        </option>
      ))}
    </select>
  );
};

export default TargetSelector;
