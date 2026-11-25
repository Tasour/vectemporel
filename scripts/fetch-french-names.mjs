#!/usr/bin/env node
/* Complète les noms français manquants à partir de Wikidata / Wikipédia.
 *
 * Le fichier `ruler_fr` de l'API ne couvre qu'une partie des entités
 * (~74 % des dirigeants). Ce script interroge les liens interlangues pour les
 * entités manquantes et écrit un fichier statique versionné, utilisé comme
 * repli par l'application. Aucune traduction n'est inventée : seuls les titres
 * francophones publiés sont repris.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'api/v1/raw');
const BASE = path.join(RAW, 'metadata_type_g_f_provinces_ruler_culture_religion_capital_province_religionGeneral.json');
const FR = path.join(RAW, 'metadata_type_g_locale_fr_f_ruler_fr_culture_fr_religion_fr_religionGeneral_fr.json');
const OUT = path.join(ROOT, 'src/data/frenchNames.ts');
const REPORT = path.join(ROOT, 'docs/FR-LABELS-COVERAGE.md');
const DIMS = ['ruler', 'culture', 'religion'];
const UA = 'Vectemporel-local/1.0 (offline atlas; contact: local)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const fr = JSON.parse(fs.readFileSync(FR, 'utf8'));

function wikiTitle(entry) {
  const raw = Array.isArray(entry) ? entry[2] : undefined;
  if (!raw || typeof raw !== 'string') return null;
  try {
    return decodeURIComponent(raw).replace(/_/g, ' ');
  } catch {
    return raw.replace(/_/g, ' ');
  }
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function getJson(url, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return response.json();
    if (response.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`HTTP ${String(response.status)} ${url}`);
  }
  throw new Error(`HTTP 429 persistant ${url}`);
}

async function wikidataLabels(titles) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('sites', 'enwiki');
  url.searchParams.set('titles', titles.join('|'));
  url.searchParams.set('props', 'labels|sitelinks');
  url.searchParams.set('languages', 'fr');
  url.searchParams.set('format', 'json');
  const data = await getJson(url);
  const byTitle = new Map();
  for (const entity of Object.values(data.entities ?? {})) {
    const en = entity.sitelinks?.enwiki?.title;
    const label = entity.labels?.fr?.value;
    if (en && label) byTitle.set(en, capitalize(label));
  }
  return byTitle;
}

async function langlinks(titles) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('prop', 'langlinks');
  url.searchParams.set('lllang', 'fr');
  url.searchParams.set('lllimit', '1');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('titles', titles.join('|'));
  const data = await getJson(url);
  const byTitle = new Map();
  const redirects = new Map((data.query?.redirects ?? []).map((r) => [r.to, r.from]));
  for (const page of Object.values(data.query?.pages ?? {})) {
    const link = page.langlinks?.[0]?.['*'];
    if (!link) continue;
    byTitle.set(page.title, capitalize(link));
    const original = redirects.get(page.title);
    if (original) byTitle.set(original, capitalize(link));
  }
  return byTitle;
}

async function main() {
  const overrides = {};
  const stats = {};
  for (const dim of DIMS) {
    const entries = base[dim] ?? {};
    const localized = fr[dim] ?? {};
    const missing = Object.entries(entries)
      .filter(([id]) => !localized[id])
      .map(([id, entry]) => ({ id, title: wikiTitle(entry) }))
      .filter((item) => item.title);
    const titleToIds = new Map();
    for (const item of missing) {
      const ids = titleToIds.get(item.title) ?? [];
      ids.push(item.id);
      titleToIds.set(item.title, ids);
    }
    const titles = [...titleToIds.keys()];
    const found = {};
    for (let index = 0; index < titles.length; index += 50) {
      const batch = titles.slice(index, index + 50);
      try {
        const labels = await wikidataLabels(batch);
        for (const [title, name] of labels) {
          for (const id of titleToIds.get(title) ?? []) found[id] = name;
        }
      } catch (error) {
        console.warn(`Wikidata ${dim} batch ${String(index)}:`, String(error));
      }
      await sleep(800);
    }
    const stillMissing = missing.filter((item) => !found[item.id]);
    const remainingTitles = [...new Set(stillMissing.map((item) => item.title))];
    for (let index = 0; index < remainingTitles.length; index += 20) {
      const batch = remainingTitles.slice(index, index + 20);
      try {
        const links = await langlinks(batch);
        for (const [title, name] of links) {
          for (const id of titleToIds.get(title) ?? []) found[id] = name;
        }
      } catch (error) {
        console.warn(`Wikipedia ${dim} batch ${String(index)}:`, String(error));
      }
      await sleep(800);
    }
    overrides[dim] = found;
    stats[dim] = {
      total: Object.keys(entries).length,
      localized: Object.keys(localized).length,
      missing: missing.length,
      filled: Object.keys(found).length,
      unresolved: missing.length - Object.keys(found).length,
    };
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    `/* Généré par scripts/fetch-french-names.mjs — ne pas éditer à la main. */\n`
    + `export const FRENCH_NAMES: Record<'ruler' | 'culture' | 'religion', Record<string, string>> = ${JSON.stringify(overrides, null, 2)};\n`
  );

  const lines = ['# Couverture des libellés français', ''];
  for (const dim of DIMS) {
    const s = stats[dim];
    lines.push(`- **${dim}** : ${String(s.localized)}/${String(s.total)} fournis par l'API, `
      + `${String(s.missing)} manquants, ${String(s.filled)} complétés par Wikidata/Wikipédia, `
      + `${String(s.unresolved)} sans titre français publié.`);
  }
  lines.push('', 'Source : liens interlangues Wikidata (labels fr) puis Wikipédia (langlinks fr). '
    + 'Aucune traduction inventée ; les entités sans titre français conservent leur nom source.');
  fs.writeFileSync(REPORT, `${lines.join('\n')}\n`);
  console.log(JSON.stringify(stats, null, 2));
}

await main();
