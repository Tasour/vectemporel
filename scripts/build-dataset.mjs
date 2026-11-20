#!/usr/bin/env node
/* Génère vectemporel-atlas/src/data/dataset.js depuis les audits locaux.
 * Aucun contenu externe : ni Grokipedia, ni traduction, ni API distante.
 * Les « points » sont des affirmations extraites des résumés vérifiés et
 * des claims des dossiers d'audit, avec leurs sources et leur certitude.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OLD = path.join(ROOT, 'source');
const OUT = path.join(ROOT, 'src', 'data', 'dataset.js');
const IMG_OUT = path.join(ROOT, 'public', 'images');

const AUDIT_DIRS = {
  france: 'france', uk: 'uk', usa: 'usa', germany: 'germany', italy: 'italy',
  spain: 'spain', china: 'china', india: 'india', japan: 'japan', egypt: 'egypt',
};
const PREFIX = {
  france: 'fr', uk: 'uk', usa: 'us', germany: 'de', italy: 'it',
  spain: 'es', china: 'cn', india: 'in', japan: 'jp', egypt: 'eg',
};
/* Vocabulaire fermé : une seule graphie par concept, quelle que soit la source. */
const CONFIDENCE_ALIASES = Object.freeze({
  disputed: 'disputé', contesté: 'disputé', controversy: 'disputé',
  'non localisé': 'non documenté', uncertain: 'probable',
});
const normalizeConfidence = (value) => CONFIDENCE_ALIASES[String(value)] || String(value);

function loadWindow(file) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context.window;
}

function parseYear(value) {
  if (value === null || value === undefined) return null;
  const matches = String(value).match(/-?\d{1,5}/g);
  return matches?.length ? Number(matches[0]) : null;
}

function normalizeEventId(id, countryId) {
  const value = String(id || '');
  const match = value.match(/^PROP-(\d+)$/i);
  if (!match) return value.toLowerCase();
  return `${PREFIX[countryId] || 'xx'}-prop-${match[1].padStart(3, '0')}`;
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÝÉÈ])/)
    .map((part) => part.trim())
    .filter((part) => part.length > 25);
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if (char === '\n' && !quoted) {
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field) { row.push(field); rows.push(row); }
  const header = rows.shift() || [];
  return rows.filter((cells) => cells.length >= 2).map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] || ''])));
}

function eraIndexForYear(country, year) {
  for (let i = 0; i < country.eras.length; i += 1) {
    const era = country.eras[i];
    if (year >= era.start && (year < era.end || (i === country.eras.length - 1 && year <= era.end))) return i;
  }
  return -1;
}

const oldData = loadWindow(path.join(OLD, 'data.js')).VECTEMPOREL_DATA;
const oldImages = loadWindow(path.join(OLD, 'event-images.js')).VECTEMPOREL_EVENT_IMAGES || {};
const oldPlaces = loadWindow(path.join(OLD, 'place-atlas.js')).VECTEMPOREL_PLACES || {};
const oldOutlines = loadWindow(path.join(OLD, 'place-atlas.js')).VECTEMPOREL_OUTLINES || {};

fs.mkdirSync(IMG_OUT, { recursive: true });
const countries = [];

