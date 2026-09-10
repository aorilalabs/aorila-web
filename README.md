# Aorila — dual site (consumer + Labs)

One Express app. The **Host** header chooses the face:

| Host | Site | SKU |
| --- | --- | --- |
| `aorila.com` / `www.aorila.com` | Consumer | **Atraly v1** |
| `aorilalabs.com` / `www.aorilalabs.com` | Aorila Labs (B2B) | **Atraly v1.5** |

Aorila builds the AI. Atraly is a separate consumer app (Powered by Aorila) and is **not** built in this repo. Partner SKU **Atraly v2.0** is named in copy and API docs only.

Early-access sell path (prices may change; no Stripe on this site):

| Face | Public offer | Access |
| --- | --- | --- |
| Consumer | **compute cost + Aorila fee** · docs free | Waitlist → `POST /leads` · `hello@aorila.com` |
| Labs | **Quoted** · Dedicated 1.5× RunPod | Contact form → `POST /leads` · `sales@aorilalabs.com` secondary |

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

- `/` — site landing
- `/api` (also `/docs`) — SKU + chat-completions docs for that face
