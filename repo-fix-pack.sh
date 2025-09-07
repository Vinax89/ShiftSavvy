#!/usr/bin/env bash
# repo-fix-pack-v3.sh — ShiftSavvy top-to-bottom repair (run from repo root)
#
# What this does (idempotent):
#   • Enforce strict server/client hash split (no node:crypto in client bundles)
#   • Normalize Next config (memory cache, allowedDevOrigins regex)
#   • Remove duplicate/stray configs (src/next.config.ts, src/firestore.*, src/sentry.*, postcss.config.mjs, src/functions/**)
#   • Tighten tsconfig excludes (exclude functions/**, build outputs)
#   • Remove unsupported firebaseui (conflicts with firebase@12)
#   • **Force-regenerate package-lock.json** to fix lock/manifest drift, then install
#   • Keep npm caching stable (assumes .npmrc already present)
#
# Usage:
#   bash repo-fix-pack-v3.sh
#
set -euo pipefail
shopt -s nullglob

say()  { printf "\033[1;32m%s\033[0m\n" "${*}"; }
warn() { printf "\033[1;33m%s\033[0m\n" "${*}"; }
err()  { printf "\033[1;31m%s\033[0m\n" "${*}" >&2; }

# 0) Sanity: repo root
if [[ ! -f package.json ]]; then
  err "Run this from the repo root (package.json not found)."; exit 1;
fi

say "1) Ensure /tmp npm cache dirs exist (matches your .npmrc)"
mkdir -p /tmp/.npm-cache /tmp/.npm-tmp

say "2) Remove unsupported 'firebaseui' deps (conflicts with firebase@12.x)"
node - <<'NODE'
const fs = require('fs');
const file = 'package.json';
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = false;
function del(path){
  const seg = path.split('.');
  let o = pkg; for (let i=0;i<seg.length-1;i++){ if(!o[seg[i]]) return; o = o[seg[i]]; }
  if (o && Object.prototype.hasOwnProperty.call(o, seg.at(-1))) { delete o[seg.at(-1)]; changed = true; }
}
['dependencies.firebaseui','dependencies.react-firebaseui'].forEach(del);
if (changed) { fs.writeFileSync(file, JSON.stringify(pkg, null, 2)+"\n"); console.log('Removed firebaseui/react-firebaseui'); }
else { console.log('firebaseui not present'); }
NODE

say "3) Normalize Next config (allowedDevOrigins + memory cache)"
[[ -f next.config.ts ]] && cp -f next.config.ts next.config.ts.bak
cat > next.config.ts <<'TS'
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
const nextConfig: NextConfig = {
  // @ts-expect-error: may lag types
  allowedDevOrigins: [/^https:\/\/\d{4}-firebase-studio-.*\.cloudworkstations\.dev$/],
  webpack: (config, { dev }) => {
    if (dev) {
      // @ts-ignore
      config.cache = { type: 'memory' };
    }
    config.ignoreWarnings ||= [];
    config.ignoreWarnings.push(/Critical dependency: the request of a dependency is an expression/);
    return config;
  },
};
export default withBundleAnalyzer(nextConfig);
TS

say "4) Enforce hash split (server/client) and guard legacy shim"
mkdir -p src/domain
[[ -f src/domain/hash-server.ts ]] || cat > src/domain/hash-server.ts <<'TS'
import 'server-only';
import { createHash } from 'node:crypto';
export function sha256(input: string): string { return createHash('sha256').update(input).digest('hex'); }
export function sha256Hex(input: string): string { return sha256(input); }
TS
[[ -f src/domain/hash-client.ts ]] || cat > src/domain/hash-client.ts <<'TS'
export async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256Hex(input: string): Promise<string> { return sha256(input); }
TS
cat > src/domain/hash.ts <<'TS'
export function sha256(): never { throw new Error("Use 'src/domain/hash-client' (client) or 'src/domain/hash-server' (server)"); }
export function sha256Hex(): never { throw new Error("Use 'src/domain/hash-client' (client) or 'src/domain/hash-server' (server)"); }
TS

