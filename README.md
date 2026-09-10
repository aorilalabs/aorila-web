# Aorila — dual site (consumer + Labs)

One Express app. The **Host** header chooses the face:

| Host | Site | Face |
| --- | --- | --- |
| `aorila.com` / `www.aorila.com` | Consumer | **API access** |
| `aorilalabs.com` / `www.aorilalabs.com` | Aorila Labs | **Request API access** |

Atraly is a separate consumer app and is **not** built in this repo.

Early-access sell path (prices may change; no Stripe on this site):

| Face | Public offer | Access |
| --- | --- | --- |
| Consumer | **compute cost + Aorila fee** | `/api` — Atraly link + `api@aorila.com` (one path; same as the nav API control) |
| Labs | Request API access | B2B contact form → `POST /leads` · `api@aorila.com` secondary |

No self-serve $29 / $199 checkout. The Atraly **app** is $20/mo on [atraly.com](https://atraly.com) — not this API. $99 is not a public Labs plan.

Leads are stored in `data/leads.json` (or `LEADS_PATH`). On Render the disk is ephemeral unless you attach a persistent disk.

**Home base: Render** — https://github.com/nbaldwin098/aorila-web

See **RENDER.md**. Both custom domains attach to the **same** web service. Push `main` (or merge this branch) to deploy. No env secrets required.

## Local

```bash
npm install
npm start
```

- Consumer: http://localhost:3000
- Labs preview: http://localhost:3000/?site=labs  
  or `curl -H 'X-Aorila-Site: labs' http://localhost:3000/`  
  On localhost / `*.onrender.com`, `?site=` also sets a cookie so `/api` stays on that face.

```bash
npm test
```

## Pages

- `/` — consumer: Aorila API-access story · Labs: request-API-access form
- `/api` (also `/docs`) — consumer: request path + Atraly pointer + `api@aorila.com` · Labs: same request-access form
- `/about` `/privacy` `/terms` — both hosts

Leads (`POST /leads`) store to `data/leads.json` or `LEADS_PATH`. Labs fields: company, name, email, use case, volume, optional website. Honeypot field is `fax` (hidden). No extra env is required for the form to accept posts.
