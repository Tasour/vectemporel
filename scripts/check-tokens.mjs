#!/usr/bin/env node
/* Vérifie que le bloc :root de styles.css est identique à src/ui/tokens.css.
 * Lecture seule : aucun fichier n'est modifié. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const BLOCK = /:root\s*\{[\s\S]*?\n\}/;
const tokenText = fs.readFileSync(path.join(ROOT, 'src/ui/tokens.css'), 'utf8');
const styleText = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const tokenBlock = tokenText.match(BLOCK)?.[0];
const styleBlock = styleText.match(BLOCK)?.[0];
if (!tokenBlock || !styleBlock) {
  console.error('Bloc :root introuvable dans tokens.css ou styles.css');
  process.exit(1);
}
const ok = tokenBlock.trim() === styleBlock.trim();
console.log(ok ? 'PASS jetons synchronisés' : 'FAIL jetons divergents — lancer npm run tokens:sync');
process.exit(ok ? 0 : 1);
