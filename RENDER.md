# Aorila + Aorila Labs on one Render service

Repo: `https://github.com/nbaldwin098/aorila-web`

**One Render web service. One deploy.** `aorilalabs.com` and `api.aorila.com` are more custom domains on the **same** service as `aorila.com` — not a second Blueprint service, not a second start command.

Routing is Host-based in `server.js` only. Attach consumer, Labs, and API names to that single service.

| Custom domain | Face | Default page |
| --- | --- | --- |
| `aorila.com` and `www.aorila.com` | Consumer | Aorila / **The Future of AI Innovation** |
| `api.aorila.com` | Consumer API face | Slim **Aorila API** (`sites/consumer/api.html`) at `GET /` |
| `aorilalabs.com` and `www.aorilalabs.com` | Labs | Aorila Labs / **Request API access** |

`aorila.com/api` **serves** the slim consumer API page (same as `api.aorila.com/`). On `api.aorila.com`, `GET /api` may 301 to `/` on that host. Labs `/api` stays on the Labs host.

The `*.onrender.com` hostname defaults to consumer. Preview Labs with `?site=labs` or header `X-Aorila-Site: labs`. Local / preview `/api` serves the slim page.

Push to `main` → Render auto-deploys. No secrets needed for this site.

Contact / waitlist posts go to `POST /leads` and append `data/leads.json` (override with `LEADS_PATH`). The Render filesystem is ephemeral unless you attach a disk to that path.

## One-time setup

1. Render → **New → Web Service** → connect **nbaldwin098/aorila-web** (or apply `render.yaml`).
2. Build: `npm install --omit=dev` · Start: `npm start` · bind is `0.0.0.0:$PORT`.
3. **Custom domains** on **this same service** — add these (www optional except skip `www.api`):
   - `aorila.com`
   - `www.aorila.com`
   - `api.aorila.com` — CNAME to the service’s `onrender.com` hostname
   - `aorilalabs.com`
   - `www.aorilalabs.com`
4. DNS: CNAME `www`, `api.aorila.com`, and (if used) Labs www to the service’s `onrender.com` hostname. Apex names need ALIAS/ANAME or Render nameservers. Do **not** create a second web service for Labs or for the API face.

TLS is issued per hostname by Render once DNS verifies.

## Day-to-day

```bash
git add -A && git commit -m "…" && git push origin main
```

## Health

`GET /` returns 200 on consumer and Labs. On `api.aorila.com`, `GET /` is the slim API page (also 200). `GET /healthz` returns `{ ok, site }` on every host, including `api.aorila.com`.
