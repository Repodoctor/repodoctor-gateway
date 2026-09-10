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
- Aggregate public `/api/v1` routes (auth, organizations, SCM connect, repositories, analysis, findings)
- Forward SCM webhooks with the original raw body to `repodoctor-scm`

## API

- `GET /health`
- `GET /ready`
- `GET /docs` OpenAPI UI
- Public browser traffic must go through `repodoctor-gateway` only.

## Events

The gateway does not publish domain events. It proxies HTTP to SCM, repository, and findings.

## Environment variables

See `.env.example`. Never commit real secrets. Production uses `AUTH_PROVIDER=supabase` with `SUPABASE_URL` and `SUPABASE_JWKS_URL`. The dashboard authenticates with Supabase; this service only verifies those JWTs. Do not put a service-role or anon key on the gateway. Internal calls mint a 60s HS256 JWT from `INTERNAL_SERVICE_TOKEN`.

## Local development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run dev
```

Uses a vendored copy of `@repodoctor/contracts` in `vendor/contracts` (no sibling checkout required).

## Testing

Vitest + Fastify `inject`. Tests run without production Cloudflare/Supabase credentials.

## Docker

```bash
docker build -t ghcr.io/repodoctor/repodoctor-gateway:local .
```

## Deployment

GitHub Actions builds and publishes immutable images to GHCR. Coolify pulls `ghcr.io/repodoctor/repodoctor-gateway:<git-sha>` (never `latest`).
