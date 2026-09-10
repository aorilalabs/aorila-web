# Aorila + Aorila Labs on one Render service

Repo: `https://github.com/nbaldwin098/aorila-web`

**One Render web service. One deploy.** `aorilalabs.com` is another custom domain on the **same** service as `aorila.com` — not a second Blueprint service, not a second start command.

Routing is Host-based in `server.js` only. Attach both apex + www names to that single service.

| Custom domain | Face | Default page |
| --- | --- | --- |
| `aorila.com` and `www.aorila.com` | Consumer | Aorila / **Aorila builds AI** |
| `aorilalabs.com` and `www.aorilalabs.com` | Labs | Aorila Labs / **Request API access** |

The `*.onrender.com` hostname defaults to consumer. Preview Labs with `?site=labs` or header `X-Aorila-Site: labs`.

Push to `main` → Render auto-deploys. No secrets needed for this site.

Contact / waitlist posts go to `POST /leads` and append `data/leads.json` (override with `LEADS_PATH`). The Render filesystem is ephemeral unless you attach a disk to that path.

## One-time setup

1. Render → **New → Web Service** → connect **nbaldwin098/aorila-web** (or apply `render.yaml`).
2. Build: `npm install --omit=dev` · Start: `npm start` · bind is `0.0.0.0:$PORT`.
3. **Custom domains** on **this same service** — add all four if you want www:
   - `aorila.com`
   - `www.aorila.com`
   - `aorilalabs.com`
   - `www.aorilalabs.com`
4. DNS: CNAME each www (and ALIAS/ANAME or Render nameservers for apex) to the service’s `onrender.com` hostname. Do **not** create a second web service for Labs.

TLS is issued per hostname by Render once DNS verifies.

## Day-to-day

```bash
git add -A && git commit -m "…" && git push origin main
```

## Health

`GET /` returns 200 on either host. `GET /healthz` returns `{ ok, site }`.
