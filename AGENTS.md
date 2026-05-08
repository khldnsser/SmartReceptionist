# Agent Guide

This file is the canonical guide for Codex and other AI coding agents working in this repo.

## Project Shape

- Root package: WhatsApp AI receptionist backend, Express, TypeScript, Node.js.
- `web/`: doctor-facing PMS, Next.js 14 App Router, React 18, Tailwind, Supabase Auth.
- Shared data store: Supabase Postgres and private Supabase Storage.
- Current system does not use Google APIs.

## Working Rules

- Preserve user changes. Check `git status --short` before editing and do not revert unrelated work.
- Keep docs lean. Prefer updating `README.md` and this file instead of adding new Markdown files.
- Keep secrets out of git. Track sanitized `.env.example` files only.
- Use repo-local patterns before adding new abstractions.
- Keep backend business rules out of HTTP handlers when they belong in domain or service modules.
- Keep PMS feature-specific UI/actions in `web/src/features` unless the component is genuinely shared.

## Backend Boundaries

- `src/core`: config, logger, error types.
- `src/infra`: low-level external clients.
- `src/repositories`: database persistence.
- `src/domain`: pure logic with no I/O.
- `src/services`: application workflows and orchestration.
- `src/agent`: agent loop, memory, prompt, guardrails, tools.
- `src/http`: routes, middleware, request/response handling.
- `src/jobs`: scheduled tasks.

Legacy compatibility folders may still exist. Migrate imports toward the boundaries above when touching related code, but do not perform broad rewrites unless the task calls for it.

## Web Boundaries

- Use server components for data loading where practical.
- Use server actions for mutations.
- Use `createClient()` for Supabase auth checks.
- Use `createAdminClient()` only on the server for trusted data operations.
- Keep browser-safe values under `NEXT_PUBLIC_*`; keep service-role keys server-only.

## Privacy Rules

- The agent can manage appointments and access only patient-facing clinical fields.
- Doctor-only notes, diagnoses, signed summaries, and vitals are not patient-facing agent data.
- Media extraction can provide context to the agent, but extracted clinical content must not be relayed back as medical interpretation.

## Validation

Run these before handing back code changes when feasible:

```bash
npm run build
npm --prefix web run lint
npm --prefix web run type-check
npm --prefix web run build
```

For Docker changes:

```bash
docker compose build
docker compose up -d
curl http://localhost:3000/health
docker compose down
```
