# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chadmin is a ClickHouse administration panel for monitoring running queries and managing user access. It operates in three topology modes — **single-node**, **self-hosted cluster**, and **ClickHouse Cloud** — and auto-detects which one it's in. The UI is a real-time dashboard that groups nodes/services, shows per-node queries and memory, and lets operators kill queries or wake idle Cloud services.

## Architecture

**Backend:** PHP 8.5 / Symfony 8.0 — API endpoints + Twig templates that bootstrap the React frontend. No ORM, no entities, no auth.

**Frontend:** React 19 + TypeScript + Vite 8 + Tailwind 4 — lives entirely in `frontend/`. Uses `@clickhouse/click-ui` (`ClickUIProvider`, `ThemeName`), `highlight.js`, and `sql-formatter`. Built output goes to `public/build/`. Data fetches are plain `fetch` calls; no react-query.

### Two entry points, not a SPA router

- `frontend/index.html` → `main.tsx` → `App.tsx` — Query Monitor at `/`
- `frontend/users.html` → `users.tsx` → `UsersPage.tsx` — Users & Access at `/users`

Each page is its own bundle. Vite is configured to emit deterministic filenames (`assets/index.js`, `assets/users.js`, `assets/style.css`) so Twig can reference them directly without a manifest — see `frontend/vite.config.ts`. If you add a new page, register it in `rollupOptions.input`, add a Twig template that links `/build/assets/<name>.js`, and add a controller route.

### Topology model (`src/Topology/`) — the spine of the app

Everything cluster-aware flows through a single `Topology` built on first request and memoized for the rest of it:

