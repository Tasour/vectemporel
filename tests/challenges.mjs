#!/usr/bin/env node
/* Défis d'apprentissage : déterminisme, provenance et bornes. */
import {
  LEARN_SEED, localGoals, silentQuestion, srsHeatmap, trailFillQuestion, yearQuiz,
} from '../src/learning/challenges.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const quiz = yearQuiz();
check('cinq questions année', quiz.length === 5, `${quiz.length}`);
check('quatre propositions', quiz.every((q) => q.options.length === 4));
check('bonne réponse présente', quiz.every((q) => q.options.includes(q.answer)));
check('propositions distinctes', quiz.every((q) => new Set(q.options).size === 4));
check('source affichée', quiz.every((q) => /Chronas CC BY-SA 4\.0/.test(q.source)));
check('déterminisme du quiz', JSON.stringify(yearQuiz()) === JSON.stringify(quiz));
check('graine affichée', LEARN_SEED === 20261121);

const silent = silentQuestion('Berry', { state: 'FRK', capital: 'Bourges', populationLabel: '11 000' }, 1000);
check('carte muette masque le nom', !silent.prompt.includes('Berry'));
check('carte muette garde la réponse', silent.answer === 'Berry');
check('carte muette sourcée', /Chronas.*1000/.test(silent.source));

const now = Date.UTC(2026, 10, 22, 12);
const heat = srsHeatmap({ cards: { a: { last: now }, b: { last: now - 86400000 } } }, { now });
check('heatmap 30 jours', heat.length === 30);
check('heatmap compte les révisions', heat.at(-1).count === 1 && heat.at(-2).count === 1);
check('heatmap jours vides', heat.slice(0, -2).every((day) => day.count === 0));

const goals = localGoals({ reviews: 50, trails: 5, centuries: 2 });
check('cinq objectifs', goals.length === 5);
check('objectifs atteints', goals.filter((g) => g.done).length === 3, `${goals.filter((g) => g.done).length}`);
check('objectif non atteint', goals.find((g) => g.id === 'reviews-100').done === false);

const fill = trailFillQuestion('soie', 0);
check('récit à trous : réponse', fill.answer === 'Kashgar', fill.answer);
check('récit à trous : propositions', fill.options.length === 4 && fill.options.includes(fill.answer));
check('récit à trous : preuve', /XIO/.test(fill.evidence));
check('récit à trous : déterminisme', JSON.stringify(trailFillQuestion('soie', 0)) === JSON.stringify(fill));

console.log(failed ? `${failed} échec(s)` : 'Défis apprentissage OK.');
process.exit(failed ? 1 : 0);
