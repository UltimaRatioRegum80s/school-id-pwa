---
name: Post-merge codegen requirement
description: When task agents add OpenAPI routes/fields and generated hooks in the same merge, the lib declarations must be rebuilt or the frontend crashes.
---

# Post-merge codegen requirement

## The rule
Any merge that touches `lib/api-spec/openapi.yaml` **or** references newly generated hooks (e.g. `useListStudentIds`) requires two steps before the app works:
1. `pnpm --filter @workspace/api-spec run codegen`
2. `pnpm run typecheck:libs`

If only step 2 is run without step 1, the generated source files are stale. If only step 1 is run, the `.d.ts` declarations in `dist/` are stale.

**Why:** The post-merge script (`scripts/post-merge.sh`) runs migrations and QR backfill but does NOT run codegen or rebuild lib declarations. Task agents that generate code locally don't commit the `dist/` output, so the merged state has source changes without updated declarations.

**How to apply:** When the app crashes after a task merge and TypeScript shows "has no exported member" errors pointing at `@workspace/api-client-react` or `@workspace/api-zod`, run both commands above. This is a ~10s fix.
