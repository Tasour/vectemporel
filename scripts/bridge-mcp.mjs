#!/usr/bin/env node
/* Wrapper du serveur MCP Three.js : garantit le serveur local puis démarre le MCP.
 * Le protocole stdio du MCP reste sur stdout ; les diagnostics vont sur stderr. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const APP_URL = process.env.DEV_URL || 'http://127.0.0.1:4181/?devtools=1';
const PORT = new URL(APP_URL).port || '4181';

async function isHealthy() {
  try {
    const response = await fetch(`${APP_URL}/index.html`, {
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

let server = null;
if (!(await isHealthy())) {
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let log = '';
  server.stderr.on('data', (chunk) => { log += chunk.toString(); });
  const deadline = Date.now() + 15000;
  while (!(await isHealthy()) && Date.now() < deadline) await delay(200);
  if (!(await isHealthy())) {
    console.error(`[bridge] serveur local indisponible : ${log.slice(-300)}`);
    server.kill('SIGTERM');
    process.exit(1);
  }
  console.error(`[bridge] serveur local démarré sur ${APP_URL}`);
}

process.env.DEV_URL = APP_URL;
process.env.HEADLESS ||= 'true';
process.env.CHROME_PATH ||= '/usr/bin/chromium';
process.env.CDP_PORT ||= '9229';
process.env.BRIDGE_PORT ||= '9222';
if (!process.env.BROWSER) process.env.BROWSER = 'auto';

let stopped = false;
function shutdown() {
  if (stopped) return;
  stopped = true;
  if (server && !server.killed) server.kill('SIGTERM');
  process.exit(0);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await import('threejs-devtools-mcp');
} catch (error) {
  console.error(`[bridge] MCP indisponible : ${error.message}`);
  shutdown();
  process.exit(1);
}
