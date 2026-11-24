#!/usr/bin/env node
/* Catalogue hiérarchique local : continent → époque → groupe → provinces.
 * Sources : miroir API local uniquement. Sortie déterministe, sans réseau. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'api/v1/raw');
const AREAS = path.join(ROOT, 'api/v1/areas');
const OUT = path.join(ROOT, 'public/articles/catalog.json');
const METADATA_FILE =
  'metadata_type_g_f_provinces_ruler_culture_religion_capital_province_religionGeneral.json';
const LOCALE_FILE =
  'metadata_type_g_locale_fr_f_ruler_fr_culture_fr_religion_fr_religionGeneral_fr.json';

const metadata = JSON.parse(fs.readFileSync(path.join(RAW, METADATA_FILE), 'utf8'));
const locale = JSON.parse(fs.readFileSync(path.join(RAW, LOCALE_FILE), 'utf8'));
const EPOCHS = [
  { id: 'antiquite', label: 'Antiquité', from: -2000, to: 500 },
  { id: 'moyen-age', label: 'Moyen Âge', from: 500, to: 1500 },
  { id: 'moderne', label: 'Époque moderne', from: 1500, to: 1800 },
  { id: 'contemporain', label: 'Époque contemporaine', from: 1800, to: 2000 },
];
const TYPE_INDEX = { ruler: 0, culture: 1, religion: 2 };
const TYPE_LABEL = { ruler: 'Souveraineté', culture: 'Culture', religion: 'Religion' };
const CONTINENTS = [
  { id: 'Europe', label: 'Europe' },
  { id: 'Afrique', label: 'Afrique' },
  { id: 'Asie', label: 'Asie' },
  { id: 'Ameriques', label: 'Amériques' },
  { id: 'Oceanie', label: 'Océanie' },
  { id: 'Autres', label: 'Autres régions' },
];

function coordinatesOf(feature) {
  const points = [];
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      points.push([value[0], value[1]]);
      return;
    }
    for (const child of value) visit(child);
  };
  visit(feature?.geometry?.coordinates);
  if (!points.length) return null;
  const xs = points.map(([lon]) => lon);
  const ys = points.map(([, lat]) => lat);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function continentOf(coords) {
  if (!coords) return 'Autres';
  const [lon, lat] = coords;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return 'Autres';
  if (lon < -30) return 'Ameriques';
  if (lon >= -25 && lon < 45 && lat >= 34) return 'Europe';
  if (lon >= -20 && lon <= 52 && lat >= -36 && lat <= 37) return 'Afrique';
  if (lon >= 110 && lat <= 0) return 'Oceanie';
  if (lon >= 25 && lat >= -12) return 'Asie';
  if (lon >= -170 && lon < -30) return 'Ameriques';
  return 'Autres';
}

const provinceCoords = new Map();
for (const feature of metadata.provinces?.features ?? []) {
  const name = feature.properties?.name;
  if (typeof name === 'string' && name) {
    const coords = coordinatesOf(feature);
    if (coords) provinceCoords.set(name, coords);
  }
}

const groups = new Map();
for (const type of Object.keys(TYPE_INDEX)) {
  const entries = metadata[type];
  const fr = locale[type] ?? {};
  if (!entries || typeof entries !== 'object') continue;
  for (const [code, value] of Object.entries(entries)) {
    if (code === '_id' || !Array.isArray(value) || value.length < 3) continue;
    const rawTitle = String(value[0] ?? code).replace(/^_+/, '').replace(/_/g, ' ');
    const key = `${type}:${code}`;
    groups.set(key, {
      id: `${type}-${code}`,
      type,
      typeLabel: TYPE_LABEL[type],
      code,
      title: typeof fr[code] === 'string' && fr[code] ? fr[code] : rawTitle,
      wiki: String(value[2] ?? rawTitle.replace(/ /g, '_')),
      image: type === 'religion' ? String(value[4] ?? '') : String(value[3] ?? ''),
      years: new Set(),
      members: new Set(),
      continents: new Set(),
    });
  }
}

const areaFiles = fs
  .readdirSync(AREAS)
  .filter((name) => /^-?\d+\.gz$/.test(name))
  .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

for (const file of areaFiles) {
  const year = Number.parseInt(file, 10);
  const areas = JSON.parse(gunzipSync(fs.readFileSync(path.join(AREAS, file))));
  for (const [province, row] of Object.entries(areas)) {
    if (!Array.isArray(row)) continue;
    const coords = provinceCoords.get(province) ?? null;
    const continent = continentOf(coords);
    for (const [type, index] of Object.entries(TYPE_INDEX)) {
      const code = row[index];
      if (typeof code !== 'string' || !code) continue;
      const group = groups.get(`${type}:${code}`);
      if (!group) continue;
      group.years.add(year);
      if (group.members.size < 200) group.members.add(province);
      group.continents.add(continent);
    }
  }
}

const serialized = [];
for (const group of groups.values()) {
  if (!group.years.size || !group.members.size) continue;
  const years = [...group.years].sort((a, b) => a - b);
  const epochs = EPOCHS.filter((epoch) => years.some((year) => year >= epoch.from && year < epoch.to)).map(
    (epoch) => epoch.id,
  );
  if (!epochs.length) continue;
  serialized.push({
    id: group.id,
    type: group.type,
    typeLabel: group.typeLabel,
    code: group.code,
    title: group.title,
    wiki: group.wiki,
    image: group.image,
    continents: [...group.continents].sort(),
    epochs,
    from: years[0],
    to: years[years.length - 1],
    itemCount: group.members.size,
    items: [...group.members].sort((a, b) => a.localeCompare(b, 'fr')).slice(0, 40),
  });
}

serialized.sort((a, b) =>
  a.title.localeCompare(b.title, 'fr') || a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
);

const catalog = {
  meta: {
    source: 'api/v1 miroir local',
    version: process.env.SOURCE_DATE_EPOCH ?? '2026-11-25',
    count: serialized.length,
    sha256: '',
  },
  continents: CONTINENTS,
  epochs: EPOCHS,
  groups: serialized,
};
catalog.meta.sha256 = crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog));
console.log(
  `catalogue : ${serialized.length} groupes, ${areaFiles.length} années, SHA ${catalog.meta.sha256.slice(0, 12)}`,
);
