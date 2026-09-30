# Architecture

Reblochon is a monorepo: FastAPI API, React/Vite frontend (pnpm), PostgreSQL via Docker.

## Backend

```
api/app/
  main.py
  config.py
  deps.py
  routers/           # auth, teams, projects, tasks, extras
  schemas/           # Pydantic In/Out + service_inputs
  services/
    auth_service.py
    team_service.py
    project_service.py
    task_service.py
    board_extras_service.py
  repositories.py
  db/
  security/
  domain/enums.py
```

Dependency direction:

```
routers → services → repositories → db
routers → schemas
```

On register: team **Default** (with description), project **Général**, three board columns. Tasks use `column_id` + `position`, `kind` (`epic`|`story`|`task`), optional `due_at`. Task links: `depends_on` (primary in UI), plus `blocks` / `relates_to`. `is_blocked` is derived when any `depends_on` target is not `done` (informational; transitions are not blocked by the API). Users may set `job_title` and `avatar_config` (Blobatar).

## Frontend

| Path | Role |
| --- | --- |
| `web/src/pages/` | Auth, Today, project board, team, settings, invite |
| `web/src/components/` | App shell, task detail modal, profile, onboarding |
| `web/src/components/ui/` | 000h / shadcn |
| `web/src/lib/api/` | Typed fetch client |
| `web/src/locales/` | FR (default) and EN |
| `web/src/router.tsx` | TanStack Router + auth guards |

Kanban uses `@dnd-kit`. Task detail is a wide dialog (inline title, tabs, Excalidraw drawing). Sidebar team selector is full-bleed; team delete lives on the Team page.

## Runtime

```
Browser (Vite :5173 or nginx :8080) → FastAPI (:8000) → PostgreSQL (:5432)
```

Useful make targets: `up`, `up-all`, `migrate`, `api`, `web`, `test`, `lint`, `format`, `ci`.

Behavioural contracts: [SPECS.md](SPECS.md).
