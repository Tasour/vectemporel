/* Générateur de questions d'apprentissage à partir des snapshots Chronas locaux.
 * Chaque question porte sa source et son année : aucun fait n'est inventé. */
import { CHRONAS_MAP } from '../data/chronas-map.js';
import { CHRONAS_LABELS } from '../data/chronas-labels.js';
import { CHRONAS_EPICS } from '../data/chronas-epics.js';

const YEAR = CHRONAS_MAP.meta.referenceYear || 1000;
const AREAS = Object.entries(CHRONAS_MAP.areas || {});
const EPICS = (CHRONAS_EPICS.epics || []).filter((epic) => epic[1] && Number.isFinite(epic[2]));

export const QUESTION_TYPES = Object.freeze([
  { id: 'capital', label: 'Capitales' },
  { id: 'ruler', label: 'Souverains' },
  { id: 'culture', label: 'Cultures' },
  { id: 'religion', label: 'Religions' },
  { id: 'epic', label: 'Événements' },
]);

function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(36);
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    let t = value += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistractors(answer, candidates, random, count = 3) {
  const pool = [...candidates].filter((value) => value !== answer);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, count);
}

function formatYear(year) {
  if (year < 0) return `${Math.abs(year)} av. J.-C.`;
  if (year === 0) return 'an 0';
  return `${year} apr. J.-C.`;
}

function localized(dimension, code) {
  if (!code) return '';
  return CHRONAS_LABELS.names[dimension]?.[code] || code;
}

function answerSets() {
  const sets = { capital: new Set(), ruler: new Set(), culture: new Set(), religion: new Set() };
  for (const [, row] of AREAS) {
    if (!Array.isArray(row)) continue;
    if (row[3]) sets.capital.add(String(row[3]));
    const ruler = localized('ruler', row[0]);
    const culture = localized('culture', row[1]);
    const religion = localized('religion', row[2]);
    if (ruler) sets.ruler.add(ruler);
    if (culture) sets.culture.add(culture);
    if (religion) sets.religion.add(religion);
  }
  return sets;
}

const SETS = answerSets();
const EPIC_YEARS = new Set(EPICS.map((epic) => formatYear(epic[2])));

function makeQuestion({ type, key, prompt, answer, candidates, source, year = YEAR }) {
  if (!answer || candidates.size < 4) return null;
  const random = mulberry32(Number.parseInt(hash(`${type}|${key}|${year}|${answer}`), 36) || 1);
  const options = [answer, ...pickDistractors(answer, candidates, random)];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [options[index], options[other]] = [options[other], options[index]];
  }
  return {
    id: hash(`${type}|${key}|${year}|${answer}`),
    type,
    prompt,
    options,
    answerIndex: options.indexOf(answer),
    year,
    source,
  };
}

let cached = null;

export function getQuestionPool() {
  if (cached) return cached;
  const questions = [];
  const fields = [
    { type: 'capital', index: 3, dimension: null, verb: 'Quelle était la capitale de' },
    { type: 'ruler', index: 0, dimension: 'ruler', verb: 'Quel était le souverain de' },
    { type: 'culture', index: 1, dimension: 'culture', verb: 'Quelle était la culture de' },
    { type: 'religion', index: 2, dimension: 'religion', verb: 'Quelle était la religion de' },
  ];

  for (const field of fields) {
    for (const [province, row] of AREAS) {
      if (!Array.isArray(row)) continue;
      const raw = row[field.index];
      const answer = field.dimension ? localized(field.dimension, raw) : String(raw || '');
      const question = makeQuestion({
        type: field.type,
        key: province,
        prompt: `${field.verb} ${province} en ${YEAR} ?`,
        answer,
        candidates: SETS[field.type],
        source: { dataset: 'Chronas', field: field.type, province, year: YEAR },
      });
      if (question) questions.push(question);
    }
  }

  for (const epic of EPICS) {
    const answer = formatYear(epic[2]);
    const question = makeQuestion({
      type: 'epic',
      key: epic[0] || epic[1],
      prompt: `En quelle année a commencé « ${epic[1]} » ?`,
      answer,
      candidates: EPIC_YEARS,
      source: { dataset: 'Chronas', field: 'epic', id: epic[0] || epic[1], year: epic[2] },
      year: epic[2],
    });
    if (question) questions.push(question);
  }

  cached = questions;
  return cached;
}

export function poolStats() {
  const pool = getQuestionPool();
  const byType = {};
  for (const question of pool) byType[question.type] = (byType[question.type] || 0) + 1;
  return { total: pool.length, byType, year: YEAR };
}
