#!/bin/sh
set -e
# Use absolute paths to root node_modules/.bin — avoids pnpm workspace path resolution
PRISMA=/app/node_modules/.bin/prisma
TSX=/app/node_modules/.bin/tsx

echo "Applying schema to database (db push)..."
$PRISMA db push --schema /app/prisma/schema.prisma --accept-data-loss

echo "Seeding database..."
$TSX /app/prisma/seed.ts || echo "Seed skipped"

echo "Starting cad-api server..."
exec node /app/apps/cad-api/dist/index.js
