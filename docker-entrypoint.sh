#!/bin/sh
set -e

./node_modules/.bin/prisma db push --skip-generate
exec pnpm run start
