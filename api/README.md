# Reblochon API

FastAPI backend. From the repo root, with Postgres up (`make up`) and migrations applied (`make migrate`):

```bash
make api
# or
cd api
uv sync --group dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Copy `api/.env.example` to `api/.env` (or use the root `.env.example`). At least `JWT_SECRET` and `DATABASE_URL` must be set.

```bash
make test          # pytest
make test-cov      # coverage
uv run alembic upgrade head
```

Layering and contracts: [ARCHITECTURE.md](../ARCHITECTURE.md), [SPECS.md](../SPECS.md).
