# Reblochon web

React + Vite frontend. From the repo root: `make web`.

```bash
pnpm install
pnpm dev                 # http://127.0.0.1:5173
pnpm typecheck
pnpm lint
pnpm build
```

Set `VITE_API_URL` in `.env` (defaults to `http://localhost:8000`).

Locales: French default, English via the language switcher. Task detail is a modal (not a side sheet); whiteboard uses Excalidraw.
