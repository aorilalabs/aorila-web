# Aorila — dual site (consumer + Labs)

One Express app. The **Host** header chooses the face:

| Host | Site | SKU |
| --- | --- | --- |
| `aorila.com` / `www.aorila.com` | Consumer | **Atraly v1** |
| `aorilalabs.com` / `www.aorilalabs.com` | Aorila Labs (B2B) | **Atraly v1.5** |

Aorila builds the AI. Atraly is a separate consumer app (Powered by Aorila) and is **not** built in this repo. Partner SKU **Atraly v2.0** is named in copy and API docs only.

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

```bash
npm test
```

## Pages

- `/` — site landing
- `/api` (also `/docs`) — SKU + chat-completions docs for that face
