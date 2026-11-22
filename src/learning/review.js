/* Point d'entrée unique du mode révision, chargé à la demande. */
export { getQuestionPool, poolStats, QUESTION_TYPES } from './questions.js';
export { loadSrs, saveSrs, resetSrs, reviewCard, dueCards, srsSummary, INTERVALS } from './srs.js';
export { createSession } from './session.js';
