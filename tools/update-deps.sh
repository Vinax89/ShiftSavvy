#!/usr/bin/env bash
# tools/update-deps.sh — One-file updater for Firebase Studio (bash)
# Updates workspace deps to the latest (by default, including majors), dedupes, and re-activates pnpm via Corepack.

set -euo pipefail

# ---------- SETTINGS ----------
# Set INCLUDE_MAJOR=0 to stay within semver ranges; 1 (default) upgrades to latest versions.
INCLUDE_MAJOR="${INCLUDE_MAJOR:-1}"
# Optional: path to your repo root (auto-detects if blank)
REPO_ROOT="${REPO_ROOT:-}"

# ---------- LOCATE REPO ROOT ----------
if [[ -z "$REPO_ROOT" ]]; then
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT="$(git rev-parse --show-toplevel)"
  else
    # fallback: try common paths under Firebase Studio home
    for p in . "$HOME/studio" "$HOME"; do
      if [[ -f "$p/pnpm-workspace.yaml" || -f "$p/package.json" ]]; then
        REPO_ROOT="$p"; break
      fi
    done
  fi
fi
[[ -n "$REPO_ROOT" ]] || { echo "❌ Could not locate repo root. Set REPO_ROOT=/path/to/repo and re-run."; exit 1; }
cd "$REPO_ROOT"

# ---------- CHECK TOOLS ----------
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing $1. Ensure dev.nix includes it, then re-enter shell."; exit 1; }; }

# Prefer Corepack → pnpm. Fall back to pnpm if already present.
if ! command -v corepack >/dev/null 2>&1; then
  echo "ℹ️  corepack not on PATH. If you use Nix, add pkgs.corepack_22 (or corepack) to dev.nix and re-enter the shell."
  need pnpm
else
  corepack --version || true
  corepack enable || true
  corepack prepare pnpm@latest --activate || true
fi

need pnpm
pnpm --version

# ---------- SAFETY SNAPSHOT ----------
echo "🗂  Creating safety snapshot of package.json files..."
TS="$(date +%Y%m%d-%H%M%S)"
SNAP_DIR=".dep-snapshots/$TS"
mkdir -p "$SNAP_DIR"
# minimal snapshot: root + all workspaces (ignore node_modules)
find . -maxdepth 4 -name package.json -not -path "*/node_modules/*" -print0 | while IFS= read -r -d '' f; do
  mkdir -p "$SNAP_DIR/$(dirname "$f")"
  cp -a "$f" "$SNAP_DIR/$f"
done
echo "   → Snapshot at $SNAP_DIR"

# ---------- UPDATE ----------
echo "🔎 Checking outdated packages (workspace-wide)..."
pnpm -w outdated || true

if [[ "$INCLUDE_MAJOR" == "1" ]]; then
  echo "⬆️  Updating ALL deps to latest (including majors)..."
  pnpm -w up -r --latest
else
  echo "⬆️  Updating deps within semver ranges..."
  pnpm -w up -r
fi

echo "🧹 Deduping lockfile..."
pnpm -w dedupe

echo "📦 Reinstalling to refresh lockfile..."
pnpm -w install

# ---------- OPTIONAL: QUICK HEALTH ----------
if pnpm -w -C . run | grep -qE '(^|\s)typecheck(\s|:)'; then
  echo "🔍 Running typecheck..."
  pnpm -w run -r typecheck || true
fi
if pnpm -w -C . run | grep -qE '(^|\s)lint(\s|:)'; then
  echo "🧭 Running lint..."
  pnpm -w run -r lint || true
fi
if pnpm -w -C . run | grep -qE '(^|\s)test(\s|:)'; then
  echo "🧪 Running unit tests..."
  pnpm -w run -r test || true
fi

# ---------- REPORT ----------
echo
echo "✅ Dependency update complete."
echo "   Repo: $REPO_ROOT"
echo "   Mode: $([[ "$INCLUDE_MAJOR" == "1" ]] && echo 'LATEST (majors included)' || echo 'RESPECT RANGES')"
echo "   Snapshot: $SNAP_DIR"
echo
echo "Tips:"
echo " - If something breaks, compare against the snapshot: 'git diff' or inspect '$SNAP_DIR'."
echo " - Re-run with 'INCLUDE_MAJOR=0' to stay within semver ranges."
echo " - If pnpm/corepack were missing, add to dev.nix:"
echo "     packages = with pkgs; [ nodejs_22 corepack_22 ];   # then re-enter shell"
