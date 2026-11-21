#!/usr/bin/env node
/* Vérification statique de l'app minimale : cohérence des données, budget,
 * absence de réseau au runtime, syntaxe et unicité des identifiants DOM. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const { CHRONAS_MAP: map } = await import(path.join(ROOT, 'src/data/chronas-map.js'));
check('année 1000', map.meta.year === 1000, String(map.meta.year));
check('2 429 régions', map.meta.areas === 2429, String(map.meta.areas));
check('2 492 géométries', map.meta.features === 2492, String(map.meta.features));
check('Berry présente', Boolean(map.areas.Berry));
check('géométrie Berry', map.features.some((feature) => feature.name === 'Berry' && feature.rings[0]?.length >= 4));
check('licence CC BY-SA', map.meta.license === 'CC BY-SA 4.0', map.meta.license);
check('coordonnées finies', map.features.every((feature) => feature.rings.every((ring) => ring.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)))));
const snapshotBytes = fs.statSync(path.join(ROOT, 'src/data/chronas-map.js')).size;
check('snapshot < 1 Mo', snapshotBytes < 1024 * 1024, `${Math.round(snapshotBytes / 1024)} Ko`);

const html = read('index.html');
const runtimeFiles = ['index.html', 'styles.css', 'src/app.js', 'src/map/data.js', 'src/map/projection.js', 'src/globe/globe.js', 'src/globe/lonlat.js', 'src/globe/texture.js'];
const runtime = runtimeFiles.map(read).join('\n');
const sw = read('sw.js');
check('aucun fetch runtime', !/\bfetch\s*\(/.test(runtime));
check('aucune URL distante', !/https?:\/\//.test(runtime));
check('service worker same-origin', /url\.origin !== self\.location\.origin/.test(sw));
check('aucun moteur globe obsolète', !/globe-engine/.test(runtime));
check('Three.js local référencé', /public\/three\.min\.js/.test(html));
const three = read('public/three.min.js');
check('Three.js MIT', /SPDX-License-Identifier: MIT/.test(three.slice(0, 400)));
check('aucun Math.random dans l’app', !/Math\.random/.test(runtime));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
check('ids DOM uniques', new Set(ids).size === ids.length, `${ids.length} ids`);
check('un seul main dans le HTML', (html.match(/<main/g) || []).length <= 1);
check('meta description', /name="description"/.test(html));

const pkg = JSON.parse(read('package.json'));
check('0 dépendance runtime', !pkg.dependencies || Object.keys(pkg.dependencies).length === 0);

const { vectorFromLonLat, lonLatFromVector, pixelsFromLonLat } = await import(path.join(ROOT, 'src/globe/lonlat.js'));
const roundtrip = [[0, 0], [2.4, 47.1], [-73.5, -40.2], [179.9, 84.9]].every(([lon, lat]) => {
  const back = lonLatFromVector(vectorFromLonLat(lon, lat));
  return Math.abs(back.lon - lon) < 1e-6 && Math.abs(back.lat - lat) < 1e-6;
});
check('roundtrip lon/lat -> vecteur', roundtrip);
const pixel = pixelsFromLonLat(0, 0, 2048, 1024);
check('texture équirectangulaire centrée', pixel.x === 1024 && pixel.y === 512);

const files = ['scripts/serve.mjs', 'scripts/build-pages.mjs', 'scripts/import-chronas-map.mjs', 'src/app.js', 'src/map/data.js', 'src/map/projection.js', 'src/globe/globe.js', 'src/globe/lonlat.js', 'src/globe/texture.js', 'tests/e2e.mjs', 'tests/pwa.mjs', 'tests/perf-budget.mjs'];
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'pipe' });
    check(`syntaxe ${file}`, true);
  } catch (error) {
    check(`syntaxe ${file}`, false, String(error.stderr || error.message).slice(0, 120));
  }
}

console.log(failed ? `${failed} échec(s)` : 'Vérification statique OK.');
process.exit(failed ? 1 : 0);
