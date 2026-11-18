/* Vectemporel Atlas — point de composition (composition root).
 * M4 : la taxonomie ci-dessous est le catalogue sémantique PUBLIC de la navigation.
 * La coque (ui/shell.js) et le routeur (platform/keyboard.js) en sont la source
 * d'exécution ; ce catalogue en est le miroir adressable, documenté dans README.md.
 * app.js ne possède aucun état : il assemble les couches et expose window.VATLAS. */
import { mount, render } from './ui/shell.js';
import {
  subscribe, state, selectCountry, goView as setView,
} from './domain/store.js';
import { initKeyboard } from './platform/keyboard.js';
import { DATASET } from './data/dataset.js';

/* Version du modèle de navigation. Toute modification d'un libellé ou d'un
 * raccourci doit être répercutée ici, dans la coque, dans le routeur et dans
 * le README (voir UNIFIED_AUDIT/NAVIGATION/views/m4-taxonomie-atlas.md). */
export const TAXONOMY_VERSION = 'm4.1';

/* Catalogue ordonné macro → micro. `level` = profondeur dans le modèle mental,
 * `role` = la question que la vue rend visible. Figé : c'est un contrat. */
export const VIEW_TAXONOMY = Object.freeze([
  Object.freeze({ id: 'globe', label: 'Monde', digit: '1', letter: 'm', level: 1, role: 'Quels pays sont documentés ?' }),
  Object.freeze({ id: 'chronology', label: 'Chronologie', digit: '2', letter: 'c', level: 2, role: 'Quelles ères et quels repères ?' }),
  Object.freeze({ id: 'recit', label: 'Récit', digit: '3', letter: 'r', level: 3, role: 'Que disent les points vérifiés ?' }),
  Object.freeze({ id: 'geography', label: 'Géographie', digit: '4', letter: 'g', level: 4, role: 'Où se situent les lieux ?' }),
  Object.freeze({ id: 'constellation', label: 'Constellation', digit: '5', letter: 's', level: 5, role: 'Comment l’ensemble se synthétise-t-il ?' }),
  Object.freeze({ id: 'points', label: 'Points', digit: '6', letter: 'p', level: 6, role: 'Quels points vérifiés isoler ?' }),
]);

/* Lexique normatif : les mêmes termes que le README, exposés sans doublon. */
export const VOCABULARY = Object.freeze({
  pays: 'Une des 10 entrées documentées par les audits locaux.',
  ère: 'Période d’un pays, porteuse de repères.',
  repère: 'Événement daté rattaché à une ère ; 229 au total.',
  point: 'Assertion vérifiée isolée par ère et domaine ; 845 au total.',
  lieu: 'Repère géographique documenté, avec coordonnées locales.',
  certitude: 'Degré repris de l’audit : vérifié, certain, probable, contesté.',
  source: 'Référence du registre local, affichée sans lien externe.',
});

/* Table de navigation lisible par machine : jumeau de la table du README. */
const NAV_SHORTCUTS = Object.freeze([
  Object.freeze({ key: '1–5 / r c g s m', action: 'changer de vue', scope: 'partout' }),
  Object.freeze({ key: '← →', action: 'repère, point ou lieu précédent / suivant', scope: 'hors globe et modale' }),
  Object.freeze({ key: '↑ ↓', action: 'ère précédente / suivante ; en Récit et Géographie, comme ← →', scope: 'Chronologie / Constellation ; Récit / Géographie' }),
  Object.freeze({ key: 'Entrée', action: 'ouvrir le détail du repère', scope: 'hors globe et modale' }),
  Object.freeze({ key: 'Espace', action: 'lecture du récit / périmètre géographique', scope: 'Récit / Géographie' }),
  Object.freeze({ key: 'Échap', action: 'fermer l’aide ou le détail, puis revenir au Monde', scope: 'partout' }),
  Object.freeze({ key: '?', action: 'ouvrir / fermer l’aide', scope: 'partout' }),
]);

const BY_ID = new Map(VIEW_TAXONOMY.map((view) => [view.id, view]));
const BY_DIGIT = new Map(VIEW_TAXONOMY.map((view) => [view.digit, view.id]));
const BY_LETTER = new Map(VIEW_TAXONOMY.map((view) => [view.letter, view.id]));

/* Repli accent/casse pour accepter « Récit » comme « recit ». */
function fold(value) {
  return String(value ?? '').trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
const BY_LABEL = new Map(VIEW_TAXONOMY.map((view) => [fold(view.label), view.id]));

/* Forme canonique : id, chiffre, initiale ou libellé → identifiant unique. */
export function resolveView(input) {
  const key = String(input ?? '').trim();
  if (BY_ID.has(key)) return key;
  if (BY_DIGIT.has(key)) return BY_DIGIT.get(key);
  const lower = key.toLowerCase();
  if (BY_LETTER.has(lower)) return BY_LETTER.get(lower);
  return BY_LABEL.get(fold(key)) || null;
}

export function views() {
  return VIEW_TAXONOMY.map((view) => view.id);
}

export function isValidView(id) {
  return BY_ID.has(id);
}

export function viewInfo(id) {
  return BY_ID.get(id) || null;
}

export function shortcutFor(id) {
  const view = BY_ID.get(id);
  return view ? { digit: view.digit, letter: view.letter } : null;
}

export function viewForShortcut(key) {
  return resolveView(key);
}

export function shortcuts() {
  return NAV_SHORTCUTS.slice();
}

export function countries() {
  return DATASET.countries.map(({ id, code, name, events }) => ({
    id, code, name, events: events.length,
  }));
}

/* Situation sémantique : l'équivalent programmatique du fil et de l'annonce. */
export function position() {
  const info = BY_ID.get(state.view) || null;
  const country = DATASET.countries.find((item) => item.id === state.countryId) || null;
  const era = country?.eras?.[state.eraIndex] || null;
  const event = country?.events?.[state.eventIndex] || null;
  return {
    view: state.view,
    label: info?.label || state.view,
    level: info?.level ?? 0,
    role: info?.role || '',
    countryId: state.countryId,
    countryName: country?.name || null,
    eraName: era?.name || null,
    eventIndex: state.eventIndex,
    eventCount: country?.events.length || 0,
    eventTitle: event?.title || null,
    pointIndex: state.pointIndex,
    placeIndex: state.placeIndex,
  };
}

mount(document.getElementById('app'));
subscribe(render);
initKeyboard();

/* API publique stable : les membres historiques sont conservés, les autres
 * sont additifs. Les modules internes peuvent changer, ces noms non. */
window.VATLAS = {
  meta: DATASET.meta,
  taxonomyVersion: TAXONOMY_VERSION,
  taxonomy: VIEW_TAXONOMY,
  lexicon: VOCABULARY,
  views,
  isValidView,
  resolveView,
  viewInfo,
  shortcutFor,
  viewForShortcut,
  shortcuts,
  countries,
  position,
  getState: () => ({ ...state }),
  openCountry: (id) => Promise.resolve(selectCountry(String(id))),
  goView: (view) => {
    const id = resolveView(view);
    if (!id) return Promise.resolve(false);
    setView(id);
    return Promise.resolve(true);
  },
};
