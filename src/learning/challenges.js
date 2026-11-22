/* Défis d'apprentissage 100 % locaux, déterministes, sans réseau.
 * Toutes les propositions viennent des données embarquées (récits, ruptures,
 * Chronas) et sont traçables. */
import { TRAILS } from '../data/trails.js';
import { TURNING_POINTS } from '../data/turning-points.js';
import { INTERVALS } from './srs.js';

export const LEARN_SEED = 20261121;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    let t = value += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/* Q1 — « En quelle année ... ? » : les propositions sont des années de
 * ruptures réelles, donc toutes plausibles et sourcées. */
export function yearQuiz({ seed = LEARN_SEED, count = 5 } = {}) {
  const random = mulberry32(seed);
  const years = TURNING_POINTS.points.map((point) => point.year);
  const questions = [];
  const picks = shuffle(TURNING_POINTS.points, random).slice(0, count);
  for (const point of picks) {
    const province = point.provinces[0];
    if (!province) continue;
    const distractors = shuffle(years.filter((year) => year !== point.year), random).slice(0, 3);
    questions.push({
      id: `year-${point.year}-${province}`,
      prompt: `En quelle année « ${province} » change-t-elle de souverain avec ${point.rulers} régions ?`,
      answer: point.year,
      options: shuffle([point.year, ...distractors], random),
      source: `Chronas CC BY-SA 4.0 · ${point.rulers} régions`,
    });
  }
  return questions;
}

/* Q2 — carte muette : les faits sont affichés, le nom est révélé après. */
export function silentQuestion(name, info, year) {
  if (!name || !info) return null;
  return {
    id: `silent-${name}-${year}`,
    prompt: `Quelle région a pour souverain « ${info.state ?? ''} », pour capitale « ${info.capital ?? ''} » et ${info.populationLabel ?? ''} habitants en ${year} ?`,
    answer: name,
    source: `Chronas CC BY-SA 4.0 · ${year}`,
  };
}

/* Q3 — activité quotidienne déduite des cartes SRS réellement révisées. */
export function srsHeatmap(srs, { days = 30, now = Date.now() } = {}) {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = Math.floor(now / dayMs) * dayMs;
  const counts = new Map();
  for (const card of Object.values(srs?.cards || {})) {
    const last = Number(card?.last);
    if (!Number.isFinite(last)) continue;
    const day = Math.floor(last / dayMs) * dayMs;
    if (day >= today - (days - 1) * dayMs && day <= today) {
      counts.set(day, (counts.get(day) || 0) + 1);
    }
  }
  const result = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = today - index * dayMs;
    result.push({ day, count: counts.get(day) || 0 });
  }
  return result;
}

/* Q4 — objectifs locaux, mesurables et sans classement. */
export function localGoals({ reviews = 0, trails = 0, centuries = 0 } = {}) {
  return [
    { id: 'reviews-10', label: '10 révisions', value: reviews, target: 10 },
    { id: 'reviews-50', label: '50 révisions', value: reviews, target: 50 },
    { id: 'reviews-100', label: '100 révisions', value: reviews, target: 100 },
    { id: 'trails-5', label: '5 jalons de récit', value: trails, target: 5 },
    { id: 'centuries-3', label: '3 siècles explorés', value: centuries, target: 3 },
  ].map((goal) => ({ ...goal, done: goal.value >= goal.target }));
}

/* Q5 — récits à trous : on masque la province de l'étape courante. */
export function trailFillQuestion(trailId, stepIndex = 0) {
  const trail = TRAILS.trails.find((item) => item.id === trailId) || TRAILS.trails[0];
  const index = Math.max(0, Math.min(stepIndex, trail.steps.length - 1));
  const step = trail.steps[index];
  const options = trail.steps.map((item) => item.province);
  const unique = [...new Set(options)];
  const wrong = shuffle(unique.filter((name) => name !== step.province), mulberry32(LEARN_SEED + index)).slice(0, 3);
  for (const point of TURNING_POINTS.points) {
    if (wrong.length >= 3) break;
    for (const name of point.provinces) {
      if (wrong.length >= 3) break;
      if (name !== step.province && !wrong.includes(name)) wrong.push(name);
    }
  }
  return {
    id: `fill-${trail.id}-${index}`,
    trailId: trail.id,
    stepIndex: index,
    year: step.year,
    prompt: `« ${step.title} » (${step.year}) : dans quelle province se déroule cette étape ?`,
    answer: step.province,
    options: shuffle([step.province, ...wrong], mulberry32(LEARN_SEED + index)),
    evidence: `${step.evidence.field} « ${step.evidence.value} » en ${step.year}`,
    source: 'Chronas CC BY-SA 4.0',
  };
}

export const LEARN_INTERVALS = INTERVALS;
