# Reblochon

Collaborative todo for small teams (and fine anywhere else). Kanban boards, today view, comments, whiteboard, invites.

Stack: FastAPI + PostgreSQL, React (Vite) + pnpm, UI based on [000h](https://000h.cojeev.com/docs/).

## Demo

https://github.com/user-attachments/assets/99e1d5fa-00de-45a5-ad35-23d8fe47f625

## Requirements

- Docker Desktop (PostgreSQL)
- Python 3.13+ and [uv](https://github.com/astral-sh/uv)
- Node.js 22+ and pnpm 10+

## Quick start (dev)

```bash
cp .env.example .env
cp api/.env.example api/.env
make install
make up
make migrate
make api    # http://127.0.0.1:8000
make web    # http://127.0.0.1:5173
```

If you are migrating from an old `courtests` database, recreate the Postgres volume once:

```bash
docker compose down -v
make up
make migrate
```

Then point `DATABASE_URL` in `api/.env` at the `reblochon` credentials from `.env.example`.

## Full stack (Docker)

```bash
cp .env.example .env   # set a real JWT_SECRET
make up-all            # db + api + web (full profile)
```

- API: http://localhost:8000
- Web: http://localhost:8080

## Quality

```bash
make lint      # ruff + oxlint + prettier check
make format    # ruff format + prettier
make test      # pytest API
make ci        # lint + tests + typecheck + build web
```

Local hooks (after `make install`):

```bash
cd api && uv run pre-commit install
```

CI runs the same checks on GitHub Actions (Postgres service for API tests).

## Layout

- `api/app/` — routers, schemas, services, repositories, db, security
- `api/tests/` — unit + integration pytest suite
- `web/` — React 19, TanStack Query + Router, i18n FR (default) / EN
- `docs/demo.mp4` — product demo
- `SPECS.md` — behavioural contracts for tests
- `ARCHITECTURE.md` — layering and runtime

## First session

1. Register on `/register` (Default team + Général board are created for you)
2. Switch or create teams from the sidebar selector; delete a team from the Team page (owner only)
3. Work the board or the Today bento; open a task for details, links, comments, and the Excalidraw whiteboard

## Licence

MIT. See [LICENSE](LICENSE).
