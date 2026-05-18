import React from 'react';
import type { Target } from '../types';
import type { WarehouseGroup } from '../utils/warehouses';

interface Props {
  groups: WarehouseGroup[];
  selectedTargetId: string | null;
  onSelect: (targetId: string) => void;
}

const CloudTargetPicker = ({ groups, selectedTargetId, onSelect }: Props) => {
  if (groups.length === 0) return null;

  const currentGroup = groups.find(g => g.targets.some(t => t.id === selectedTargetId)) ?? groups[0];
  const currentTarget: Target =
    currentGroup.targets.find(t => t.id === selectedTargetId) ?? currentGroup.targets[0];

  const groupKey = (g: WarehouseGroup) => g.id ?? `__standalone__${g.name}`;

  const onWarehouseChange = (key: string) => {
    const g = groups.find(x => groupKey(x) === key);
    if (!g) return;
    const next = g.targets.find(t => t.isPrimary) ?? g.targets[0];
    onSelect(next.id);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {groups.length > 1 && (
        <select
          className="ch-select ch-select-brand max-w-[130px] sm:max-w-[220px]"
          value={groupKey(currentGroup)}
          onChange={e => onWarehouseChange(e.target.value)}
          title="Warehouse"
        >
          {groups.map(g => (
            <option key={groupKey(g)} value={groupKey(g)}>{g.name}</option>
          ))}
        </select>
      )}
      {currentGroup.targets.length > 1 && (
        <select
          className="ch-select ch-select-brand max-w-[130px] sm:max-w-[220px]"
          value={currentTarget.id}
          onChange={e => onSelect(e.target.value)}
          title="Service"
        >
          {currentGroup.targets.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}{t.isPrimary ? ' ★' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default CloudTargetPicker;
