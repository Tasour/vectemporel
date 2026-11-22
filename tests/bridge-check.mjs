#!/usr/bin/env node
/* Contrôle de la configuration du pont Three.js pour OpenCode.
 * Le proxy 9222 est optionnel : il n'existe que lorsque le MCP est démarré. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONFIG = path.join(os.homedir(), '.config/opencode/opencode.json');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

let config;
try { config = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (error) { config = null; }
const mcp = config?.mcp?.['threejs-devtools-mcp'];
check('MCP configuré', Boolean(mcp));
check('wrapper utilisé', mcp?.command?.some((part) => part.endsWith('scripts/bridge-mcp.mjs')));
check('cible 4181 avec devtools', /4181\/\?devtools=1/.test(mcp?.environment?.DEV_URL || ''), mcp?.environment?.DEV_URL);
check('headless actif', mcp?.environment?.HEADLESS === 'true');
check('CDP 9229', mcp?.environment?.CDP_PORT === '9229');

const wrapper = path.join(ROOT, 'scripts/bridge-mcp.mjs');
check('wrapper présent', fs.existsSync(wrapper));
try {
  execFileSync(process.execPath, ['--check', wrapper], { stdio: 'pipe' });
  check('syntaxe wrapper', true);
} catch (error) {
  check('syntaxe wrapper', false, String(error.stderr || error.message).slice(0, 120));
}

const get = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return { ok: response.ok, csp: response.headers.get('content-security-policy') || '' };
  } catch {
    return { ok: false, csp: '' };
  }
};

let server = null;
if (!(await get('http://127.0.0.1:4181/index.html')).ok) {
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '4181' },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 10000;
  while (!(await get('http://127.0.0.1:4181/index.html')).ok && Date.now() < deadline) {
    await delay(200);
  }
}

const prod = await get('http://127.0.0.1:4181/index.html');
const dev = await get('http://127.0.0.1:4181/index.html?devtools=1');
check('serveur local actif', prod.ok);
const scriptDirective = prod.csp.split(';').find((part) => part.trim().startsWith('script-src')) || '';
check('CSP production stricte', scriptDirective.includes("'self'") && !scriptDirective.includes('unsafe-inline'), scriptDirective.trim());
check('CSP dev autorise le pont', dev.csp.includes('unsafe-inline') && dev.csp.includes('ws://localhost:9222'));

const proxy = await get('http://localhost:9222/');
if (proxy.ok) check('proxy MCP joignable', true);
else console.log('PASS proxy MCP non démarré hors session (contrôle ignoré)');

if (server && !server.killed) server.kill('SIGTERM');
console.log(failed ? `${failed} échec(s)` : 'Pont OpenCode prêt.');
process.exit(failed ? 1 : 0);
