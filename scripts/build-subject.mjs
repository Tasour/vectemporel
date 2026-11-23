#!/usr/bin/env node
/* Génère le jeu d'articles Wikipédia d'un sujet pour le champ Pixi hors ligne.
 * Usage : node scripts/build-subject.mjs <item> [requête] [nombre]
 * La requête brute est archivée localement ; aucun appel réseau au runtime. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id) { console.error('Usage : node scripts/build-subject.mjs <item> [requête] [nombre]'); process.exit(2); }
const query = process.argv[3] || id.replace(/[-_]/g, ' ');
const limit = Number(process.argv[4] || 24);
const API = 'https://fr.wikipedia.org/w/api.php';
const UA = { 'User-Agent': 'VectemporelSubjectBuilder/1.0 (local offline Atlas)' };

const url = new URL(API);
url.search = new URLSearchParams({
  action: 'query', list: 'search', srsearch: query, srnamespace: '0',
  srlimit: String(limit), prop: 'extracts|info|pageimages', exintro: '1',
  explaintext: '1', exsentences: '2', piprop: 'thumbnail', pithumbsize: '320',
  format: 'json', formatversion: '2',
}).toString();
const response = await fetch(url, { headers: UA });
if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
const raw = await response.text();
const data = JSON.parse(raw);
const cacheDir = path.join(ROOT, 'docs/subjects');
fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(path.join(cacheDir, `${id}-search.json`), raw);

const found = data.query?.search || [];
const detailUrl = new URL(API);
detailUrl.search = new URLSearchParams({
  action: 'query', pageids: found.map((page) => page.pageid).join('|'),
  prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '3',
  format: 'json', formatversion: '2',
}).toString();
const detailResponse = await fetch(detailUrl, { headers: UA });
if (!detailResponse.ok) throw new Error(`Wikipedia extraits ${detailResponse.status}`);
const detailRaw = await detailResponse.text();
fs.writeFileSync(path.join(cacheDir, `${id}-extracts.json`), detailRaw);
const extracts = new Map((JSON.parse(detailRaw).query?.pages || [])
  .map((page) => [String(page.pageid), (page.extract || '').replace(/\s+/g, ' ').trim()]));

const articles = found.map((page, index) => {
  const extract = extracts.get(String(page.pageid)) || '';
  const candidate = extract.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
  const year = candidate ? Number(candidate[1]) : 2000;
  return {
    id: String(page.pageid ?? index),
    title: page.title,
    year,
    extract: extract.slice(0, 320),
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    thumbnail: null,
  };
}).filter((article) => article.extract.length > 20);

const payload = {
  meta: {
    item: id, title: query, source: 'Wikipédia FR — API action=query',
    query, count: articles.length, generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Année extraite du premier millésime de l’extrait ; 2000 par défaut. Heuristique documentée.',
  },
  articles,
};
payload.meta.sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const outDir = path.join(ROOT, 'src/data/subjects');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${id}.json`);
fs.writeFileSync(out, JSON.stringify(payload));
console.log(`${id} : ${articles.length} articles, ${articles[0]?.year} → ${articles.at(-1)?.year}, SHA ${payload.meta.sha256.slice(0, 12)}`);
