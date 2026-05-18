# Chadmin

Chadmin is an administration panel for ClickHouse — a real-time dashboard for monitoring running queries, managing users and access, and operating ClickHouse Cloud services. It auto-detects whether you're running a **single node**, a **self-hosted cluster**, or **ClickHouse Cloud**, and adapts the UI and SQL accordingly.

![Chadmin Dashboard](https://user-images.githubusercontent.com/14631690/111626669-f6f6b500-87f6-11eb-95e5-f52df087c1dd.png)

## Installation and Setup

### Requirements
- Docker and Docker Compose
- Git

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/bun4uk/chadmin.git
   cd chadmin
   ```

2. Create and configure the `.env` file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your ClickHouse credentials. For ClickHouse Cloud, set `CLICKHOUSE_CLOUD_KEY_ID` and `CLICKHOUSE_CLOUD_KEY_SECRET` — Cloud mode turns on automatically when these are present. See `.env.example` for the full list.

3. Launch the project:
   ```bash
   docker-compose up -d
   ```

4. Open http://localhost in your browser

### Development

Everything builds and runs through `docker-compose`. The `frontend` container runs `npm install && npm run watch` (Vite build in watch mode) and rebuilds assets into `public/build/` on every file change — no host-side `npm` or `composer` needed.

There is no test suite and no separate lint step. TypeScript type-checking runs as part of the Vite build inside the `frontend` container.

#### After backend (PHP) changes

```bash
docker-compose restart app
docker-compose exec app bin/console cache:clear
```

#### Running an arbitrary command in a container

```bash
docker-compose exec app bin/console <command>     # Symfony console
docker-compose run --rm composer install          # composer
docker-compose exec frontend npm run build        # one-shot production build
```

### Useful Commands

#### Complete shutdown of the project
```bash
docker-compose down
```

#### Viewing logs
```bash
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f frontend
```

#### Full restart with cache clearing
```bash
docker-compose down
rm -rf var/cache/* var/log/* public/build/*
docker-compose up -d
docker-compose exec app bin/console cache:clear
```

## Technologies

- PHP 8.5 / Symfony 8.0
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + `@clickhouse/click-ui`
- `highlight.js` + `sql-formatter` for SQL display
- `smi2/phpclickhouse` for ClickHouse SQL queries
- Docker and Docker Compose

## Project Features

- Auto-detects topology: single node, self-hosted cluster, or ClickHouse Cloud — no manual switch needed
- Real-time per-target view of running queries with memory and duration
- SQL syntax highlighting and formatting in query popups
- Background coloring based on query execution time
- Kill long-running queries
- Users & Access page (`/users`) for inspecting and dropping ClickHouse users
- Cloud-only: wake idle/stopped services from the UI; deep-link to a specific warehouse/service via URL params (`?warehouse=…&service=…`)
- Light/dark theme toggle, persisted per browser
- Polling pauses when the tab is hidden, so idle Cloud services aren't kept warm by a background tab

## Project Optimizations

### Docker Configuration

- **Container Memory**: Frontend container memory limit set to 8GB in `docker-compose.yml`
- **Automatic Build**: Frontend container runs Vite in watch mode automatically

