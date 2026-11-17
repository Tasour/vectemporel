#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const src = fs.readFileSync(path.join(ROOT, 'src/data/dataset.js'), 'utf8');
const match = src.match(/export const DATASET = ([\s\S]*);\s*$/);
const data = JSON.parse(match[1]);
let failures = 0;
const check = (name, condition) => {
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
};

check('10 pays', data.countries.length === 10);
const events = data.countries.flatMap((country) => country.events);
check('229 repères', events.length === 229);
check('ids uniques', new Set(events.map((event) => event.id)).size === events.length);
check('901 points au moins', events.reduce((sum, event) => sum + event.points.length, 0) >= 900);
check('chaque pays a des ères', data.countries.every((country) => country.eras.length > 0));
check('chaque repère a une ère valide', events.every((event) => event.countryEraValid !== false));
check('chaque image existe', events.every((event) => !event.image || fs.existsSync(path.join(ROOT, event.image.src))));
check('chaque point a un texte', events.every((event) => event.points.every((point) => point.text && point.text.length > 15)));
check('aucun lien Grokipedia', !/grokipedia\.com|grokipedia/i.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
check('aucun lien externe dans l’interface', !/href=["']https?:/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
check('routeur clavier unique', (fs.readFileSync(path.join(ROOT, 'src/platform/keyboard.js'), 'utf8').match(/addEventListener\('keydown'/g) || []).length === 1);

for (const country of data.countries) {
  const eraIds = new Set(country.eras.map((era) => era.id));
  check(`${country.id} : repères rattachés`, country.events.every((event) => eraIds.has(event.eraId)));
}
console.log(failures ? `${failures} échec(s)` : 'Tous les contrôles passent.');
process.exit(failures ? 1 : 0);
