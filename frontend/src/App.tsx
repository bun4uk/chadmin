import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from './components/ThemeToggle';
import TargetTile from './components/TargetTile';
import ConfirmDialog from './components/ConfirmDialog';
import CloudTargetPicker from './components/CloudTargetPicker';
import { showError, showSuccess } from './components/Toast';
import { fetchProcessesForTarget, fetchTopology, killQuery, wakeTarget } from './api/topology';
import { findTargetByNames, groupTargetsByWarehouse, warehouseForTarget } from './utils/warehouses';
import type { ProcessResponse, Target, Topology } from './types';

const SELECTED_TARGET_KEY = 'selectedTargetId';

const App = () => {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [topologyError, setTopologyError] = useState<string | null>(null);

  // Per-target data keyed by target id.
  const [targetData, setTargetData] = useState<Record<string, ProcessResponse>>({});
  const [targetError, setTargetError] = useState<Record<string, string>>({});

  const [intervalSec, setIntervalSec] = useState<number>(() => {
    const saved = localStorage.getItem('intervalSec');
    const n = saved ? Number(saved) : NaN;
    return !isNaN(n) && n > 0 ? n : 30;
  });
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    const saved = localStorage.getItem('autoRefresh');
    return saved !== null ? saved === 'true' : true;
  });
  const [timeLeft, setTimeLeft] = useState<number>(intervalSec);
  const intervalRef = useRef<number>(intervalSec);
  const refreshingRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [killingIds, setKillingIds] = useState<Set<string>>(new Set());
  const [wakingIds, setWakingIds] = useState<Set<string>>(new Set());
  const [wakeConfirmTarget, setWakeConfirmTarget] = useState<Target | null>(null);

  // Cloud-only: which service is currently displayed. For cluster/single it stays null.
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Page Visibility — pause polling when tab is hidden so we don't keep Cloud services warm.
  const [isVisible, setIsVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );
  const wasHiddenRef = useRef<boolean>(false);

  useEffect(() => { intervalRef.current = intervalSec; }, [intervalSec]);
  useEffect(() => { localStorage.setItem('intervalSec', String(intervalSec)); }, [intervalSec]);
  useEffect(() => { localStorage.setItem('autoRefresh', String(autoRefresh)); }, [autoRefresh]);

  useEffect(() => {
    const onVis = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Load topology on mount and periodically refresh state-only (cheap control-plane).
  const loadTopology = useCallback(async () => {
    try {
      const t = await fetchTopology();
      setTopology(t);
      setTopologyError(null);
    } catch (e) {
      setTopologyError((e as Error).message);
    }
  }, []);

  useEffect(() => { loadTopology(); }, [loadTopology]);

  // Topology refresh runs on its own slow cadence — decoupled from process polling.
  // Backend caches Cloud API responses for 30s; polling faster just wastes HTTP.
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;
    const id = setInterval(loadTopology, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, loadTopology, isVisible]);

  const warehouseGroups = useMemo(
    () => (topology && topology.mode === 'cloud' ? groupTargetsByWarehouse(topology.targets) : []),
    [topology],
  );

  // Resolve the initial selection once topology is available: URL → localStorage → first alphabetical.
  useEffect(() => {
    if (!topology || topology.mode !== 'cloud') return;
    if (selectedTargetId !== null) return;
    if (warehouseGroups.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const urlWarehouse = params.get('warehouse');
    const urlService = params.get('service');

    if (urlWarehouse && urlService) {
      const hit = findTargetByNames(warehouseGroups, urlWarehouse, urlService);
      if (hit) {
        setSelectedTargetId(hit.id);
        return;
      }
      showError(`Service "${urlService}" in warehouse "${urlWarehouse}" not found`);
    }

    const saved = localStorage.getItem(SELECTED_TARGET_KEY);
    if (saved && topology.targets.some(t => t.id === saved)) {
      setSelectedTargetId(saved);
      return;
    }

    const firstGroup = warehouseGroups[0];
    const first = firstGroup.targets.find(t => t.isPrimary) ?? firstGroup.targets[0];
    setSelectedTargetId(first.id);
  }, [topology, warehouseGroups, selectedTargetId]);

  // Mirror selection into URL + localStorage so deep-links and reloads land on the same service.
  useEffect(() => {
    if (!topology || topology.mode !== 'cloud' || !selectedTargetId) return;
    const target = topology.targets.find(t => t.id === selectedTargetId);
    const group = warehouseForTarget(warehouseGroups, selectedTargetId);
    if (!target || !group) return;

    const url = new URL(window.location.href);
    url.searchParams.set('warehouse', group.name);
    url.searchParams.set('service', target.name);
    window.history.replaceState({}, '', url.toString());

    localStorage.setItem(SELECTED_TARGET_KEY, selectedTargetId);
  }, [selectedTargetId, topology, warehouseGroups]);

  // The targets we actually render and poll. Cloud = just the selected one; otherwise all.
  const visibleTargets = useMemo<Target[]>(() => {
    if (!topology) return [];
    if (topology.mode !== 'cloud') return topology.targets;
    if (!selectedTargetId) return [];
    const t = topology.targets.find(x => x.id === selectedTargetId);
    return t ? [t] : [];
  }, [topology, selectedTargetId]);

  const loadAllTargets = useCallback(async () => {
    if (!topology) return;

    const queryable = visibleTargets.filter(t => t.queryable);
    // Bail out early before touching refreshingRef — otherwise an empty call (e.g. during
    // initial mount before selection is resolved) would block the next real invocation.
    if (queryable.length === 0) return;

    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setTimeLeft(intervalRef.current);

    await Promise.allSettled(queryable.map(async (target) => {
      try {
        const resp = await fetchProcessesForTarget(target.id);
        setTargetData(prev => ({ ...prev, [target.id]: resp }));
        setTargetError(prev => { const { [target.id]: _, ...rest } = prev; return rest; });
      } catch (e) {
        setTargetError(prev => ({ ...prev, [target.id]: (e as Error).message }));
      }
    }));

    // Sync killingIds against all responses — drop IDs no longer present.
    setKillingIds(prev => {
      if (prev.size === 0) return prev;
      const stillPresent = new Set<string>();
      Object.values({ ...targetData }).forEach(resp => {
        Object.values(resp.processes || {}).forEach(arr => {
          arr.forEach(p => {
            if (prev.has(p.query_id) && !p.is_cancelled) stillPresent.add(p.query_id);
          });
        });
      });
      return stillPresent;
    });

    setIsRefreshing(false);
    refreshingRef.current = false;
  }, [topology, visibleTargets]);

  useEffect(() => { loadAllTargets(); }, [loadAllTargets]);

  useEffect(() => {
    if (!autoRefresh || !topology || !isVisible) return;
    const id = setInterval(loadAllTargets, intervalRef.current * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec, loadAllTargets, topology, isVisible]);

  // Countdown timer.
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;
    const id = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : prev), 1000);
    return () => clearInterval(id);
  }, [autoRefresh, isVisible]);
  useEffect(() => { setTimeLeft(intervalSec); }, [intervalSec]);

  // When tab becomes visible again after being hidden, kick off an immediate refresh
  // so the user doesn't stare at stale data for up to `intervalSec` seconds.
  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
      return;
    }
    if (wasHiddenRef.current && autoRefresh && topology) {
      wasHiddenRef.current = false;
      loadTopology();
      loadAllTargets();
    }
  }, [isVisible, autoRefresh, topology, loadTopology, loadAllTargets]);

  const handleKill = useCallback((queryId: string, targetId: string) => {
    setKillingIds(prev => new Set(prev).add(queryId));
    killQuery(queryId, targetId)
      .then((resp) => {
        if (resp.status === 'ok') {
          showSuccess(`Query ${queryId} stopped`);
          loadAllTargets();
        } else {
          showError('Не вдалося зупинити запит');
          setKillingIds(prev => { const ns = new Set(prev); ns.delete(queryId); return ns; });
        }
      })
      .catch(() => {
        showError('Помилка запиту');
        setKillingIds(prev => { const ns = new Set(prev); ns.delete(queryId); return ns; });
      });
  }, [loadAllTargets]);

  const requestWake = useCallback((targetId: string) => {
    if (wakingIds.has(targetId)) return;
    const t = topology?.targets.find(x => x.id === targetId);
    if (t) setWakeConfirmTarget(t);
  }, [topology, wakingIds]);

  const performWake = useCallback(() => {
    const target = wakeConfirmTarget;
    if (!target) return;
    setWakeConfirmTarget(null);
    setWakingIds(prev => {
      const ns = new Set(prev);
      ns.add(target.id);
      return ns;
    });
    wakeTarget(target.id)
      .then((resp) => {
        if (resp.status === 'ok') {
          showSuccess('Wake signal sent');
          // Poll topology more aggressively for a minute to catch state transition.
          const start = Date.now();
          const pollId = setInterval(() => {
            loadTopology();
            if (Date.now() - start > 90_000) clearInterval(pollId);
          }, 5000);
        } else {
          showError(resp.error || 'Wake failed');
          // Keep in wakingIds — user requested "disable until page refresh" on failure.
        }
      })
      .catch(() => showError('Wake request failed'));
  }, [wakeConfirmTarget, loadTopology]);

  // Once a target transitions to a queryable state, drop it from wakingIds so that
  // if it later idles again the Wake button is clickable again.
  useEffect(() => {
    if (!topology) return;
    setWakingIds(prev => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      topology.targets.forEach(t => {
        if (t.queryable && next.has(t.id)) { next.delete(t.id); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [topology]);

  if (topologyError) {
    return <main className="p-4" style={{ color: 'var(--danger)' }}>Failed to load topology: {topologyError}</main>;
  }
  if (!topology) {
    return <main className="p-4">Loading topology…</main>;
  }

  const modeLabel = {
    cloud: topology.organization ? `Cloud · ${topology.organization.name}` : 'Cloud',
    cluster: 'Cluster',
    single: 'Single-node',
  }[topology.mode];

  return (
    <>
      <div
        className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2"
        style={{
          background: 'var(--bg-0)',
          color: 'var(--fg-1)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <a href="/" className="flex-shrink-0">
          <img src="/build/images/chadmin-logo.png" alt="Chadmin" className="h-7 w-8 sm:h-8 sm:w-10 object-contain" />
        </a>
        <h1 className="m-0 leading-none font-semibold" style={{ fontSize: 'var(--fs-xl)' }}>Chadmin</h1>
        <a href="/users" className="btn-accent btn-accent-sm">Users</a>
        <ThemeToggle />
        <span className="whitespace-nowrap ml-auto sm:ml-0" style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>
          <span className="sm:hidden">{topology.organization?.name ?? modeLabel}</span>
          <span className="hidden sm:inline">{modeLabel}</span>
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap basis-full sm:basis-auto sm:ml-auto">
          {topology.mode === 'cloud' && warehouseGroups.length > 0 && (
            <CloudTargetPicker
              groups={warehouseGroups}
              selectedTargetId={selectedTargetId}
              onSelect={setSelectedTargetId}
            />
          )}
          <select
            className="ch-select flex-shrink-0"
            value={intervalSec}
            onChange={e => setIntervalSec(Number(e.target.value))}
          >
            {[5, 10, 30, 60, 300].map(v => (
              <option key={v} value={v}>{v} s</option>
            ))}
          </select>
          {autoRefresh && isVisible && (
            <span
              className="flex-shrink-0 tabular min-w-[2.5rem] text-center"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-on-surface)' }}
            >
              {timeLeft}s
            </span>
          )}
          {!isVisible && (
            <span
              className="flex-shrink-0"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}
              title="Polling paused — tab is hidden"
            >
              paused
            </span>
          )}
          <label className="flex items-center gap-1 flex-shrink-0" title="Auto refresh" style={{ fontSize: 'var(--fs-body)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="hidden sm:inline">Auto</span>
          </label>
          <button
            className="btn-accent btn-accent-sm flex-shrink-0"
            onClick={loadAllTargets}
            disabled={isRefreshing}
            title="Refresh now"
          >
            Refresh
          </button>
        </div>
      </div>

      <main className={`${isRefreshing ? 'animate-pulse ' : ''}grid gap-4 p-2 sm:p-4 grid-cols-1`}>
        {topology.targets.length === 0 && (
          <p style={{ color: 'var(--fg-3)' }}>No targets in current topology.</p>
        )}
        {topology.mode === 'cloud' && topology.targets.length > 0 && visibleTargets.length === 0 && (
          <p style={{ color: 'var(--fg-3)' }}>Select a service above.</p>
        )}
        {visibleTargets.map((target: Target) => (
          <TargetTile
            key={target.id}
            target={target}
            data={targetData[target.id]}
            killingIds={killingIds}
            onKill={handleKill}
            onWake={requestWake}
            isWaking={wakingIds.has(target.id)}
            error={targetError[target.id]}
          />
        ))}
      </main>

      {wakeConfirmTarget && (
        <ConfirmDialog
          title="Wake service?"
          message={
            'Send wake signal to "' + wakeConfirmTarget.name + '" (currently ' + wakeConfirmTarget.state + ')?'
            + '\n\nClickHouse Cloud may take a few minutes to bring the service online.'
          }
          confirmLabel="Wake"
          onConfirm={performWake}
          onCancel={() => setWakeConfirmTarget(null)}
        />
      )}
    </>
  );
};

export default App;
