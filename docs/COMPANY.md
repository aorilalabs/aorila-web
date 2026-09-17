# Aorila — from demo to real company

This repo today is the **marketing + lead-capture surface** (`aorila.com` / `aorilalabs.com`) plus the **parent console** (account, billing, auth). Entity map: Aorila (parent) = aorila.com + parent console · Aorila Labs = aorilalabs.com + dashboard + `api.aorilalabs.com` · Atraly = atraly.com + `api.atraly.com`. Entities share only login; `api.aorila.com` does not exist. Going from demo to a functioning company means becoming the **default place customers find GPU capacity** — and that only works if **providers never run dry**.

## What we are

Aorila is an **AI compute marketplace**: customers rent pods, serverless endpoints, and clusters; independent **providers** (hosts, colo operators, data centers) supply GPUs; Aorila takes a **platform fee on top of compute cost**.

That is the same structural bet as Vast.ai / RunPod Community Cloud — with a chance to win **supply** while competitors tighten or pause host onboarding.

## Honest current state

| Layer | Status |
| --- | --- |
| Brand + IA (Pods, Serverless, Clusters, Hub, Hybrid Cloud) | Marketing shells |
| Labs commercial API request + lead store | Real (file-backed; ephemeral on Render without a disk) |
| Auth / API access CTAs | Links to `aorila.com/api` — separate logins per site (Aorila, Atraly, Labs) |
| Checkout / payouts | None in this repo (by design today) |
| Host agent, scheduler, capacity inventory | Not in this repo |
| Atraly / Ally | Separate products |

Until inventory, billing, and fulfillment are real, public copy must stay **access-request** honest — not fake SKUs or fake prices.

## The winning wedge: provider density

Customers come when GPUs are available. Providers come when demand (and payouts) are reliable. Liquidity is the product.

### Market timing (research)

- Hyperscalers absorb premium SKUs; independent capacity still needs a front door.
- Open marketplaces (Vast-style) win on **breadth and price discovery**.
- Curated clouds (RunPod Secure-style) win on **reliability and DX**.
- When a large competitor **pauses community host onboarding** or leans first-party, independent operators look for a fair marketplace. That is our opening.

### Supply strategy (how we never run out)

1. **Always-open provider funnel** — `/providers` application → ops review → KYC/payouts → host agent → verified listing. Never close the door while demand exists.
2. **Two supply tiers** (same control plane)
   - **Open Cloud** — verified independents; competitive pricing; reliability score.
   - **Secure Cloud** — certified DC partners; SLA / compliance path for enterprise.
3. **Marketplace-neutral economics** — do not starve providers with opaque first-party competition on the same listings. If Aorila later runs owned capacity, label it clearly and keep ranking rules fair.
4. **Earn providers’ loyalty**
   - Fast, predictable payouts
   - Transparent utilization and queue demand
   - Simple host software (daemon + Docker + NVIDIA)
   - Verification that rewards uptime, network, and CUDA freshness
   - Optional reserved / interruptible / on-demand so idle GPUs still earn
5. **Demand on-ramp in parallel** — API keys, Labs enterprise, Atraly/Ally traffic — or supply sits empty and hosts leave.

### Demand strategy (why people have to come to us)

- **Depth of SKUs** across regions (marketing already claims global reach — inventory must back it).
- **One control plane** for open + secure + hybrid (customer’s own hardware).
- **Developer path**: pods → serverless → clusters without rewriting the stack.
- **Commercial path**: Labs quotes for volume and dedicated capacity.

## Operating system of the company (build order)

Not calendar estimates — dependency order:

### Phase 0 — Company surface (this repo)

- Provider application + partner DC path (lead kinds)
- Durable lead storage (Postgres or disk) — Render filesystem is ephemeral
- Clear public story: compute marketplace + fee, not fake plan cards

### Phase 1 — Trust & money rails

- Customer accounts + API keys
- Provider connected accounts + identity verification
- Metered usage ledger (GPU-seconds, storage, egress)
- Platform fee (“compute cost + Aorila fee”)
- Webhooks for payouts, disputes, account updates
- See [CONNECT.md](./CONNECT.md)

### Phase 2 — Supply software

- Host agent (heartbeat, hardware inventory, CUDA/driver probe, job sandbox)
- Listing + pricing controls for providers
- Verification / reliability scoring
- Capacity API used by the control plane

### Phase 3 — Fulfillment

- Scheduler (pack jobs onto GPUs, preemption for interruptible)
- Pod / serverless / cluster product surfaces that **consume real inventory**
- Customer console that matches marketing IA

### Phase 4 — Moat

- Regional density maps that competitors cannot fake
- Reserved capacity marketplace (presell before racks land)
- Enterprise Secure Cloud certifications
- Keep the provider door open when others close theirs

## What “best” means for us

Not the loudest landing page. Best means:

1. A customer can get a GPU **now**.
2. A provider can list and get paid **without begging for demand**.
3. Aorila’s fee is earned for discovery, billing, support, and trust — not for locking hosts out.

## Repo boundaries

| Concern | Where |
| --- | --- |
| Marketing, legal stubs, provider/Labs leads | **This repo** |
| Auth, billing, host agent, scheduler | Product platform repo(s) |
| Consumer chat / Ally | Atraly / Ally |

Ship Phase 0 here. Do not pretend Phase 3 exists in HTML alone.
