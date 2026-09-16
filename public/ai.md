# Aorila AI API

For coding agents. Humans: https://aorila.com/api

Base URL: `https://api.aorilalabs.com`

This host is **inference only**. GPU rental is not served here.

## Auth

`Authorization: Bearer <key>`

Ask for a key at https://aorila.com/api or api@aorila.com.

## Models

`GET /v1/models`

Public IDs: `atraly-v1`, `atraly-v1.5`, `atraly-v2.0`.

## Chat

`POST /v1/chat/completions`

Body matches OpenAI chat completions (`model`, `messages`, optional `temperature`, `max_tokens`, `stream`).

```bash
curl https://api.aorilalabs.com/v1/chat/completions \
  -H "Authorization: Bearer $AORILA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"atraly-v2.0","messages":[{"role":"user","content":"Hello"}]}'
```

Point any OpenAI-compatible client at `https://api.aorilalabs.com/v1`.

## Agent index

- https://aorila.com/llms.txt
- https://aorila.com/llms-full.txt
