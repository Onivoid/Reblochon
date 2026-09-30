# Contributing

Thanks for taking a look. Reblochon is a small personal project with room to grow.

## Setup

1. Fork and clone
2. Copy `.env.example` → `.env` and `api/.env.example` → `api/.env`
3. `make install && make up && make migrate`
4. Optional: `cd api && uv run pre-commit install`

## Before you open a PR

- `make format`
- `make lint`
- `make test`
- For UI changes: `pnpm --dir web typecheck` and a quick pass in the browser

Keep PRs focused. One concern per PR is easier to review than a kitchen sink.

## Style

- API: Ruff (lint + format). Prefer small services with a clear domain name over dumping everything into one file.
- Web: oxlint + Prettier. Prefer `@/lib/api` for HTTP. Keep pages readable; extract a hook when a screen gets too dense.
- Tests live under `api/tests/` with `test_unit_` / `test_integration_` prefixes. Assert behaviour and SPECS details (`owner_required`, `self_link`, `is_blocked`, …), not private implementation details.

## Docs

README, SPECS, ARCHITECTURE, and package READMEs are in English. When behaviour changes, update [SPECS.md](SPECS.md) in the same PR.

## Commits

Short messages that say why the change exists. Conventional commits are fine if you already use them; plain English is fine too.