say "5) Rewrite 'domain/hash' imports when clearly client/server"
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const isClientFile = (p, txt) => /^\s*['"]use client['"];/.test(txt) || p.includes(`${path.sep}src${path.sep}components${path.sep}`);
const isServerFile = (p) => p.includes(`${path.sep}src${path.sep}app${path.sep}api${path.sep}`) || p.includes(`${path.sep}pages${path.sep}api${path.sep}`) || p.includes(`${path.sep}scripts${path.sep}`) || p.includes(`${path.sep}functions${path.sep}`);
const exts = new Set(['.ts','.tsx','.mts','.cts']);
function* walk(dir){ for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p = path.join(dir,e.name); if (e.isDirectory()){ if(['node_modules','.next','.turbo','dist','build','coverage'].includes(e.name)) continue; yield* walk(p);} else if (exts.has(path.extname(p))) yield p; } }
const root = process.cwd(), src = path.join(root,'src'); let updated=0;
if (fs.existsSync(src)) for (const f of walk(src)) { const t = fs.readFileSync(f,'utf8'); if (!/from\s+['"][^'"]*domain\/hash['"]/.test(t)) continue; let n=t; if (isClientFile(f,t)) n=n.replace(/from\s+(["'])((?:@\/)?.*?)domain\/hash\1/g,'from $1$2domain/hash-client$1'); else if (isServerFile(f)) n=n.replace(/from\s+(["'])((?:@\/)?.*?)domain\/hash\1/g,'from $1$2domain/hash-server$1'); if(n!==t){ fs.writeFileSync(f,n); updated++; console.log('  fixed import ->', path.relative(root,f)); } }
console.log(`Rewrote ${updated} files`);
NODE

say "6) Remove duplicate/stray config files"
rm -f  src/next.config.ts \
      src/firestore.rules \
      src/firestore.indexes.json \
      src/sentry.client.config.ts \
      src/sentry.server.config.ts \
      postcss.config.mjs || true

say "7) Ensure single PostCSS config (CJS)"
[[ -f postcss.config.js ]] || cat > postcss.config.js <<'JS'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
JS

say "8) Tailwind v4 directive check: normalize globals.css if needed (v3 base)"
if [[ -f src/app/globals.css ]] && grep -Eq "@theme|@source" src/app/globals.css; then
  warn "   Detected Tailwind v4 directives — replacing with v3 base."
  cat > src/app/globals.css <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
/* Global styles below */
CSS
fi

say "9) Tighten tsconfig excludes (exclude functions/** from Next project)"
node - <<'NODE'
const fs = require('fs');
const p = 'tsconfig.json';
if (!fs.existsSync(p)) process.exit(0);
const ts = JSON.parse(fs.readFileSync(p,'utf8'));
ts.exclude ||= [];
const add = (x)=>{ if(!ts.exclude.includes(x)) ts.exclude.push(x); };
['node_modules','functions/**','src/functions/**','.next','.turbo','dist','build','coverage'].forEach(add);
fs.writeFileSync(p, JSON.stringify(ts,null,2)+'\n');
console.log('tsconfig.exclude ->', ts.exclude);
NODE

say "10) Remove duplicate Functions under src (canonical at /functions)"
rm -rf src/functions || true

say "11) Ensure next-env.d.ts exists"
[[ -f next-env.d.ts ]] || cat > next-env.d.ts <<'TS'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
// NOTE: This file should not be edited
TS

say "12) Normalize package.json (pin Next/React, scripts, Node types)"
node - <<'NODE'
const fs = require('fs');
const file = 'package.json';
const pkg = JSON.parse(fs.readFileSync(file,'utf8'));
pkg.scripts ||= {}; pkg.dependencies ||= {}; pkg.devDependencies ||= {};
if (pkg.devDependencies && pkg.devDependencies.next) delete pkg.devDependencies.next;
pkg.dependencies.next = '15.5.2';
pkg.dependencies.react = '18.3.1';
pkg.dependencies['react-dom'] = '18.3.1';
pkg.scripts.dev = 'next dev -H 0.0.0.0 -p 9002';
pkg.scripts.start = 'next start -H 0.0.0.0 -p 9002';
pkg.scripts.preinstall ||= 'mkdir -p /tmp/.npm-cache /tmp/.npm-tmp || true';
pkg.devDependencies['@types/node'] ||= '^20.14.2';
pkg.packageManager = 'npm@10.8.2';
fs.writeFileSync(file, JSON.stringify(pkg,null,2)+'\n');
console.log('package.json normalized');
NODE

say "13) Ensure CodeQL config exists"
mkdir -p .github/codeql
cat > .github/codeql/codeql-config.yml <<'YAML'
name: ShiftSavvy CodeQL Config
paths:
  - src
  - src/tools
  - scripts
  - functions/src
  - .github/workflows
paths-ignore:
  - node_modules/**
  - .next/**
  - .turbo/**
  - dist/**
  - functions/dist/**
  - coverage/**
  - public/**
  - playwright-report/**
queries:
  - uses: security-extended
  - uses: security-and-quality
YAML

say "14) Clean artifacts & **force-regenerate** lockfile, then install"
rm -rf node_modules .next .turbo
if [[ -f package-lock.json ]]; then
  mv -f package-lock.json package-lock.old.json
  warn "   Existing package-lock.json backed up to package-lock.old.json"
fi
npm i --package-lock-only --prefer-online --no-audit --no-fund
npm ci --prefer-online --no-audit --no-fund

say "15) Sanity checks"
if [[ -x node_modules/.bin/next ]]; then echo "next ✓"; else err "next missing ✖"; fi
node -p "require.resolve('@types/node/package.json')" >/dev/null 2>&1 && echo "@types/node ✓" || warn "@types/node not found (dev)"
# Lingering firebaseui references?
count=$(grep -RIl "firebaseui" --exclude-dir=node_modules -- */ 2>/dev/null | wc -l || true)
[[ "$count" != "0" ]] && warn "Found ${count} source file(s) mentioning 'firebaseui' — remove/rewrite them." || true

echo -e "\n✅ All done. Start dev with: npm run dev\n"
