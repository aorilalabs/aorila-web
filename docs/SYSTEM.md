# Aorila system map — one job per subsystem

We do **not** put everything in one blob. Each module owns a single concern. Other product surfaces (auth, scheduler, host agent, chat) stay out of this marketing repo until they have their own homes.

```
┌─────────────────────────────────────────────────────────────┐
│  aorila-web (this repo)                                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Marketing│  │  Leads   │  │ Vendors  │  │ Site routing│ │
│  │ pages/IA │  │ capture  │  │ registry │  │ host→face   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │             │             │                │        │
│       └─────────────┴──────┬──────┴────────────────┘        │
│                            │ Express app                    │
└────────────────────────────┼────────────────────────────────┘
                             │
        future platform ─────┼───── Connect / meter / agent
                             ▼
```

## Subsystems (what each does / does **not**)

| Module | Owns | Does **not** own |
| --- | --- | --- |
| **Marketing** (`lib/marketing-pages.js`, `sites/`) | Public copy, IA, CTAs | Pricing truth, live inventory |
| **Leads** (`lib/leads.js`) | Inbound forms (Labs, waitlist, key, provider) | Vendor lifecycle, payouts |
| **Vendors** (`lib/vendors/`) | Provider registry, supported SKU/region catalog, status | Scheduling jobs, host daemon, Stripe |
| **Site routing** (`lib/resolve-site.js`, `server.js`) | Host → consumer / API / Labs | Product auth |
| **Connect plan** (`docs/CONNECT.md`) | Payment design doc | Live Stripe keys in this app |

## Vendor lifecycle (this repo)

```
apply (/providers) → lead (kind=provider) + vendor status=applied
       → ops review (VENDOR_OPS_TOKEN API)
       → verified → active (listed on GET /api/vendors)
```

Activation for **payouts and host software** is Phase 1–2 of [COMPANY.md](./COMPANY.md) — not faked here.

## APIs in this repo

| Route | Audience | Purpose |
| --- | --- | --- |
| `POST /leads` | Public | Capture leads; provider apps also create a draft vendor |
| `GET /api/vendors` | Public | Active vendors only (empty until ops activates) |
| `GET /api/vendors/catalog` | Public | SKUs, regions, tiers we accept — the “all vendors” menu |
| `GET /api/ops/vendors` | Ops (`Authorization: Bearer $VENDOR_OPS_TOKEN`) | Full registry |
| `PATCH /api/ops/vendors/:id` | Ops | Advance status / tier / notes |
| `GET /healthz` | Platform | Liveness |

## Data

| File / env | Module |
| --- | --- |
| `data/leads.json` or `LEADS_PATH` | Leads |
| `data/vendors.json` or `VENDORS_PATH` | Vendors |
| `VENDOR_OPS_TOKEN` | Protects ops vendor routes (optional locally; required in prod for ops) |

Render disk is ephemeral without a persistent disk — treat JSON stores as staging until Postgres lands in the platform repo.

## Rule

If a change needs auth sessions, GPU scheduling, or money movement — **new subsystem / new repo**, not another page in marketing.
