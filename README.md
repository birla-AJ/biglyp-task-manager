# BigLyp Task Manager

A task manager built with Next.js, Cloudflare Workers, D1, Drizzle ORM and TypeScript.

## Live links

- Frontend: https://biglyp-task-manager-ewg.pages.dev
- API: https://biglyp-task-api.ajaybirlaep.workers.dev

## Features

- Register and login with JWT authentication
- Create, edit, delete and filter personal tasks
- Task statuses: Todo, In Progress and Done
- Due dates and inline status updates
- Input validation with Zod
- User-level task ownership

## Tech stack

- Frontend: Next.js App Router, TypeScript, Zod
- Backend: Cloudflare Workers, Hono, D1 and Drizzle ORM
- Authentication: jose and bcryptjs

## Project structure

```text
web/       Next.js frontend
worker/    Cloudflare Worker API and D1 schema
```

## Run locally

### Backend

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
```

Set a `JWT_SECRET` with at least 32 characters in `.dev.vars`, then run:

```bash
npm run db:generate
npm run db:migrate:local
npm run dev
```

The API runs on `http://127.0.0.1:8787`.

### Frontend

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787` in `.env.local` for local development.

## Useful commands

```bash
# in worker/
npm run typecheck
npm run db:generate
npm run db:migrate:local
npm run db:migrate:remote
npm run deploy

# in web/
npm run typecheck
npm run build
npm run deploy
```

## Environment variables

| Variable              | Used by  | Purpose                     |
| --------------------- | -------- | --------------------------- |
| `JWT_SECRET`          | Worker   | JWT signing secret          |
| `CORS_ORIGIN`         | Worker   | Allowed frontend origins    |
| `BCRYPT_ROUNDS`       | Worker   | Optional bcrypt cost factor |
| `NEXT_PUBLIC_API_URL` | Frontend | Worker API URL              |

`JWT_SECRET` is stored with `wrangler secret put JWT_SECRET` in production and must not be committed.
