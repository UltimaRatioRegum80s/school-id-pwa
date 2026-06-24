#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
pnpm --filter @workspace/db run migrate:qr-codes
pnpm --filter @workspace/db run migrate:behavior-categories
pnpm --filter @workspace/db run migrate:recognition-tiers
pnpm --filter @workspace/db run migrate:pin
pnpm --filter @workspace/db run seed:pss-staff
