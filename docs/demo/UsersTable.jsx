// UsersTable.jsx
function UsersTable({ data, onDelete, onCopyUser }) {
  const [sort, setSort] = React.useState({ key: 'user', dir: 'asc' });
  const [copiedUser, setCopiedUser] = React.useState(null);

  const userMap = React.useMemo(() => {
    const map = new Map();
    (data.users || []).forEach(u => map.set(u.name, { roles: [], grants: [], lastQueryAt: u.last_query_at }));
    (data.user_roles || []).forEach(ur => {
      if (!map.has(ur.user_name)) map.set(ur.user_name, { roles: [], grants: [], lastQueryAt: null });
      map.get(ur.user_name).roles.push(ur.role_name);
    });
    (data.user_grants || []).forEach(g => {
      if (!map.has(g.user_name)) map.set(g.user_name, { roles: [], grants: [], lastQueryAt: null });
      map.get(g.user_name).grants.push(g);
    });
    return map;
  }, [data]);

  const rows = React.useMemo(() => {
    const out = Array.from(userMap.entries()).map(([user, info]) => ({ user, ...info }));
    const cmp = (a, b) => {
      let r = 0;
      if (sort.key === 'user') r = a.user.localeCompare(b.user);
      else if (sort.key === 'roles') r = a.roles.length - b.roles.length;
      else if (sort.key === 'grants') r = a.grants.length - b.grants.length;
      else if (sort.key === 'lastQueryAt') {
        const at = a.lastQueryAt ? new Date(a.lastQueryAt).getTime() : Infinity;
        const bt = b.lastQueryAt ? new Date(b.lastQueryAt).getTime() : Infinity;
        r = at - bt;
      }
      return sort.dir === 'asc' ? r : -r;
    };
    return out.sort(cmp);
  }, [userMap, sort]);

  const toggleSort = (k) => setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' });
  const arrow = (k) => sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : '';

  const { addToast } = window.useToast();
  const copyUser = async (u) => {
    try { await navigator.clipboard.writeText(u); setCopiedUser(u); setTimeout(() => setCopiedUser(null), 1200); }
    catch { addToast('Copy failed', 'error'); }
  };

  return (
    <section>
      <h3 className="font-semibold text-base mb-2">Users</h3>
      <div className="overflow-auto rounded" style={{ border: '1px solid var(--accent-on-surface)' }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {[['user', 'User'], ['roles', 'Roles'], ['grants', 'Direct grants'], ['lastQueryAt', 'Last query']].map(([k, label]) => (
                <th key={k} className="text-left px-2 py-1" style={{ color: 'var(--accent-on-surface)' }}>
                  <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:underline">
                    {label} {arrow(k)}
                  </button>
                </th>
              ))}
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, roles, grants, lastQueryAt }) => (
              <tr key={user} style={{ borderTop: '1px solid var(--border-3)' }}>
                <td className="px-2 py-1 whitespace-nowrap font-mono text-xs">
                  <button onClick={() => copyUser(user)} className="hover:text-[var(--accent-on-surface)]" style={{ textDecoration: 'underline dotted' }} title="Click to copy">{user}</button>
                  {copiedUser === user && <span className="ml-2 text-xs" style={{ color: 'var(--accent-on-surface)' }}>Copied</span>}
                </td>
                <td className="px-2 py-1">
                  {roles.length ? (
                    <div className="flex flex-wrap gap-1">
                      {roles.map(r => <span key={r} className="px-1 rounded border text-xs" style={{ color: 'var(--accent-on-surface)', borderColor: 'var(--accent-on-surface)' }}>{r}</span>)}
                    </div>
                  ) : <span style={{ color: 'var(--fg-3)' }}>—</span>}
                </td>
                <td className="px-2 py-1">
                  {grants.length ? (
                    <details>
                      <summary className="cursor-pointer">{grants.length} grants</summary>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {grants.map((g, i) => (
                          <li key={i}>
                            <span style={{ color: 'var(--accent-on-surface)' }}>{g.access_type}</span>
                            {g.database ? ' on ' + g.database : ''}
                            {g.table_name ? '.' + g.table_name : ''}
                            {g.column ? `(${g.column})` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : <span style={{ color: 'var(--fg-3)' }}>—</span>}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-xs font-mono">
                  {lastQueryAt ? new Date(lastQueryAt).toISOString().replace('T', ' ').slice(0, 19) : <span style={{ color: 'var(--fg-3)' }} className="font-sans">No queries</span>}
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => onDelete(user)}
                    className="px-2 py-0.5 rounded border transition text-xs"
                    style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ff6b6b'; e.currentTarget.style.color = 'var(--bg-0)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff6b6b'; }}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="font-semibold text-base mb-2 mt-6">Roles</h3>
      <div className="overflow-auto rounded" style={{ border: '1px solid var(--accent-on-surface)' }}>
        <table className="min-w-full text-sm">
          <thead><tr>
            <th className="text-left px-2 py-1" style={{ color: 'var(--accent-on-surface)' }}>Role</th>
            <th className="text-left px-2 py-1" style={{ color: 'var(--accent-on-surface)' }}>Grants</th>
          </tr></thead>
          <tbody>
            {(data.roles || []).map(r => {
              const rg = (data.role_grants || []).filter(g => g.role_name === r.name);
              return (
                <tr key={r.name} style={{ borderTop: '1px solid var(--border-3)' }}>
                  <td className="px-2 py-1 whitespace-nowrap font-mono text-xs">{r.name}</td>
                  <td className="px-2 py-1">
                    {rg.length ? (
                      <details>
                        <summary className="cursor-pointer">{rg.length} grants</summary>
                        <ul className="list-disc list-inside mt-1 text-xs">
                          {rg.map((g, i) => (
                            <li key={i}>
                              <span style={{ color: 'var(--accent-on-surface)' }}>{g.access_type}</span>
                              {g.database ? ' on ' + g.database : ''}
                              {g.table_name ? '.' + g.table_name : ''}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : <span style={{ color: 'var(--fg-3)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

window.UsersTable = UsersTable;
