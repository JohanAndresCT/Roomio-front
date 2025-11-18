# Roomio — Frontend (Sprint 1 scaffold)

This repository contains the Sprint 1 base scaffold for the "Roomio" videoconferencing frontend.

Tech stack (Sprint 1):
- Vite + React + TypeScript
- SASS
- Firebase Authentication (skeleton)
- React Router

What's included:
- Project config: `package.json`, `tsconfig.json`, `vite.config.ts`
- `src/` skeleton with components, pages, hooks, api mocks, firebase client
- `src/styles/` with SASS variables and a module example
- `.env.example` showing configurable API base URL and Firebase keys

How to start (Windows PowerShell):

1. Copy `.env.example` -> `.env` and fill values.
2. Install dependencies:

    npm install

3. Start dev server:

    npm run dev

Notes and next steps:
- Firebase keys must be added to `.env`.
- API calls in `src/api` are mocks for Sprint 1, and read the base URL from `import.meta.env.VITE_API_BASE_URL`.
- Accessibility: navbar uses keyboard navigation and ARIA roles; color tokens aim for good contrast.

Sprint 2 tasks: implement chat, audio/video, real meeting integration. See `TODO` list in repository root.
