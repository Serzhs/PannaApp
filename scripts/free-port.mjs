#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

/**
 * Frees a TCP port before a dev server tries to take it.
 *
 * Metro and `nest start` both spawn children that outlive the terminal they were
 * started from, so a stale listener on 8081 or 3000 is the normal case rather than the
 * exception, and the error it produces names a port rather than a thing to do about it.
 */
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error('Usage: node scripts/free-port.mjs <port>');
  process.exit(1);
}

function listenersOn(p) {
  try {
    // -sTCP:LISTEN so a browser or simulator merely connected to the port is left alone.
    const out = execFileSync('lsof', ['-ti', `tcp:${p}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').map(Number).filter(Boolean);
  } catch {
    // lsof exits non-zero when nothing matches, which is the common and happy case.
    return [];
  }
}

const pids = listenersOn(port).filter((pid) => pid !== process.pid);
if (pids.length === 0) process.exit(0);

for (const pid of pids) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // Already gone, or not ours to kill. Either way the port may now be free.
  }
}

console.log(`freed port ${port} (was held by ${pids.join(', ')})`);
