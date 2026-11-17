#!/usr/bin/env node
/* Vectemporel — construit l'atlas des lieux à partir des dossiers pays.
 * Les coordonnées sont lues dans l'API Wikipedia (fr puis en) : aucune
 * position n'est devinée. Les lieux sans coordonnée vérifiée restent sans
 * point sur la carte, mais gardent leur fiche descriptive. */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { feature } from 'topojson-client';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UA = 'Vectemporel/0.2 (https://github.com/Tasour/vectemporel; prototype pédagogique)';
const COUNTRIES = ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt'];
const WORLD_NAMES = {
  france: 'France', uk: 'United Kingdom', usa: 'United States of America',
  germany: 'Germany', italy: 'Italy', spain: 'Spain', china: 'China',
  india: 'India', japan: 'Japan', egypt: 'Egypt',
};
const topology = JSON.parse(fs.readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url), 'utf8'));
const worldFeatures = feature(topology, topology.objects.countries).features;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
};
const key = (value) => String(value).toLowerCase().replace(/[_ ]+/g, ' ').trim();
const clean = (label) => String(label).replace(/\s*\([^)]*\)\s*$/, '').trim();

async function api(lang, titles) {
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
    format: 'json', formatversion: '2', action: 'query',
    prop: 'coordinates|info', colimit: 'max', inprop: 'url',
    titles: titles.join('|'),
  })}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return response.json();
    await sleep(2500 * (attempt + 1));
  }
  return null;
}

function resolveMap(data) {
  const pairs = [
    ...(data.query?.normalized || []),
    ...(data.query?.redirects || []),
  ].map((item) => [key(item.from), key(item.to)]);
  return (name) => {
    let result = key(name);
    for (let i = 0; i < 6; i += 1) {
      const found = pairs.find(([from]) => from === result);
      if (!found) break;
      result = found[1];
    }
    return result;
  };
}

const atlas = {};
const outlines = {};
const report = [];
let total = 0;
let located = 0;

for (const countryId of COUNTRIES) {
  const file = path.join(ROOT, 'audits', countryId, 'country-audit.yaml');
  if (!fs.existsSync(file)) continue;
  const audit = YAML.parse(fs.readFileSync(file, 'utf8'));
  const places = audit.places || [];
  const queries = new Map();
  for (const place of places) {
    const label = clean(place.label_current);
    queries.set(label, { label, alternatives: [label, ...(place.names_historical || []).map(clean)] });
  }
  const found = { fr: new Map(), en: new Map() };
  for (const lang of ['fr', 'en']) {
    const titles = [...queries.values()].flatMap((item) => item.alternatives);
    for (const group of chunk([...new Set(titles)], 40)) {
      const response = await api(lang, group);
      await sleep(600);
      if (!response) continue;
      const resolve = resolveMap(response);
      for (const page of response.query?.pages || []) {
        const coordinate = page.coordinates?.[0];
        if (!coordinate || page.missing !== undefined) continue;
        found[lang].set(key(page.title), {
          lat: coordinate.lat,
          lon: coordinate.lon,
          title: page.title,
          source: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        });
      }
    }
  }
  atlas[countryId] = {};
  for (const place of places) {
    total += 1;
    const record = {
      id: place.id,
      label: place.label_current,
      historical: place.names_historical || [],
      hierarchy: place.hierarchy || '',
      functions: place.functions || [],
      events: place.events || [],
      contestations: place.contestations || [],
      lat: null,
      lon: null,
      source: null,
    };
    for (const candidate of [clean(place.label_current), ...(place.names_historical || []).map(clean)]) {
      const point = found.fr.get(key(candidate)) || found.en.get(key(candidate));
      if (point) {
        Object.assign(record, { lat: point.lat, lon: point.lon, source: point.source });
        break;
      }
    }
    if (record.lat !== null) located += 1;
    else report.push(`- ${countryId} / ${place.label_current}`);
    atlas[countryId][place.id] = record;
  }
  const world = worldFeatures.find((item) => item.properties.name === WORLD_NAMES[countryId]);
  if (world) {
    const polygons = world.geometry.type === 'Polygon' ? [world.geometry.coordinates] : world.geometry.coordinates;
    outlines[countryId] = {
      name: world.properties.name,
      rings: polygons
        .map((polygon) => polygon[0].filter((_, index) => index % 2 === 0))
        .filter((ring) => ring.length > 4),
    };
  }
  console.log(`${countryId} : ${Object.values(atlas[countryId]).filter((p) => p.lat !== null).length}/${places.length} lieux localisés`);
}

const js = `/* Généré par scripts/build-place-atlas.mjs — coordonnées vérifiées via l'API Wikipedia.
 * ${new Date().toISOString().slice(0, 10)}
 */
window.VECTEMPOREL_PLACES = ${JSON.stringify(atlas, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'place-atlas.js'), `${js}\nwindow.VECTEMPOREL_OUTLINES = ${JSON.stringify(outlines, null, 2)};\n`, 'utf8');
fs.writeFileSync(path.join(ROOT, 'PLACE_ATLAS.md'), `# Atlas des lieux\n\n> Généré par \`npm run build:places\`. ${new Date().toISOString().slice(0, 10)}.\n\n${located}/${total} lieux localisés à partir de l’API Wikipedia (fr puis en). Les autres\nconservent leur fiche descriptive mais n’ont pas de point sur la carte : aucune\ncoordonnée n’est inventée.\n\n${report.length ? `## Lieux sans coordonnée\n\n${report.join('\n')}\n` : ''}`);
console.log(`place-atlas.js : ${located}/${total} lieux localisés.`);
