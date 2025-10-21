#!/bin/bash
set -e

# Navigate to monorepo root
cd "$(dirname "$0")"

# Install all dependencies
pnpm install

# Build the frontend
pnpm nx build front

# Copy .next to the expected location if needed
if [ ! -d "apps/front/.next" ]; then
  echo "Error: .next directory not found after build"
  exit 1
fi

echo "Frontend build completed successfully"
