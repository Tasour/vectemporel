#!/usr/bin/env node
/* Gate de design permanent : balayage de tous les états de l'app + contrôle des
 * fragments de récit. Réutilise le harnais universel sans jamais le modifier. */
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PYTHON = '/home/tasour/Projects/football-visual/.venv/bin/python';
const GATE = '/home/tasour/.config/opencode/design/apple-design-gate.sh';
const PORT = 4244;
const URL = `http://127.0.0.1:${PORT}/index.html`;
const failOn = process.argv.includes('--fail-on=P1') ? 'P1' : 'P2';

const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
let code = 0;
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(URL);
      if (response.ok) break;
    } catch { /* serveur non prêt */ }
    await wait(150);
  }
  const sweep = execFileSync(PYTHON, [
    'scripts/design-sweep.py', '--url', URL, '--json', '/tmp/opencode/design-sweep.json',
    '--fail-on', failOn,
  ], { encoding: 'utf8', cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000 });
  const result = JSON.parse(sweep.slice(sweep.indexOf('{')));
  console.log(`design:gate — ${result.states} états × ${result.viewports.length} viewports :`, result.counts);
  for (const finding of result.findings) {
    console.log(`  ${finding.severity} ${finding.rule} [${finding.state} ${finding.viewport}] ${finding.selector}`);
  }
  for (const report of ['dauphine', 'catholicisme']) {
    const output = execFileSync(GATE, [
      '--file', `public/reports/${report}.html`, '--fail-on', failOn,
    ], {
      encoding: 'utf8', cwd: process.cwd(),
      env: { ...process.env, APPLE_DESIGN_PYTHON: PYTHON },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const fragment = JSON.parse(output.slice(output.indexOf('{')));
    console.log(`design:gate — fragment ${report} :`, fragment.counts);
    for (const finding of fragment.findings) {
      console.log(`  ${finding.severity} ${finding.rule} ${finding.selector}`);
    }
  }
} catch (error) {
  const output = String(error.stdout || '') + String(error.stderr || '') + error.message;
  try {
    const data = JSON.parse(output.slice(output.indexOf('{')));
    console.log('design:gate — écarts :', data.counts);
    for (const finding of data.findings || []) {
      console.log(`  ${finding.severity} ${finding.rule} [${finding.state || ''} ${finding.viewport || ''}] ${finding.selector}`);
    }
  } catch {
    console.error(output.slice(0, 3000));
  }
  code = 1;
} finally {
  server.kill('SIGTERM');
}
process.exit(code);
