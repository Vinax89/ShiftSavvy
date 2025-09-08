#!/usr/bin/env node
import { execSync } from 'node:child_process';
const ports = process.argv.slice(2).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
for (const port of ports) {
  // First try kill-port
  try { execSync(`npx --yes kill-port ${port}`, { stdio: 'ignore' }); } catch {}
  // Then Linux ss
  try { execSync(`bash -lc "ss -lptn 'sport = :${port}' | awk '/LISTEN/ { print $NF }' | sed -n 's/.*pid=\\([0-9]\\+\\).*/\\1/p' | xargs -r kill -9"`, { stdio: 'ignore' }); } catch {}
  // Then lsof
  try { execSync(`bash -lc "lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | xargs -r kill -9"`, { stdio: 'ignore' }); } catch {}
  // Finally fuser
  try { execSync(`bash -lc "fuser -k ${port}/tcp 2>/dev/null || true"`, { stdio: 'ignore' }); } catch {}
}
