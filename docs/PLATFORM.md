# Aorila compute API

Lives in this repo (`platform/`). Public responses are branded Aorila only.

## Routes

- `GET /v1/health`
- `GET /v1/catalog/gpus?sku=&tier=&region=`
- `POST /v1/jobs` `{ "sku": "h100-80", "tier": "secure" }`
- `GET /v1/jobs` / `GET /v1/jobs/:id` / `POST /v1/jobs/:id/stop`

Without `RUNPOD_API_KEY`, catalog and jobs use Aorila mock capacity so the API works locally.

Set keys on the Render service (not in git):

```
AORILA_FEE_BPS=600
RUNPOD_API_KEY=
VAST_API_KEY=
AORILA_API_TOKENS=
```

`AORILA_REVEAL_UPSTREAM=1` is ops-only. Default hides sourced pools.
