.PHONY: up down up-all migrate api web install test test-cov lint format ci

up:
	docker compose up -d db

down:
	docker compose --profile full down

up-all:
	docker compose --profile full up -d --build

migrate:
	cd api && uv run alembic upgrade head

api:
	cd api && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

web:
	pnpm --dir web dev --host 127.0.0.1 --port 5173

install:
	cd api && uv sync --group dev
	pnpm --dir web install
	cd api && uv run pre-commit install || true

test:
	cd api && uv run pytest -v

test-cov:
	cd api && uv run pytest --cov=app --cov-report=term-missing

lint:
	cd api && uv run ruff check app tests
	pnpm --dir web lint
	pnpm --dir web format:check

format:
	cd api && uv run ruff check --fix app tests
	cd api && uv run ruff format app tests
	pnpm --dir web format

ci: lint test
	pnpm --dir web typecheck
	pnpm --dir web build
