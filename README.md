# FO Plugin — Electron

Electron + React + TypeScript rewrite of the PySide6 controller-automation UI.
This build uses the bundled mock JSON data in `src/data/` (no live scraping).

## Stack

- **Electron** — desktop shell (`electron/main.js`, `electron/preload.js`)
- **React 18 + TypeScript** — renderer UI
- **Vite** — dev server & bundler
- **Tailwind CSS** — styling (Apple-minimal tokens ported from `ui/theme.py`)
- **lucide-react** — icons

## Project structure

```
electron-app/
├─ electron/
│  ├─ main.js         # Main process: window + IPC (versions, folder picker)
│  └─ preload.js      # Secure bridge exposing window.electronAPI
├─ src/
│  ├─ main.tsx        # Renderer entry
│  ├─ App.tsx         # Shell: sidebar + page router + footer
│  ├─ index.css       # Tailwind layers + base styles
│  ├─ shared/config.ts# Controllers, timeline sections, page ids
│  ├─ types.ts        # Odds & timeline domain types
│  ├─ hooks/          # useOddsData, useTimelines (bundle JSON via glob)
│  ├─ components/
│  │  ├─ Sidebar.tsx
│  │  ├─ Footer.tsx   # live system clock
│  │  └─ pages/       # ChecklistDashboard, TimelinePage, MatchOddsPage, SettingsPage
│  └─ data/           # odds/*.json + timelines/*.json (copied from ../odds_data)
├─ index.html
├─ vite.config.ts
├─ tailwind.config.js
├─ postcss.config.js
└─ tsconfig.json
```

## Getting started

```bash
cd electron-app
npm install      # installs React, Electron, Vite, Tailwind, etc.
npm run dev      # starts Vite (:5173) and launches Electron pointed at it
```

## Production build

```bash
npm run build    # type-check + bundle renderer into dist/
npm start        # launch Electron against the built dist/index.html
```

## Packaging installers (electron-builder)

Output is written to `release/`.

```bash
npm run dist:mac   # macOS: .dmg + .zip (arm64 + x64)
npm run dist:win   # Windows: NSIS installer + portable .exe (x64)
npm run dist:all   # both (see cross-build note below)
```

### Platform notes

- **macOS builds must run on macOS.** Produces `FO Plugin-<version>.dmg`
  (and a `.zip`) for both Apple Silicon (arm64) and Intel (x64).
- **Windows builds** run natively on Windows. Building the Windows target
  **from macOS** additionally requires [Wine](https://www.winehq.org)
  (`brew install --cask wine-stable`); without it, use a Windows machine or CI.
- Builds are **unsigned** by default. For distribution, configure code signing
  (Apple Developer ID / Windows Authenticode) via electron-builder env vars.

### App icons (optional)

electron-builder auto-detects an icon at `build-resources/icon.png`
(1024×1024 recommended). Drop one in and it will be used for both platforms;
otherwise the default Electron icon is applied.

## Feature parity with the PySide6 app

| PySide6 | Electron |
| --- | --- |
| FluentWindow sidebar | `Sidebar.tsx` |
| Checklist dashboard (QWebEngineView) | `ChecklistDashboard.tsx` |
| Timeline widgets (per section) | `TimelinePage.tsx` |
| Match odds verification (V4 web table) | `MatchOddsPage.tsx` |
| Settings + profile picker | `SettingsPage.tsx` (native dialog via IPC) |
| Footer status + QTimer clock | `Footer.tsx` |

## Notes

- Odds/timeline JSON is copied into `src/data/`. Re-copy from `../odds_data`
  if the source data changes.
- Live HKJC scraping (Playwright) is intentionally out of scope for this build.
  It can be re-added later in the Electron main process using the Node
  `playwright` package.
