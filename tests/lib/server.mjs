/* Serveur local partagé par les harnais de test.
 * Objectif : `npm run check` reste reproductible sans terminal annexe.
 * Un `BASE_URL` fourni court-circuite le lancement (serveur déjà prêt). */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function startServer(port) {
  if (process.env.BASE_URL) return null;
  return spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
}

export async function waitForHttp(url, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return true;
    } catch { /* serveur pas encore prêt */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

export function stopServer(server) {
  if (server && !server.killed) server.kill('SIGTERM');
}
