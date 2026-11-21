import { register } from './registry.js';

/* Lentille E083 — vue CHRONOLOGIE : liens vers les points vérifiés et
   navigation inter-vues. Aucune donnée n'est inventée : tous les libellés et
   toutes les cibles sont lus dans le DOM construit par chronology.js.
   Aucun accès réseau, aucun générateur aléatoire, aucune journalisation,
   aucune boucle d'animation ni minuteur. */

const CSS_ID = 'chronology-e083';
const PREFIX = 'e083';

function uid(name) {
  return `${PREFIX}-${name}`;
}

function find(name) {
  return document.getElementById(uid(name));
}

function slug(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '_');
}

/* Un nœud préfixé par e083 est réutilisé s'il existe déjà, créé sinon.
   La coque reconstruisant le DOM à chaque rendu, cette garde couvre aussi le
   cas d'un apply() rejoué sans reconstruction. */
function ensure(root, tag, cls, name, el, text) {
  let node = find(name);
  if (!node) {
    node = el(tag, cls, text);
    node.id = uid(name);
    root.appendChild(node);
  } else if (text !== undefined && node.textContent !== text) {
    node.textContent = text;
  }
  return node;
}

function makeLink(el, href, text, label, cls) {
  const anchor = el('a', cls || 'e083-link', text);
  anchor.href = href;
  if (label) anchor.setAttribute('aria-label', label);
  return anchor;
}

