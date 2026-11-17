/* Vue Constellation optionnelle : figée, légendée, synchronisée à l'arbre. */
import { state, currentCountry, selectEra, selectEvent } from '../domain/store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

export function renderConstellation(stage) {
  const country = currentCountry();
  if (!country) return;
  const layout = el('div', 'constellation-layout');
  const legend = el('div', 'constellation-legend');
  legend.append(
    el('span', 'legend-sun', 'Ère'),
    el('span', 'legend-planet', 'Événement'),
    el('span', 'legend-moon', 'Point issu de l’audit')
  );
  layout.appendChild(legend);
  const field = el('div', 'constellation-field');
  country.eras.forEach((era, eraIndex) => {
    const sun = el('button', `const-sun${eraIndex === state.eraIndex ? ' is-active' : ''}`, era.name);
    sun.type = 'button';
    sun.style.setProperty('--era', era.color);
    sun.title = `${formatYear(era.start)} → ${formatYear(era.end)}`;
    sun.addEventListener('click', () => selectEra(eraIndex));
    field.appendChild(sun);
    if (eraIndex !== state.eraIndex) return;
    const events = country.events.filter((event) => event.eraId === era.id);
    events.forEach((event, planetIndex) => {
      const planet = el('button', `const-planet${country.events.indexOf(event) === state.eventIndex ? ' is-active' : ''}`, event.title);
      planet.type = 'button';
      planet.style.setProperty('--angle', `${planetIndex * 137.5}deg`);
      planet.style.setProperty('--radius', `${70 + planetIndex * 22}px`);
      planet.title = formatYear(event.year);
      planet.addEventListener('click', () => selectEvent(country.events.indexOf(event)));
      field.appendChild(planet);
    });
  });
  layout.appendChild(field);
  layout.appendChild(el('p', 'constellation-note', 'Vue optionnelle · aucune orbite animée · chaque lune est un point vérifié visible dans le détail.'));
  stage.appendChild(layout);
}
