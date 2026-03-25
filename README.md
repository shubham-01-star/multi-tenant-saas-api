# Multi-Tenant SaaS API

Production-oriented multi-tenant REST API for a B2B SaaS platform with tenant-scoped API key auth, Redis sliding-window rate limiting, BullMQ-based transactional email delivery, tamper-evident audit logs, and protected operational endpoints.

## Stack

- Runtime: Node.js + TypeScript
- Framework: Express
- Database: PostgreSQL + Prisma Client + Prisma Postgres adapter
- Cache / Queue: Redis + BullMQ
- Mail: Nodemailer + Ethereal test transport
- Tests: Vitest

## Why Express

Express was retained instead of switching frameworks because the repository already started on Express, and the middleware-first model maps cleanly to this problem: API key tenant resolution, rate limiting, internal key protection, telemetry, and error normalization all fit naturally into the request pipeline. That kept the implementation incremental and easy to commit in believable slices.

## Architecture Decisions

### Tenant isolation

Tenant context is resolved from the API key on every authenticated request. The API never trusts a client-supplied tenant ID for authorization.

Isolation is enforced at the query layer, not only in middleware:

- tenant-scoped repository methods require `tenantId`
- resource lookups use tenant-aware filters such as `findFirst({ where: { id, tenantId } })`
- cross-tenant access returns not found because the query never leaves the authenticated tenant scope

### API keys

API keys are generated as `mtk_<prefix>_<secret>`.

- only the raw key is shown at creation time
- only Argon2 hashes are stored
- auth resolves the record by prefix and then verifies the full raw key against the hash
- key rotation creates a new key and leaves the old one valid for exactly 15 minutes through `graceExpiresAt`

### Rate limiting

Rate limiting uses Redis sorted sets and a sliding-window algorithm.

Implemented tiers:

- Global: 1000 requests per minute per tenant
- Endpoint: configurable per route per tenant
- Burst: 50 requests per 5 seconds per API key

Algorithm summary:

1. remove expired timestamps from the sorted set
2. count the timestamps still inside the active window
3. deny if count already reached the limit
4. otherwise insert the current request timestamp

This avoids the fixed-window boundary bug where clients can double-spend quota around minute edges.

### Queue-based email engine

All transactional emails go through BullMQ.

BullMQ was used instead of the older Bull package because it is the modern maintained successor in the same Redis-backed queue family and provides better ergonomics around retries, workers, and queue inspection.

Implemented email triggers:

- user invited to tenant
- API key rotated
- rate limit threshold warning at 80 percent of the global tenant limit, throttled to one warning per hour per tenant

Implemented delivery behavior:

- retry with exponential backoff
- dead-letter queue for exhausted jobs
- delivery log in PostgreSQL
- preview URLs from Ethereal for development verification

### Tamper-evident audit trail

Every state-changing operation writes an audit log entry containing:

- action type
- actor user
- API key used
- IP address
- previous value
- new value
- previous chain hash
- current chain hash

The chain hash is SHA-256 over deterministic serialized entry data plus the previous hash.

Because entries are linked per tenant, tampering with any row breaks all following hashes.

Database-level append-only protection is implemented through the SQL trigger in:

- `prisma/migrations/20260324190000_audit_log_append_only/migration.sql`

This trigger blocks `UPDATE` and `DELETE` on `AuditLog`.

### Health and metrics

Internal endpoints are protected with a separate `INTERNAL_API_KEY`.

- `GET /health` checks DB, Redis, queue depth, and average response time over the last 60 seconds
- `GET /metrics` aggregates current billing-period usage per tenant

## Error Shape

All API errors follow this contract:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Local Setup

### 1. Start infrastructure

```bash
docker compose up -d
```

This project uses these local ports by default:

- PostgreSQL: `5434`
- Redis: `6380`

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Generate Prisma client

```bash
npm install
npm run prisma:generate
```

### 4. Push schema to PostgreSQL

```bash
npx prisma db push --config prisma.config.ts
```

### 5. Apply append-only audit trigger

```bash
docker exec -i mt-saas-postgres psql -U postgres -d multitenant_saas -f - < prisma/migrations/20260324190000_audit_log_append_only/migration.sql
```

### 6. Seed sample data

```bash
npm run seed
```

### 7. Run API and worker

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run worker
```

## Validation Performed

The implementation was validated against an isolated Docker-backed setup:

- PostgreSQL on port `5434`
- Redis on port `6380`
- schema sync completed
- audit trigger applied
- seed completed successfully
- app and worker started successfully
- `/`, `/health`, `/auth/me`, `/projects`, and `/users/invite` were smoke-tested
- queued invite email reached `SENT` state with an Ethereal preview URL

## Seed Output

The seed script creates:

- 2 tenants
- 3 users per tenant: 1 owner and 2 members
- owner API key per tenant
- projects per tenant
- prebuilt valid audit chain entries
- request metric rows
- Redis rate-limit state for testing scenarios

## Useful Commands

```bash
npm run dev
npm run worker
npm run typecheck
npm test
npm run seed
```

## OpenAPI

API documentation is available in:

- `openapi.yaml`

## Known Limitations

- Prisma 7 currently required runtime adapter wiring with `@prisma/adapter-pg`, so schema bootstrap uses `prisma db push` plus the explicit audit SQL trigger step instead of a full generated migration stack for all models.
- Integration tests focus on the two subtle areas requested by the assignment: sliding-window logic and audit-chain verification. Full HTTP integration coverage can be expanded further.
- Rate-limit warning emails are throttled in Redis, but alert delivery history is not yet separately summarized in metrics beyond email delivery status.
- Queue health currently reports pending and failed jobs; more detailed worker latency metrics could be added later.

## Explanation Field Draft

The hardest problem was making the system feel truly tenant-safe while also keeping the code practical to extend. I avoided treating tenant isolation as only an authentication concern. Instead, the API key middleware resolves tenant context once, and every tenant-owned repository method requires that tenant ID as part of the query filter. That means the database lookup itself is scoped, so a Tenant A user never reaches Tenant B data and usually cannot even confirm whether a foreign resource exists. The second tricky area was the audit trail: the chain hash has to be deterministic, so I normalized JSON before hashing and linked each entry to the previous tenant hash. That made it possible to build a verification endpoint that can identify the first broken row. If I were doing one more pass, I would replace the current `db push` bootstrap with a more polished migration workflow tailored for Prisma 7 adapters, so local setup would be even smoother for reviewers.
