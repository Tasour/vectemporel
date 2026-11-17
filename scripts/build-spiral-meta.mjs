#!/usr/bin/env node
/*
 * Vectemporel — génère spiral-meta.js à partir des dossiers pays.
 *
 * Associe les acteurs (period_ids) et les lieux (events) des dossiers
 * aux ères de data.js, pour alimenter la spirale narrative.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const COUNTRIES = ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt'];

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_DATA;
}

function parseYear(value) {
  if (value === null || value === undefined) return null;
  const matches = String(value).match(/-?\d{1,5}/g);
  if (!matches || matches.length === 0) return null;
  return Number(matches[0]);
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

const data = loadData();
const output = {};

for (const country of data.countries) {
  const auditPath = path.join(ROOT, 'audits', country.id, 'country-audit.yaml');
  if (!fs.existsSync(auditPath)) continue;
  const audit = YAML.parse(fs.readFileSync(auditPath, 'utf8'));
  const periods = (audit.periods || [])
    .map((period) => ({
      id: period.id,
      start: parseYear(period.start_edtf),
      end: parseYear(period.end_edtf),
    }))
    .filter((period) => period.start !== null && period.end !== null);
  const periodById = new Map(periods.map((period) => [period.id, period]));
  const eventById = new Map(country.events.map((event) => [event.id, event]));
  const eras = country.eras.map((era) => ({
    start: era.start,
    end: era.end,
    actors: [],
    places: [],
  }));

  const eraIndexForYear = (year) => {
    for (let i = 0; i < eras.length; i += 1) {
      if (year >= eras[i].start && (year < eras[i].end || (i === eras.length - 1 && year <= eras[i].end))) {
        return i;
      }
    }
    return -1;
  };

  for (const actor of audit.actors || []) {
    let bestIndex = -1;
    let bestOverlap = 0;
    for (const periodId of actor.period_ids || []) {
      const period = periodById.get(periodId);
      if (!period) continue;
      for (let i = 0; i < eras.length; i += 1) {
        const value = overlap(period.start, period.end, eras[i].start, eras[i].end);
        if (value > bestOverlap) {
          bestOverlap = value;
          bestIndex = i;
        }
      }
    }
    if (bestIndex >= 0 && eras[bestIndex].actors.length < 4) {
      eras[bestIndex].actors.push({
        id: actor.id,
        label: actor.label,
        type: actor.type || 'individual',
        roles: (actor.roles || []).slice(0, 2),
      });
    }
  }

  for (const place of audit.places || []) {
    const index = (place.events || [])
      .map((eventId) => eventById.get(eventId))
      .filter(Boolean)
      .map((event) => eraIndexForYear(event.year))
      .find((value) => value >= 0);
    if (index !== undefined && index >= 0 && eras[index].places.length < 4) {
      eras[index].places.push({
        id: place.id,
        label: place.label_current,
        hierarchy: place.hierarchy || '',
        functions: (place.functions || []).slice(0, 2),
      });
    }
  }

  output[country.id] = { eras };
}

const js = `/* Généré par scripts/build-spiral-meta.mjs — ne pas éditer à la main. */\nwindow.VECTEMPOREL_SPIRAL_META = ${JSON.stringify(output, null, 2)};\n`;
fs.writeFileSync(path.join(ROOT, 'spiral-meta.js'), js, 'utf8');
console.log(`spiral-meta.js généré : ${Object.keys(output).length} pays.`);
