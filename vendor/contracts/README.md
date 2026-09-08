# RepoDoctor Contracts

Shared, versioned TypeScript contracts for the RepoDoctor platform.

This is the **only** shared npm package across RepoDoctor services. Services must not query another service's database and must not import another service's internals.

## Purpose

- Zod schemas for public API payloads
- Domain events and topic names
- Authorization ranks (organization roles and repository permissions)
- Provider-neutral `SourceControlProvider` and `MessageBus` interfaces
- Deterministic finding fingerprints and health-score formula

## Package

```
@repodoctor/contracts
```

GitHub: `https://github.com/Repodoctor/repodoctor-contracts`

Published to GitHub Packages (`https://npm.pkg.github.com`) on every push to `main` (prerelease `0.1.0-<sha>`) and on `v*` tags (the version in `package.json`).

```bash
npm login --scope=@repodoctor --registry=https://npm.pkg.github.com
```

```json
"@repodoctor/contracts": "0.1.0"
```

Backend services also vendor a snapshot at `vendor/contracts` so GitHub Actions and Docker builds do not need a GitHub Packages token or a sibling checkout.

## Local development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

No production credentials are required.

## Environment variables

None at runtime. `.env.example` exists for consistency.

## Testing

Vitest unit tests cover authorization, fingerprints, health scoring, and local bus idempotency.

## Docker / deployment

This repository is a library, not a deployable service. GitHub Actions publishes to GitHub Packages (`@repodoctor/contracts`).
