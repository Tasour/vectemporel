/* Coque unique : barre, fil, rang, scène, pied. */
import { DATASET } from '../data/dataset.js';
import { state, currentCountry, currentEra, currentEvent } from '../domain/store.js';
import { renderGlobe } from '../views/globe.js';
import { renderChronology } from '../views/chronology.js';
import { renderRecit } from '../views/recit.js';
import { renderGeography } from '../views/geography.js';
import { renderConstellation } from '../views/constellation.js';

const TABS = [
  ['globe', 'Monde'],
  ['chronology', 'Chronologie'],
  ['recit', 'Récit'],
  ['geography', 'Géographie'],
  ['constellation', 'Constellation'],
];

let root = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function renderBar(parent) {
  const bar = el('header', 'shell-bar');
  const brand = el('div', 'shell-brand');
  brand.append(el('strong', '', 'V-ATLAS'), el('span', '', 'Vectemporel · données locales'));

  const tabs = el('nav', 'shell-tabs');
  TABS.forEach(([id, label], index) => {
    const button = el('button', `shell-tab${state.view === id ? ' is-active' : ''}`, `${index + 1} · ${label}`);
    button.type = 'button';
    button.addEventListener('click', () => {
      import('../domain/store.js').then(({ goView }) => goView(id));
    });
    tabs.appendChild(button);
  });

  const right = el('div', 'shell-actions');
  const help = el('button', 'shell-icon', '?');
  help.type = 'button';
  help.addEventListener('click', () => import('../domain/store.js').then(({ set }) => set({ helpOpen: !state.helpOpen }, 'help')));
  right.appendChild(help);
  bar.append(brand, tabs, right);
  parent.appendChild(bar);
}

function renderTrail(parent) {
  const country = currentCountry();
  const era = currentEra();
  const event = currentEvent();
  const trail = el('div', 'shell-trail');
  const parts = [
    ['Monde', 'globe'],
    [country?.name || '—', 'chronology'],
    [era?.name || '—', 'chronology'],
    [event?.title || '—', 'chronology'],
  ];
  parts.forEach(([label, view], index) => {
    if (index) trail.appendChild(el('span', 'sep', ' › '));
    const node = el('button', index === parts.length - 1 ? 'crumb is-current' : 'crumb', label);
    node.type = 'button';
    node.addEventListener('click', () => {
      if (index === 0) import('../domain/store.js').then(({ goView }) => goView('globe'));
      else if (index >= 2) import('../domain/store.js').then(({ goView }) => goView(view));
    });
    trail.appendChild(node);
  });
  if (country && event) {
    trail.appendChild(el('span', 'rank', `${state.eventIndex + 1} / ${country.events.length} · ${formatYear(event.year)}`));
  }
  parent.appendChild(trail);
}

function renderHelp(parent) {
  if (!state.helpOpen) return;
  const overlay = el('div', 'help-overlay');
  const sheet = el('div', 'help-sheet');
  sheet.appendChild(el('h2', '', 'Pilotage intégral au clavier'));
  const grid = el('div', 'help-grid');
  [
    ['1–5', 'changer de vue'],
    ['← →', 'repère ou point suivant'],
    ['↑ / ↓', 'période précédente / suivante'],
    ['Entrée', 'ouvrir le détail'],
    ['Espace', 'lecture ou périmètre'],
    ['Échap', 'retour au monde'],
    ['?', 'aide'],
  ].forEach(([key, label]) => {
    const row = el('div', 'help-row');
    row.append(el('kbd', '', key), el('span', '', label));
    grid.appendChild(row);
  });
  sheet.appendChild(grid);
  const note = el('p', '', 'Aucun lien externe : tous les points proviennent des audits locaux. Les degrés de certitude sont affichés dans le détail.');
  sheet.appendChild(note);
  overlay.appendChild(sheet);
  parent.appendChild(overlay);
}

function renderDetail(parent) {
  if (!state.detailOpen) return;
  const country = currentCountry();
  const event = currentEvent();
  if (!event) return;
  const overlay = el('div', 'help-overlay detail-overlay');
  const sheet = el('div', 'detail-sheet');
  sheet.appendChild(el('h2', '', event.title));
  sheet.appendChild(el('p', 'detail-year', `${formatYear(event.year)} · ${currentEra()?.name || ''}`));
  event.points.forEach((point) => {
    const row = el('div', 'detail-point');
    row.append(el('span', `point-kind is-${point.kind}`, point.kind), el('span', 'confidence', point.confidence));
    row.appendChild(el('p', '', point.text));
    if (point.sources.length) row.appendChild(el('small', '', `sources : ${point.sources.join(', ')}`));
    sheet.appendChild(row);
  });
  const actors = event.actors.map((actor) => actor.label).join(' · ');
  const places = event.places.map((place) => place.label).join(' · ');
  if (actors) sheet.appendChild(el('p', 'detail-meta', `Figures : ${actors}`));
  if (places) sheet.appendChild(el('p', 'detail-meta', `Lieux : ${places}`));
  if (country?.sources.length) {
    sheet.appendChild(el('p', 'detail-meta', `Registre local : ${country.sources.length} références documentées (titres affichés sans lien), dont ${country.sources.filter((source) => source.doi).length} DOI.`));
  }
  overlay.appendChild(sheet);
  parent.appendChild(overlay);
}

export function render() {
  if (!root) return;
  root.innerHTML = '';
  renderBar(root);
  renderTrail(root);
  const stage = el('main', 'shell-stage');
  root.appendChild(stage);
  if (state.view === 'globe') renderGlobe(stage);
  else if (!state.countryId) {
    stage.appendChild(el('div', 'empty-stage', 'Choisissez un pays sur le globe.'));
  } else if (state.view === 'chronology') renderChronology(stage);
  else if (state.view === 'recit') renderRecit(stage);
  else if (state.view === 'geography') renderGeography(stage);
  else renderConstellation(stage);
  const footer = el('footer', 'shell-footer');
  footer.append(
    el('span', '', '← → repère · ↑ ↓ période · 1–5 vues'),
    el('span', '', state.playing ? 'lecture en cours · Espace pour arrêter' : 'Entrée détail · ? aide')
  );
  root.appendChild(footer);
  renderHelp(root);
  renderDetail(root);
}

export function mount(element) {
  root = element;
  render();
}
