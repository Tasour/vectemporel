/* Récit guidé : un point à la fois, construit uniquement depuis les audits. */
import { state, currentCountry, currentEvent, goView, set } from '../domain/store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

export function renderRecit(stage) {
  const country = currentCountry();
  const event = currentEvent();
  if (!country || !event) return;
  const point = event.points[state.pointIndex] || event.points[0];
  const layout = el('div', 'recit-layout');
  const media = el('div', 'recit-media');
  if (event.image) {
    const img = el('img');
    img.src = event.image.src;
    img.alt = event.image.alt || event.title;
    media.appendChild(img);
    if (event.image.caption) media.appendChild(el('p', 'media-caption', event.image.caption));
  } else {
    media.appendChild(el('div', 'media-empty', 'Aucune image vérifiée pour ce repère.'));
  }
  const body = el('div', 'recit-body');
  body.appendChild(el('div', 'view-kicker', `Étape ${state.pointIndex + 1} / ${event.points.length} · ${point?.kind || 'point'}`));
  body.appendChild(el('h1', 'recit-title', point?.text || event.title));
  body.appendChild(el('p', 'recit-meta', `${event.title} · ${formatYear(event.year)} · ${point?.confidence || ''}`));
  body.appendChild(el('p', 'recit-context', event.summary));
  if (point?.sources.length) body.appendChild(el('p', 'recit-sources', `Sources du point : ${point.sources.join(', ')}`));
  const actions = el('div', 'recit-actions');
  const back = el('button', '', '← Point précédent');
  const next = el('button', '', 'Point suivant →');
  const chrono = el('button', '', 'Chronologie');
  [back, next, chrono].forEach((button) => { button.type = 'button'; });
  back.addEventListener('click', () => set({ pointIndex: Math.max(0, state.pointIndex - 1) }, 'point'));
  next.addEventListener('click', () => set({ pointIndex: Math.min(event.points.length - 1, state.pointIndex + 1) }, 'point'));
  chrono.addEventListener('click', () => goView('chronology'));
  actions.append(back, next, chrono);
  body.appendChild(actions);
  body.appendChild(el('p', 'recit-note', 'Lecture automatique : Espace. Aucun texte n’est généré : les points proviennent des audits.'));
  layout.append(media, body);
  stage.appendChild(layout);
}
