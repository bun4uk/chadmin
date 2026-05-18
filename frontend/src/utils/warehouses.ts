import type { Target } from '../types';

export interface WarehouseGroup {
  // Warehouse id from Cloud API, or null for standalone services (grouped individually).
  id: string | null;
  // Display name — primary service's name when present, otherwise alphabetically first.
  name: string;
  targets: Target[];
}

// Groups Cloud targets by `warehouseId`. Services with null warehouseId become their own
// single-member group so the selector can treat them uniformly.
export function groupTargetsByWarehouse(targets: Target[]): WarehouseGroup[] {
  const byId = new Map<string, Target[]>();
  const standalone: Target[] = [];

  for (const t of targets) {
    if (t.warehouseId) {
      const bucket = byId.get(t.warehouseId) ?? [];
      bucket.push(t);
      byId.set(t.warehouseId, bucket);
    } else {
      standalone.push(t);
    }
  }

  const groups: WarehouseGroup[] = [];
  for (const [id, ts] of byId) {
    const sorted = [...ts].sort((a, b) => a.name.localeCompare(b.name));
    const primary = sorted.find(t => t.isPrimary);
    groups.push({ id, name: (primary ?? sorted[0]).name, targets: sorted });
  }
  for (const t of standalone) {
    groups.push({ id: null, name: t.name, targets: [t] });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

// Finds a target by warehouse-name + service-name pair (both case-insensitive).
export function findTargetByNames(
  groups: WarehouseGroup[],
  warehouseName: string,
  serviceName: string,
): Target | null {
  const wh = groups.find(g => g.name.toLowerCase() === warehouseName.toLowerCase());
  if (!wh) return null;
  return wh.targets.find(t => t.name.toLowerCase() === serviceName.toLowerCase()) ?? null;
}

// Resolves which warehouse group a target belongs to.
export function warehouseForTarget(groups: WarehouseGroup[], targetId: string): WarehouseGroup | null {
  return groups.find(g => g.targets.some(t => t.id === targetId)) ?? null;
}
