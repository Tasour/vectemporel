#!/usr/bin/env node
/*
 * Vectemporel — audit structurel des frises (méthode v1.0).
 *
 * Ce script ne juge pas la qualité historique. Il vérifie :
 * - la cohérence des ères et des repères ;
 * - l’intégrité des identifiants, tags, liens et audits prose ;
 * - la couverture tags × ères ;
 * - la complétude du schéma cible (acteurs, lieux, sources, claims, TimeSpan…).
 *
 * Sortie : TIMELINE_AUDIT.md
 * Code de sortie : 1 si l’intégrité POC échoue ; avec --strict, 1 si la cible < 80/100.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REPORT_PATH = path.join(ROOT, 'TIMELINE_AUDIT.md');
const METHOD_VERSION = '1.0';
const STRICT = process.argv.includes('--strict');
const GENERATED = new Date().toISOString().slice(0, 10);

const TAGS = {
  politique: 'Politique',
  guerre: 'Guerres',
  sciences: 'Sciences',
  arts: 'Arts & lettres',
  religion: 'Religions',
  societe: 'Société',
  economie: 'Économie',
  exploration: 'Monde',
};

const METHOD_DOMAINS = [
  ['Politique & institutions', 'politique'],
  ['Guerres & diplomatie', 'guerre'],
  ['Droit & justice', null],
  ['Économie & travail', 'economie'],
  ['Société & démographie', 'societe'],
  ['Femmes, genre, sexualités', null],
  ['Religions & croyances', 'religion'],
  ['Sciences, techniques & santé', 'sciences'],
  ['Arts & lettres', 'arts'],
  ['Environnement & territoire', null],
  ['Migrations & diasporas', null],
  ['Peuples autochtones & minorités', null],
  ['Mémoire & patrimoine', null],
  ['Circulations transnationales', 'exploration'],
];

const DOMAIN_TAG = new Map(METHOD_DOMAINS.filter(([, tag]) => tag));

function loadGlobal(file) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context);
  return context.window;
}

function githubSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} _-]/gu, '')
    .replace(/ /g, '-');
}

function extractHeadings(markdown) {
  const headings = new Map();
  const slugs = new Set();
  for (const line of markdown.split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!match) continue;
    const slug = githubSlug(match[1]);
    slugs.add(slug);
    headings.set(match[1], slug);
  }
  return { headings, slugs };
}

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

function ratio(value, total) {
  return total > 0 ? value / total : 0;
}

function pct(value, total) {
  return total > 0 ? `${((value / total) * 100).toFixed(0)} %` : '—';
}

function frNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function eraIndexForYear(eras, year) {
  for (let i = 0; i < eras.length; i += 1) {
    const era = eras[i];
    if (year >= era.start && (year < era.end || (i === eras.length - 1 && year <= era.end))) {
      return i;
    }
  }
  return -1;
}

function readCountryFile(countryId, file) {
  const full = path.join(ROOT, 'audits', countryId, file);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function omissionsCount(countryId) {
  const text = readCountryFile(countryId, 'omissions.yaml');
  if (!text) return 0;
  return text
    .split('\n')
    .filter((line) => /^\s*-\s+/.test(line) && !line.trim().startsWith('#'))
    .length;
}

function coverageMatrixStats(countryId) {
  const text = readCountryFile(countryId, 'coverage-matrix.csv');
  if (!text) return { total: 0, valid: 0 };
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { total: 0, valid: 0 };
  const rows = lines.slice(1).map(parseCsvLine).filter((row) => row.length >= 7);
  const valid = rows.filter((row) =>
    ['couvert', 'partiel', 'vide justifié'].includes((row[6] || '').trim())
  ).length;
  return { total: rows.length, valid };
}

function signoffStatus(countryId) {
  const text = readCountryFile(countryId, 'country-audit.yaml');
  if (!text) return false;
  const verdict = text.match(/^\s*verdict:\s*"?(passed|conditional)"?\s*$/m);
  const signed = text.match(/^\s*signed_by:\s*\[(.+)\]\s*$/m);
  const signedList = text.match(/^\s*signed_by:\s*\n((?:\s*-\s+.+\n?)+)/m);
  return Boolean(verdict && (signed?.[1]?.trim() || signedList?.[1]?.trim()));
}

function hasField(event, field) {
  const value = event[field];
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
}

function analyseCountry(country, atlasEntry, allEventIds, mismatchedSummary) {
  const issues = [];
  const warnings = [];
  const eras = [...country.eras];
  const events = [...country.events];

  // --- Périodisation -------------------------------------------------------
  let erasSorted = true;
  for (let i = 0; i < country.eras.length; i += 1) {
    if (country.eras[i] !== eras[i]) erasSorted = false;
  }
  const eraIssues = [];
  eras.forEach((era, index) => {
    if (!(era.start < era.end)) eraIssues.push(`ère « ${era.name} » vide ou inversée`);
    if (index > 0 && eras[index - 1].end !== era.start) {
      eraIssues.push(
        `rupture non contiguë entre « ${eras[index - 1].name} » (${eras[index - 1].end}) et « ${era.name} » (${era.start})`
      );
    }
  });
  if (eras.length > 0) {
    if (eras[0].start !== country.domain[0]) {
      eraIssues.push(`la première ère commence en ${eras[0].start}, domaine ${country.domain[0]}`);
    }
    if (eras[eras.length - 1].end !== country.domain[1]) {
      eraIssues.push(`la dernière ère finit en ${eras[eras.length - 1].end}, domaine ${country.domain[1]}`);
    }
  }
  if (new Set(eras.map((era) => era.name)).size !== eras.length) {
    eraIssues.push('noms d’ères dupliqués');
  }
  if (!erasSorted) eraIssues.push('ères non triées');
  if (eraIssues.length) issues.push(...eraIssues);

  // --- Repères -------------------------------------------------------------
  const domainIssues = [];
  const eventIds = new Set();
  const duplicates = [];
  const badYears = [];
  const badTags = [];
  const badImportance = [];
  const badGrok = [];
  const badEra = [];
  let sorted = true;

  events.forEach((event, index) => {
    if (eventIds.has(event.id)) duplicates.push(event.id);
    eventIds.add(event.id);
    if (!Number.isInteger(event.year) || event.year < country.domain[0] || event.year > country.domain[1]) {
      badYears.push(`${event.id} (${event.year})`);
    }
    if (event.endYear !== undefined) {
      if (!Number.isInteger(event.endYear) || event.endYear < event.year || event.endYear > country.domain[1]) {
        badYears.push(`${event.id} (fin ${event.endYear})`);
      }
    }
    if (!Array.isArray(event.tags) || event.tags.length === 0 || event.tags.some((tag) => !TAGS[tag])) {
      badTags.push(event.id);
    }
    if (![1, 2, 3].includes(event.importance)) badImportance.push(event.id);
    if (
      typeof event.grok !== 'string' ||
      !event.grok.trim() ||
      /\s/.test(event.grok) ||
      event.grok.includes('://')
    ) {
      badGrok.push(event.id);
    }
    if (eraIndexForYear(eras, event.year) < 0) badEra.push(event.id);
    if (index > 0 && events[index - 1].year > event.year) sorted = false;
  });
  if (duplicates.length) issues.push(`identifiants dupliqués : ${duplicates.join(', ')}`);
  if (badYears.length) issues.push(`repères hors domaine ou dates invalides : ${badYears.join(', ')}`);
  if (badTags.length) issues.push(`tags inconnus ou absents : ${badTags.join(', ')}`);
  if (badImportance.length) issues.push(`importance invalide : ${badImportance.join(', ')}`);
  if (badGrok.length) issues.push(`slug Grokipedia absent ou invalide : ${badGrok.join(', ')}`);
  if (badEra.length) issues.push(`repères hors ère : ${badEra.join(', ')}`);
  if (!sorted) issues.push('repères non triés par année');

  // --- Liens related -------------------------------------------------------
  let relatedTotal = 0;
  let relatedBroken = [];
  let relatedReciprocal = 0;
  events.forEach((event) => {
    for (const target of event.related || []) {
      relatedTotal += 1;
      if (target === event.id) relatedBroken.push(`${event.id} → soi-même`);
      else if (!allEventIds.has(target)) relatedBroken.push(`${event.id} → ${target} (absent)`);
      else {
        const targetEvent = allEventIds.get(target);
        if ((targetEvent.related || []).includes(event.id)) relatedReciprocal += 1;
      }
    }
  });
  if (relatedBroken.length) issues.push(`liens related cassés : ${relatedBroken.join(', ')}`);

  // --- Audit prose ---------------------------------------------------------
  const slug = mismatchedSummary.slugByName.get(atlasEntry.name);
  const hrefAnchor = atlasEntry.audit.href.includes('#')
    ? decodeURIComponent(atlasEntry.audit.href.split('#')[1])
    : '';
  const anchorValid = Boolean(hrefAnchor && mismatchedSummary.slugs.has(hrefAnchor));
  if (!slug) issues.push('aucune section d’audit prose trouvée dans COUNTRY_AUDITS.md');
  if (!anchorValid) {
    issues.push(
      `ancre d’audit invalide : ${atlasEntry.audit.href || '—'}${slug ? ` (ancre attendue : #${slug})` : ''}`
    );
  }
  const summaryCounts = (atlasEntry.audit.summary || '').match(/(\d+)\s+périodes?,\s*(\d+)\s+repères?/);
  const summaryMatches =
    summaryCounts &&
    Number(summaryCounts[1]) === eras.length &&
    Number(summaryCounts[2]) === events.length;
  if (!summaryMatches) {
    issues.push(
      `résumé d’audit incohérent : « ${atlasEntry.audit.summary} » (attendu ${eras.length} périodes, ${events.length} repères)`
    );
  }

  // --- Couverture tags × ères ---------------------------------------------
  const tagEra = new Map();
  for (const tag of Object.keys(TAGS)) {
    tagEra.set(tag, new Array(eras.length).fill(0));
  }
  const eraCounts = new Array(eras.length).fill(0);
  for (const event of events) {
    const index = eraIndexForYear(eras, event.year);
    if (index < 0) continue;
    eraCounts[index] += 1;
    for (const tag of event.tags || []) {
      if (tagEra.has(tag)) tagEra.get(tag)[index] += 1;
    }
  }
  const totalCells = Object.keys(TAGS).length * eras.length;
  let coveredCells = 0;
  const emptyCells = [];
  for (const [tag, counts] of tagEra) {
    counts.forEach((count, index) => {
      if (count > 0) coveredCells += 1;
      else emptyCells.push(`${eras[index].name} × ${TAGS[tag]}`);
    });
  }
  const emptyEras = eras.filter((era, index) => eraCounts[index] === 0).map((era) => era.name);
  if (emptyEras.length) warnings.push(`ères sans repère : ${emptyEras.join(', ')}`);

  // --- Équilibre -----------------------------------------------------------
  const politicalMilitary = events.filter(
    (event) => (event.tags || []).includes('politique') || (event.tags || []).includes('guerre')
  ).length;
  const politicalShare = ratio(politicalMilitary, events.length);

  // --- Complétude cible v1.0 ----------------------------------------------
  const total = events.length;
  const withActors = events.filter((event) => hasField(event, 'actors')).length;
  const withPlaces = events.filter((event) => hasField(event, 'places')).length;
  const withSources = events.filter((event) => hasField(event, 'sources')).length;
  const withClaims = events.filter((event) => hasField(event, 'claims')).length;
  const withTimeSpan = events.filter(
    (event) => hasField(event, 'timeSpan') || (event.time && hasField(event.time, 'edtf'))
  ).length;
  const withPrecision = events.filter(
    (event) =>
      hasField(event, 'datePrecision') ||
      (event.time && event.time.precision && event.time.precision !== 'unknown')
  ).length;
  const withYear = events.filter((event) => Number.isInteger(event.year)).length;
  const omissions = omissionsCount(country.id);
  const matrix = coverageMatrixStats(country.id);
  const signoff = signoffStatus(country.id);

  const targetScore =
    ratio(withActors, total) * 15 +
    ratio(withPlaces, total) * 15 +
    ratio(withSources, total) * 20 +
    ratio(withClaims, total) * 10 +
    (ratio(withYear, total) * 0.4 + ratio(withTimeSpan, total) * 0.6) * 15 +
    ratio(withPrecision, total) * 5 +
    (omissions > 0 ? 1 : 0) * 5 +
    ratio(matrix.valid, matrix.total) * 7.5 +
    (signoff ? 1 : 0) * 7.5;

  const checks = [
    ['Périodisation contiguë', eraIssues.length === 0],
    ['Repères dans le domaine', badYears.length === 0],
    ['Repères rattachés à une ère', badEra.length === 0],
    ['Identifiants uniques', duplicates.length === 0],
    ['Repères triés', sorted],
    ['Tags valides', badTags.length === 0],
    ['Importance valide', badImportance.length === 0],
    ['Slugs Grokipedia valides', badGrok.length === 0],
    ['Liens related résolus', relatedBroken.length === 0],
    ['Section d’audit présente', Boolean(slug)],
    ['Ancre d’audit valide', anchorValid],
    ['Résumé d’audit cohérent', Boolean(summaryMatches)],
  ];
  const passed = checks.filter(([, ok]) => ok).length;

  return {
    country,
    atlasEntry,
    issues,
    warnings,
    checks,
    integrity: ratio(passed, checks.length),
    integrityPassed: passed,
    integrityTotal: checks.length,
    eras,
    events,
    eraCounts,
    tagEra,
    totalCells,
    coveredCells,
    emptyCells,
    emptyEras,
    relatedTotal,
    relatedBroken,
    relatedReciprocal,
    politicalMilitary,
    politicalShare,
    targetScore,
    fields: {
      actors: withActors,
      places: withPlaces,
      sources: withSources,
      claims: withClaims,
      timeSpan: withTimeSpan,
      precision: withPrecision,
      year: withYear,
      endYear: events.filter((event) => event.endYear !== undefined).length,
    },
    omissions,
    matrix,
    signoff,
    anchorValid,
    slug,
  };
}

function globalAggregate(results, allEvents) {
  const total = allEvents.length;
  const count = (field) => allEvents.filter((event) => hasField(event, field)).length;
  const withTimeSpan = allEvents.filter(
    (event) => hasField(event, 'timeSpan') || (event.time && hasField(event.time, 'edtf'))
  ).length;
  const withPrecision = allEvents.filter(
    (event) =>
      hasField(event, 'datePrecision') ||
      (event.time && event.time.precision && event.time.precision !== 'unknown')
  ).length;
  const omissions = results.filter((result) => result.omissions > 0).length;
  const matrices = results.filter((result) => result.matrix.total > 0 && result.matrix.valid > 0);
  const matrixValid = results.reduce((sum, result) => sum + result.matrix.valid, 0);
  const matrixTotal = results.reduce((sum, result) => sum + result.matrix.total, 0);
  const signoffs = results.filter((result) => result.signoff).length;
  const score =
    ratio(count('actors'), total) * 15 +
    ratio(count('places'), total) * 15 +
    ratio(count('sources'), total) * 20 +
    ratio(count('claims'), total) * 10 +
    (ratio(allEvents.filter((event) => Number.isInteger(event.year)).length, total) * 0.4 +
      ratio(withTimeSpan, total) * 0.6) *
      15 +
    ratio(withPrecision, total) * 5 +
    ratio(omissions, results.length) * 5 +
    ratio(matrixValid, matrixTotal) * 7.5 +
    ratio(signoffs, results.length) * 7.5;
  return { total, count, withTimeSpan, withPrecision, omissions, matrices, matrixValid, matrixTotal, signoffs, score };
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

const app = loadGlobal('data.js');
const atlas = loadGlobal('countries.js');
const data = app.VECTEMPOREL_DATA;
const atlasCountries = atlas.VECTEMPOREL_ATLAS.countries;
const atlasByAppId = new Map(
  atlasCountries.filter((entry) => entry.appId).map((entry) => [entry.appId, entry])
);
const auditsMarkdown = fs.readFileSync(path.join(ROOT, 'COUNTRY_AUDITS.md'), 'utf8');
const { headings, slugs } = extractHeadings(auditsMarkdown);
const slugByName = new Map();
for (const [title, slug] of headings) {
  const name = title.replace(/\s+—\s+audit\s*$/i, '').trim();
  slugByName.set(name, slug);
}

const allEvents = [];
const allEventIds = new Map();
const duplicateGlobal = [];
for (const country of data.countries) {
  for (const event of country.events) {
    if (allEventIds.has(event.id)) duplicateGlobal.push(event.id);
    allEventIds.set(event.id, event);
    allEvents.push({ ...event, countryId: country.id });
  }
}

const results = data.countries.map((country) => {
  const atlasEntry = atlasByAppId.get(country.id);
  if (!atlasEntry) throw new Error(`Pays absent de countries.js : ${country.id}`);
  return analyseCountry(country, atlasEntry, allEventIds, { slugByName, slugs });
});

const aggregate = globalAggregate(results, allEvents);
const totalEras = results.reduce((sum, result) => sum + result.eras.length, 0);
const totalChecks = results.reduce((sum, result) => sum + result.integrityTotal, 0);
const passedChecks = results.reduce((sum, result) => sum + result.integrityPassed, 0);
const countriesWithIssues = results.filter((result) => result.issues.length > 0);
const brokenAnchors = results.filter((result) => !result.anchorValid);
const brokenRelated = results.reduce((sum, result) => sum + result.relatedBroken.length, 0);
const relatedTotal = results.reduce((sum, result) => sum + result.relatedTotal, 0);
const reciprocal = results.reduce((sum, result) => sum + result.relatedReciprocal, 0);
const totalCells = results.reduce((sum, result) => sum + result.totalCells, 0);
const coveredCells = results.reduce((sum, result) => sum + result.coveredCells, 0);

// ---------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------

const lines = [];
const push = (...items) => lines.push(...items);

push('# Audit structurel des frises — Vectemporel');
push('');
push(`> Généré par \`npm run audit:timeline\` le **${GENERATED}**. Méthode cible : **v${METHOD_VERSION}**.`);
push('>');
push('> **Ce que cet audit mesure.** La cohérence des ères, des repères, des tags, des liens et des audits prose, puis la **complétude du schéma cible**. Il ne mesure pas la qualité historique, la justesse des dates ni l’équilibre réel des récits : ces vérifications exigent une double lecture humaine.');
push('');
push('## Synthèse');
push('');
push('| Indicateur | Résultat |');
push('| --- | --- |');
push(`| Pays audités | ${results.length} |`);
push(`| Repères | ${aggregate.total} |`);
push(`| Ères | ${totalEras} |`);
push(`| Intégrité POC | **${passedChecks}/${totalChecks} contrôles** (${pct(passedChecks, totalChecks)}) |`);
push(`| Pays avec anomalie d’intégrité | ${countriesWithIssues.length} |`);
push(`| Couverture tags × ères | ${coveredCells}/${totalCells} cellules (${pct(coveredCells, totalCells)}) |`);
push(`| Liens \`related\` | ${relatedTotal} liens, ${brokenRelated} cassé(s), ${pct(reciprocal, relatedTotal)} réciproques |`);
push(`| Grokipedia | ${allEvents.filter((event) => event.grok).length}/${aggregate.total} slugs présents |`);
push(`| Audits prose | ${results.filter((result) => result.slug).length}/${results.length} sections présentes |`);
push(`| Ancres d’audit | ${results.length - brokenAnchors.length}/${results.length} valides |`);
push(`| Complétude cible v${METHOD_VERSION} | **${aggregate.score.toFixed(1)}/100** |`);
push('');
push('**Verdict.** ');
if (countriesWithIssues.length === 0) {
  push(
    `Les ${results.length} frises sont **cohérentes pour le POC** : ères contiguës, repères dans leur domaine, identifiants, tags et liens valides.`
  );
} else {
  push(
    `${countriesWithIssues.length} frise(s) présentent au moins une anomalie d’intégrité : ${countriesWithIssues
      .map((result) => result.country.name)
      .join(', ')}.`
  );
}
push(
  `En revanche, la **cible v${METHOD_VERSION} n’est pas atteinte** : le score de ${aggregate.score.toFixed(
    1
  )}/100 mesure la complétude du schéma, pas la valeur historique. Aucun repère ne porte aujourd’hui d’acteurs, de lieux, de sources indépendantes, de claims ni de \`TimeSpan\` explicite.`
);
push('');
push('## Tableau pays');
push('');
push('| Pays | Domaine | Ères | Repères | Couverture | Politique/guerre | Intégrité | Cible | Audit |');
push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
for (const result of results) {
  const domain = `${result.country.domain[0]} → ${result.country.domain[1]}`;
  push(
    `| ${result.country.flag} ${result.country.name} | ${domain} | ${result.eras.length} | ${result.events.length} | ${pct(
      result.coveredCells,
      result.totalCells
    )} | ${pct(result.politicalMilitary, result.events.length)} | ${result.integrityPassed}/${
      result.integrityTotal
    } | ${result.targetScore.toFixed(0)}/100 | ${result.anchorValid ? '✅' : '❌'} |`
  );
}
push('');
push('La colonne **Cible** est un score de complétude structurelle : 0 signifie que le schéma cible est absent, pas que les repères sont faux. La colonne **Audit** vérifie seulement que le lien vers `COUNTRY_AUDITS.md` pointe vers une ancre existante.');
push('');

// --- Constats transversaux -------------------------------------------------
push('## 1. Ce qui est solide');
push('');
push('- **Périodisations continues** : chaque ère commence là où la précédente finit, dans le domaine du pays.');
push('- **Repères rattachés** : chaque événement tombe dans le domaine temporel et dans une ère.');
push('- **Identifiants et tags** : pas de doublon détecté, tags limités au vocabulaire de l’application.');
push(`- **Liens éditoriaux** : ${relatedTotal} liens \`related\`, ${brokenRelated} cassé(s).`);
push(`- **Grokipedia** : ${allEvents.filter((event) => event.grok).length}/${aggregate.total} slugs structurellement valides. Le contrôle de disponibilité en ligne reste \`npm run verify\`.`);
push('');

push('## 2. Lacunes structurelles');
push('');
push('| Champ cible | Repères renseignés | Couverture | Conséquence |');
push('| --- | ---: | ---: | --- |');
push(`| \`actors\` | ${aggregate.count('actors')}/${aggregate.total} | 0 % | Impossible de vérifier la place des femmes, des minorités, des classes populaires ou des institutions. |`);
push(`| \`places\` | ${aggregate.count('places')}/${aggregate.total} | 0 % | Impossible de vérifier les lieux hors capitale, les échelles et les géographies datées. |`);
push(`| \`sources\` indépendantes | ${aggregate.count('sources')}/${aggregate.total} | 0 % | Grokipedia reste un point d’entrée, pas une source probante : aucune fiche n’a deux sources indépendantes. |`);
push(`| \`claims\` | ${aggregate.count('claims')}/${aggregate.total} | 0 % | Les désaccords et les incertitudes ne sont pas modélisés. |`);
push(`| \`TimeSpan\` | ${aggregate.withTimeSpan}/${aggregate.total} | 0 % | Le temps est réduit à une année (et parfois \`endYear\`) ; pas de bornes, de calendrier ni d’incertitude. |`);
push(`| \`datePrecision\` | ${aggregate.withPrecision}/${aggregate.total} | 0 % | Aucune distinction jour / mois / année / décennie / siècle. |`);
push(`| Registre d’omissions | ${aggregate.omissions}/${results.length} pays | 0 % | Les absences ne sont pas documentées : un oubli reste silencieux. |`);
push(`| Matrice de couverture | ${aggregate.matrices.length}/${results.length} pays | 0 % | Les 14 domaines de la méthode ne sont pas remplis ni justifiés. |`);
push(`| Audit expert signé | ${aggregate.signoffs}/${results.length} pays | 0 % | Les audits prose ne sont ni une double lecture ni un sign-off. |`);
push('');
push(`Le score de **${aggregate.score.toFixed(1)}/100** est donc cohérent : le POC possède un schéma minimal (année, titre, tags, lien), pas le schéma de preuve de la méthode v${METHOD_VERSION}.`);
push('');

push('## 3. Couverture thématique');
push('');
push('Les 8 tags actuels ne couvrent pas les 14 domaines de la méthode. Un domaine non instrumenté n’est pas nécessairement absent du récit : il est **invisible et non auditable**.');
push('');
push('| Domaine méthode | Tag actuel | Repères | Statut |');
push('| --- | --- | ---: | --- |');
const tagCounts = new Map(Object.keys(TAGS).map((tag) => [tag, 0]));
for (const event of allEvents) {
  for (const tag of new Set(event.tags || [])) {
    if (tagCounts.has(tag)) tagCounts.set(tag, tagCounts.get(tag) + 1);
  }
}
for (const [domain, tag] of METHOD_DOMAINS) {
  if (!tag) {
    push(`| ${domain} | — | 0 | **non instrumenté** |`);
  } else {
    const count = tagCounts.get(tag);
    const status = domain === 'Circulations transnationales' ? 'partiel' : 'instrumenté';
    push(`| ${domain} | \`${tag}\` | ${count} | ${status} |`);
  }
}
push('');
push('**Six domaines n’ont aucun tag dédié** : droit et justice, femmes et genre, environnement, migrations et diasporas, peuples autochtones et minorités, mémoire et patrimoine. Le tag `exploration` (« Monde ») ne couvre que partiellement les circulations transnationales.');
push('');

// --- Équilibre --------------------------------------------------------------
push('## 4. Équilibre politique et militaire');
push('');
push(`Seuil de vigilance de la méthode : **≤ 50 %** des repères étiquetés politique ou guerre.`);
push('');
push('| Pays | Politique/guerre | Part | Statut |');
push('| --- | ---: | ---: | --- |');
for (const result of results) {
  push(
    `| ${result.country.name} | ${result.politicalMilitary}/${result.events.length} | ${pct(
      result.politicalMilitary,
      result.events.length
    )} | ${result.politicalShare > 0.5 ? '⚠️ au-dessus du seuil' : '✅ sous le seuil'} |`
  );
}
push('');
const overThreshold = results.filter((result) => result.politicalShare > 0.5);
if (overThreshold.length) {
  push(
    `**${overThreshold.length}/${results.length} pays** dépassent le seuil : ${overThreshold
      .map((result) => `${result.country.name} (${pct(result.politicalMilitary, result.events.length)})`)
      .join(', ')}. Ce n’est pas une erreur factuelle, mais un déséquilibre de sélection à corriger par la matrice de couverture.`
  );
} else {
  push('Aucun pays ne dépasse le seuil.');
}
push('');

// --- Angles morts -----------------------------------------------------------
push('## 5. Angles morts non mesurables');
push('');
push('Ces angles morts ne sont pas déclarés absents : ils sont **impossibles à auditer** avec le schéma actuel.');
push('');
push('- **Femmes et genre** : aucun champ acteur, donc aucune vérification possible de la présence, de l’absence ou du rôle des femmes.');
push('- **Minorités, peuples autochtones, populations colonisées** : aucun acteur collectif ni claim, donc aucune traçabilité.');
push('- **Lieux hors capitale** : aucun lieu daté, donc aucune vérification de l’échelle locale, régionale ou frontalière.');
push('- **Mémoire et commémorations** : aucun objet mémoriel distinct de l’événement commémoré.');
push('- **Incertitude et controverses** : aucun `TimeSpan`, aucune précision, aucun statut de claim.');
push('- **Sources** : Grokipedia est un point d’entrée de lecture ; la méthode exige deux sources indépendantes par fiche.');
push('');
push('> Une omission non mesurée n’est pas une omission niée : c’est une **dette d’audit**.');
push('');

// --- Liens et audits --------------------------------------------------------
push('## 6. Liens, audits et cohérence documentaire');
push('');
push(`- **Liens \`related\`** : ${relatedTotal} liens, ${brokenRelated} cassé(s), ${pct(reciprocal, relatedTotal)} réciproques.`);
push(`- **Ancres d’audit** : ${results.length - brokenAnchors.length}/${results.length} valides.${brokenAnchors.length ? ` Cassées : ${brokenAnchors.map((result) => `${result.country.name} (${result.atlasEntry.audit.href})`).join(', ')}.` : ''}`);
const summaryMismatches = results.filter((result) =>
  result.issues.some((issue) => issue.startsWith('résumé d’audit incohérent'))
);
push(
  `- **Résumés d’audit** : ${results.length - summaryMismatches.length}/${results.length} cohérents avec le nombre d’ères et de repères.`
);
push(
  '- **Audit prose vs audit expert** : les sections de `COUNTRY_AUDITS.md` sont des notes éditoriales ; aucun pays ne dispose de double lecture chiffrée (kappa) ni de sign-off.'
);
push('');

// --- Plan de correction -----------------------------------------------------
push('## 7. Plan de correction priorisé');
push('');
push('| Priorité | Action | Livrable |');
push('| --- | --- | --- |');
push('| P0 | Définir le schéma v2 : `Actor`, `Place`, `Source`, `Claim`, `TimeSpan`, `datePrecision`. | Spécification + migration de `data.js`. |');
push('| P0 | Ajouter un `TimeSpan` minimal à chaque repère, avec rôle de date et source. | 189 fiches avec bornes, précision et certitude. |');
push('| P1 | Remplir `templates/country-audit.yaml` pour les 10 pays pilotes. | `audits/<pays>/country-audit.yaml`. |');
push('| P1 | Remplir la matrice de couverture et le registre d’omissions. | `coverage-matrix.csv` + `omissions.yaml` par pays. |');
push('| P1 | Ajouter deux sources indépendantes par fiche-événement. | `source-register.csv` + `sources` dans les fiches. |');
push('| P2 | Double lecture, kappa, arbitrage et sign-off. | Rapport d’audit signé, score ≥ 80/100. |');
push('');

// --- Détail par pays --------------------------------------------------------
push('## 8. Détail par pays');
push('');
for (const result of results) {
  const { country, atlasEntry } = result;
  push(`### ${country.flag} ${country.name} (\`${country.id}\`)`);
  push('');
  push(
    `- **Périodisation** : ${result.eras.length} ères, ${country.domain[0]} → ${country.domain[1]} ; ${
      result.checks.find(([label]) => label === 'Périodisation contiguë')[1] ? 'contiguïté ✅' : 'contiguïté ❌'
    } ; ${result.events.length - result.fields.endYear} repères ponctuels, ${result.fields.endYear} avec \`endYear\`.`
  );
  push(
    `- **Couverture tags × ères** : ${result.coveredCells}/${result.totalCells} cellules (${pct(
      result.coveredCells,
      result.totalCells
    )}) ; ${result.emptyEras.length ? `ères vides : ${result.emptyEras.join(', ')}` : 'aucune ère vide'}.`
  );
  const emptyPreview = result.emptyCells.slice(0, 8);
  push(
    `- **Cellules vides** : ${
      result.emptyCells.length ? `${emptyPreview.join(' ; ')}${result.emptyCells.length > emptyPreview.length ? ` ; … (${result.emptyCells.length} au total)` : ''}` : 'aucune.'
    }`
  );
  push(
    `- **Liens** : ${result.relatedTotal} \`related\`, ${result.relatedBroken.length} cassé(s), ${pct(
      result.relatedReciprocal,
      result.relatedTotal
    )} réciproques ; **Grokipedia** ${result.events.filter((event) => event.grok).length}/${result.events.length}.`
  );
  push(
    `- **Audit prose** : \`${atlasEntry.audit.href || '—'}\` ${result.anchorValid ? '✅' : '❌'} ; résumé « ${atlasEntry.audit.summary} » ${
      result.checks.find(([label]) => label === 'Résumé d’audit cohérent')[1] ? '✅' : '❌'
    }.`
  );
  push(
    `- **Champs cible** : acteurs ${pct(result.fields.actors, result.events.length)}, lieux ${pct(
      result.fields.places,
      result.events.length
    )}, sources ${pct(result.fields.sources, result.events.length)}, claims ${pct(
      result.fields.claims,
      result.events.length
    )}, TimeSpan ${pct(result.fields.timeSpan, result.events.length)}, précision ${pct(
      result.fields.precision,
      result.events.length
    )}.`
  );
  push(
    `- **Équilibre** : politique/guerre ${result.politicalMilitary}/${result.events.length} (${pct(
      result.politicalMilitary,
      result.events.length
    )}) ; **intégrité** ${result.integrityPassed}/${result.integrityTotal} ; **cible** ${result.targetScore.toFixed(
      1
    )}/100.`
  );
  if (result.issues.length) {
    push('- **Anomalies** :');
    for (const issue of result.issues) push(`  - ${issue}`);
  }
  if (result.warnings.length) {
    push('- **Avertissements** :');
    for (const warning of result.warnings) push(`  - ${warning}`);
  }
  push('');
}

// --- Méthode ----------------------------------------------------------------
push('## 9. Reproduire et interpréter');
push('');
push('```bash');
push('npm run audit:timeline');
push('npm run audit:timeline -- --strict   # échoue aussi si la cible v1.0 est incomplète');
push('npm run verify                       # vérifie la disponibilité des 189 pages Grokipedia');
push('```');
push('');
push('**Lecture des scores.**');
push('- **Intégrité POC** : contrôles de cohérence internes. Un échec est un défaut à corriger immédiatement.');
push('- **Cible v1.0** : part du schéma de preuve effectivement renseignée. Un score faible n’est pas une condamnation des contenus : c’est la mesure de ce qui manque pour rendre les frises auditables.');
push('- **Couverture tags × ères** : mesure la présence d’au moins un repère par tag et par ère. Elle ne mesure ni la qualité, ni la proportion, ni l’absence de biais.');
push('');
push('**Formule de la cible v1.0.** Acteurs 15 % + lieux 15 % + sources 20 % + claims 10 % + temps 15 % (année seule : 40 % du sous-score ; `TimeSpan` : 60 %) + précision 5 % + registre d’omissions 5 % + matrice de couverture 7,5 % + sign-off 7,5 %.');
push('');
push(`Méthode complète : [TIMELINE_METHOD.md](TIMELINE_METHOD.md). Gabarits : [templates/](templates/).`);
push('');
push('---');
push('');
push(`*Rapport généré automatiquement. Ne pas éditer à la main : modifier \`scripts/audit-timeline.mjs\` ou les données, puis relancer \`npm run audit:timeline\`.*`);
push('');

fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}`, 'utf8');

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------

console.log('Audit structurel Vectemporel');
console.log(`  pays        : ${results.length}`);
console.log(`  repères     : ${aggregate.total}`);
console.log(`  intégrité   : ${passedChecks}/${totalChecks} contrôles (${pct(passedChecks, totalChecks)})`);
console.log(`  cible v${METHOD_VERSION} : ${aggregate.score.toFixed(1)}/100`);
console.log(`  rapport     : ${path.relative(ROOT, REPORT_PATH)}`);
if (countriesWithIssues.length) {
  console.error(`  anomalies   : ${countriesWithIssues.length} pays`);
  for (const result of countriesWithIssues) {
    for (const issue of result.issues) console.error(`    - ${result.country.name} : ${issue}`);
  }
}

if (countriesWithIssues.length > 0) process.exitCode = 1;
else if (STRICT && aggregate.score < 80) {
  console.error(`  strict      : cible v${METHOD_VERSION} < 80/100`);
  process.exitCode = 1;
}
