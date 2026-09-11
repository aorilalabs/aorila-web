# Aorila — dual site (consumer + Labs)

One Express app. The **Host** header chooses the face:

| Host | Site | Face |
| --- | --- | --- |
| `aorila.com` / `www.aorila.com` | Consumer | **The Future of AI Innovation** |
| `api.aorila.com` | Consumer API face | Slim **Aorila API** at `/` (same copy as today’s `/api`) |
| `aorilalabs.com` / `www.aorilalabs.com` | Aorila Labs | **Request API access** |

Atraly is a separate consumer app and is **not** built in this repo.

Early-access sell path (prices may change; no Stripe on this site):

| Face | Public offer | Access |
| --- | --- | --- |
| Consumer | **compute cost + Aorila fee** | `https://api.aorila.com` — Atraly link + `api@aorila.com` (`aorila.com/api` 301s here) |
| Labs | Request API access | B2B contact form → `POST /leads` · `api@aorila.com` secondary |

No self-serve $29 / $199 checkout. The Atraly **app** is $20/mo on [atraly.com](https://atraly.com) — not this API. $99 is not a public Labs plan.

Leads are stored in `data/leads.json` (or `LEADS_PATH`). On Render the disk is ephemeral unless you attach a persistent disk.

**Home base: Render** — https://github.com/nbaldwin098/aorila-web

See **RENDER.md**. Consumer, Labs, and `api.aorila.com` attach to the **same** web service. Push `main` (or merge this branch) to deploy. No env secrets required.

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
- `/api` — consumer custom domains: 301 → `https://api.aorila.com/` · preview hosts: slim page · Labs: request form
- `/docs` — both hosts: docs ship with a key (no public reference)
- consumer `/tp` + `/support`; Labs `/privacy` + `/terms`

Leads (`POST /leads`) store to `data/leads.json` or `LEADS_PATH`. Labs fields: company, name, email, use case, volume, optional website. Honeypot field is `fax` (hidden). No extra env is required for the form to accept posts.
