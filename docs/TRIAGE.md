# Aorila triage

## Surfaces

| Surface | Host | Job |
| --- | --- | --- |
| Consumer | aorila.com | Marketing + on-demand catalog |
| Commercial | aorila.com/commercial | Planned VMs, reserved, MSA |
| AI API | api.aorila.com | Models — not pods |
| Compute API | aorila-compute.onrender.com | Live catalog / start / stop |
| Labs | aorilalabs.com | Enterprise request |

## Consumer pages accounted for

Home, API, Docs, T&P, Support, Pods, Serverless, Clusters (→ commercial VMs), Hub, Deployments, Inference, Agents, Fine-Tuning, Compute-Heavy, Case Studies, Articles, Press, Blog, About, Providers, Partner, Careers, Pricing (live), Enterprise, Contact, Search, Commercial, Commercial/VMs, Commercial/Reserved, Commercial/Terms.

## Build order

1. Live catalog on /pricing and /pods — now
2. Commercial tab + planned VMs page — now
3. Real start/stop behind compute host + credit on provider accounts
4. Customer prepaid / Stripe
5. compute.aorila.com DNS
6. Rotate Render + provider keys when this phase is done
