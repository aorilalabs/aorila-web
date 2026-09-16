# Render runbook: backend API + three static sites

Repo: `https://github.com/nbaldwin098/aorila-web`

This repo now prepares Render for a zero-downtime split:

- **`aorila`** stays a Node web service for backend/API behavior.
- **`aorila-site`** serves the consumer static frontend.
- **`aorila-labs-site`** serves the Labs static frontend.
- **`aorila-robotics-site`** serves the Robotics static frontend.

Do **not** deploy custom-domain cutovers all at once. Test Render subdomains first, then move domains one service at a time.

## Service intent

### Backend (`aorila`)

Keep the Node service for dynamic behavior only:

- `POST /leads`
- auth and account routes (`/login`, `/signup`, `/logout`, `/console`, `/account`, `/dashboard`)
- compute proxy (`/compute/v1/gpus`)
- `GET /healthz`
- existing backend behavior (parent console, auth, leads)

After cutover, the backend should keep only `console.aorila.com` as its custom domain (the parent console). `api.aorila.com` does not exist.

### Static sites

Build commands:

```bash
npm run build:site -- consumer
npm run build:site -- labs
npm run build:site -- robotics
```

Outputs:

- `dist/consumer`
- `dist/labs`
- `dist/robotics`

Each build copies shared `public/` assets and emits the correct root `index.html`.

## Zero-downtime rollout

1. **Deploy the blueprint without changing custom domains.**
   - Keep the current Node service live.
   - Let Render create the three static services on free plans.
2. **Test Render subdomains first.**
   - Open each `*.onrender.com` URL and verify the right root page loads:
     - consumer
     - Labs
     - Robotics placeholder
   - Verify shared assets load (`design.css`, `site.js`, `price.js`, favicon).
3. **Test browser/API behavior before cutover.**
   - Consumer: pricing page loads the live catalog, contact/provider forms submit, console/login links resolve to the backend/API origin.
   - Labs: request-access form submits to the backend/API origin.
   - Backend: `GET /healthz` returns 200 and `POST /leads` still works.
4. **Move domains one at a time.**
   - **Labs first:** attach `aorilalabs.com` and `www.aorilalabs.com` to `aorila-labs-site`, verify TLS, reload the form flow, and confirm API/browser requests still reach the backend.
   - **Robotics second:** attach `robotics.aorila.com` to `aorila-robotics-site`, verify TLS, and confirm the placeholder page is the only public Robotics content.
   - **Aorila last:** attach `aorila.com` and `www.aorila.com` to `aorila-site`, verify TLS, pricing, contact/provider flows, and backend-linked routes.
5. **Leave only `console.aorila.com` on Node.**
   - After consumer, Labs, and Robotics are stable on static services, remove their custom domains from the Node service.
   - Keep `console.aorila.com` attached to the backend service (parent console + auth + leads).
6. **Verify backend health after every move.**
   - `GET https://console.aorila.com/healthz`
   - auth/account paths load
   - `/compute/v1/gpus` still answers
   - lead forms still submit from all allowed frontend origins

## Notes

- The frontend API origin is centralized in browser code. Production defaults to `https://api.aorilalabs.com` (Labs API, commercial uses).
- `STATIC_API_ORIGIN` can be set at build time if a temporary preview API origin is needed while testing static artifacts.
- Backend CORS is intentionally restricted to:
  - `https://aorila.com`
  - `https://www.aorila.com`
  - `https://aorilalabs.com`
  - `https://www.aorilalabs.com`
  - `https://robotics.aorila.com`
- Do **not** touch Atraly, DNS outside the planned cutovers, Render secrets, or live Render resources from this repo change alone.
