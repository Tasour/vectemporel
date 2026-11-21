#!/usr/bin/env node
/* Vérifie la couverture explicite des propositions. NE MODIFIE AUCUN FICHIER. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCoverage } from './lib/coverage.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const { total, covered, breakdown, missing, invalid } = computeCoverage(ROOT);
const pct = total ? Math.round((covered / total) * 100) : 0;

console.log(`Couverture explicite : ${covered}/${total} (${pct} %)`);
if (breakdown) console.log(`${breakdown.couvert} couvertes · ${breakdown.videJustifie} absences justifiées (dont ${breakdown.derive} dérivées)`);
console.log(`Points proposés : ${invalid.length ? `${invalid.length} anomalie(s)` : 'valides'}`);
if (missing.length) console.log(`Manquants : ${missing.length}`);
for (const item of missing.slice(0, 20)) console.log(`- ${item}`);
for (const item of invalid.slice(0, 20)) console.log(`ERREUR ${item}`);

if (missing.length || invalid.length) process.exitCode = 1;
