#!/usr/bin/env node
/*
 * Vectemporel — vérification des sources des dossiers pays.
 *
 * Pour chaque source-register.csv :
 * - résout les DOI via l’API Handle de doi.org ;
 * - teste les URL (HEAD, puis GET si HEAD est refusé) ;
 * - distingue « valide », « protégé mais joignable », « non concluant », « introuvable ».
 *
 * Sortie : SOURCE_VERIFICATION.md
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const COUNTRIES = ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt'];
const TIMEOUT = 15000;
const CONCURRENCY = 8;

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function readSources(country) {
  const file = path.join(ROOT, 'audits', country, 'source-register.csv');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  return lines.slice(1).map(parseCsvLine).map((row) => ({
    id: (row[0] || '').trim(),
    title: (row[2] || '').trim(),
    doi: (row[8] || '').trim().replace(/^https?:\/\/doi\.org\//i, ''),
    url: (row[9] || '').trim(),
  })).filter((source) => source.id);
}

async function checkDoi(doi) {
  const endpoint = `https://doi.org/api/handles/${encodeURIComponent(doi)}`;
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'user-agent': 'Vectemporel-source-audit/1.0' },
    });
    if (!response.ok) return { status: 'unresolved', detail: `HTTP ${response.status}` };
    const data = await response.json();
    if (data.responseCode === 1) return { status: 'valid', detail: 'DOI résolu' };
    return { status: 'unresolved', detail: `responseCode ${data.responseCode}` };
  } catch (error) {
    return { status: 'unresolved', detail: error.name === 'TimeoutError' ? 'timeout' : error.message };
  }
}

async function checkUrl(url) {
  const headers = { 'user-agent': 'Mozilla/5.0 (compatible; Vectemporel-source-audit/1.0)' };
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT),
        headers,
      });
      if (response.status === 404 || response.status === 410) {
        return { status: 'invalid', detail: `HTTP ${response.status}` };
      }
      if (response.status >= 200 && response.status < 400) {
        return { status: 'valid', detail: `HTTP ${response.status}` };
      }
      if ([401, 403, 429].includes(response.status)) {
        return { status: 'protected', detail: `HTTP ${response.status}` };
      }
      if (method === 'HEAD' && response.status === 405) continue;
      return { status: 'uncertain', detail: `HTTP ${response.status}` };
    } catch (error) {
      if (method === 'HEAD') continue;
      return { status: 'uncertain', detail: error.name === 'TimeoutError' ? 'timeout' : error.message };
    }
  }
  return { status: 'uncertain', detail: 'non testable' };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const all = [];
for (const country of COUNTRIES) {
  for (const source of readSources(country)) all.push({ country, ...source });
}

const cache = new Map();
const checks = await mapLimit(all, CONCURRENCY, async (source) => {
  const key = source.doi ? `doi:${source.doi}` : source.url ? `url:${source.url}` : '';
  if (key && cache.has(key)) return { ...source, ...cache.get(key) };
  let result;
  if (source.doi) result = await checkDoi(source.doi);
  else if (source.url) result = await checkUrl(source.url);
  else result = { status: 'missing', detail: 'ni DOI ni URL' };
  if (key) cache.set(key, result);
  return { ...source, ...result };
});

const byCountry = new Map(COUNTRIES.map((country) => [country, []]));
for (const check of checks) {
  if (!byCountry.has(check.country)) byCountry.set(check.country, []);
  byCountry.get(check.country).push(check);
}

const totals = { valid: 0, protected: 0, uncertain: 0, unresolved: 0, invalid: 0, missing: 0 };
for (const check of checks) totals[check.status] = (totals[check.status] || 0) + 1;

const lines = [];
lines.push('# Vérification des sources — dossiers pays');
lines.push('');
lines.push(`> Vérification automatisée le **${new Date().toISOString().slice(0, 10)}**.`);
lines.push('> Les DOI sont résolus via l’API Handle de `doi.org`. Les URL sont testées en HEAD puis GET. Un statut « protégé » signifie que la page existe probablement mais refuse les requêtes automatisées ; il ne vaut pas validation du contenu.');
lines.push('');
lines.push('## Synthèse');
lines.push('');
lines.push('| Statut | Nombre |');
lines.push('| --- | ---: |');
lines.push(`| DOI/URL valides | ${totals.valid} |`);
lines.push(`| Protégés mais joignables | ${totals.protected} |`);
lines.push(`| Non concluants | ${totals.uncertain} |`);
lines.push(`| DOI non résolus | ${totals.unresolved} |`);
lines.push(`| Introuvables (404/410) | ${totals.invalid} |`);
lines.push(`| Sans DOI ni URL | ${totals.missing} |`);
lines.push(`| **Total** | **${checks.length}** |`);
lines.push('');
lines.push('## Détail par pays');
lines.push('');
for (const country of COUNTRIES) {
  const list = byCountry.get(country) || [];
  if (list.length === 0) {
    lines.push(`### ${country}`);
    lines.push('');
    lines.push('Aucun registre de sources trouvé.');
    lines.push('');
    continue;
  }
  const bad = list.filter((item) => ['unresolved', 'invalid', 'missing'].includes(item.status));
  lines.push(`### ${country} — ${list.length} sources, ${bad.length} problème(s)`);
  lines.push('');
  lines.push('| ID | Statut | Détail | Référence |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of list) {
    const icon = item.status === 'valid' ? '✅' : item.status === 'protected' ? '🔒' : item.status === 'uncertain' ? '⚠️' : '❌';
    const ref = item.doi ? `doi:${item.doi}` : item.url || '—';
    const title = item.title.replace(/\|/g, '\\|').slice(0, 100);
    lines.push(`| ${item.id} | ${icon} ${item.status} | ${item.detail.replace(/\|/g, '\\|')} | [${title}](${ref}) |`);
  }
  lines.push('');
}

fs.writeFileSync(path.join(ROOT, 'SOURCE_VERIFICATION.md'), `${lines.join('\n').trimEnd()}\n`, 'utf8');

console.log('Vérification des sources — dossiers pays');
console.log(`  sources testées : ${checks.length}`);
console.log(`  valides          : ${totals.valid}`);
console.log(`  protégées        : ${totals.protected}`);
console.log(`  non concluantes  : ${totals.uncertain}`);
console.log(`  DOI non résolus  : ${totals.unresolved}`);
console.log(`  introuvables     : ${totals.invalid}`);
console.log(`  sans lien        : ${totals.missing}`);
console.log(`  rapport          : SOURCE_VERIFICATION.md`);

if (totals.invalid > 0 || totals.unresolved > 0 || totals.missing > 0) process.exitCode = 1;
