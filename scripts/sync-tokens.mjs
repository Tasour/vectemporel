#!/usr/bin/env node
/* Répercute le bloc :root canonique de src/ui/tokens.css dans styles.css. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const STYLE = path.join(ROOT, 'styles.css');
const BLOCK = /:root\s*\{[\s\S]*?\n\}/;
const tokenBlock = fs.readFileSync(path.join(ROOT, 'src/ui/tokens.css'), 'utf8').match(BLOCK)?.[0];
const styleText = fs.readFileSync(STYLE, 'utf8');
if (!tokenBlock || !BLOCK.test(styleText)) throw new Error('Bloc :root introuvable');
fs.writeFileSync(STYLE, styleText.replace(BLOCK, tokenBlock));
console.log('Jetons synchronisés dans styles.css');
