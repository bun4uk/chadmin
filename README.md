# Chadmin

Chadmin is an administration panel for ClickHouse — a real-time dashboard for monitoring running queries, managing users and access, and operating ClickHouse Cloud services. It auto-detects whether you're running a **single node**, a **self-hosted cluster**, or **ClickHouse Cloud**, and adapts the UI and SQL accordingly.


![Chadmin Dashboard](https://github.com/user-attachments/assets/a2541685-0b4b-433f-8cb0-3f72d6c7204f)

## Installation and Setup

### Run via Docker Hub (fastest)

The published image at [`bun4uk/chadmin`](https://hub.docker.com/r/bun4uk/chadmin) bundles nginx + php-fpm + the built frontend in a single container. No clone, no build:

```bash
docker run -d \
  --name chadmin \
  -p 8080:80 \
  -e CLICKHOUSE_HOST=clickhouse.example.com \
  -e CLICKHOUSE_PORT=8123 \
  -e CLICKHOUSE_USERNAME=default \
  -e CLICKHOUSE_PASSWORD=secret \
  bun4uk/chadmin:latest
```

Then open http://localhost:8080.

For ClickHouse Cloud, pass the API credentials instead — Cloud mode turns on automatically:

```bash
docker run -d \
  --name chadmin \
  -p 8080:80 \
  -e CLICKHOUSE_CLOUD_KEY_ID=xxxxxxxx \
  -e CLICKHOUSE_CLOUD_KEY_SECRET=yyyyyyyy \
  bun4uk/chadmin:latest
```

See `.env.example` for the full list of supported environment variables. Available tags: `latest`, `M.m.p` (semver), `M.m`, `M`. Multi-arch images are published for `linux/amd64` and `linux/arm64`.

### Run via Docker Compose (development)

#### Requirements
- Docker and Docker Compose
- Git

#### Quick Start

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

