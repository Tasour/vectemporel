import { register } from './registry.js';

/* Lentille E079 — « Narration et contexte historique, liens entre événements »
 * de la vue chronologie (vague CHRONOLOGIE, sous-agent E079).
 *
 * Dix chantiers E079-01..E079-10, tous implémentés ici. La lentille s'applique
 * après le rendu de chronology.js, qui appelle runEnhancements en fin de
 * fonction (chronology.js:539). Elle ne modifie ni la vue, ni le store, ni le
 * jeu de données : tous les récits et tous les liens sont DÉRIVÉS du DOM déjà
 * produit par la vue (cartes de repères, bandes d'ère, titre de l'aside).
 * Aucune causalité n'est inventée (chronology.js:441).
 *
 * Contrat respecté : un seul register('E079', ...), un seul appel à
 * ctx.css('chronology-e079', ...), identifiants uniques préfixés « e079 » avec
 * garde d'existence, français partout, zéro journalisation, zéro réseau, zéro
 * aléa, zéro boucle rAF, zéro timer. Le mode compact et la région live sont
 * conservés au niveau module pour survivre aux reconstructions du stage
 * opérées par la coque (chronology.js:30-32).
 */

const CSS_ID = 'chronology-e079';
const LIVE_ID = 'e079-live';

const CSS = `
.e079-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e079-block{margin:14px 0;padding:11px 12px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.02)}
.e079-h{margin:0 0 7px;color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.e079-prose{margin:5px 0;color:var(--muted);font-size:10px;line-height:1.6}
.e079-note{margin:6px 0 0;color:var(--muted-2);font-size:9px;font-style:italic;line-height:1.5}
.e079-link-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.e079-link{min-height:36px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-soft);font:inherit;font-size:10px;text-align:left;cursor:pointer}
.e079-link:hover,.e079-link:focus-visible{border-color:var(--gold);color:var(--gold-bright)}
.e079-link:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e079-frie-list{list-style:none;margin:0;padding:4px 0 8px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}
.e079-frie-list>li{flex:0 0 auto}
.e079-mark{min-height:36px;max-width:170px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:9px;line-height:1.35;text-align:left;cursor:pointer}
.e079-mark-year{display:block;color:var(--gold);font-size:8px;font-variant-numeric:tabular-nums}
.e079-mark[aria-current="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.e079-mark:hover{border-color:var(--line-strong);color:var(--ink)}
.e079-mark:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e079-status{margin:10px 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.e079-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
.e079-toggle{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.e079-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1)}
.e079-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e079-compact .e079-optional{display:none}
@media (max-width:620px){.e079-block{padding:9px 10px}.e079-link{max-width:100%}}
@media (prefers-reduced-motion:reduce){.e079-link,.e079-mark,.e079-toggle{transition:none!important}}
[data-e079-reduced="1"] .e079-link,[data-e079-reduced="1"] .e079-mark,[data-e079-reduced="1"] .e079-toggle{transition:none!important}
`;

let currentCtx = null;
let compact = false;
let liveNode = null;

/* Aucun chantier ne peut faire échouer un autre chantier ni le rendu. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

function make(tag, className, text) {
  if (currentCtx && typeof currentCtx.el === 'function') {
    return currentCtx.el(tag, className, text);
  }
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Calque local de formatYear (chronology.js:26-28), sans toucher à la vue. */
function formatYear(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'année non renseignée';
  return n < 0 ? `${Math.abs(n)} av. J.-C.` : String(n);
}

function clear(node) {
  if (!node) return;
  if (typeof node.replaceChildren === 'function') node.replaceChildren();
  else while (node.firstChild) node.removeChild(node.firstChild);
}

/* Garde d'existence : réutilise un nœud déjà présent, le déplace dans le
 * parent courant si besoin, ou le crée. Tous les ids sont préfixés e079. */
function ensure(parent, id, tag, className) {
  if (!parent || typeof parent.querySelector !== 'function') return null;
  let found = parent.querySelector(`#${id}`);
  if (!found) {
    found = document.getElementById(id);
    if (found && found.parentNode && found.parentNode !== parent) {
      parent.appendChild(found);
    }
  }
  if (!found) {
    found = make(tag, className);
    found.id = id;
    parent.appendChild(found);
  }
  return found;
}

/* Région live unique, hors du stage : elle survit au innerHTML de la coque,
 * comme #nav-c2a-live (chronology.js:119-138). */
