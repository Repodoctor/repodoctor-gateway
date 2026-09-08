# RepoDoctor Gateway

Public API gateway: authentication, authorization, tenant isolation, and API aggregation.

GitHub: `https://github.com/Repodoctor/repodoctor-gateway`
Image: `ghcr.io/repodoctor/repodoctor-gateway:<git-sha>`

## Purpose

Independently deployable gateway service for RepoDoctor.

## Responsibilities

- Authenticate users (Supabase Auth or local provider)
- Authorize organization roles and repository permissions
- Enforce tenant isolation
- CORS, rate limiting, request IDs, tracing, error envelopes
- Aggregate public /api/v1 routes

## API

- `GET /health`
- `GET /ready`
- `GET /docs` OpenAPI UI
- Public browser traffic must go through `repodoctor-gateway` only.

## Events

Published: repository.created

Consumed: (none in this phase)

## Environment variables

See `.env.example`. Never commit real secrets. `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Local development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run dev
```

Requires a sibling checkout of `repodoctor-contracts` (file dependency).

## Testing

Vitest + Fastify `inject`. Tests run without production Cloudflare/Supabase credentials.

## Docker

```bash
mkdir -p /tmp/ctx/service /tmp/ctx/contracts
cp -a . /tmp/ctx/service
cp -a ../repodoctor-contracts /tmp/ctx/contracts
docker build -f Dockerfile -t ghcr.io/repodoctor/repodoctor-gateway:local /tmp/ctx
```

## Deployment

GitHub Actions builds and publishes immutable images to GHCR. Coolify pulls `ghcr.io/repodoctor/repodoctor-gateway:<git-sha>` (never `latest`).
