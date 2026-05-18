// Shell.jsx — shared top chrome
function Shell({ topology, selectedTargetId, onSelectTarget, intervalSec, onIntervalChange, autoRefresh, onAutoChange, timeLeft, isVisible, isRefreshing, onRefresh, theme, onThemeToggle, currentPage, onNavigate }) {
  const modeLabel = {
    cloud: topology.organization ? `Cloud · ${topology.organization.name}` : 'Cloud',
    cluster: 'Cluster',
    single: 'Single-node',
  }[topology.mode];

  const groups = React.useMemo(() => {
    if (topology.mode !== 'cloud') return [];
    const map = new Map();
    topology.targets.forEach(t => {
      const key = t.warehouseId || `__${t.name}`;
      if (!map.has(key)) map.set(key, { id: t.warehouseId, name: t.warehouseName || t.name, targets: [] });
      map.get(key).targets.push(t);
    });
    return Array.from(map.values());
  }, [topology]);

  const currentGroup = groups.find(g => g.targets.some(t => t.id === selectedTargetId)) ?? groups[0];
  const currentTarget = currentGroup?.targets.find(t => t.id === selectedTargetId) ?? currentGroup?.targets[0];
  const isUsersPage = currentPage === 'users';

  return (
    <div className="border-b px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ background: 'var(--bg-0)', borderColor: 'var(--border-1)', color: 'var(--fg-1)' }}>
      <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('query'); }} className="flex-shrink-0">
        <img src="../assets/chadmin-logo.png" alt="Chadmin" style={{ height: 32, width: 40, objectFit: 'contain' }} />
      </a>
      <h1 className="font-semibold text-xl m-0 leading-none">Chadmin</h1>

      {!isUsersPage ? (
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('users'); }}
           className="btn-accent btn-accent-sm no-underline">Users</a>
      ) : (
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('query'); }}
           className="btn-accent btn-accent-sm no-underline">Query Monitor</a>
      )}

      <ThemeSwitch theme={theme} onToggle={onThemeToggle} />

      <span className="text-xs ml-auto sm:ml-0" style={{ color: 'var(--fg-3)' }}>{modeLabel}</span>

      <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
        {topology.mode === 'cloud' && groups.length > 0 && (
          <>
            {groups.length > 1 && (
              <select
                className="ch-select ch-select-brand"
                style={{ maxWidth: 220 }}
                value={currentGroup.id ?? `__${currentGroup.name}`}
                onChange={(e) => {
                  const g = groups.find(x => (x.id ?? `__${x.name}`) === e.target.value);
                  if (g) {
                    const next = g.targets.find(t => t.isPrimary) ?? g.targets[0];
                    onSelectTarget(next.id);
                  }
                }}
              >
                {groups.map(g => <option key={g.id ?? g.name} value={g.id ?? `__${g.name}`}>{g.name}</option>)}
              </select>
            )}
            {currentGroup && currentGroup.targets.length > 1 && (
              <select
                className="ch-select ch-select-brand"
                style={{ maxWidth: 220 }}
                value={currentTarget.id}
                onChange={(e) => onSelectTarget(e.target.value)}
              >
                {currentGroup.targets.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.isPrimary ? ' ★' : ''}</option>
                ))}
              </select>
            )}
          </>
        )}

        <select
          className="ch-select"
          value={intervalSec}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
        >
          {[5, 10, 30, 60, 300].map(v => <option key={v} value={v}>{v} s</option>)}
        </select>

        {autoRefresh && isVisible && (
          <span className="text-xs tabular-nums min-w-[2.5rem] text-center" style={{ color: 'var(--accent-on-surface)' }}>{timeLeft}s</span>
        )}
        {!isVisible && (
          <span className="text-xs" style={{ color: 'var(--fg-3)' }} title="Polling paused — tab is hidden">paused</span>
        )}

        <label className="flex items-center gap-1 text-sm" title="Auto refresh">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => onAutoChange(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Auto
        </label>

        <button
          disabled={isRefreshing}
          onClick={onRefresh}
          className="btn-accent btn-accent-sm"
          title="Refresh now"
        >Refresh</button>
      </div>
    </div>
  );
}

function ThemeSwitch({ theme, onToggle }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: theme === 'dark' ? 0.4 : 1 }}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <button
        onClick={onToggle}
        aria-label="Toggle theme"
        className="relative inline-block rounded-full cursor-pointer"
        style={{ width: 36, height: 20, background: 'var(--accent)', transition: '.15s', border: '1px solid var(--border-1)' }}
      >
        <span style={{ position: 'absolute', top: 2, left: theme === 'dark' ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--bg-0)', transition: '.15s' }} />
      </button>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: theme === 'dark' ? 1 : 0.4 }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </span>
  );
}

window.Shell = Shell;
