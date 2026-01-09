#!/bin/bash
# Setup worktrees for parallel agent development
set -e

WORKTREE_DIR="${1:-../nextier-worktrees}"
AGENTS=("backend" "frontend" "infra")

echo "=========================================="
echo "Setting up worktrees in $WORKTREE_DIR"
echo "=========================================="

mkdir -p "$WORKTREE_DIR"

for agent in "${AGENTS[@]}"; do
    if [ -d "$WORKTREE_DIR/$agent" ]; then
        echo "[$agent] Already exists, skipping..."
    else
        echo "[$agent] Creating worktree..."
        git worktree add "$WORKTREE_DIR/$agent" -b "$agent/current"
        echo "[$agent] Installing dependencies..."
        (cd "$WORKTREE_DIR/$agent" && pnpm install)
        echo "[$agent] Ready!"
    fi
done

echo ""
echo "=========================================="
echo "Worktrees ready:"
echo "=========================================="
git worktree list

echo ""
echo "Usage:"
echo "  cd $WORKTREE_DIR/backend   # Work on backend"
echo "  cd $WORKTREE_DIR/frontend  # Work on frontend"
echo "  cd $WORKTREE_DIR/infra     # Work on infra"
