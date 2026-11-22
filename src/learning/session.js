/* Session de révision : entrelacement des types et priorité aux cartes dues. */
import { dueCards, reviewCard } from './srs.js';

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    let t = value += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function interleave(list, random) {
  const groups = new Map();
  for (const question of shuffle(list, random)) {
    if (!groups.has(question.type)) groups.set(question.type, []);
    groups.get(question.type).push(question);
  }
  const result = [];
  let added = true;
  while (added) {
    added = false;
    for (const group of groups.values()) {
      if (group.length) {
        result.push(group.shift());
        added = true;
      }
    }
  }
  return result;
}

export function createSession({
  pool, srs, seed = 20261121, limit = 10, now = Date.now(),
} = {}) {
  const random = mulberry32(seed);
  const byId = new Map(pool.map((question) => [question.id, question]));
  const learned = new Set(Object.keys(srs.cards));
  const due = new Set(dueCards(srs, now));

  const dueQuestions = [...due].map((id) => byId.get(id)).filter(Boolean);
  const newQuestions = pool.filter((question) => !learned.has(question.id));
  let ordered = [...interleave(dueQuestions, random), ...interleave(newQuestions, random)];

  if (ordered.length < limit) {
    const extras = shuffle(pool.filter((question) => !ordered.includes(question)), random);
    ordered = [...ordered, ...extras];
  }

  const questions = ordered.slice(0, limit);
  let position = 0;
  const results = [];

  return {
    seed,
    total: questions.length,
    current: () => questions[position] || null,
    questions: () => [...questions],
    answer(optionIndex) {
      const question = questions[position];
      if (!question) return null;
      const correct = optionIndex === question.answerIndex;
      reviewCard(srs, question.id, correct, now);
      results.push({ id: question.id, type: question.type, correct });
      position += 1;
      return { correct, answerIndex: question.answerIndex, question };
    },
    skip() {
      const question = questions[position];
      if (!question) return null;
      results.push({ id: question.id, type: question.type, correct: false });
      position += 1;
      reviewCard(srs, question.id, false, now);
      return question;
    },
    progress: () => ({
      position,
      total: questions.length,
      correct: results.filter((item) => item.correct).length,
      done: position >= questions.length,
    }),
    results: () => [...results],
  };
}
