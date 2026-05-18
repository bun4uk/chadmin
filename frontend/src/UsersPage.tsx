import React, { useEffect, useMemo, useState } from 'react';
import ThemeToggle from './components/ThemeToggle';
import TargetSelector from './components/TargetSelector';
import ConfirmDialog from './components/ConfirmDialog';
import { ToastProvider, showError, showSuccess } from './components/Toast';
import { fetchTopology } from './api/topology';
import type { Target, Topology } from './types';

type AccessOverview = {
  target?: Target;
  sleeping?: boolean;
  users: { name: string; last_query_at: string | null }[];
  roles: { name: string }[];
  user_roles: { user_name: string; role_name: string }[];
  user_grants: { user_name: string; access_type: string; database: string | null; table_name: string | null; column: string | null }[];
  role_grants: { role_name: string; access_type: string; database: string | null; table_name: string | null; column: string | null }[];
};

const API_BASE = '/api';

const UsersPageInner: React.FC = () => {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const [data, setData] = useState<AccessOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopology()
      .then((t) => {
        setTopology(t);
        const primary = t.targets.find(tg => tg.queryable) ?? t.targets[0] ?? null;
        if (primary) setCurrentTargetId(primary.id);
      })
      .catch(() => setError('Failed to load topology'));
  }, []);

  useEffect(() => {
    if (!topology || !currentTargetId) return;
    setLoading(true);
    const qs = `?target=${encodeURIComponent(currentTargetId)}`;
    fetch(`${API_BASE}/access-overview${qs}`)
      .then(r => r.json())
      .then((json: AccessOverview) => {
        setData(json);
        setError(null);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [topology, currentTargetId]);

  const currentTarget = useMemo(
    () => topology?.targets.find(t => t.id === currentTargetId) ?? null,
    [topology, currentTargetId],
  );

  const userMap = useMemo(() => {
    if (!data) return new Map<string, { roles: string[]; grants: AccessOverview['user_grants']; lastQueryAt: string | null }>();
    const map = new Map<string, { roles: string[]; grants: AccessOverview['user_grants']; lastQueryAt: string | null }>();
    data.users.forEach(u => {
      if (!u?.name) return;
      map.set(u.name, { roles: [], grants: [] as any, lastQueryAt: u.last_query_at });
    });
    data.user_roles.forEach(ur => {
      if (!ur?.user_name) return;
      if (!map.has(ur.user_name)) map.set(ur.user_name, { roles: [], grants: [] as any, lastQueryAt: null });
      if (ur.role_name) map.get(ur.user_name)!.roles.push(ur.role_name);
    });
    data.user_grants.forEach(g => {
      if (!g?.user_name) return;
      if (!map.has(g.user_name)) map.set(g.user_name, { roles: [], grants: [] as any, lastQueryAt: null });
      (map.get(g.user_name)!.grants as any).push(g);
    });
    return map;
  }, [data]);

  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<string | null>(null);
  type SortKey = 'user' | 'roles' | 'grants' | 'lastQueryAt';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'user', dir: 'asc' });

  const handleCopyUser = async (user: string) => {
    const copyFallback = (text: string): boolean => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };

    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(user);
        success = true;
      }
    } catch (_) {
      success = false;
    }
    if (!success) success = copyFallback(user);
    if (success) {
      setCopiedUser(user);
      setTimeout(() => setCopiedUser(null), 1200);
    } else {
      showError('Copy failed');
    }
  };

  const performDeleteUser = async (user: string) => {
    if (!currentTargetId) return;
    setDeleteConfirmUser(null);
    setDeletingUser(user);
    try {
      const url = `/api/drop-clickhouse-user/${encodeURIComponent(user)}?target=${encodeURIComponent(currentTargetId)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status !== 'ok') throw new Error('Failed to delete');
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.filter(u => u.name !== user),
          user_roles: prev.user_roles.filter(ur => ur.user_name !== user),
          user_grants: prev.user_grants.filter(g => g.user_name !== user),
        };
      });
      showSuccess(`User ${user} deleted`);
    } catch (_) {
      showError('Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  const formatLastQuery = (value: string): string => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const MI = String(d.getMinutes()).padStart(2, '0');
    const SS = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${HH}:${MI}:${SS}`;
  };

  const toggleSort = (key: SortKey) => {
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const arrow = (k: SortKey) => (sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : '');

  const userRows = useMemo(() => {
    const rows = Array.from(userMap.entries()).map(([user, info]) => ({
      user,
      roles: info.roles,
      grants: info.grants as any[],
      lastQueryAt: info.lastQueryAt as string | null,
    }));

    const cmpStr = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').localeCompare(b ?? '');
    const cmpNum = (a: number, b: number) => a - b;

    rows.sort((a, b) => {
      let res = 0;
      switch (sort.key) {
        case 'user': res = cmpStr(a.user, b.user); break;
        case 'roles': res = cmpNum(a.roles.length, b.roles.length); if (res === 0) res = cmpStr(a.user, b.user); break;
        case 'grants': res = cmpNum(a.grants.length, b.grants.length); if (res === 0) res = cmpStr(a.user, b.user); break;
        case 'lastQueryAt': {
          const at = a.lastQueryAt ? new Date(a.lastQueryAt).getTime() : Number.POSITIVE_INFINITY;
          const bt = b.lastQueryAt ? new Date(b.lastQueryAt).getTime() : Number.POSITIVE_INFINITY;
          res = cmpNum(at, bt);
          if (res === 0) res = cmpStr(a.user, b.user);
          break;
        }
      }
      return sort.dir === 'asc' ? res : -res;
    });

    return rows;
  }, [userMap, sort]);

  if (error) return <div className="p-4" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!topology) return <div className="p-4">Loading topology…</div>;

  const isSleeping = data?.sleeping === true || (currentTarget && !currentTarget.queryable);

  return (
    <div className="flex flex-col">
      <header
        className="flex items-center gap-3 flex-wrap px-3 sm:px-4 py-2"
        style={{
          background: 'var(--bg-0)',
          color: 'var(--fg-1)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <a href="/" className="flex-shrink-0">
          <img src="/build/images/chadmin-logo.png" alt="Chadmin logo" className="h-8 w-10 object-contain" />
        </a>
        <h1 className="m-0 leading-none font-semibold" style={{ fontSize: 'var(--fs-xl)' }}>Chadmin</h1>
        <a href="/" className="btn-accent btn-accent-sm">Query Monitor</a>
        <ThemeToggle />
        <span className="whitespace-nowrap ml-auto" style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>
          Users &amp; Access
        </span>
        {topology.mode === 'cloud' && topology.targets.length > 1 && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>Service</span>
            <TargetSelector targets={topology.targets} currentId={currentTargetId} onChange={setCurrentTargetId} />
          </div>
        )}
      </header>

      <div className="p-2 sm:p-4 flex flex-col gap-6">
        {currentTarget && (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-3)' }}>
            Scope: <span style={{ color: 'var(--accent-on-surface)' }}>{currentTarget.name}</span>
            {currentTarget.state !== 'running' && <span className="ml-2">({currentTarget.state})</span>}
          </div>
        )}

        {isSleeping && (
          <div
            className="p-6 italic"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--accent-on-surface)',
              borderRadius: 'var(--r-md)',
              color: 'var(--fg-3)',
            }}
          >
            💤 Service "{currentTarget?.name}" is {currentTarget?.state}. Wake it from Query Monitor to view users and access.
          </div>
        )}

        {!isSleeping && loading && <div style={{ color: 'var(--fg-3)' }}>Loading…</div>}

        {!isSleeping && !loading && data && (
          <>
            <section>
              <h2 className="m-0 mb-2 font-semibold" style={{ fontSize: 'var(--fs-md)' }}>Users</h2>
              <div
                className="overflow-auto"
                style={{
                  border: '1px solid var(--accent-on-surface)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <table className="min-w-full" style={{ fontSize: 'var(--fs-body)' }}>
                  <thead>
                    <tr>
                      {([
                        ['user', 'User'],
                        ['roles', 'Roles'],
                        ['grants', 'Direct grants'],
                        ['lastQueryAt', 'Last query'],
                      ] as [SortKey, string][]).map(([k, label]) => (
                        <th key={k} className="text-left px-2 py-1" style={{ color: 'var(--accent-on-surface)' }}>
                          <button
                            type="button"
                            className="label-caps flex items-center gap-1 hover:underline"
                            onClick={() => toggleSort(k)}
                          >
                            {label} {arrow(k)}
                          </button>
                        </th>
                      ))}
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map(({ user, roles, grants, lastQueryAt }) => (
                      <tr key={user} style={{ borderTop: '1px solid var(--border-3)' }}>
                        <td className="px-2 py-1 whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                          <button
                            type="button"
                            onClick={() => handleCopyUser(user)}
                            title="Click to copy"
                            style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}
                          >
                            {user}
                          </button>
                          {copiedUser === user && (
                            <span className="ml-2" style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-on-surface)' }}>Copied</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {roles.length ? (
                            <div className="flex flex-wrap gap-1">
                              {roles.map(r => (
                                <span
                                  key={r}
                                  className="label-caps"
                                  style={{
                                    padding: '2px 6px',
                                    border: '1px solid var(--accent-on-surface)',
                                    borderRadius: 'var(--r-md)',
                                    color: 'var(--accent-on-surface)',
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--fg-3)' }}>—</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {grants.length ? (
                            <details>
                              <summary className="cursor-pointer">{grants.length} grants</summary>
                              <ul className="list-disc list-inside mt-1" style={{ fontSize: 'var(--fs-xs)' }}>
                                {grants.map((g: any, idx: number) => (
                                  <li key={idx}>
                                    <span style={{ color: 'var(--accent-on-surface)' }}>{g.access_type}</span>
                                    {g.database ? ` on ${g.database}` : ''}
                                    {g.table_name ? `.${g.table_name}` : ''}
                                    {g.column ? `(${g.column})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            <span style={{ color: 'var(--fg-3)' }}>—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                          {lastQueryAt ? formatLastQuery(lastQueryAt) : <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}>No queries</span>}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            className="btn-danger btn-danger-sm"
                            onClick={() => setDeleteConfirmUser(user)}
                            disabled={deletingUser === user}
                          >
                            {deletingUser === user ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="m-0 mb-2 font-semibold" style={{ fontSize: 'var(--fs-md)' }}>Roles</h2>
              <div
                className="overflow-auto"
                style={{
                  border: '1px solid var(--accent-on-surface)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <table className="min-w-full" style={{ fontSize: 'var(--fs-body)' }}>
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>Role</th>
                      <th className="text-left px-2 py-1 label-caps" style={{ color: 'var(--accent-on-surface)' }}>Grants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roles.map(r => {
                      const rGrants = data.role_grants.filter(g => g.role_name === r.name);
                      return (
                        <tr key={r.name} style={{ borderTop: '1px solid var(--border-3)' }}>
                          <td className="px-2 py-1 whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                            {r.name}
                          </td>
                          <td className="px-2 py-1">
                            {rGrants.length ? (
                              <details>
                                <summary className="cursor-pointer">{rGrants.length} grants</summary>
                                <ul className="list-disc list-inside mt-1" style={{ fontSize: 'var(--fs-xs)' }}>
                                  {rGrants.map((g, idx) => (
                                    <li key={idx}>
                                      <span style={{ color: 'var(--accent-on-surface)' }}>{g.access_type}</span>
                                      {g.database ? ` on ${g.database}` : ''}
                                      {g.table_name ? `.${g.table_name}` : ''}
                                      {g.column ? `(${g.column})` : ''}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : (
                              <span style={{ color: 'var(--fg-3)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {deleteConfirmUser && (
        <ConfirmDialog
          title="Delete user?"
          message={`Delete user "${deleteConfirmUser}" on target "${currentTarget?.name ?? currentTargetId}"?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => performDeleteUser(deleteConfirmUser)}
          onCancel={() => setDeleteConfirmUser(null)}
        />
      )}
    </div>
  );
};

const UsersPage: React.FC = () => (
  <ToastProvider>
    <UsersPageInner />
  </ToastProvider>
);

export default UsersPage;
