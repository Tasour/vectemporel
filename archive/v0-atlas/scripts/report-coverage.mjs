#!/usr/bin/env node
/* Génère COVERAGE_POINTS.md (artefact explicite, hors vérification). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCoverage, formatCoverageReport } from './lib/coverage.mjs';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const result = computeCoverage(ROOT);
const file = path.join(ROOT, 'COVERAGE_POINTS.md');
writeFileAtomic(file, formatCoverageReport(result));
console.log(`COVERAGE_POINTS.md généré : ${result.covered}/${result.total}`);
