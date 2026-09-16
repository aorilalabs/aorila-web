# Aorila — dual site (consumer + Labs)

One Express app. The **Host** header chooses the face:

| Host | Site | Face |
| --- | --- | --- |
| `aorila.com` / `www.aorila.com` | Consumer (Aorila parent) | **The Future of AI Innovation** |
| `aorilalabs.com` / `www.aorilalabs.com` | Aorila Labs | **Peer-powered compute marketplace** |

Entity map: **Aorila** (parent, DE C-corp) = aorila.com + parent console (donations, emails, updates) ·
**Aorila Labs** (Labs LLC) = aorilalabs.com + dashboard.aorilalabs.com + `api.aorilalabs.com` (Labs API, commercial uses) ·
**Atraly** (Atraly LLC) = atraly.com + `api.atraly.com` (consumer API, Labs-managed).
Entities share ONLY login. `api.aorila.com` does not exist. API hosts are pure JSON — never pages.
Separate Renders + Supabase projects per entity are deferred, not yet done.

Atraly is a separate consumer app and is **not** built in this repo.

**Company direction:** Aorila is an AI compute marketplace — many GPU providers, one customer front door. See [docs/COMPANY.md](docs/COMPANY.md) and [docs/CONNECT.md](docs/CONNECT.md).

Early-access sell path (prices may change; no Stripe on this site):

| Face | Public offer | Access |
| --- | --- | --- |
| Consumer | **compute cost + Aorila fee** | `https://aorila.com/api` — Atraly link + `api@aorila.com` |
| Providers | List GPUs on the network | `/providers` application → `POST /leads` (`kind=provider`) |
| Labs | Commercial API access | B2B contact form → `POST /leads` · `api@aorila.com` secondary |

No self-serve $29 / $199 checkout. The Atraly **app** is $20/mo on [atraly.com](https://atraly.com) — not this API. $99 is not a public Labs plan.

Leads are stored in `data/leads.json` (or `LEADS_PATH`). On Render, `render.yaml` mounts a disk at `/var/data` and sets `LEADS_PATH` so Labs and provider submissions survive restarts.

**Home base: Render** — https://github.com/nbaldwin098/aorila-web

See **RENDER.md**. Consumer and Labs attach to the **same** web service for now (per-entity renders are deferred). Push `main` (or merge this branch) to deploy. No env secrets required.

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

- `/` — consumer: one-line landing + key / Labs CTAs · API host: slim Atraly + `api@aorila.com` · Labs: request form
- `/api` — consumer + preview hosts: slim API page (`sites/consumer/api.html`) · Labs: request form
- `/docs` — both hosts: docs ship with a key (no public reference)
- consumer `/tp` + `/support`; Labs `/tp` + `/support` (same footer as aorila.com)

Leads (`POST /leads`) store to `data/leads.json` or `LEADS_PATH`. Labs fields: company, name, email, use case, volume, optional website. Honeypot field is `fax` (hidden). No extra env is required for the form to accept posts.