function live() {
  if (liveNode && liveNode.isConnected) return liveNode;
  let found = document.getElementById(LIVE_ID);
  if (!found) {
    found = make('p', 'e079-sr-only');
    found.id = LIVE_ID;
    found.setAttribute('role', 'status');
    found.setAttribute('aria-live', 'polite');
    found.setAttribute('aria-atomic', 'true');
    document.body.appendChild(found);
  }
  liveNode = found;
  return liveNode;
}

function say(message) {
  const node = live();
  if (node) node.textContent = message;
}

function placeBefore(parent, node, selector) {
  if (!parent || !node) return;
  const anchor = parent.querySelector(selector);
  if (anchor && anchor !== node) parent.insertBefore(node, anchor);
}

function collect(ctx) {
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return null;

  const cards = Array.from(stage.querySelectorAll('#atlas-chrono-events > li[data-event-id]'))
    .map((li) => {
      const button = li.querySelector('button.event-card');
      if (!button) return null;
      const title = (button.querySelector('strong')?.textContent || '').trim()
        || 'Repère sans titre';
      return {
        li,
        button,
        id: li.dataset.eventId || '',
        year: Number(li.dataset.year),
        eraId: li.dataset.eraId || '',
        tags: (li.dataset.tags || '').split(/\s+/).filter(Boolean),
        title,
      };
    })
    .filter(Boolean);

  const eras = Array.from(stage.querySelectorAll('#atlas-chrono-eras button.era-band'))
    .map((band, index) => {
      const name = (band.querySelector('span')?.textContent || '').trim() || 'Ère sans nom';
      const range = (band.querySelector('.atlas-chrono-era-range')?.textContent || '').trim()
        || `${formatYear(band.dataset.start)} → ${formatYear(band.dataset.end)}`;
      return {
        band,
        index,
        id: band.dataset.eraId || '',
        start: Number(band.dataset.start),
        end: Number(band.dataset.end),
        name,
        range,
        current: band.getAttribute('aria-current') === 'true',
      };
    });

  const asideTitle = (stage.querySelector('#atlas-chrono-event-title')?.textContent || '').trim();
  const current = cards.find((item) => item.button.getAttribute('aria-current') === 'true')
    || cards.find((item) => item.button.classList.contains('is-active'))
    || (asideTitle ? cards.find((item) => item.title === asideTitle) : null)
    || null;
  const era = eras.find((item) => item.current)
    || eras.find((item) => current && item.id === current.eraId)
    || null;

  return {
    ctx,
    stage,
    layout: ctx.layout,
    main: stage.querySelector('#atlas-chrono-main'),
    aside: stage.querySelector('#atlas-chrono-aside'),
    cards,
    eras,
    current,
    era,
  };
}

function follow(entry, reason) {
  if (!entry || !entry.button || entry.button.disabled) return;
  entry.button.click();
  say(`Repère rejoint : ${entry.title} (${formatYear(entry.year)}). ${reason}.`);
}

/* E079-01 — récit situé du repère courant. */
function buildFil(m) {
  const box = ensure(m.aside, 'e079-fil', 'section', 'e079-block e079-fil');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-fil-title');
  box.appendChild(make('h3', 'e079-h', 'Récit du repère'));
  box.lastChild.id = 'e079-fil-title';
  placeBefore(m.aside, box, '#atlas-chrono-points-title');
  if (!m.current) {
    box.appendChild(make('p', 'e079-note',
      'Aucun repère sélectionné : le récit s’affichera dès qu’un repère est choisi.'));
    return;
  }
  const kickers = Array.from(m.aside.querySelectorAll('.aside-kicker'))
    .map((node) => (node.textContent || '').trim()).filter(Boolean);
  const eraText = m.era ? `« ${m.era.name} » (${m.era.range})` : 'une ère non documentée';
  const index = m.cards.indexOf(m.current);
  const previous = index > 0 ? m.cards[index - 1] : null;
  const next = index >= 0 && index < m.cards.length - 1 ? m.cards[index + 1] : null;
  let prose = `Ici : « ${m.current.title} » (${formatYear(m.current.year)}). Ce repère appartient à l’ère ${eraText}.`;
  if (kickers.length) prose += ` ${kickers.join(' · ')}.`;
  if (previous) prose += ` Dans l’ordre affiché, il vient après « ${previous.title} » (${formatYear(previous.year)}).`;
  if (next) prose += ` Il vient avant « ${next.title} » (${formatYear(next.year)}).`;
  box.appendChild(make('p', 'e079-prose', prose));
}

