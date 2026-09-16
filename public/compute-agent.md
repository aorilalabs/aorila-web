# Aorila compute — agent setup

Fetch this first: https://aorila.com/compute-agent.md

This is GPU rental. Not the AI API. Do not call the AI API for pods. Pods are Labs compute: https://dashboard.aorilalabs.com

## Product

Aorila combines capacity from many pools. Customer sees Aorila SKUs only.
Slight premium vs raw pool price is the product (one door, one bill).

## Control plane (private repo aorila-platform)

- GET /compute/v1/gpus
- POST /compute/v1/pods  { "sku": "h100-80", "tier": "secure" }
- GET /compute/v1/pods/:id
- POST /compute/v1/pods/:id/stop

Brand names: Aorila RTX 4090, Aorila L40S, Aorila A100 80GB, Aorila H100 80GB.
Never name upstream vendors in user copy.

## Operator env

RUNPOD_API_KEY=
VAST_API_KEY=
AORILA_FEE_BPS=600
AORILA_API_TOKENS=

On the compute host only. Not git. Not Supabase.