register('E083', (ctx) => {
  if (ctx.viewId && ctx.viewId !== 'chronology') return;
  if (!ctx.layout) return;

  const { el, layout, css, reducedMotion } = ctx;
  const issues = [];
  const safe = (name, fn) => {
    try { fn(); } catch { issues.push(name); }
  };

  /* Une seule injection de style, identifiée, sans toucher à styles.css. */
  css(CSS_ID, `
.e083-block{margin:10px 0 14px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e083-title{margin:0 0 6px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.e083-list{margin:0;padding-left:18px;color:var(--muted);font-size:9px;line-height:1.6}
.e083-list li{margin:1px 0}
.e083-link{display:inline-flex;align-items:center;min-height:24px;color:var(--gold-bright);text-decoration:underline;text-underline-offset:2px;font-size:9px}
.e083-link:hover{color:var(--ink)}
.e083-link[aria-current="page"],.e083-link[aria-current="location"]{color:var(--ink);font-weight:600}
.e083-link[aria-disabled="true"]{color:var(--muted-2);text-decoration:none;cursor:default}
.e083-point-back{margin-left:8px;font-size:8px}
.e083-point-nav{display:inline-flex;gap:10px;margin-left:auto;font-size:8px}
.e083-source-link{margin-right:4px;font-size:8px}
.e083-view-nav{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:0 0 6px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e083-view-note{margin:0;color:var(--muted-2);font-size:8px;line-height:1.5}
.e083-coverage{margin:8px 0 12px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e083-trail-points{margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.6}
.point,.e083-anchor-target{scroll-margin-block:64px}
.e083-anchor-target:target{outline:2px solid var(--gold-bright);outline-offset:2px}
.e083-reduced .e083-link{transition:none!important}
@media (prefers-reduced-motion:reduce){.e083-link{transition:none!important}}
@media (max-width:620px){.e083-view-nav{flex-direction:column;align-items:flex-start}.e083-list{font-size:8px}}
`);

  const main = layout.querySelector('#atlas-chrono-main');
  const aside = layout.querySelector('#atlas-chrono-aside');
  const eventItems = [...layout.querySelectorAll('#atlas-chrono-events > li[data-event-id][id]')];
  const selectedCard = layout.querySelector('#atlas-chrono-events > li[data-event-id] > button[aria-current="true"]');
  const selectedId = selectedCard ? selectedCard.dataset.eventId : null;
  const pointItems = aside ? [...aside.querySelectorAll('ol.points > li.point[id]')] : [];
  let citedSources = 0;

  /* E083-01 — index des points vérifiés du repère courant. */
  safe('index-points', () => {
    if (!aside || !pointItems.length) return;
    const nav = ensure(aside, 'nav', 'e083-block', 'point-index', el);
    nav.setAttribute('aria-label', 'Accès direct aux points vérifiés du repère');
    let title = nav.querySelector('.e083-title');
    if (!title) {
      title = el('p', 'e083-title', 'Points vérifiés — accès direct');
      nav.appendChild(title);
    }
    let list = nav.querySelector('ol');
    if (!list) {
      list = el('ol', 'e083-list');
      nav.appendChild(list);
    }
    list.textContent = '';
    pointItems.forEach((point, index) => {
      const kind = point.dataset.kind || 'sans type';
      const confidence = point.dataset.confidence || 'confiance non précisée';
      const anchor = makeLink(
        el, `#${point.id}`,
        `Point ${index + 1}/${pointItems.length} · ${kind} · ${confidence}`,
        `Aller au point ${index + 1} : ${kind}, confiance ${confidence}`,
        'e083-link'
      );
      const li = el('li');
      li.appendChild(anchor);
      list.appendChild(li);
    });
    const pointsList = aside.querySelector('ol.points');
    if (pointsList && nav.nextSibling !== pointsList) aside.insertBefore(nav, pointsList);
  });

  /* E083-02 — retour au repère depuis chaque point vérifié. */
  safe('retour-repere', () => {
    pointItems.forEach((point, index) => {
      if (point.querySelector('.e083-point-back')) return;
      const match = /^point-(.+)-(\d+)$/.exec(point.id);
      if (!match) return;
      const anchor = makeLink(
        el, `#event-${match[1]}`, '↑ Repère',
        `Revenir au repère depuis le point ${index + 1}`,
        'e083-link e083-point-back'
      );
      point.appendChild(anchor);
    });
  });

  /* E083-03 — sommaire des repères, construit uniquement depuis le DOM réel. */
  safe('index-reperes', () => {
    if (!main || !eventItems.length) return;
    const nav = ensure(main, 'nav', 'e083-block', 'event-index', el);
    nav.setAttribute('aria-label', 'Sommaire des repères de la chronologie');
    let title = nav.querySelector('.e083-title');
    if (!title) {
      title = el('p', 'e083-title', 'Repères de ce pays — liens directs');
      nav.appendChild(title);
    }
    let list = nav.querySelector('ol');
    if (!list) {
      list = el('ol', 'e083-list');
      nav.appendChild(list);
    }
    list.textContent = '';
    eventItems.forEach((li) => {
      const card = li.querySelector('button.event-card');
      const label = (card && card.querySelector('strong') && card.querySelector('strong').textContent) || li.dataset.eventId;
      const year = card && card.querySelector('.event-year') ? card.querySelector('.event-year').textContent : '';
      const anchor = makeLink(
        el, `#${li.id}`, `${year ? `${year} · ` : ''}${label}`,
        `Aller au repère ${label}${year ? ` (${year})` : ''}`,
        'e083-link'
      );
      if (li.dataset.eventId === selectedId) anchor.setAttribute('aria-current', 'location');
      const row = el('li');
      row.appendChild(anchor);
      list.appendChild(row);
    });
    const eraNav = layout.querySelector('#atlas-chrono-eras');
    if (eraNav && nav.nextSibling !== eraNav) main.insertBefore(nav, eraNav);
  });

  /* E083-04 — navigation inter-vues déléguée : aucun import du store.
     Le lien « Monde » relaye le clic du bouton existant #nav-c2a-back. */
  safe('nav-vues', () => {
    if (!main) return;
    const nav = ensure(main, 'nav', 'e083-view-nav', 'view-nav', el);
    nav.setAttribute('aria-label', 'Navigation entre les vues');
    nav.textContent = '';
    const back = document.getElementById('nav-c2a-back');
    const globe = makeLink(
      el, '#nav-c2a-back',
      back ? 'Monde (carte)' : 'Monde (retour indisponible)',
      'Ouvrir la vue Monde par le bouton de retour existant',
      'e083-link e083-view-link'
    );
    globe.id = uid('go-globe');
    if (!back) globe.setAttribute('aria-disabled', 'true');
    globe.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById('nav-c2a-back');
      if (target && !target.disabled) target.click();
    });
    const here = makeLink(el, '#atlas-chrono-title', 'Chronologie (vue courante)', 'Vue chronologie courante', 'e083-link e083-view-link');
    here.id = uid('view-current');
    here.setAttribute('aria-current', 'page');
    const note = el('p', 'e083-view-note', 'Les autres vues restent accessibles depuis la barre supérieure de la coque ; ce greffon ne modifie pas le routeur.');
    note.id = uid('view-note');
    nav.append(globe, here, note);
  });

  /* E083-05 — le fil de situation C2 gagne des liens vers les points. */
  safe('fil-points', () => {
    const trail = document.getElementById('nav-c2a-trail');
    if (!trail || !layout.contains(trail)) return;
    const line = ensure(trail, 'p', 'e083-trail-points', 'trail-points', el);
    line.textContent = '';
    line.appendChild(el('span', '', pointItems.length ? 'Points vérifiés : ' : 'Aucun point vérifié dans ce repère.'));
    pointItems.forEach((point, index) => {
      if (index) line.appendChild(document.createTextNode(' · '));
      line.appendChild(makeLink(
        el, `#${point.id}`, String(index + 1),
        `Aller au point ${index + 1} du repère`, 'e083-link'
      ));
    });
  });

  /* E083-06 — registre local des sources citées, avec retour aux points.
     Aucun lien réseau : les cibles sont des ancres internes au document. */
  safe('registre-sources', () => {
    if (!aside || !pointItems.length) return;
    const citations = new Map();
    pointItems.forEach((point, index) => {
      point.querySelectorAll('[data-source-id]').forEach((node) => {
        const sourceId = node.dataset.sourceId;
        if (!sourceId) return;
        if (!citations.has(sourceId)) citations.set(sourceId, []);
        citations.get(sourceId).push({ anchor: `#${point.id}`, number: index + 1 });
        if (!node.querySelector('.e083-source-link')) {
          node.insertBefore(
            makeLink(
              el, `#${uid(`source-${slug(sourceId)}`)}`, '↗',
              `Voir la source ${sourceId} dans le registre local`,
              'e083-link e083-source-link'
            ),
            node.firstChild
          );
        }
      });
    });
    if (!citations.size) return;
    const section = ensure(aside, 'section', 'e083-block', 'source-register', el);
    section.setAttribute('aria-label', 'Registre local des sources citées dans ce repère');
    section.textContent = '';
    section.appendChild(el('p', 'e083-title', 'Sources citées — retour aux points'));
    const list = el('ol', 'e083-list');
    [...citations.keys()].sort().forEach((sourceId) => {
      const li = el('li');
      li.id = uid(`source-${slug(sourceId)}`);
      li.appendChild(el('span', '', `${sourceId} : `));
      citations.get(sourceId).forEach((reference, rank) => {
        if (rank) li.appendChild(document.createTextNode(' · '));
        li.appendChild(makeLink(
          el, reference.anchor, `point ${reference.number}`,
          `Aller au point ${reference.number} qui cite la source ${sourceId}`,
          'e083-link'
        ));
      });
      list.appendChild(li);
      citedSources += 1;
    });
    section.appendChild(list);
    aside.appendChild(section);
  });

  /* E083-07 — navigation séquentielle entre les points vérifiés. */
  safe('nav-points', () => {
    pointItems.forEach((point, index) => {
      if (point.querySelector('.e083-point-nav')) return;
      const match = /^point-(.+)-(\d+)$/.exec(point.id);
      if (!match) return;
      const eventId = match[1];
      const step = (target, label, spoken, disabled) => {
        if (disabled) {
          const span = el('span', 'e083-link', `${label} (indisponible)`);
          span.setAttribute('aria-disabled', 'true');
          return span;
        }
        return makeLink(el, `#point-${eventId}-${target}`, label, spoken, 'e083-link');
      };
      const strip = el('span', 'e083-point-nav');
      strip.append(
        step(index - 1, '← précédent', `Aller au point ${index} du repère`, index === 0),
        step(index + 1, 'suivant →', `Aller au point ${index + 2} du repère`, index === pointItems.length - 1)
      );
      const head = point.querySelector('.point-head');
      if (head) head.appendChild(strip);
      else point.appendChild(strip);
    });
  });

  /* E083-08 — couverture chiffrée en texte, sans créer de seconde région
     live : #nav-c2a-live (chronology.js:121-133) reste l'unique annonce. */
  safe('couverture', () => {
    if (!main) return;
    const anchors = layout.querySelectorAll('a.e083-link[href^="#"]').length;
    const line = ensure(main, 'p', 'e083-coverage', 'coverage', el);
    line.textContent = `${pointItems.length} point(s) vérifié(s) · ${anchors} lien(s) profond(s) · ${citedSources} source(s) citée(s) · vue ${layout.dataset.view || 'chronologie'}. Les annonces vocales restent celles de la coque.`;
    layout.dataset.e083Coverage = String(anchors);
  });

  /* E083-09 — cibles d'ancrage focalisables et visibles au :target. */
  safe('cibles', () => {
    [...eventItems, ...pointItems].forEach((node) => {
      if (node.tabIndex < 0) node.tabIndex = -1;
      node.classList.add('e083-anchor-target');
    });
    layout.querySelectorAll('[id^="e083-source-"]').forEach((node) => {
      if (node.tabIndex < 0) node.tabIndex = -1;
      node.classList.add('e083-anchor-target');
    });
  });

  /* E083-10 — robustesse : gardes d'existence, mouvement réduit et miroir
     d'état auditable, sans aucune journalisation. */
  safe('robustesse', () => {
    layout.dataset.e083 = issues.length ? 'partial' : 'ok';
    if (issues.length) layout.dataset.e083Issues = issues.join(' ');
    else layout.removeAttribute('data-e083-issues');
    if (typeof reducedMotion === 'function' && reducedMotion()) layout.classList.add('e083-reduced');
    else layout.classList.remove('e083-reduced');
    layout.dataset.e083View = String(ctx.viewId || layout.dataset.view || 'chronologie');
  });
});
