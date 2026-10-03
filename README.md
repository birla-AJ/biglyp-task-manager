# BigLyp Task Manager — Edge-Native Full-Stack Project

A full-stack task manager where registered users can create, update, filter and delete their personal tasks.

| Layer | Tech |
|---|---|
| Backend runtime | Cloudflare Workers (Hono router) |
| Database | Cloudflare D1 (SQLite) |
| ORM / migrations | Drizzle ORM (`sqlite-core`) + drizzle-kit |
| Auth | `jose` (HS256 JWT, 24h expiry) + `bcryptjs` |
| Validation | Zod (request bodies, query params, route params, env vars) |
| Frontend | Next.js 15 (App Router, static export) on Cloudflare Pages |
| Language | TypeScript, `strict: true`, no `any` |
| HTTP client | Native `fetch` |

## 🔗 Live URLs

- **Frontend (Cloudflare Pages):** `https://<YOUR-PAGES-PROJECT>.pages.dev`  ← replace after deploying
- **API (Cloudflare Worker):** `https://biglyp-task-api.<YOUR-SUBDOMAIN>.workers.dev`  ← replace after deploying

## Repository layout

```
.
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts        # app setup: env validation, CORS, error handling
│   │   ├── env.ts          # Bindings type + Zod env schema
│   │   ├── db/             # Drizzle schema + client
│   │   ├── lib/            # jwt (jose), password (bcryptjs), Zod schemas, errors
│   │   ├── middleware/     # JWT auth middleware
│   │   └── routes/         # auth.ts, tasks.ts
│   ├── drizzle/            # generated SQL migrations (drizzle-kit generate)
│   ├── drizzle.config.ts
│   └── wrangler.toml
└── web/                    # Next.js frontend
    └── src/
        ├── app/            # /login, /register, /dashboard
        ├── components/     # TaskCard, TaskModal, ConfirmDialog, Spinner
        └── lib/            # api client, auth context, Zod schemas, date helpers
```

## API

All endpoints live on the Worker. JSON in / JSON out.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Register (returns user, never the password) |
| POST | `/api/auth/login` | – | Returns `{ token, user }` (JWT, 24h) |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/tasks?status=` | ✓ | List own tasks, optional status filter |
| POST | `/api/tasks` | ✓ | Create task (`title`, `description?`, `status?`, `due_date?`) |
| GET | `/api/tasks/:id` | ✓ | Get one task |
| PATCH | `/api/tasks/:id` | ✓ | Partial update |
| DELETE | `/api/tasks/:id` | ✓ | Delete (204) |

Send the token as `Authorization: Bearer <token>`.
`due_date` is a Unix timestamp in **seconds**. Statuses: `todo`, `in-progress`, `done`.

Behaviour: invalid input → **400** with `{ "error": "email: Invalid email address" }`; missing/invalid JWT → **401**; someone else's task → **404** (every query filters on `user_id = JWT sub`).

## Environment variables

**Worker** (`worker/`)

| Name | Where | Description |
|---|---|---|
| `JWT_SECRET` | `wrangler secret put JWT_SECRET` / `worker/.dev.vars` locally | ≥ 32 chars. **Never commit.** |
| `CORS_ORIGIN` | `[vars]` in `wrangler.toml` | Allowed frontend origin(s), comma-separated |
| `BCRYPT_ROUNDS` | optional | Default `10` (see note below) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN` | shell env, only for `drizzle-kit migrate` on production | D1 HTTP credentials |

**Frontend** (`web/`)

| Name | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Deployed Worker URL (no trailing slash). Needed at **build time**. |

## Local setup

Prerequisites: Node.js 20+, a Cloudflare account (free is fine).

```bash
# 1) Worker
cd worker
npm install
cp .dev.vars.example .dev.vars          # then edit JWT_SECRET
npm run db:generate                     # drizzle-kit generate -> creates ./drizzle/*.sql
npm run db:migrate:local                # applies migrations to the LOCAL D1 (wrangler)
npm run dev                             # http://127.0.0.1:8787

# 2) Frontend (new terminal)
cd web
npm install
cp .env.example .env.local              # NEXT_PUBLIC_API_URL=http://127.0.0.1:8787
npm run dev                             # http://localhost:3000
```

Type-check both: `npm run typecheck` inside `worker/` and `web/`.

## Migrations

```bash
cd worker
npm run db:generate        # drizzle-kit generate  (schema -> SQL files in ./drizzle)
npm run db:migrate:local   # local D1 via wrangler
npm run db:migrate:remote  # PRODUCTION D1 via drizzle-kit migrate (needs the 3 CLOUDFLARE_* env vars)
```

## Deployment

### 1. Worker + D1

```bash
cd worker
npx wrangler login
npx wrangler d1 create biglyp-tasks-db
# -> copy the printed database_id into wrangler.toml ([[d1_databases]] database_id)

npm run db:generate                      # if not already generated, commit ./drizzle

# Apply migrations to PRODUCTION D1
export CLOUDFLARE_ACCOUNT_ID=<your account id>
export CLOUDFLARE_DATABASE_ID=<the database_id from above>
export CLOUDFLARE_D1_TOKEN=<API token with "D1 Edit" permission>
npm run db:migrate:remote

npx wrangler secret put JWT_SECRET       # paste a long random string
npm run deploy                           # prints https://biglyp-task-api.<subdomain>.workers.dev
```

Generate a secret with: `openssl rand -base64 48`

### 2. Frontend on Cloudflare Pages

```bash
cd web
npm install
NEXT_PUBLIC_API_URL=https://biglyp-task-api.<subdomain>.workers.dev npm run build   # outputs ./out
npx wrangler pages project create biglyp-task-manager --production-branch main     # first time only
npm run deploy                                                                      # wrangler pages deploy out
```

(or connect the GitHub repo in the Pages dashboard: root directory `web`, build command `npm run build`, output directory `out`, env var `NEXT_PUBLIC_API_URL`.)

### 3. Final step — CORS

Set `CORS_ORIGIN` in `worker/wrangler.toml` to your Pages URL (e.g. `https://biglyp-task-manager.pages.dev`) and run `npm run deploy` in `worker/` again.

## Notes

- **bcrypt CPU time:** `bcryptjs` is pure JS. On the Workers *free* plan (10 ms CPU limit) cost 10 can occasionally exceed the limit on register/login. If you see error 1102 / 500 on those endpoints, set `BCRYPT_ROUNDS = "8"` under `[vars]` (or use the paid plan).
- **Ownership:** every task query includes `AND user_id = <JWT sub>`, so other users' tasks behave as non-existent (404).
- **DB-level status enforcement:** `CHECK (status IN ('todo','in-progress','done'))` on `tasks`.
- The JWT lives in `localStorage` on the client (frontend and API are on different origins).
# biglyp-task-manager