/* E079-02 — voisins chronologiques immédiats. */
function buildNeighbors(m) {
  const box = ensure(m.aside, 'e079-neighbors', 'section', 'e079-block e079-optional');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-neighbors-title');
  box.appendChild(make('h3', 'e079-h', 'Repères voisins'));
  box.lastChild.id = 'e079-neighbors-title';
  placeBefore(m.aside, box, '#atlas-chrono-points-title');
  if (!m.current) {
    box.appendChild(make('p', 'e079-note', 'Aucun voisin à afficher sans repère sélectionné.'));
    return;
  }
  const index = m.cards.indexOf(m.current);
  const list = make('ol', 'e079-link-list');
  const slots = [
    { item: index > 0 ? m.cards[index - 1] : null, label: 'Repère précédent', arrow: '← ' },
    { item: index >= 0 && index < m.cards.length - 1 ? m.cards[index + 1] : null, label: 'Repère suivant', arrow: '' },
  ];
  slots.forEach((slot) => {
    if (!slot.item) return;
    const li = make('li');
    const button = make('button', 'e079-link',
      `${slot.arrow}${formatYear(slot.item.year)} · ${slot.item.title}${slot.arrow ? '' : ' →'}`);
    button.type = 'button';
    button.setAttribute('aria-label',
      `${slot.label} : ${slot.item.title}, ${formatYear(slot.item.year)}`);
    button.addEventListener('click', () => follow(slot.item, 'lien de voisinage chronologique'));
    li.appendChild(button);
    list.appendChild(li);
  });
  if (!list.childNodes.length) {
    list.appendChild(make('li', 'e079-note', 'Aucun voisin visible dans la sélection courante.'));
  }
  box.appendChild(list);
  box.appendChild(make('p', 'e079-note',
    'Lien d’ordre chronologique : aucun lien de cause à effet n’est affirmé.'));
}

/* E079-03 — liens par thèmes partagés, jamais présentés comme des causes. */
function buildThemes(m) {
  const box = ensure(m.aside, 'e079-themes', 'section', 'e079-block e079-optional');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-themes-title');
  box.appendChild(make('h3', 'e079-h', 'Thèmes partagés'));
  box.lastChild.id = 'e079-themes-title';
  placeBefore(m.aside, box, '#atlas-chrono-points-title');
  if (!m.current || !m.current.tags.length) {
    box.appendChild(make('p', 'e079-note',
      'Aucun thème renseigné sur ce repère : aucun lien thématique n’est déduit.'));
    return;
  }
  const shared = m.cards
    .filter((item) => item !== m.current)
    .map((item) => ({
      item,
      common: item.tags.filter((tag) => m.current.tags.includes(tag)),
    }))
    .filter((entry) => entry.common.length)
    .slice(0, 6);
  if (!shared.length) {
    box.appendChild(make('p', 'e079-note',
      'Aucun autre repère affiché ne partage ces thèmes.'));
    return;
  }
  const list = make('ol', 'e079-link-list');
  shared.forEach(({ item, common }) => {
    const li = make('li');
    const button = make('button', 'e079-link',
      `${formatYear(item.year)} · ${item.title} — ${common.join(', ')}`);
    button.type = 'button';
    button.setAttribute('aria-label',
      `${item.title}, ${formatYear(item.year)}. Thème partagé : ${common.join(', ')}`);
    button.addEventListener('click', () => follow(item, 'lien par thème partagé'));
    li.appendChild(button);
    list.appendChild(li);
  });
  box.appendChild(list);
  box.appendChild(make('p', 'e079-note',
    'Un thème commun décrit un vocabulaire partagé, pas une causalité.'));
}

/* E079-04 — écarts de millésime chiffrés et explicitement bornés. */
function buildGaps(m) {
  const box = ensure(m.aside, 'e079-gaps', 'section', 'e079-block e079-optional');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-gaps-title');
  box.appendChild(make('h3', 'e079-h', 'Écarts de millésime'));
  box.lastChild.id = 'e079-gaps-title';
  placeBefore(m.aside, box, '#atlas-chrono-points-title');
  if (!m.current || !Number.isFinite(m.current.year)) {
    box.appendChild(make('p', 'e079-note', 'Millésime indisponible : aucun écart calculé.'));
    return;
  }
  const index = m.cards.indexOf(m.current);
  const neighbours = [
    index > 0 ? m.cards[index - 1] : null,
    index >= 0 && index < m.cards.length - 1 ? m.cards[index + 1] : null,
  ].filter((item) => item && Number.isFinite(item.year));
  if (!neighbours.length) {
    box.appendChild(make('p', 'e079-note', 'Aucun voisin daté permettant un écart.'));
    return;
  }
  const lines = neighbours.map((item) => {
    const delta = Math.abs(m.current.year - item.year);
    return `Entre « ${item.title} » (${formatYear(item.year)}) et ce repère (${formatYear(m.current.year)}) : ${delta} année(s) calendaire(s).`;
  });
  box.appendChild(make('p', 'e079-prose', lines.join(' ')));
  box.appendChild(make('p', 'e079-note',
    'Calcul arithmétique sur les millésimes affichés, sans correction de l’an zéro.'));
}