for (const country of oldData.countries) {
  const auditDir = AUDIT_DIRS[country.id];
  if (!auditDir) continue;
  const auditPath = path.join(OLD, 'audits', auditDir, 'country-audit.yaml');
  const csvPath = path.join(OLD, 'audits', auditDir, 'source-register.csv');
  const audit = fs.existsSync(auditPath) ? YAML.parse(fs.readFileSync(auditPath, 'utf8')) : {};
  const sourceRows = fs.existsSync(csvPath) ? csvRows(fs.readFileSync(csvPath, 'utf8')) : [];
  const sources = new Map(sourceRows.map((row) => [row.source_id, {
    id: row.source_id,
    type: row.type,
    title: row.title,
    authors: row.authors,
    year: row.year,
    publisher: row.publisher_or_journal,
    doi: row.doi || '',
    url: row.url || '',
    reliability: row.reliability,
    independence: row.independence,
    notes: row.notes,
  }]));

  const eras = country.eras.map((era, index) => ({
    id: `${country.id}-era-${index + 1}`,
    index,
    name: era.name,
    start: era.start,
    end: era.end,
    color: era.color,
  }));

  const auditActors = (audit.actors || []).map((actor) => ({
    id: `${country.id}-${String(actor.id || '').toLowerCase()}`,
    label: actor.label,
    type: actor.type || 'individual',
    roles: actor.roles || [],
    periodIds: actor.period_ids || [],
    places: actor.places || [],
    assessment: actor.assessment || '',
    memory: actor.memory || '',
    sources: actor.sources || [],
  }));
  const auditPlaces = (audit.places || []).map((place) => {
    const atlas = oldPlaces[country.id]?.[place.id] || {};
    return {
      id: `${country.id}-${String(place.id || '').toLowerCase()}`,
      label: place.label_current,
      historical: place.names_historical || [],
      hierarchy: place.hierarchy || '',
      functions: place.functions || [],
      contestations: place.contestations || [],
      eventIds: (place.events || []).map((id) => normalizeEventId(id, country.id)),
      lat: atlas.lat ?? null,
      lon: atlas.lon ?? null,
      source: atlas.source || null,
      sources: place.sources || [],
    };
  });
  const auditClaims = (audit.claims || []).map((claim) => ({
    id: `${country.id}-${String(claim.id || '').toLowerCase()}`,
    subject: claim.subject || '',
    predicate: claim.predicate || '',
    object: claim.object || '',
    text: claim.text || '',
    confidence: normalizeConfidence(claim.confidence || 'probable'),
    sources: claim.sources || [],
  }));

  const events = country.events.map((event) => {
    const eraIdx = eraIndexForYear(country, event.year);
    const era = eras[Math.max(0, eraIdx)];
    const image = oldImages[event.id];
    let imageOut = null;
    if (image?.src) {
      const sourcePath = path.join(OLD, image.src);
      const fileName = `${event.id}${path.extname(image.src)}`;
      const dest = path.join(IMG_OUT, fileName);
      if (fs.existsSync(sourcePath) && !fs.existsSync(dest)) fs.copyFileSync(sourcePath, dest);
      imageOut = {
        src: `public/images/${fileName}`,
        alt: image.alt || '',
        caption: image.caption || '',
        credit: image.credit || '',
        license: image.license || '',
        source: image.source || '',
      };
    }
    const matchingActors = auditActors.filter((actor) => {
      if (!actor.periodIds.length) return false;
      const labels = actor.periodIds.map((id) => (audit.periods || []).find((period) => period.id === id)?.label || '');
      return labels.includes(era.name);
    }).slice(0, 6);
    const matchingPlaces = auditPlaces.filter((place) => place.eventIds.includes(event.id)).slice(0, 6);
    const relatedClaims = auditClaims.filter((claim) => {
      const text = `${claim.subject} ${claim.object}`.toLowerCase();
      const title = event.title.toLowerCase();
      return text.includes(title) || title.includes(claim.subject.toLowerCase());
    });
    const points = [
      ...splitSentences(event.summary).map((sentence, index) => ({
        id: `${event.id}-point-${index + 1}`,
        kind: 'récit',
        text: sentence,
        confidence: 'vérifié',
        datePrecision: 'unknown',
        sources: [],
      })),
      ...relatedClaims.map((claim) => ({
        id: `${claim.id}-point`,
        kind: 'audit',
        text: claim.text,
        confidence: claim.confidence,
        datePrecision: 'unknown',
        sources: claim.sources,
      })),
      ...matchingActors.slice(0, 2).map((actor) => ({
        id: `${actor.id}-point`,
        kind: 'figure',
        text: actor.assessment || `${actor.label} : ${actor.roles.join(', ')}`,
        confidence: 'vérifié',
        datePrecision: 'unknown',
        sources: actor.sources,
      })),
      ...matchingPlaces.slice(0, 2).map((place) => ({
        id: `${place.id}-point`,
        kind: 'lieu',
        text: `${place.label} — ${place.functions.join(', ') || place.hierarchy || 'lieu documenté'}`,
        confidence: place.lat !== null ? 'vérifié' : 'non documenté',
        datePrecision: 'unknown',
        sources: place.sources,
      })),
    ];
    return {
      id: event.id,
      eraId: era.id,
      year: event.year,
      title: event.title,
      subtitle: event.subtitle || '',
      summary: event.summary || '',
      tags: event.tags || [],
      importance: event.importance || 1,
      image: imageOut,
      points,
      actors: matchingActors.map((actor) => ({ id: actor.id, label: actor.label, roles: actor.roles })),
      places: matchingPlaces.map((place) => ({
        id: place.id, label: place.label, lat: place.lat, lon: place.lon,
        hierarchy: place.hierarchy, functions: place.functions, contestations: place.contestations,
      })),
      related: [],
    };
  });

  const usedClaims = new Set(events.flatMap((event) => event.points.filter((p) => p.kind === 'audit').map((p) => p.id.replace(/-point$/, ''))));
  const countryClaims = auditClaims.filter((claim) => !usedClaims.has(claim.id));
  const outline = oldOutlines[country.id]?.rings || [];
  const mainRing = outline.reduce((best, ring) => (ring.length > best.length ? ring : best), outline[0] || []);
  const bounds = mainRing.length
    ? {
        minLon: Math.min(...mainRing.map((p) => p[0])),
        maxLon: Math.max(...mainRing.map((p) => p[0])),
        minLat: Math.min(...mainRing.map((p) => p[1])),
        maxLat: Math.max(...mainRing.map((p) => p[1])),
      }
    : null;

  countries.push({
    id: country.id,
    name: country.name,
    flag: country.flag || '',
    color: country.color || '#e6b96f',
    code: ({ france: 'FR', uk: 'GB', usa: 'US', germany: 'DE', italy: 'IT', spain: 'ES', china: 'CN', india: 'IN', japan: 'JP', egypt: 'EG' })[country.id] || '',
    domain: country.domain,
    outline: mainRing,
    bounds,
    eras,
    events,
    actors: auditActors,
    places: auditPlaces,
    claims: countryClaims,
    sources: [...sources.values()],
    omissions: audit.coverage?.known_omissions || [],
    audit: {
      verdict: audit.audit?.verdict || 'pending',
      blocked: Boolean(audit.audit?.blocking_errors?.length),
      signoff: audit.audit?.signoff || null,
      historiography: audit.historiography || {},
    },
  });
}

const dataset = {
  meta: {
    name: 'Vectemporel',
    system: 'Vectemporel',
    version: '0.1.0',
    generated: new Date().toISOString().slice(0, 10),
    source: 'audits locaux + data.js curaté',
    externalLinks: false,
    countries: countries.length,
    events: countries.reduce((sum, country) => sum + country.events.length, 0),
    points: countries.reduce((sum, country) => sum + country.events.reduce((n, event) => n + event.points.length, 0), 0),
  },
  countries,
};
fs.writeFileSync(OUT, `/* Généré par scripts/build-dataset.mjs — ne pas éditer. */\nexport const DATASET = ${JSON.stringify(dataset, null, 2)};\n`);
console.log(`${dataset.meta.events} repères, ${dataset.meta.points} points, ${countries.length} pays → src/data/dataset.js`);