- **`TopologyMode`** — `Single | Cluster | Cloud`.
- **`TopologyDetector`** — picks the mode in this order: `CLICKHOUSE_MODE` env override → cloud credentials present → SQL probe of `system.clusters` (ignoring Cloud's `default` and `all_groups.*`) → single. The SQL probe uses the legacy `ClickHouseClient` (the default connection from env).
- **`TopologyConfig`** — readonly DTO that all env-var reading funnels through, injected into provider/detector/CloudApiClient.
- **`Target`** — a single addressable thing (node/cluster/cloud service) with `hosts`, `port`, `https`, `cluster`, `state`, plus optional Cloud metadata (`warehouseId`, `isPrimary`, `region`, memory limits).
- **`TargetState`** — enum covering Cloud service states (`running/idle/stopped/awaking/...`). `isQueryable()` is true only for `Running | PartiallyRunning | Degraded`.
- **`TopologyProvider::getTopology()`** — returns a `Topology` (list of Targets + org info). In Cloud mode delegates to `CloudTopologyFactory`; if the Cloud API fails, falls back to a one-target "degraded cloud" topology derived from env, with service name parsed from the pod hostname.

### Controller argument resolution

Two value resolvers, both priority 150 in `config/services.yaml`:

- **`TargetResolver`** — resolves a `Target $target` arg from `?target=<id>` (404s if unknown) or falls back to `Topology::primaryTarget()`. **This is the modern path** — new endpoints should take `Target $target`.
- **`ClusterNameResolver`** — legacy: fills `?string $cluster` by querying `system.clusters` directly. Kept only for `/api/get-cluster-name`.

### Data-plane connections (`src/ClickHouse/`)

- **`ConnectionManager::clientFor(Target)`** — builds an `smi2/phpclickhouse` Client per Target, lazy and cached per-request by target id. **Never instantiates for non-queryable targets** (throws `TargetNotQueryableException`) — crucial because even a `ping()` on an idle Cloud service wakes it. For multi-host targets (self-hosted failover) it pings each with a 2s timeout; for single-host targets (Cloud, or a single self-hosted host) it skips the ping entirely and returns the client as-is.
- **`QueryBuilder`** — produces SQL that branches on `Target::mode` / `Target::cluster`:
  - Single-node → `FROM system.<table>` directly.
  - Cluster / Cloud → `FROM clusterAllReplicas('<cluster>', system, <table>)` + `SETTINGS skip_unavailable_shards = 1`.
  - Cloud per-service cluster is always named `'default'`; self-hosted uses the probed/overridden name.
- **`ClickHouseClient`** (`src/Service/ClickHouseClient.php`) — legacy thin wrapper used only by `TopologyDetector` for the cluster-name probe. Controllers should always go through `ConnectionManager`.

### Cloud control plane (`src/Cloud/`)

- **`CloudApiClient`** — HTTP Basic against `https://api.clickhouse.cloud/v1/`. Control-plane only — **calls here never wake services**. Caches the services list for 30s and organizations for 300s via `CacheInterface`. Retries once on 429/5xx with backoff (honors `x-ratelimit-reset`). Unwraps the `{status, requestId, result|error}` envelope.
- **Wake semantics** (`wakeService`): `stopped` → `PATCH /state {"command":"start"}` on control plane; `idle` → GET `/ping` on the data-plane HTTPS endpoint (per Cloud docs, `start` does **not** resume idle services). Read timeouts on the idle-wake ping are expected and swallowed; only connect-level failures bubble up.
- **`CloudTopologyFactory`** — assembles the Topology from `listServices()`. Applies `CLICKHOUSE_CLOUD_SERVICE_ALLOWLIST` (CSV of service IDs), drops `terminated` / `softDeleted`, and maps each service to a `Target` with `cluster: 'default'`, `https: true`, `database: CLICKHOUSE_DB_NAME`.
- Chadmin maintains its own warehouse-to-service grouping on the frontend (`utils/warehouses.ts`) because the Cloud API only exposes an opaque `dataWarehouseId`, not warehouse names.

### Controllers / routes

- **`HtmxController`** (`/`) — legacy name; HTMX was removed. Just renders the React root for the Query Monitor.
- **`QueriesController`** — `/api/cluster-processes` (takes `Target`), `/api/kill-query/{queryId}` (takes `Target`), `/api/get-cluster-list` (derives from topology), `/api/get-cluster-name` (legacy, uses `ClusterNameResolver`). Endpoints that take `Target` return `{sleeping: true, processes: {}}` when the target is not queryable — the frontend renders a dimmed tile.
- **`AccessController`** — `/users` (page), `/api/access-overview` (takes `Target`), `/api/drop-clickhouse-user/{user}` (takes `Target`).
- **`TopologyController`** — `/api/topology` (full `Topology::toJson()`), `POST /api/targets/{id}/wake` (Cloud-only; calls `CloudApiClient::wakeService` then invalidates the services cache so the next poll observes the new state).

### Frontend data flow

`App.tsx` owns topology, per-target process data, polling interval, kill/wake tracking, and selected target. Two independent intervals:

- Topology refresh — fixed 30s (matches the backend Cloud API cache TTL; polling faster wastes HTTP).
- Per-target process fetch — `intervalSec` (persisted in `localStorage` as `intervalSec` / `autoRefresh`; default 30s).

**Page Visibility:** both intervals pause when `document.hidden`. This is important in Cloud mode — we don't want to keep idle services warm by polling a hidden tab. When the tab becomes visible again, both fetches fire immediately.

**Cloud-specific UI:**
- Only one Target is rendered at a time (`selectedTargetId`), chosen via `CloudTargetPicker`. Services are grouped by `warehouseId` into `WarehouseGroup`s (standalone services form single-member groups). Group display name is the primary service's name, or the alphabetically first.
- Selection is bootstrapped from `?warehouse=...&service=...` URL params, then `localStorage` (`selectedTargetId`), then the first primary in the first group. Changes mirror back to URL + `localStorage` for deep-linkable reloads.
- Idle/stopped targets render with a Wake button; clicking opens a confirmation modal (`ConfirmDialog`), then `POST /api/targets/{id}/wake`. After wake, the topology is polled at 5s for 90s to catch the state transition. A target stays in `wakingIds` (disabling the button) until it becomes queryable again.

**Theming:** `ClickThemeProvider` (`frontend/src/ClickThemeProvider.tsx`) manages `light | dark` via `ClickUIProvider`; the `light` class is toggled on `<html>`. Persisted under `theme` in `localStorage`. Tailwind 4's opacity modifiers have bitten this codebase before on light theme — be careful with `bg-foo/50` patterns.

### Nginx

`docker/dev/nginx/...` serves `/build/` and `/assets/` as static files and routes everything else to the PHP FPM upstream (`app:9000`). DNS is re-resolved per request so the `app` service can be restarted without restarting nginx.

## Development Commands

```bash
# Start all services (nginx on :80, php-fpm, node frontend watcher)
docker-compose up -d

# Frontend — the `frontend` container already runs `npm install && npm run watch`.
# To run locally outside Docker:
npm install
npm run dev          # Vite dev server on :5173 (standalone; not wired into nginx)
npm run watch        # Vite build in watch mode — writes into public/build/
npm run build        # Production build

# After PHP changes
docker-compose restart app
docker-compose exec app bin/console cache:clear

# Full reset
docker-compose down
rm -rf var/cache/* var/log/* public/build/*
docker-compose up -d
docker-compose exec app bin/console cache:clear

# Logs
docker-compose logs -f app
docker-compose logs -f frontend
docker-compose logs -f nginx
```

**There is no test suite** — no `tests/` directory, no PHPUnit config, no `npm test`. Do not invent a test command; verify by exercising the UI at http://localhost and checking backend logs. TypeScript type-checking happens as part of `vite build`; there is no separate lint step.

## Environment

Copy `.env.example` → `.env`. See that file for the full list. Key notes:

- **`CLICKHOUSE_HOST`** — single host or comma-separated failover list. Ignored in Cloud mode (hosts come from the Cloud API).
- **`CLICKHOUSE_PORT`** — `8123` for self-hosted HTTP; `8443` for Cloud HTTPS. **No auto-detect** for HTTPS.
- **`CLICKHOUSE_HTTPS`** — set explicitly for self-hosted TLS. In Cloud mode the SQL path always uses HTTPS regardless of this flag (Cloud API returns HTTPS-only endpoints).
- **`CLICKHOUSE_MODE`** — `cloud | cluster | single | ''(auto)`. Presence of cloud credentials auto-selects cloud; otherwise the `system.clusters` probe decides cluster vs single.
- **`CLICKHOUSE_CLOUD_KEY_ID`/`_SECRET`** — presence turns on cloud mode. `developer` role is enough for read-only.
- **`CLICKHOUSE_CLOUD_ORG_ID`** — optional; auto-derived if the key has access to exactly one org, otherwise required.
- **`CLICKHOUSE_CLOUD_SERVICE_ALLOWLIST`** — optional CSV of service IDs to filter the topology; empty = all.

These are wired via `TopologyConfig` in `config/services.yaml`. When adding a new env var, add a default in the `parameters:` block of `services.yaml` so missing-env-in-prod doesn't crash container boot.

## Conventions

- **Comments in the codebase are Ukrainian.** Match the surrounding language when adding one; default to no comment unless the *why* is non-obvious.
- Frontend theme: `bgdark` (#1f1f1c) and `accent` (#faff69) in `frontend/tailwind.config.js` give the dark "ClickHouse yellow" look.
- **New cluster-aware endpoints:** take `Target $target` (via `TargetResolver`), go through `ConnectionManager::clientFor($target)`, build SQL through `QueryBuilder` (or branch on `$target->mode` / `$target->cluster` the same way). Return an empty/sleeping response when `!$target->isQueryable()` instead of throwing — the frontend renders these as dimmed tiles.
- **Never touch an idle Cloud service's data-plane to probe state.** Even a `ping()` wakes it. Use the control-plane services list for state; only call data-plane on user-initiated actions (queries, explicit wake).