/* E079-05 — frise narrative de l'ère courante, cliquable. */
function buildFrie(m) {
  const box = ensure(m.main, 'e079-frie', 'section', 'e079-block e079-frie e079-optional');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-frie-title');
  box.appendChild(make('h2', 'e079-h', 'Frise de l’ère'));
  box.lastChild.id = 'e079-frie-title';
  const eraId = m.era ? m.era.id : (m.current ? m.current.eraId : null);
  const members = eraId ? m.cards.filter((item) => item.eraId === eraId) : [];
  if (!members.length) {
    box.appendChild(make('p', 'e079-note', 'Aucun repère daté à placer sur cette frise.'));
  } else {
    const list = make('ol', 'e079-frie-list');
    const cap = 14;
    members.slice(0, cap).forEach((item) => {
      const li = make('li');
      const button = make('button', 'e079-mark');
      button.type = 'button';
      if (item === m.current) button.setAttribute('aria-current', 'true');
      button.setAttribute('aria-label', `${item.title}, ${formatYear(item.year)}`);
      button.append(
        make('span', 'e079-mark-year', formatYear(item.year)),
        make('span', '', item.title.length > 34 ? `${item.title.slice(0, 33)}…` : item.title)
      );
      button.addEventListener('click', () => follow(item, 'repère de la frise d’ère'));
      li.appendChild(button);
      list.appendChild(li);
    });
    box.appendChild(list);
    if (members.length > cap) {
      box.appendChild(make('p', 'e079-note',
        `${members.length - cap} autre(s) repère(s) de cette ère ne sont pas affiché(s) sur la frise.`));
    }
  }
  placeBefore(m.main, box, '#atlas-chrono-events');
}

/* E079-06 — contexte d'ère : identité, période, effectif et vocabulaire. */
function buildEra(m) {
  const box = ensure(m.main, 'e079-era', 'section', 'e079-block e079-era');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-era-title');
  box.appendChild(make('h2', 'e079-h', 'Contexte d’ère'));
  box.lastChild.id = 'e079-era-title';
  if (!m.era) {
    box.appendChild(make('p', 'e079-note', 'Aucune ère documentée pour ce pays.'));
  } else {
    const members = m.cards.filter((item) => item.eraId === m.era.id);
    const tags = [...new Set(members.flatMap((item) => item.tags))].sort().slice(0, 8);
    let text = `Ère « ${m.era.name} », de ${m.era.range}. Elle rassemble ${members.length} repère(s) dans la sélection affichée.`;
    if (tags.length) text += ` Thèmes présents : ${tags.join(', ')}.`;
    box.appendChild(make('p', 'e079-prose', text));
  }
  placeBefore(m.main, box, '#atlas-chrono-events');
}

/* E079-07 — continuité entre ère précédente et ère suivante. */
function buildTransition(m) {
  const box = ensure(m.main, 'e079-transition', 'section', 'e079-block e079-transition e079-optional');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-transition-title');
  box.appendChild(make('h2', 'e079-h', 'Avant et après cette ère'));
  box.lastChild.id = 'e079-transition-title';
  const index = m.era ? m.eras.findIndex((item) => item.id === m.era.id) : -1;
  const slots = [
    { era: index > 0 ? m.eras[index - 1] : null, label: 'ère précédente', arrow: '← ' },
    { era: index >= 0 && index < m.eras.length - 1 ? m.eras[index + 1] : null, label: 'ère suivante', arrow: '' },
  ];
  const list = make('ol', 'e079-link-list');
  slots.forEach((slot) => {
    if (!slot.era) return;
    const li = make('li');
    const button = make('button', 'e079-link',
      `${slot.arrow}${slot.era.name} (${slot.era.range})${slot.arrow ? '' : ' →'}`);
    button.type = 'button';
    button.setAttribute('aria-label', `Ouvrir l’${slot.label} : ${slot.era.name}, ${slot.era.range}`);
    button.addEventListener('click', () => {
      slot.era.band.click();
      say(`Ère rejointe : ${slot.era.name} (${slot.era.range}). Changement de contexte d’ère.`);
    });
    li.appendChild(button);
    list.appendChild(li);
  });
  if (list.childNodes.length) box.appendChild(list);
  else box.appendChild(make('p', 'e079-note', 'Cette ère est la seule documentée pour ce pays.'));
  box.appendChild(make('p', 'e079-note',
    'Le passage d’une ère à l’autre marque un changement de contexte, pas une cause.'));
  placeBefore(m.main, box, '#atlas-chrono-events');
}

