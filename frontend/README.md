# SEJar - Frontend

React + TypeScript + Vite + Tailwind. Talks to the FastAPI backend at
`http://127.0.0.1:8000` (hardcoded in `src/api.ts` - this is a local
single-user tool, so no env-based config was added for the MVP).

## Run it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. The backend must be running first
(see ../backend/README.md) or you'll see a "Backend unreachable" screen.

## Design notes

The visual language is a technical drafting/blueprint theme (grid-paper
background, ink-stamp status badges, a drawing-sheet title block footer)
rather than a generic app look - it's meant to read like the engineering
documents it's replacing. Fonts: Space Grotesk (headings), IBM Plex Sans
(body), IBM Plex Mono (IDs, data, stamps).
