#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const src = fs.readFileSync(path.join(ROOT, 'src/data/dataset.js'), 'utf8');
const match = src.match(/export const DATASET = ([\s\S]*);\s*$/);
const data = JSON.parse(match[1]);
const CONFIDENCE = new Set(['vérifié', 'certain', 'probable', 'disputé', 'non documenté']);
const PRECISION = new Set(['year', 'month', 'day', 'interval', 'range', 'circa', 'century', 'unknown']);
const events = data.countries.flatMap((country) => country.events);
const narrativePoints = events.flatMap((event) => event.points);
const auditPoints = data.countries.flatMap((country) => country.points);
let failures = 0;
const check = (name, condition) => {
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
};

check('10 pays', data.countries.length === 10);
check('229 repères', events.length === 229);
check('ids uniques', new Set(events.map((event) => event.id)).size === events.length);
check('901 points de récit', narrativePoints.length === data.meta.eventPoints);
check('845 points d’audit extraits', auditPoints.length === data.meta.validatedPoints);
check('total des points', data.meta.points === data.meta.eventPoints + data.meta.validatedPoints);
check('certitudes fermées', [...narrativePoints, ...auditPoints].every((point) => CONFIDENCE.has(point.confidence)));
check('précisions fermées', [...narrativePoints, ...auditPoints].every((point) => PRECISION.has(point.datePrecision)));
check('aucun point d’audit sans source', auditPoints.every((point) => Array.isArray(point.sources) && point.sources.length > 0));
check('statut extrait des points d’audit', auditPoints.every((point) => point.status === 'extrait'));
check('chaque pays a des ères', data.countries.every((country) => country.eras.length > 0));
check('chaque repère a une ère valide', events.every((event) => event.countryEraValid !== false));
check('chaque image existe', events.every((event) => !event.image || fs.existsSync(path.join(ROOT, event.image.src))));
const declaredFixes = data.countries.reduce((sum, country) => {
  const file = path.join(ROOT, 'source', 'audits', country.id, 'fixes.yaml');
  if (!fs.existsSync(file)) return sum;
  return sum + (YAML.parse(fs.readFileSync(file, 'utf8')).event_updates || []).filter((item) => item.id && item.set).length;
}, 0);
check('corrections d’audit appliquées', data.meta.appliedFixes?.length === declaredFixes,
  `${data.meta.appliedFixes?.length || 0}/${declaredFixes}`);
const UNTRANSLATED = /\b(seen from|view of|in the|from the|reconstruction of|the opening of)\b/i;
const prose = (text) => String(text || '').replace(/\S+\.(png|jpe?g|svg|gif)\b/gi, '');
check('légendes d’images en français', events.every((event) => !event.image
  || (!UNTRANSLATED.test(prose(event.image.alt)) && !UNTRANSLATED.test(prose(event.image.caption)))));
check('chaque point a un texte', events.every((event) => event.points.every((point) => point.text && point.text.length > 15)));
check('aucun lien Grokipedia', !/grokipedia\.com|grokipedia/i.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
check('aucun lien externe dans l’interface', !/href=["']https?:/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
check('routeur clavier unique', (fs.readFileSync(path.join(ROOT, 'src/platform/keyboard.js'), 'utf8').match(/addEventListener\('keydown'/g) || []).length === 1);
const CAPTURE_GLOBAL = /\b(window|document)\.addEventListener\('keydown'[^;]*\btrue\b/;
const captureFiles = [];
(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (entry.name.endsWith('.js') && CAPTURE_GLOBAL.test(fs.readFileSync(full, 'utf8'))) {
      captureFiles.push(path.relative(ROOT, full));
    }
  }
})(path.join(ROOT, 'src', 'views'));
check('aucun ecouteur clavier global en capture hors routeur', captureFiles.length === 0, captureFiles.slice(0, 3).join(', '));

for (const country of data.countries) {
  const eraIds = new Set(country.eras.map((era) => era.id));
  check(`${country.id} : repères rattachés`, country.events.every((event) => eraIds.has(event.eraId)));
}
console.log(failures ? `${failures} échec(s)` : 'Tous les contrôles passent.');
process.exit(failures ? 1 : 0);
