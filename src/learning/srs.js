/* Répétition espacée locale (Leitner 5 boîtes), sans réseau ni horodatage figé. */
const STORAGE_KEY = 'vectemporel-srs-v1';
const DAY = 24 * 60 * 60 * 1000;
export const INTERVALS = Object.freeze([1, 3, 7, 16, 35]);

const EMPTY = () => ({
  cards: {},
  stats: { reviews: 0, correct: 0, streak: 0, bestStreak: 0 },
});

function safeParse(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.cards || typeof data.cards !== 'object') return EMPTY();
    return {
      cards: data.cards,
      stats: { ...EMPTY().stats, ...(data.stats || {}) },
    };
  } catch {
    return EMPTY();
  }
}

export function loadSrs(storage = globalThis.localStorage) {
  if (!storage) return EMPTY();
  try { return safeParse(storage.getItem(STORAGE_KEY)); } catch { return EMPTY(); }
}

export function saveSrs(state, storage = globalThis.localStorage) {
  if (!storage) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ }
}

export function resetSrs(storage = globalThis.localStorage) {
  if (!storage) return EMPTY();
  try { storage.removeItem(STORAGE_KEY); } catch { /* stockage indisponible */ }
  return EMPTY();
}

export function reviewCard(state, id, correct, now = Date.now()) {
  const current = state.cards[id] || { box: 0, due: now, seen: 0 };
  const box = correct ? Math.min(current.box + 1, INTERVALS.length - 1) : 0;
  const due = now + INTERVALS[box] * DAY;
  state.cards[id] = {
    box,
    due,
    seen: (current.seen || 0) + 1,
    last: now,
  };
  state.stats.reviews += 1;
  if (correct) {
    state.stats.correct += 1;
    state.stats.streak += 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
  } else {
    state.stats.streak = 0;
  }
  return state;
}

export function dueCards(state, now = Date.now()) {
  return Object.entries(state.cards)
    .filter(([, card]) => Number(card.due) <= now)
    .map(([id]) => id);
}

export function srsSummary(state, now = Date.now()) {
  const cards = Object.values(state.cards);
  return {
    cards: cards.length,
    due: dueCards(state, now).length,
    mastered: cards.filter((card) => card.box >= INTERVALS.length - 1).length,
    ...state.stats,
  };
}
