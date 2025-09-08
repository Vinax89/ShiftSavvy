#!/usr/bin/env node
/*
  scripts/audit-client-imports.mjs
  Scans the repository for React/Next **client components** (files containing `use client`)
  and reports server-only imports that will break web bundles (e.g., node:crypto, fs, path, firebase-admin, next/server).

  Usage:
    node scripts/audit-client-imports.mjs [--fix] [--json]

  Notes:
    • Only AUTOMATIC fix supported: replacing imports ending with `domain/hash` -> `domain/hash-client` for client files.
    • Exit code 1 when violations are found (unless --json and no violations).
*/
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const DO_FIX = args.has('--fix');
const AS_JSON = args.has('--json');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const VALID_EXT = new Set(['.ts', '.tsx', '.mts', '.cts']);

const NODE_BUILTINS = new Set([
  // core built-ins (without 'node:' prefix)
  'assert','async_hooks','buffer','child_process','cluster','console','constants','crypto','dgram','diagnostics_channel',
  'dns','domain','events','fs','http','http2','https','module','net','os','path','perf_hooks','process','punycode',
  'querystring','readline','repl','stream','string_decoder','timers','tls','tty','url','util','v8','vm','worker_threads','zlib'
]);

// Extra server-only packages to flag in client bundles
const EXTRA_FORBIDDEN = new Set([
  'firebase-admin',
  'undici',               // server-side fetch impl
  'next/server',
  'next/headers',
  '@sentry/node',
]);

const IMPORT_RE = /(import\s+[^'"\n]*['"]([^'"\n]+)['"])|(import\(\s*['"]([^'"\n]+)['"]\s*\))|(require\(\s*['"]([^'"\n]+)['"]\s*\))/g;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.turbo', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) continue;
      yield* walk(p);
    } else {
      const ext = path.extname(p);
      if (VALID_EXT.has(ext)) yield p;
    }
  }
}

function isClientFile(txt) {
  // check first ~10 non-empty lines for the directive
  const lines = txt.split(/\r?\n/).slice(0, 20).map(s => s.trim()).filter(Boolean);
  return lines.some(l => /^['"]use client['"];?$/.test(l));
}

function collectImports(txt) {
  const specs = [];
  let m;
  while ((m = IMPORT_RE.exec(txt)) !== null) {
    const spec = m[2] || m[4] || m[6];
    if (spec) specs.push({ spec, index: m.index });
  }
  return specs;
}

function isForbiddenModule(spec) {
  if (spec.startsWith('node:')) return true;
  if (NODE_BUILTINS.has(spec)) return true;
  if (EXTRA_FORBIDDEN.has(spec)) return true;
  // direct paths into Node builtins seldom happen; skip for now
  return false;
}

function suggestFix(spec, isClient) {
  // Only safe auto-fix: domain/hash -> domain/hash-client (client files only)
  if (isClient && /(\b|\/)(domain\/hash)$/.test(spec)) {
    return spec.replace(/domain\/hash$/, 'domain/hash-client');
  }
  return null;
}

const results = [];

if (!fs.existsSync(SRC)) {
  console.error(`src/ not found at ${SRC}`);
  process.exit(2);
}

for (const file of walk(SRC)) {
  const txt = fs.readFileSync(file, 'utf8');
  const isClient = isClientFile(txt);
  if (!isClient) continue;

  const imports = collectImports(txt);
  const violations = [];
  let updatedText = txt;
  let didModify = false;

  for (const { spec } of imports) {
    if (isForbiddenModule(spec)) {
      violations.push({ type: 'server-only-import', spec });
      continue;
    }
    const fix = suggestFix(spec, isClient);
    if (fix && DO_FIX) {
      const before = updatedText;
      // Replace only import spec occurrences that match exactly the quoted module string.
      const quoted = new RegExp(`(['"])${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
      updatedText = updatedText.replace(quoted, `$1${fix}$1`);
      if (updatedText !== before) didModify = true;
    } else if (fix) {
      violations.push({ type: 'needs-client-hash', spec, suggestion: fix });
    }
  }

  if (didModify && DO_FIX) {
    fs.writeFileSync(file, updatedText);
  }

  if (violations.length) {
    results.push({ file: path.relative(ROOT, file), isClient, violations });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ count: results.length, results }, null, 2));
} else {
  if (results.length === 0) {
    console.log('✅ No server-only imports detected in client components.');
  } else {
    console.log('\n\x1b[31m✖ Server-only imports detected in client components:\x1b[0m');
    for (const r of results) {
      console.log(`\n• ${r.file}`);
      for (const v of r.violations) {
        if (v.type === 'server-only-import') {
          console.log(`   - imports \x1b[33m${v.spec}\x1b[0m (forbidden in client)`);
        } else if (v.type === 'needs-client-hash') {
          console.log(`   - uses \x1b[33m${v.spec}\x1b[0m → suggest: \x1b[32m${v.suggestion}\x1b[0m`);
        }
      }
    }
    console.log(`\nTotal problem files: ${results.length}`);
  }
}

process.exit(results.length ? 1 : 0);
