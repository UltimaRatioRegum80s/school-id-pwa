---
name: Production data migration constraints (task agent)
description: Why/how to migrate DATA (not schema) into a Replit-managed production DB from a task-agent environment.
---

# Migrating data into Replit-managed production from a task agent

A task agent has **no direct write path** to the Replit-managed production database:

- `executeSql({ environment: "production" })` is **read-only** (SELECT only) — it hits a read replica that can lag the real prod DB.
- A custom HTTP endpoint added to an artifact is **not in production** until the task is merged AND the user republishes from the main repl. So an in-app migration endpoint built inside a task env can never be reached at the live URL during that task — the live build predates it and returns 404 no matter how many times the user re-publishes.
- The production `DATABASE_URL` / `PG*` exist as secrets but their **values are not readable** (`viewEnvVars` shows existence only). There is no auto-discoverable prod connection string.
- Dev and prod are genuinely separate databases (different roles/data); Replit injects `DATABASE_URL` per-environment at runtime. The app code reads only `DATABASE_URL` (no `PRODUCTION_DATABASE_URL`).

**Replit auto-handles only SCHEMA on publish, never DATA.** So copying rows dev→prod requires user involvement.

**Two workable paths (pick based on what the user can do):**
1. User pastes the production connection string → run a node script (`pg`) that connects dev via `DATABASE_URL` and prod via the provided URL, then writes. Cleanest: agent does everything + verifies.
2. Generate a single idempotent SQL file and have the user paste+run it in the Database tool's Production Database SQL console. Self-contained, no connection string needed.

**Why:** repeated failed re-publishes during one task were caused by trying to reach a task-only endpoint at the live URL.

**How to apply:** when asked to sync data to prod, don't build/deploy an endpoint expecting it to be live mid-task. Validate the SQL/script against dev first (it should be a safe no-op there if rows already exist via `ON CONFLICT`/`NOT EXISTS`). Respect FKs: `student_qr_codes` cascades on student delete, but `scan_events` and `behavior_logs` do not — delete those dependent rows before deleting students.
