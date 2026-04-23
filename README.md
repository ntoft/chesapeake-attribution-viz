# Chesapeake Attribution Viz

Static visualization of fish-kill attribution data from the WarmHub
`fish-kill-attribution/chesapeake-attribution` repo. Shows a MapLibre map of
Chesapeake Bay with event markers; clicking a marker opens a side panel with
NGO / Industry / Agency attribution beliefs side by side.

## Development

```bash
bun install
bun run refresh-data   # requires WH_TOKEN env var, pulls latest snapshot → public/data.json
bun run dev            # http://localhost:5173
```

`refresh-data` uses `@warmhub/sdk-ts` via a private GitHub Packages registry,
so it must run locally (your shell already has `WH_TOKEN` configured via
`wh` login). The generated `public/data.json` is committed to the repo so
Vercel builds are hermetic — no WarmHub token needed at build time.

## Deploy (Vercel Web UI)

1. Push this repo to GitHub.
2. Go to vercel.com → New Project → Import `ntoft/chesapeake-attribution-viz`.
3. Framework preset: Vite. Build command: `bun run build`. Output dir: `dist`.
4. Deploy. No env vars required.

## Refreshing data

```bash
bun run refresh-data
git commit -am "Refresh attribution snapshot"
git push
```

Vercel auto-redeploys on push.
