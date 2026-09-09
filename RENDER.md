# Aorila Labs on Render (home base)

Repo: `https://github.com/nbaldwin098/aorila-web`  
Domains: `aorila.com` / `aorilalabs.com`

Push to `main` → Render auto-deploys. No secrets needed for this site.

## One-time setup

1. Render → **New → Web Service** → connect **nbaldwin098/aorila-web**
2. Build: `npm install --omit=dev` · Start: `npm start`
3. Custom domains → `aorila.com` + `aorilalabs.com` (and www if you want)

## Day-to-day

```bash
git add -A && git commit -m "…" && git push origin main
```
