import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const atlasContext = { window: {} };
vm.createContext(atlasContext);
vm.runInContext(fs.readFileSync(path.join(root, 'countries.js'), 'utf8'), atlasContext);
const atlas = atlasContext.window.VECTEMPOREL_ATLAS;
const byCode3 = new Map(atlas.countries.map((country) => [country.code3, country]));

const topology = readJson('node_modules/world-atlas/countries-50m.json');
const geo = feature(topology, topology.objects.countries);
const features = geo.features;

const VISUAL_WIDTH = 4096;
const VISUAL_HEIGHT = 2048;
const PICK_WIDTH = 2048;
const PICK_HEIGHT = 1024;

const activeCodes = new Set(atlas.countries.filter((country) => country.available).map((country) => country.code));

const visual = createCanvas(VISUAL_WIDTH, VISUAL_HEIGHT);
const vctx = visual.getContext('2d');

const vProjection = geoEquirectangular()
  .translate([VISUAL_WIDTH / 2, VISUAL_HEIGHT / 2])
  .scale(VISUAL_WIDTH / (2 * Math.PI));
const vPath = geoPath(vProjection, vctx);

const ocean = vctx.createLinearGradient(0, 0, 0, VISUAL_HEIGHT);
ocean.addColorStop(0, '#07131f');
ocean.addColorStop(0.45, '#0a1927');
ocean.addColorStop(1, '#06111a');
vctx.fillStyle = ocean;
vctx.fillRect(0, 0, VISUAL_WIDTH, VISUAL_HEIGHT);

// Subtle graticule helps read the sphere without any extra geometry.
vctx.beginPath();
vPath(geoGraticule10());
vctx.strokeStyle = 'rgba(103, 141, 168, 0.16)';
vctx.lineWidth = 1.1;
vctx.stroke();

for (const item of features) {
  const country = byCode3.get(String(item.id));
  const active = country && activeCodes.has(country.code);
  vctx.beginPath();
  vPath(item);
  if (active) {
    vctx.save();
    vctx.shadowColor = 'rgba(230, 185, 111, 0.55)';
    vctx.shadowBlur = 18;
    vctx.fillStyle = '#c99a4b';
    vctx.fill();
    vctx.restore();
    vctx.lineWidth = 1.5;
    vctx.strokeStyle = 'rgba(255, 227, 174, 0.9)';
  } else {
    vctx.fillStyle = '#1a2a39';
    vctx.fill();
    vctx.lineWidth = 0.7;
    vctx.strokeStyle = 'rgba(67, 101, 126, 0.72)';
  }
  vctx.stroke();
}

const visualBuffer = visual.toBuffer('image/png');
fs.writeFileSync(path.join(root, 'globe-map.png'), visualBuffer);

const visualSmall = createCanvas(2048, 1024);
const vsctx = visualSmall.getContext('2d');
vsctx.imageSmoothingEnabled = true;
vsctx.imageSmoothingQuality = 'high';
vsctx.drawImage(visual, 0, 0, 2048, 1024);
const visualSmallBuffer = visualSmall.toBuffer('image/png');
fs.writeFileSync(path.join(root, 'globe-map-2k.png'), visualSmallBuffer);

const pick = createCanvas(PICK_WIDTH, PICK_HEIGHT);
const pctx = pick.getContext('2d');
const pProjection = geoEquirectangular()
  .translate([PICK_WIDTH / 2, PICK_HEIGHT / 2])
  .scale(PICK_WIDTH / (2 * Math.PI));
const pPath = geoPath(pProjection, pctx);

pctx.fillStyle = '#000000';
pctx.fillRect(0, 0, PICK_WIDTH, PICK_HEIGHT);
pctx.imageSmoothingEnabled = false;

const levels = [24, 64, 104, 144, 184, 224];
const colorSlots = [];
for (const r of levels) {
  for (const g of levels) {
    for (const b of levels) colorSlots.push([r, g, b]);
  }
}

const palette = [];
const colorByCode = new Map();
let slot = 0;
for (const country of atlas.countries) {
  const color = colorSlots[slot++];
  colorByCode.set(country.code, color);
  palette.push({ code: country.code, rgb: color });
}

for (const item of features) {
  const country = byCode3.get(String(item.id));
  if (!country) continue;
  const color = colorByCode.get(country.code);
  if (!color) continue;
  pctx.beginPath();
  pPath(item);
  pctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  pctx.fill();
}

const pickBuffer = pick.toBuffer('image/png');
fs.writeFileSync(path.join(root, 'globe-pick.png'), pickBuffer);
fs.writeFileSync(
  path.join(root, 'globe-palette.json'),
  `${JSON.stringify({ width: PICK_WIDTH, height: PICK_HEIGHT, palette }, null, 2)}\n`
);

console.log(
  `Globe textures: ${(visualBuffer.length / 1024).toFixed(0)} KB visual 4K, ${(visualSmallBuffer.length / 1024).toFixed(0)} KB visual 2K, ${(pickBuffer.length / 1024).toFixed(0)} KB pick, ${palette.length} couleurs.`
);
