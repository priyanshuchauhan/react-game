# React Game — Big Face Platformer

This repository contains a Vite + React game.

How to run locally
- Install: `npm install`
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`
- Preview build: `npm run preview`

Deployment
- This repo includes a GitHub Action that builds the app and publishes the `dist/` folder to GitHub Pages when you push to the `main` branch.
- The workflow sets the Vite base to `/react-game/` so the site will work when served from GitHub Pages under the repository path.

Expected site URL
- If your GitHub username is `priyanshuchauhan` and repo is `react-game`, the default Pages URL will be:

  https://priyanshuchauhan.github.io/react-game/

Notes
- It may take a minute after the workflow finishes for the site to become available.
- Check Actions -> "Build and Deploy to GitHub Pages" for build logs and status.
- If you prefer to serve from the repository root or use a custom domain, update `vite.config.js` (or set the `BASE_URL` env var in the workflow) and re-run the workflow.

Docker
- A Dockerfile is included to build and serve the site using nginx.

If you want, I can also add a README badge showing the Pages URL or the workflow status.
