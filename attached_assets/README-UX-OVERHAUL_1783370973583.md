# School ID — UX Overhaul Drop-In (5 files)

## What this fixes (from the navigation audit)
| # | Audit issue | Fix |
|---|---|---|
| 1 | Merit/demerit = 4 taps | NEW floating quick-action button (FAB) on Scan, Dashboard & Students → 2 taps. Plus one-tap +Merit / −Demerit buttons on every student profile |
| 2 | Admin is a junk drawer | Split into "Daily Tasks" (Add Student, Import, Print Cards, Activities, Rewards) vs "Setup · rarely needed" (Settings, Appearance, Staff, Categories, Tiers) |
| 3 | Dashboard buries exceptions | "Needs Attention" now FIRST, above KPIs and charts. Amber (not red) per your colour rules, tappable → filtered student list |
| 4 | Students grade-first drilling | Search bar was already live in your repo — kept, and FAB added on top |

## Above and beyond
- Behaviour category chips in the quick sheet (pulls your configured categories + points automatically; falls back to ±1)
- Optional note field; category name auto-used as the note if left blank
- Haptic buzz on successful save (mobile)
- Live data refresh: saving a merit/demerit instantly refreshes the student's profile and lists
- FAB politely hides while the Scan result sheet or a student profile is open — never covers your model UX pattern

## Files
NEW  artifacts/school-id/src/components/QuickBehaviorSheet.tsx
MOD  artifacts/school-id/src/pages/DashboardPage.tsx
MOD  artifacts/school-id/src/pages/AdminPage.tsx
MOD  artifacts/school-id/src/pages/StudentsPage.tsx
MOD  artifacts/school-id/src/pages/ScanPage.tsx

## Install (Replit)
1. Drag each file into the matching folder in the Replit file tree (overwrite when asked)
2. Restart the app. That's it.

## Zero-risk guarantees
- NO OpenAPI spec changes → NO codegen run needed
- NO backend changes, NO database changes
- Only existing generated hooks used (useCreateBehaviorLog, useListStudents, useListBehaviorCategories)
- Verified: `tsc --noEmit` exit 0 + full `vite build` success on your exact lockfile
