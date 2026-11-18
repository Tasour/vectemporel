/* Vue par défaut : chronologie linéaire et hiérarchique.
   Audit ATLAS-CHRONO : titres sémantiques, ancres uniques, recherche locale,
   provenance lisible et focus préservé. Aucune donnée n'est inventée.
   Refonte navigation C2 : repères de situation — voir
   UNIFIED_AUDIT/NAVIGATION/views/c2-orientation-atlas.md (C2-01 à C2-10). */
import { state, currentCountry, selectEra, selectEvent, set, goView } from '../domain/store.js';

const STYLE_ID = 'atlas-chronologie-css';
const NAV_STYLE_ID = 'nav-c2a';
const NAV_LIVE_ID = 'nav-c2a-live';
let navLiveNode = null;

/* Filtre propre à la vue : il ne modifie pas l'état partagé du store.
   Il survit aux reconstructions complètes du DOM opérées par la coque. */
const local = { query: '', tag: null };
let focusIntent = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* Bloc de style unique, injecté dans un `stage` lui-même reconstruit à chaque
   rendu (shell.js:137) : aucune règle de styles.css n'est modifiée. */
function injectStyle(stage) {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.atlas-chrono-h1 { margin:0 0 6px; font-family:var(--serif); font-size:22px; font-weight:450; }
.atlas-chrono-hint { margin:-2px 0 14px; color:var(--muted-2); font-size:8px; }
.atlas-chrono-status { min-height:13px; margin:0 0 12px; color:var(--muted); font-size:9px; line-height:1.4; }
.atlas-chrono-era-nav { margin-bottom:14px; }
.atlas-chrono-era-list { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:5px; }
.atlas-chrono-era-list > li { display:flex; flex:1 1 116px; min-width:0; }
.era-band.atlas-chrono-band { display:flex; flex-direction:column; gap:3px; width:100%; min-height:48px; }
.atlas-chrono-era-range { color:var(--muted); font-size:8px; font-variant-numeric:tabular-nums; }
.era-band[aria-current="true"] { border-color:var(--gold); color:var(--ink); box-shadow:inset 0 -2px var(--era); }
.atlas-chrono-tools { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
.atlas-chrono-search {
  flex:1 1 220px; min-width:180px; min-height:36px; padding:7px 10px;
  border:1px solid var(--line); border-radius:8px;
  background:var(--surface-2); color:var(--ink); font:inherit; font-size:11px;
}
.atlas-chrono-search::placeholder { color:var(--muted-2); }
.atlas-chrono-tag {
  min-height:30px; padding:4px 10px; border:1px solid var(--line); border-radius:999px;
  background:transparent; color:var(--muted); font-size:9px; cursor:pointer;
}
.atlas-chrono-tag[aria-pressed="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.1); }
.atlas-chrono-count { color:var(--muted-2); font-size:9px; font-variant-numeric:tabular-nums; }
.event-list.atlas-chrono-events { list-style:none; margin:0; padding:0; }
.event-list.atlas-chrono-events > li { display:flex; min-width:0; }
.event-card { width:100%; }
.event-card[aria-current="true"] { border-color:var(--gold); box-shadow:0 0 0 1px rgba(230,185,111,.2); }
.atlas-chrono-card-era { padding:0 10px; color:var(--muted-2); font-size:8px; }
.atlas-chrono-tags { margin:8px 0 0; color:var(--muted-2); font-size:9px; }
.atlas-chrono-tags .atlas-chrono-tag { min-height:24px; margin-left:4px; padding:2px 7px; font-size:8px; }
.atlas-chrono-section-title { margin:16px 0 0; color:var(--ink-soft); font-family:var(--serif); font-size:14px; font-weight:450; }
.points.atlas-chrono-points { list-style:none; padding:0; }
.point-sources {
  list-style:none; margin:4px 0 0; padding:0; display:flex; flex-wrap:wrap;
  gap:4px 10px; color:var(--muted-2); font-size:8px; line-height:1.4;
}
.point-sources li::before { content:'↳ '; color:var(--gold); }
.atlas-chrono-empty {
  padding:14px; border:1px dashed var(--line); border-radius:8px;
  color:var(--muted); font-size:11px; line-height:1.5;
}
.atlas-chrono-empty button {
  min-height:32px; margin-top:8px; padding:0 10px; border:1px solid var(--line);
  border-radius:8px; background:transparent; color:var(--gold-bright);
  font-size:9px; cursor:pointer;
}
.era-band, .event-card, .atlas-chrono-tag { scroll-margin-block:60px; }
@media (max-width:620px) {
  .atlas-chrono-era-list > li { flex:1 1 45%; }
  .atlas-chrono-tools { flex-direction:column; align-items:stretch; }
  .atlas-chrono-search { width:100%; }
  .atlas-chrono-tags .atlas-chrono-tag { margin:4px 4px 0 0; }
}
@media (prefers-reduced-motion:reduce) {
  .era-band, .event-card, .atlas-chrono-tag { transition:none !important; }
}`;
  stage.appendChild(style);
}

/* C2 : bloc de style des repères de situation, injecté une seule fois dans
   <head> (qui survit au innerHTML de la coque) sans éditer styles.css. */
function injectNavStyle() {
  if (document.getElementById(NAV_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = NAV_STYLE_ID;
  style.textContent = `
.nav-c2-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.nav-c2-orientation{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.nav-c2-here{margin:0 0 5px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.nav-c2-trail{margin:0}
.nav-c2-trail-list{display:flex;flex-wrap:wrap;gap:2px;margin:0;padding:0;list-style:none;color:var(--muted);font-size:10px;line-height:1.6}
.nav-c2-trail-item{display:flex;gap:3px;min-width:0}
.nav-c2-sep{color:rgba(255,255,255,.28)}
.nav-c2-crumb.is-current{color:var(--gold-bright);font-weight:600}
.nav-c2-progress{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.nav-c2-back{min-height:30px;margin:7px 0 0;padding:3px 9px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.nav-c2-back:hover{border-color:var(--gold)}
.nav-c2-back:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.nav-c2-point-rank{margin-right:6px;color:var(--gold);font-size:8px;font-variant-numeric:tabular-nums}
@media (max-width:620px){.nav-c2-orientation{padding:7px 8px}.nav-c2-trail-list{font-size:9px}}`;
  document.head.appendChild(style);
}

/* C2-06 : région live locale unique, créée hors de #app pour survivre au
   innerHTML de la coque (shell.js:330) et rester annonçable. */
function ensureNavLive() {
  if (navLiveNode && navLiveNode.isConnected) return navLiveNode;
  navLiveNode = document.getElementById(NAV_LIVE_ID);
  if (!navLiveNode) {
    navLiveNode = el('p', 'nav-c2-sr-only');
    navLiveNode.id = NAV_LIVE_ID;
    navLiveNode.setAttribute('role', 'status');
    navLiveNode.setAttribute('aria-live', 'polite');
    navLiveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(navLiveNode);
  }
  return navLiveNode;
}

function navSay(message) {
  const node = ensureNavLive();
  if (node) node.textContent = message;
}

/* C2-03 : fil de situation local. Quatre entités plus le niveau « point »,
   en texte réel : le fil de la coque (shell.js:223-228) s'arrête au repère. */
function buildTrail(country, era, event, pointCount) {
  const nav = el('nav', 'nav-c2-trail');
  nav.id = 'nav-c2a-trail';
  nav.setAttribute('aria-label', 'Situation — pays, ère, repère, points');
  const ol = el('ol', 'nav-c2-trail-list');
  const crumbs = [
    ['Monde', false],
    [country?.name || 'Pays non sélectionné', false],
    [era?.name || 'Ère non sélectionnée', false],
    [event?.title || 'Repère non sélectionné', true],
    [`Points du repère (${pointCount})`, false],
  ];
  crumbs.forEach(([label, current], index) => {
    const li = el('li', 'nav-c2-trail-item');
    if (index) {
      const sep = el('span', 'nav-c2-sep', '›');
      sep.setAttribute('aria-hidden', 'true');
      li.appendChild(sep);
    }
    const node = el('span', `nav-c2-crumb${current ? ' is-current' : ''}`, label);
    if (current) node.setAttribute('aria-current', 'location');
    li.appendChild(node);
    ol.appendChild(li);
  });
  nav.appendChild(ol);
  return nav;
}

/* Facteur commune entre le rendu et l'annonce de filtrage (C2-06). */
function eventHaystack(item) {
  return [
    item.title, item.subtitle, item.summary, formatYear(item.year),
    ...(item.tags || []), ...(item.points || []).map((point) => point.text),
  ].filter(Boolean).join(' ').toLowerCase();
}

function filterEvents(country, eraEvents) {
  const query = local.query.trim().toLowerCase();
  const filtering = Boolean(query || local.tag);
  const scopeEvents = filtering ? country.events : eraEvents;
  const matched = scopeEvents.filter((item) => {
    if (local.tag && !(item.tags || []).includes(local.tag)) return false;
    if (!query) return true;
    return eventHaystack(item).includes(query);
  });
  return { filtering, scopeEvents, matched, query };
}

function announceFilter() {
  const country = currentCountry();
  if (!country) return;
  const { matched } = filterEvents(country, []);
  navSay(`Filtre : ${matched.length} repère(s) affiché(s) sur ${country.events.length}.`);
}

/* La coque reconstruisant tout le DOM, le focus est restauré explicitement
   vers le contrôle que l'utilisateur vient d'activer. */
function applyFocusIntent() {
  if (!focusIntent) return;
  const id = focusIntent;
  focusIntent = null;
  const target = document.getElementById(id);
  if (target && typeof target.focus === 'function') target.focus();
}

export function renderChronology(stage) {
  const country = currentCountry();
  if (!country) return;
  injectStyle(stage);
  injectNavStyle();
  ensureNavLive();

  const layout = el('div', 'chronology-layout');
  layout.dataset.countryId = country.id;
  layout.dataset.view = 'chronology';

  const main = el('section', 'chronology-main');
  main.id = 'atlas-chrono-main';
  main.setAttribute('aria-labelledby', 'atlas-chrono-title');
  const aside = el('aside', 'chronology-aside');
  aside.id = 'atlas-chrono-aside';
  aside.setAttribute('aria-label', 'Fiche du repère');

  /* ATLAS-CHRONO-01 + C2-01/-02 : hiérarchie h1 → h2 → h3, ancres uniques,
     titre situé par le pays courant (libellé aligné sur shell.js:14). */
  const h1 = el('h1', 'view-title atlas-chrono-h1', `Chronologie · ${country.name}`);
  h1.id = 'atlas-chrono-title';
  main.appendChild(h1);
  main.appendChild(el('p', 'view-lede', 'Une seule ère à la fois. Les bandes gardent le contexte, la fiche donne les points vérifiés.'));
  main.appendChild(el('p', 'atlas-chrono-hint', 'Clavier : → repère suivant · ↑ ère précédente · ↓ ère suivante · Entrée détail · ? aide.'));

  const eraIndex = Math.max(0, Math.min(country.eras.length - 1, state.eraIndex));
  const era = country.eras[eraIndex] || null;
  const eraEvents = country.events.filter((item) => item.eraId === era?.id);
  const event = country.events[state.eventIndex] || null;
  const posInEra = event ? eraEvents.findIndex((item) => item.id === event.id) + 1 : 0;

  /* ATLAS-CHRONO-06 + C2-04/-06 : la recherche porte sur les textes des points,
     donc sur les 901 points réels ; sans filtre, la vue reste ère par ère.
     Le filtrage est factorisé pour servir le rendu et l'annonce live. */
  const { filtering, scopeEvents, matched } = filterEvents(country, eraEvents);

  /* ATLAS-CHRONO-08 + C2-06 : bande de statut visible (texte), sans
     role=status : les annonces locales passent par #nav-c2a-live et les
     annonces de navigation restent à la région de shell.js:73. */
  const status = el('p', 'atlas-chrono-status');
  status.id = 'atlas-chrono-status';
  const scopeLabel = filtering
    ? `Recherche dans les ${country.events.length} repères de ${country.name}`
    : era
      ? `Ère ${eraIndex + 1}/${country.eras.length} · ${era.name} (${formatYear(era.start)} → ${formatYear(era.end)})`
      : 'Aucune ère documentée pour ce pays';
  status.textContent = `${scopeLabel}. ${matched.length} repère(s) affiché(s) sur ${scopeEvents.length}${filtering ? ' dans le périmètre de recherche' : ''}.`
    + (posInEra ? ` Repère ${posInEra}/${eraEvents.length} dans l'ère · rang global ${state.eventIndex + 1}/${country.events.length}.` : '');
  main.appendChild(status);

  /* C2-03/-04/-07/-08/-09 : bloc de situation visible en permanence, avant
     tout contrôle : fil, progression complète et retour explicite. */
  const orientation = el('div', 'nav-c2-orientation');
  orientation.appendChild(el('p', 'nav-c2-here', 'Vous êtes ici'));
  orientation.appendChild(buildTrail(country, era, event, event?.points.length || 0));
  const progress = el('p', 'nav-c2-progress');
  progress.id = 'nav-c2a-progress';
  progress.textContent = era
    ? `Ère ${eraIndex + 1}/${country.eras.length} · ${era.name} (${formatYear(era.start)} → ${formatYear(era.end)}) · repère ${posInEra}/${eraEvents.length} dans l'ère · rang global ${state.eventIndex + 1}/${country.events.length} · points du repère ${event?.points.length || 0}.`
    : `Aucune ère documentée pour ${country.name}. Choisissez un repère pour afficher ses points.`;
  orientation.appendChild(progress);
  const back = el('button', 'nav-c2-back', '← Retour au monde');
  back.type = 'button';
  back.id = 'nav-c2a-back';
  back.setAttribute('aria-keyshortcuts', 'Escape');
  back.addEventListener('click', () => goView('globe'));
  orientation.appendChild(back);
  main.appendChild(orientation);

  /* ATLAS-CHRONO-02 : nav sémantique, période en texte visible, état aria-current. */
  const nav = el('nav', 'atlas-chrono-era-nav');
  nav.id = 'atlas-chrono-eras';
  nav.setAttribute('aria-label', `Ères de ${country.name}`);
  const bands = el('ol', 'atlas-chrono-era-list');
  country.eras.forEach((item, index) => {
    const li = el('li');
    const band = el('button', `era-band atlas-chrono-band${index === eraIndex ? ' is-active' : ''}`);
    band.type = 'button';
    band.id = `era-${item.id}`;
    band.dataset.eraId = item.id;
    band.dataset.start = String(item.start);
    band.dataset.end = String(item.end);
    if (index === eraIndex) band.setAttribute('aria-current', 'true');
    band.setAttribute('aria-controls', 'atlas-chrono-events');
    band.title = `${formatYear(item.start)} → ${formatYear(item.end)}`;
    band.style.setProperty('--era', item.color);
    band.append(
      el('span', '', item.name),
      el('span', 'atlas-chrono-era-range', `${formatYear(item.start)} → ${formatYear(item.end)}`)
    );
    band.addEventListener('click', () => {
      focusIntent = `era-${item.id}`;
      selectEra(index);
      navSay(`Ère ${item.name} : ${country.events.filter((candidate) => candidate.eraId === item.id).length} repères.`);
    });
    li.appendChild(band);
    bands.appendChild(li);
  });
  nav.appendChild(bands);
  main.appendChild(nav);

  /* ATLAS-CHRONO-06 : outils locaux, sans réseau ni état global. */
  const tools = el('div', 'atlas-chrono-tools');
  tools.id = 'atlas-chrono-tools';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'atlas-chrono-search';
  search.className = 'atlas-chrono-search';
  search.placeholder = 'Rechercher un repère, une année, un thème…';
  search.setAttribute('aria-label', 'Rechercher parmi les repères et les points de ce pays');
  search.setAttribute('aria-controls', 'atlas-chrono-events');
  search.value = local.query;
  search.addEventListener('input', () => {
    local.query = search.value;
    focusIntent = 'atlas-chrono-search';
    set({}, 'chrono-filter');
    announceFilter();
  });
  tools.appendChild(search);

  const allTags = [...new Set(country.events.flatMap((item) => item.tags || []))].sort();
  allTags.forEach((tag) => {
    const button = el('button', 'atlas-chrono-tag', tag);
    button.type = 'button';
    button.id = `tag-btn-${tag}`;
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', local.tag === tag ? 'true' : 'false');
    button.setAttribute('aria-controls', 'atlas-chrono-events');
    button.addEventListener('click', () => {
      local.tag = local.tag === tag ? null : tag;
      focusIntent = `tag-btn-${tag}`;
      set({}, 'chrono-filter');
      announceFilter();
    });
    tools.appendChild(button);
  });
  tools.appendChild(el('span', 'atlas-chrono-count', `${matched.length} / ${scopeEvents.length} repères`));
  main.appendChild(tools);

  /* ATLAS-CHRONO-03 : liste ordonnée, adressable, avec données indexables. */
  const list = el('ol', 'event-list atlas-chrono-events');
  list.id = 'atlas-chrono-events';
  list.setAttribute('aria-label', filtering
    ? `Repères filtrés de ${country.name}`
    : `Repères de l'ère ${era?.name || ''}`);
  if (!matched.length) {
    /* ATLAS-CHRONO-07 : état vide explicite, distinct filtre / ère vide. */
    const li = el('li');
    const empty = el('div', 'atlas-chrono-empty', filtering
      ? `Aucun repère ne correspond au filtre parmi les ${country.events.length} repères du pays.`
      : 'Aucun repère documenté pour cette ère.');
    empty.id = filtering ? 'nav-c2a-empty-filter' : 'nav-c2a-empty-era';
    if (filtering) {
      const reset = el('button', '', 'Réinitialiser le filtre');
      reset.type = 'button';
      reset.addEventListener('click', () => {
        local.query = '';
        local.tag = null;
        focusIntent = 'atlas-chrono-search';
        set({}, 'chrono-filter');
        announceFilter();
      });
      empty.appendChild(reset);
    }
    li.appendChild(empty);
    list.appendChild(li);
  } else {
    matched.forEach((item) => {
      const index = country.events.indexOf(item);
      const li = el('li');
      li.id = `event-${item.id}`;
      li.dataset.eventId = item.id;
      li.dataset.year = String(item.year);
      li.dataset.eraId = item.eraId;
      li.dataset.importance = String(item.importance);
      if ((item.tags || []).length) li.dataset.tags = item.tags.join(' ');

      const card = el('button', `event-card${index === state.eventIndex ? ' is-active' : ''}`);
      card.type = 'button';
      card.id = `event-btn-${item.id}`;
      card.dataset.eventId = item.id;
      card.setAttribute('aria-controls', 'atlas-chrono-aside');
      if (index === state.eventIndex) card.setAttribute('aria-current', 'true');

      const year = el('span', 'event-year', formatYear(item.year));
      const title = el('strong', '', item.title);
      const subtitle = el('span', 'event-subtitle', item.subtitle);
      if (item.image) {
        const img = el('img');
        img.src = item.image.src;
        img.alt = item.image.alt || item.title;
        card.appendChild(img);
      }
      card.append(year, title, subtitle);
      if (filtering) {
        const eraName = country.eras.find((candidate) => candidate.id === item.eraId)?.name;
        if (eraName) card.appendChild(el('span', 'atlas-chrono-card-era', eraName));
      }
      card.addEventListener('click', () => {
        focusIntent = `event-btn-${item.id}`;
        selectEvent(index);
      });
      li.appendChild(card);
      list.appendChild(li);
    });
  }
  main.appendChild(list);

  if (event) {
    /* C2-10 : un seul mécanisme de nommage par région. */
    aside.removeAttribute('aria-label');
    aside.setAttribute('aria-labelledby', 'atlas-chrono-event-title');
    aside.appendChild(el('div', 'aside-kicker', `Repère ${state.eventIndex + 1} / ${country.events.length}`));
    aside.appendChild(el('div', 'aside-kicker', `Ère ${eraIndex + 1} / ${country.eras.length}${posInEra ? ` · repère ${posInEra} / ${eraEvents.length} dans l'ère` : ''}`));

    const title = el('h2', 'aside-title', event.title);
    title.id = 'atlas-chrono-event-title';
    aside.appendChild(title);
    aside.appendChild(el('p', 'aside-year', `${formatYear(event.year)} · ${event.subtitle}`));

    if (event.image) {
      const img = el('img', 'aside-image');
      img.src = event.image.src;
      img.alt = event.image.alt || event.title;
      aside.appendChild(img);
      aside.appendChild(el('p', 'aside-credit', [event.image.credit, event.image.license].filter(Boolean).join(' · ')));
    }
    aside.appendChild(el('p', 'aside-summary', event.summary));

    /* ATLAS-CHRONO-09 : thèmes réels, jamais une relation causale inventée. */
    if ((event.tags || []).length) {
      const tagLine = el('p', 'atlas-chrono-tags', 'Thèmes :');
      event.tags.forEach((tag) => {
        const chip = el('button', 'atlas-chrono-tag', tag);
        chip.type = 'button';
        chip.id = `aside-tag-${tag}`;
        chip.dataset.tag = tag;
        chip.setAttribute('aria-pressed', local.tag === tag ? 'true' : 'false');
        chip.addEventListener('click', () => {
          local.tag = local.tag === tag ? null : tag;
          focusIntent = `aside-tag-${tag}`;
          set({}, 'chrono-filter');
          announceFilter();
        });
        tagLine.appendChild(chip);
      });
      aside.appendChild(tagLine);
    }

    /* ATLAS-CHRONO-01 et -05 : h3, tous les points, sources titrées sans lien. */
    const pointsTitle = el('h3', 'atlas-chrono-section-title', `Points du repère (${event.points.length})`);
    pointsTitle.id = 'atlas-chrono-points-title';
    aside.appendChild(pointsTitle);

    const points = el('ol', 'points atlas-chrono-points');
    points.setAttribute('aria-labelledby', 'atlas-chrono-points-title');
    if (!event.points.length) {
      const emptyPoints = el('li', 'atlas-chrono-empty', 'Aucun point documenté pour ce repère.');
      emptyPoints.id = 'nav-c2a-empty-points';
      points.appendChild(emptyPoints);
    } else {
      event.points.forEach((point, position) => {
        const item = el('li', 'point');
        item.id = `point-${event.id}-${position}`;
        item.dataset.pointId = point.id;
        item.dataset.kind = point.kind;
        item.dataset.confidence = point.confidence;

        const head = el('div', 'point-head');
        head.append(
          el('span', 'nav-c2-point-rank', `Point ${position + 1} / ${event.points.length}`),
          el('span', `point-kind is-${point.kind}`, point.kind),
          el('span', 'confidence', point.confidence)
        );
        item.appendChild(head);
        item.appendChild(el('p', '', point.text));

        if ((point.sources || []).length) {
          const sources = el('ul', 'point-sources');
          point.sources.forEach((sourceId) => {
            const source = (country.sources || []).find((candidate) => candidate.id === sourceId);
            const label = source && source.title ? `${sourceId} — ${source.title}` : sourceId;
            const line = el('li', '', label);
            line.dataset.sourceId = sourceId;
            if (source && source.authors) line.title = [source.authors, source.year].filter(Boolean).join(' · ');
            sources.appendChild(line);
          });
          item.appendChild(sources);
        }
        points.appendChild(item);
      });
    }
    aside.appendChild(points);

    /* ATLAS-CHRONO-08 : navigation aux bornes connues, focus sur la carte cible. */
    const buttons = el('div', 'aside-actions');
    const prev = el('button', '', '← Repère précédent');
    const next = el('button', '', 'Repère suivant →');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-controls', 'atlas-chrono-aside');
    next.setAttribute('aria-controls', 'atlas-chrono-aside');
    prev.disabled = state.eventIndex <= 0;
    next.disabled = state.eventIndex >= country.events.length - 1;
    prev.addEventListener('click', () => {
      const target = country.events[state.eventIndex - 1];
      if (target) focusIntent = `event-btn-${target.id}`;
      selectEvent(state.eventIndex - 1);
    });
    next.addEventListener('click', () => {
      const target = country.events[state.eventIndex + 1];
      if (target) focusIntent = `event-btn-${target.id}`;
      selectEvent(state.eventIndex + 1);
    });
    buttons.append(prev, next);
    aside.appendChild(buttons);
  } else {
    /* ATLAS-CHRONO-07 : l'aside n'est jamais un panneau vide. */
    const emptyKicker = el('div', 'aside-kicker', 'Aucun repère sélectionné');
    emptyKicker.id = 'nav-c2a-empty-kicker';
    aside.appendChild(emptyKicker);
    const emptyEvent = el('p', 'atlas-chrono-empty', 'Choisissez un repère dans la liste pour afficher ses points vérifiés.');
    emptyEvent.id = 'nav-c2a-empty-event';
    aside.appendChild(emptyEvent);
  }

  layout.append(main, aside);
  stage.appendChild(layout);
  applyFocusIntent();
}
