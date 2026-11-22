#!/usr/bin/env node
/* Contrôles déterministes des questions, du SRS et de la session. */
import {
  getQuestionPool, poolStats, loadSrs, saveSrs, resetSrs,
  reviewCard, srsSummary, createSession, dueCards,
} from '../src/learning/review.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const pool = getQuestionPool();
const stats = poolStats();
check('pool non vide', pool.length > 5000, `${pool.length} questions`);
check('5 types de questions', Object.keys(stats.byType).length === 5, JSON.stringify(stats.byType));
check('4 options partout', pool.every((q) => q.options.length === 4 && new Set(q.options).size === 4));
check('réponse valide', pool.every((q) => q.answerIndex >= 0 && q.answerIndex < 4 && q.options[q.answerIndex]));
check('source présente', pool.every((q) => q.source?.dataset === 'Chronas' && q.source?.field));
check('année de référence', stats.year === 1000, `${stats.year}`);

const again = getQuestionPool();
check('pool déterministe', again === pool || JSON.stringify(again[0]) === JSON.stringify(pool[0]));

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
let srs = resetSrs(storage);
const now = Date.UTC(2026, 10, 22);
srs = reviewCard(srs, pool[0].id, true, now);
check('carte Notée', srs.cards[pool[0].id].box === 1 && srs.cards[pool[0].id].seen === 1);
srs = reviewCard(srs, pool[0].id, true, now + 3 * 86400000);
check('progression boîte 2', srs.cards[pool[0].id].box === 2);
srs = reviewCard(srs, pool[0].id, false, now + 10 * 86400000);
check('retour boîte 1', srs.cards[pool[0].id].box === 0 && srs.stats.streak === 0);
saveSrs(srs, storage);
check('persistance', loadSrs(storage).cards[pool[0].id].box === 0);
check('summary', srsSummary(srs, now).reviews === 3, JSON.stringify(srsSummary(srs, now)));

srs = resetSrs(storage);
reviewCard(srs, pool[0].id, true, now - 5 * 86400000);
check('carte due', dueCards(srs, now).includes(pool[0].id));

const session = createSession({ pool, srs, seed: 20261121, limit: 10, now });
check('session 10 cartes', session.total === 10);
const sessionTypes = new Set(session.questions().map((question) => question.type));
check('session entrelacée', sessionTypes.size >= 3, [...sessionTypes].join(','));
check('carte due en premier', session.questions()[0].id === pool[0].id);
const first = session.current();
const answer = session.answer(first.answerIndex);
check('bonne réponse', answer.correct === true);
check('progression session', session.progress().position === 1 && session.progress().correct === 1);

console.log(failed ? `${failed} échec(s)` : 'Apprentissage OK.');
process.exit(failed ? 1 : 0);
