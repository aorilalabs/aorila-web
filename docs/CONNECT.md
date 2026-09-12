# Stripe Connect recommendation — Aorila GPU marketplace

Internal plan for when we turn on real payments. Do **not** expose Stripe branding on public marketing pages until product checkout ships.

## Business model (confirmed)

- **Platform**: Aorila (merchant of record for customer compute purchases)
- **Connected accounts**: GPU providers / hosts / DC partners who get paid for capacity used
- **Customers**: developers and companies renting pods / serverless / clusters
- **Monetization**: application fee ≈ “Aorila fee” on top of compute; optional Labs subscription or reserved-capacity products later

## Recommended Connect configuration

| Decision | Choice | Why |
| --- | --- | --- |
| Integration shape | **Marketplace** | Customers pay Aorila; Aorila pays providers |
| Accounts API | **Accounts v2** | New integration; recipient/merchant configs as needed |
| Dashboard for providers | **Embedded components** (or Express-hosted) | Providers need payouts + tax forms without building a bank UI |
| Charge pattern | **Separate charges and transfers** | Usage is metered *after* the job starts; often you charge (or debit prepaid balance) before you know final GPU-seconds / which host served failover |
| Platform fee | Withhold from transfer amount (ledger) | Matches “compute cost + Aorila fee” |
| Negative balance liability | **Platform** | Standard for marketplace destination/separate patterns |
| Cross-border providers | Plan for **cross-border payouts** early | GPU supply is global |

### Why not destination charges alone?

Destination charges fit one-shot, known-seller carts. GPU rental is continuous and may **migrate hosts**, refund partial hours, or split storage/egress. A **usage ledger + transfers** (with `source_transaction` when mapping to a charge) keeps payouts correct.

### Why not direct charges?

Customers buy **Aorila**, not “Host #482”. Brand, disputes, and enterprise invoicing should sit on the platform.

## Money flow (target)

1. Customer funds a balance or pays an invoice / PaymentIntent on the **platform**.
2. Control plane meters GPU-seconds (and add-ons) against the serving provider(s).
3. Ledger credits provider owed amount; platform keeps Aorila fee + covers Stripe fees.
4. Transfer to provider connected account on a schedule (e.g. daily) or threshold.
5. Stripe pays out to the provider’s bank per their payout settings.
6. Hold / clawback rules for fraud, failed verification, or SLA breach.

## Onboarding providers

1. Apply on `/providers` (this site) → ops qualify hardware.
2. Create Connect account; collect KYC progressively (baseline identity → full TIN when thresholds / risk require).
3. Install host agent; pass verification self-test.
4. Enable `transfers` (and tax reporting capabilities where required).
5. List capacity; earn.

## Implementation checklist (product platform)

- [ ] Stripe Connect platform onboarding in Dashboard
- [ ] Accounts v2 create + Account Links / embedded onboarding
- [ ] Customers + PaymentElement (cards; add ACH for Labs later)
- [ ] Prepaid balance or postpaid invoice path
- [ ] Idempotent usage ledger
- [ ] Transfer job + webhooks (`account.updated`, `payout.*`, `charge.dispute.*`)
- [ ] 1099-K / local tax reporting settings for US providers
- [ ] Radar rules on platform charges; provider risk scoring in-app

## Explicit non-goals for aorila-web

This marketing repo stays free of Stripe.js and secret keys until a real checkout surface lives here or on the app domain.
