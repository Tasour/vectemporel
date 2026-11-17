/* Vue par défaut : chronologie linéaire et hiérarchique. */
import { state, currentCountry, selectEra, selectEvent, set } from '../domain/store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

export function renderChronology(stage) {
  const country = currentCountry();
  if (!country) return;
  const layout = el('div', 'chronology-layout');
  const main = el('section', 'chronology-main');
  const aside = el('aside', 'chronology-aside');

  main.appendChild(el('div', 'view-title', 'Chronologie'));
  main.appendChild(el('p', 'view-lede', 'Une seule ère à la fois. Les bandes gardent le contexte, la fiche donne les points vérifiés.'));

  const bands = el('div', 'era-bands');
  country.eras.forEach((era, index) => {
    const band = el('button', `era-band${index === state.eraIndex ? ' is-active' : ''}`, era.name);
    band.type = 'button';
    band.title = `${formatYear(era.start)} → ${formatYear(era.end)}`;
    band.style.setProperty('--era', era.color);
    band.addEventListener('click', () => selectEra(index));
    bands.appendChild(band);
  });
  main.appendChild(bands);

  const events = country.events.filter((event) => event.eraId === country.eras[state.eraIndex]?.id);
  const list = el('div', 'event-list');
  events.forEach((event) => {
    const index = country.events.indexOf(event);
    const card = el('button', `event-card${index === state.eventIndex ? ' is-active' : ''}`);
    card.type = 'button';
    const year = el('span', 'event-year', formatYear(event.year));
    const title = el('strong', '', event.title);
    const subtitle = el('span', 'event-subtitle', event.subtitle);
    card.append(year, title, subtitle);
    if (event.image) {
      const img = el('img');
      img.src = event.image.src;
      img.alt = event.image.alt || event.title;
      card.insertBefore(img, title);
    }
    card.addEventListener('click', () => selectEvent(index));
    list.appendChild(card);
  });
  main.appendChild(list);

  const event = country.events[state.eventIndex];
  if (event) {
    aside.appendChild(el('div', 'aside-kicker', `Repère ${state.eventIndex + 1} / ${country.events.length}`));
    aside.appendChild(el('h2', 'aside-title', event.title));
    aside.appendChild(el('p', 'aside-year', `${formatYear(event.year)} · ${event.subtitle}`));
    if (event.image) {
      const img = el('img', 'aside-image');
      img.src = event.image.src;
      img.alt = event.image.alt || event.title;
      aside.appendChild(img);
      aside.appendChild(el('p', 'aside-credit', [event.image.credit, event.image.license].filter(Boolean).join(' · ')));
    }
    aside.appendChild(el('p', 'aside-summary', event.summary));
    const points = el('div', 'points');
    event.points.slice(0, 8).forEach((point) => {
      const item = el('div', 'point');
      const head = el('div', 'point-head');
      head.append(el('span', `point-kind is-${point.kind}`, point.kind), el('span', 'confidence', point.confidence));
      item.appendChild(head);
      item.appendChild(el('p', '', point.text));
      if (point.sources.length) item.appendChild(el('small', '', `sources : ${point.sources.join(', ')}`));
      points.appendChild(item);
    });
    aside.appendChild(points);
    const buttons = el('div', 'aside-actions');
    const prev = el('button', '', '← Repère précédent');
    const next = el('button', '', 'Repère suivant →');
    prev.type = next.type = 'button';
    prev.addEventListener('click', () => selectEvent(state.eventIndex - 1));
    next.addEventListener('click', () => selectEvent(state.eventIndex + 1));
    buttons.append(prev, next);
    aside.appendChild(buttons);
  }

  layout.append(main, aside);
  stage.appendChild(layout);
}
