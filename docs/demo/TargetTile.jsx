// TargetTile.jsx — node tile with query table
const BASE_RAM = { r: 156, g: 163, b: 175 };
function ramColor(used, avail, isLight) {
  const coolR = isLight ? 90 : BASE_RAM.r;
  const coolG = isLight ? 90 : BASE_RAM.g;
  const coolB = isLight ? 85 : BASE_RAM.b;
  if (!used || !avail) return `rgb(${coolR},${coolG},${coolB})`;
  const ratio = used / avail;
  const start = 0.2, full = 0.7;
  let t = 0;
  if (ratio > start) t = Math.min(1, (ratio - start) / (full - start));
  // Hot color: red in both themes, slightly darker in light
  const hotR = 255, hotG = 0, hotB = 0;
  const r = Math.round(coolR + (hotR - coolR) * t);
  const g = Math.round(coolG + (hotG - coolG) * t);
  const b = Math.round(coolB + (hotB - coolB) * t);
  return `rgb(${r},${g},${b})`;
}
function elapsedColor(sec, isLight) {
  if (sec <= 30) return isLight ? '#000' : '#fff';
  const ratio = Math.min(1, (sec - 30) / 270);
  const gb = Math.round(255 * (1 - ratio));
  return `rgb(255,${gb},${gb})`;
}
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h) parts.push(h + 'h');
  if (m || h) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

