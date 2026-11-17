/* Géographie locale : contour du pays et lieux vérifiés, sans tuile distante. */
import { state, currentCountry, currentPlaces, set, goView } from '../domain/store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function project(point, bounds, width, height) {
  if (!bounds) return { x: width / 2, y: height / 2 };
  return {
    x: ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width,
    y: ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * height,
  };
}

export function renderGeography(stage) {
  const country = currentCountry();
  if (!country) return;
  const places = currentPlaces();
  const layout = el('div', 'geo-layout');
  const map = el('div', 'geo-map');
  const W = 900;
  const H = 620;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'geo-svg');
  if (country.outline.length) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', country.outline.map(([lon, lat]) => {
      const p = project({ lon, lat }, country.bounds, W, H);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' '));
    polygon.setAttribute('class', 'geo-outline');
    svg.appendChild(polygon);
  }
  places.forEach((place, index) => {
    const p = project(place, country.bounds, W, H);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `geo-marker${index === state.placeIndex ? ' is-active' : ''}`);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x.toFixed(1));
    circle.setAttribute('cy', p.y.toFixed(1));
    circle.setAttribute('r', index === state.placeIndex ? '7' : '4');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (p.x + 9).toFixed(1));
    label.setAttribute('y', (p.y + 3).toFixed(1));
    label.textContent = place.label;
    group.append(circle, label);
    group.addEventListener('click', () => set({ placeIndex: index }, 'place'));
    svg.appendChild(group);
  });
  map.appendChild(svg);
  map.appendChild(el('p', 'map-note', 'Carte schématique locale · coordonnées vérifiées · aucune tuile ni service externe.'));

  const panel = el('aside', 'geo-panel');
  panel.appendChild(el('div', 'view-kicker', `Lieu ${places.length ? state.placeIndex + 1 : 0} / ${places.length} · ${state.scope === 'era' ? 'repère' : 'pays'}`));
  const place = places[state.placeIndex];
  if (place) {
    panel.appendChild(el('h2', 'geo-title', place.label));
    if ((place.historical || []).length) panel.appendChild(el('p', 'geo-history', `Noms historiques : ${place.historical.join(' · ')}`));
    panel.appendChild(el('p', 'geo-functions', (place.functions || []).join(' · ') || place.hierarchy || 'Lieu documenté'));
    if ((place.contestations || []).length) panel.appendChild(el('p', 'geo-debate', `Mémoires : ${place.contestations.join(' · ')}`));
    panel.appendChild(el('p', 'geo-coords', `${place.lat?.toFixed(3)}, ${place.lon?.toFixed(3)}`));
    panel.appendChild(el('p', 'geo-source', place.source || 'Source de coordonnée non renseignée'));
  } else {
    panel.appendChild(el('p', '', 'Aucun lieu localisé pour ce périmètre.'));
  }
  const scope = el('button', '', state.scope === 'era' ? 'Voir tous les lieux du pays' : 'Revenir aux lieux du repère');
  scope.type = 'button';
  scope.addEventListener('click', () => set({ scope: state.scope === 'era' ? 'country' : 'era', placeIndex: 0 }, 'scope'));
  panel.appendChild(scope);
  const back = el('button', '', '← Chronologie');
  back.type = 'button';
  back.addEventListener('click', () => goView('chronology'));
  panel.appendChild(back);
  layout.append(map, panel);
  stage.appendChild(layout);
}