/* E079-08 — règle d'honnêteté narrative, adossée aux points de la vue. */
function buildMethod(m) {
  const box = ensure(m.main, 'e079-method', 'section', 'e079-block e079-method');
  if (!box) return;
  clear(box);
  box.setAttribute('aria-labelledby', 'e079-method-title');
  box.appendChild(make('h2', 'e079-h', 'Comment lire ces liens'));
  box.lastChild.id = 'e079-method-title';
  box.appendChild(make('p', 'e079-prose',
    'Les liens ci-dessus sont des déductions de présentation : voisinage dans l’ordre des repères, thèmes présents dans les données, écart entre millésimes et successions d’ère. Ils ne remplacent pas les sources : chaque fait reste adossé aux points du repère et à leur liste de sources dans la fiche. Aucune relation de cause à effet n’est affirmée.'));
  placeBefore(m.main, box, '#atlas-chrono-events');
}

/* E079-09 — affichage sobre de l'état des liens ; l'annonce passe par la
 * région live unique du module, pas par un second role=status visible. */
function buildStatus(m) {
  const box = ensure(m.main, 'e079-status', 'p', 'e079-status');
  if (!box) return;
  clear(box);
  const index = m.cards.indexOf(m.current);
  const neighbours = index >= 0 ? (index > 0 ? 1 : 0) + (index < m.cards.length - 1 ? 1 : 0) : 0;
  const eraMembers = m.era ? m.cards.filter((item) => item.eraId === m.era.id).length : 0;
  box.textContent = `Liens narratifs : ${neighbours} voisin(s) chronologique(s), `
    + `${eraMembers} repère(s) sur la frise de l’ère, `
    + `${compact ? 'vue réduite' : 'vue complète'}. Les annonces sont faites par une région discrète unique.`;
}

/* E079-10 — commande de densité, marqueurs d'audit et gardes de re-render. */
function buildControls(m) {
  const box = ensure(m.main, 'e079-controls', 'div', 'e079-controls');
  if (!box) return;
  clear(box);
  const button = ensure(box, 'e079-compact-btn', 'button', 'e079-toggle');
  button.type = 'button';
  button.textContent = compact ? 'Afficher tous les liens' : 'Réduire les liens';
  button.setAttribute('aria-pressed', compact ? 'true' : 'false');
  button.addEventListener('click', () => {
    compact = !compact;
    if (m.layout && m.layout.classList) m.layout.classList.toggle('e079-compact', compact);
    button.textContent = compact ? 'Afficher tous les liens' : 'Réduire les liens';
    button.setAttribute('aria-pressed', compact ? 'true' : 'false');
    say(compact ? 'Liens narratifs réduits.' : 'Liens narratifs affichés.');
    safe(() => buildStatus(m));
  });
  if (m.layout && m.layout.dataset) {
    const reduced = currentCtx && typeof currentCtx.reducedMotion === 'function'
      ? currentCtx.reducedMotion() : false;
    m.layout.dataset.e079Reduced = reduced ? '1' : '0';
    m.layout.dataset.e079Compact = compact ? '1' : '0';
    m.layout.dataset.e079Cards = String(m.cards.length);
    m.layout.dataset.e079Eras = String(m.eras.length);
    m.layout.classList.toggle('e079-compact', compact);
  }
}

register('E079', (ctx) => {
  currentCtx = ctx;
  safe(() => ctx.css(CSS_ID, CSS));
  const m = safe(() => collect(ctx));
  if (!m) return;
  safe(() => buildEra(m));
  safe(() => buildFrie(m));
  safe(() => buildTransition(m));
  safe(() => buildMethod(m));
  safe(() => buildFil(m));
  safe(() => buildNeighbors(m));
  safe(() => buildThemes(m));
  safe(() => buildGaps(m));
  safe(() => buildControls(m));
  safe(() => buildStatus(m));
});