function TargetTile({ target, data, killingIds, wakingIds, onKill, onWake, onOpenQuery, onOpenMemory, onOpenUser, theme }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { setTick(0); }, [data]);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const sleeping = !target.queryable || data?.sleeping === true;
  const nodes = data && !sleeping ? Object.entries(data.processes || {}) : [];
  const isLight = theme === 'light';

  const compute = (() => {
    const parts = [];
    if (target.numReplicas) parts.push(target.numReplicas + '×');
    if (target.minMemoryGb != null && target.maxMemoryGb != null) {
      parts.push(target.minMemoryGb === target.maxMemoryGb ? `${target.minMemoryGb}GB` : `${target.minMemoryGb}-${target.maxMemoryGb}GB`);
    }
    return parts.length ? parts.join(' ') : null;
  })();

  const location = target.provider && target.region ? `${target.provider.toUpperCase()} ${target.region}` : target.region;
  const isWaking = wakingIds.has(target.id);

  return (
    <section className="border-2 rounded shadow" style={{ background: 'var(--bg-0)', borderColor: 'var(--accent-on-surface)' }}>
      <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-2 border-b" style={{ borderColor: 'var(--border-2)' }}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="m-0 truncate font-medium" style={{ fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '-0.01em' }}>{target.name}</h2>
          <window.StateBadge state={target.state} />
          {target.isPrimary && (
            <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--accent-on-surface)', color: 'var(--accent-on-surface)' }}>primary</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--fg-3)' }}>
          {compute && <span>{compute}</span>}
          {location && <span>{location}</span>}
          {target.clickhouseVersion && <span>CH {target.clickhouseVersion}</span>}
          {sleeping && target.mode === 'cloud' && (
            <button
              disabled={isWaking}
              onClick={() => onWake(target.id)}
              className="px-2 py-0.5 rounded border transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--accent-on-surface)', borderColor: 'var(--accent-on-surface)' }}
              onMouseEnter={(e) => { if (!isWaking) { e.currentTarget.style.background = 'var(--accent-on-surface)'; e.currentTarget.style.color = 'var(--bg-0)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-on-surface)'; }}
            >
              {isWaking ? 'Waking…' : 'Wake'}
            </button>
          )}
        </div>
      </header>

      {sleeping && (
        <div className="p-6 flex items-center gap-3 italic" style={{ color: 'var(--fg-3)' }}>
          <span aria-hidden className="text-2xl not-italic">💤</span>
          <span>
            Service is {target.state}.
            {isWaking ? ' Wake signal sent — waiting for the service to come online…'
              : target.mode === 'cloud' ? ' Not polling SQL — click Wake to resume.'
              : ' Not polling SQL.'}
          </span>
        </div>
      )}

      {!sleeping && nodes.length === 0 && (
        <div className="p-4" style={{ color: 'var(--fg-3)' }}>No active queries.</div>
      )}

      {!sleeping && nodes.length > 0 && (
        <div className="grid gap-4 p-2 sm:p-4">
          {nodes.map(([nodeName, processes]) => {
            const mem = data.memory_metrics?.[nodeName];
            const cgTotal = mem?.CGroupMemoryTotal;
            const cgUsed = mem?.CGroupMemoryUsed;
            const availMetric = cgTotal && Number(cgTotal.bytes) > 0 ? cgTotal : mem?.OSMemoryTotal;
            const usedMetric = cgUsed ? cgUsed : mem?.MemoryResident;
            const usedBytes = usedMetric ? Number(usedMetric.bytes) : NaN;
            const availBytes = availMetric ? Number(availMetric.bytes) : NaN;
            const rc = ramColor(usedBytes, availBytes, isLight);

            return (
              <div key={nodeName} className="rounded p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)' }}>
                <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                  <h3 className="m-0 truncate text-sm font-medium" style={{ fontFamily: 'var(--font-mono)' }} title={nodeName}>{nodeName}</h3>
                  {usedMetric && availMetric && (
                    <span className="text-xs whitespace-nowrap font-mono" style={{ color: rc }}>
                      RAM {usedMetric.readable_size} / {availMetric.readable_size}
                    </span>
                  )}
                  <span className="text-xs whitespace-nowrap">Active queries: {processes.length}</span>
                </div>
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full text-sm table-auto" style={{ minWidth: 420 }}>
                  <thead>
                    <tr>
                      <th className="text-left px-1 py-1 text-xs font-medium" style={{ color: 'var(--accent-on-surface)' }}>ID</th>
                      <th className="text-left px-1 py-1 text-xs font-medium" style={{ color: 'var(--accent-on-surface)' }}>User</th>
                      <th className="text-left px-1 py-1 text-xs font-medium" style={{ color: 'var(--accent-on-surface)' }}>Elapsed</th>
                      <th className="text-left px-1 py-1 text-xs font-medium" style={{ color: 'var(--accent-on-surface)' }}>Memory</th>
                      <th className="text-center px-1 py-1 text-xs font-medium" style={{ color: 'var(--accent-on-surface)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map(p => {
                      const el = Math.round(p.elapsed) + tick;
                      const isKilling = killingIds.has(p.query_id) || p.is_cancelled;
                      return (
                        <tr key={p.query_id} style={{ borderTop: '1px solid #3a3a36' }}>
                          <td
                            className="px-1 py-1 cursor-pointer font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-[260px]"
                            style={{ color: 'var(--accent-on-surface)', textDecoration: 'underline dotted' }}
                            onClick={() => onOpenQuery(p)}
                          >{p.query_id}</td>
                          <td
                            className="px-1 py-1 cursor-pointer relative"
                            style={{ textDecoration: 'underline dotted' }}
                            onClick={(e) => onOpenUser && onOpenUser(p, e.currentTarget)}
                          >{p.user}</td>
                          <td className="px-1 py-1 cursor-pointer font-mono" style={{ color: elapsedColor(el, isLight) }}>
                            {fmtDuration(el)}
                          </td>
                          <td
                            className="px-1 py-1 cursor-pointer font-mono text-xs"
                            style={{ textDecoration: 'underline dotted' }}
                            onClick={(e) => onOpenMemory(p, e.currentTarget)}
                          >{p.formatted_memory_usage}</td>
                          <td className="px-1 py-1 text-center">
                            <button
                              disabled={isKilling}
                              onClick={() => onKill(p.query_id, target.id)}
                              className="px-2 rounded border transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                              style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }}
                              onMouseEnter={(e) => { if (!isKilling) { e.currentTarget.style.background = '#ff6b6b'; e.currentTarget.style.color = 'var(--bg-0)'; } }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff6b6b'; }}
                            >{isKilling ? 'Killing…' : 'Kill'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

window.TargetTile = TargetTile;
