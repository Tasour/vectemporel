/* Écriture atomique : temporaire + rename. Avoid TOCTOU partiel sur coupure.
 * Exemption verrou : chaque script CLI est monoprocess et écrit un seul artefact
 * par exécution ; aucun chemin d'écriture concurrent n'existe dans l'app (-date : 2026-11-20). */
import fs from 'node:fs';
import path from 'node:path';

export function writeFileAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, file);
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch { /* le temporaire n'existe peut-être pas */ }
    throw error;
  }
}
