import { register } from './registry.js';

/* Lentille E051 — accessibilité clavier du focus et de la tabulation de la vue
   Constellation. Dix chantiers (E051-01 à E051-10), tous implémentés ici.
   Greffon tolérant : zéro réseau, zéro aléa, zéro journalisation, aucun minuteur ni
   boucle rAF propre. Aucun fichier partagé n'est modifié ; chaque identifiant
   créé est préfixé `e051-`. Textes et commentaires en français. */

const STYLE_ID = 'constellation-e051';
const FIELD_ID = 'e051-field';
const SKIP_ID = 'e051-skip';
const LIVE_ID = 'e051-live';
const COUNTER_ID = 'e051-counter';
const HELP_ID = 'e051-help';

/* Un seul écouteur global, quel que soit le nombre de rendus successifs :
   la coque reconstruit le DOM à chaque changement d'état. */
let activeLayout = null;
let globalBound = false;
let lastAnnounce = '';

const CSS = `
/* E051-05 — anneau de focus contrasté, non porté par la seule couleur :
   contour épais, décalage, trait discontinu et halo sombre doublé. */
.constellation-layout .const-sun:focus-visible,
.constellation-layout .const-planet:focus-visible,
.constellation-layout .const-moon:focus-visible,
.constellation-layout .constellation-back:focus-visible,
.constellation-layout #e051-skip:focus-visible {
  outline: 3px solid #f0c880;
  outline-offset: 3px;
  border-style: dashed;
  box-shadow: 0 0 0 6px rgba(240, 200, 128, .22), inset 0 0 0 2px rgba(7, 11, 18, .85);
  z-index: 8;
}
/* E051-05 — aucun halo sous préférence de mouvement réduit. */
.constellation-layout[data-e051-motion="reduced"] .const-sun:focus-visible,
.constellation-layout[data-e051-motion="reduced"] .const-planet:focus-visible,
.constellation-layout[data-e051-motion="reduced"] .const-moon:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(7, 11, 18, .85);
}
/* E051-06 — cible de focus agrandie de 18 px autour du soleil et de la lune,
   sans déplacer le point calculé par polar() dans constellation.js. */
.constellation-layout .const-sun::before,
.constellation-layout .const-moon::before {
  content: '';
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  pointer-events: auto;
}
.constellation-layout .const-sun:focus-visible::before,
.constellation-layout .const-moon:focus-visible::before {
  border: 2px solid rgba(7, 11, 18, .9);
}
/* E051-04 — lien d'évitement : hors écran au repos, révélé au focus. */
#e051-skip {
  position: absolute; left: 8px; top: -60px; z-index: 9;
  min-height: 36px; padding: 0 10px;
  border: 1px solid var(--gold, #e6b96f); border-radius: 8px;
  background: var(--surface-2, #141a24); color: var(--ink, #e8dcc4);
  font-size: 10px; cursor: pointer;
}
#e051-skip:focus { top: 8px; }
/* E051-07 — région d'annonce visuellement masquée mais vocalisée. */
.e051-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
/* E051-08 — compteur de position visible, chiffres alignés. */
#e051-counter {
  display: inline-block; min-width: 44px; padding: 0 6px;
  border: 1px solid var(--line, #3a4150); border-radius: 6px;
  color: var(--gold, #e6b96f);
  font: 10px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums; text-align: center;
}
/* E051-10 — aide clavier indexable sous la constellation. */
#e051-help {
  flex: 1 1 420px; max-width: 820px; margin: 0;
  color: var(--muted, #93a0b4); font-size: 9px; line-height: 1.5;
}
@media (max-width: 620px) {
  #e051-skip { font-size: 9px; }
  #e051-help { flex-basis: 100%; font-size: 8px; }
}
`;

/* Fabrique tolérante : le contrat fournit ctx.el, repli local sinon. */
function makeEl(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Création idempotente : la coque recrée le DOM, les anciens nœuds sont
   détachés et `getElementById` ne les retrouve plus. */
function ensureNode(id, tag, className, parent, ctx) {
  let node = typeof document !== 'undefined' && document.getElementById
    ? document.getElementById(id) : null;
  if (!node) {
    node = makeEl(ctx, tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Groupe de nœuds d'une même famille, lu depuis les clés data-const-key. */
function groupOf(field, kind) {
  if (!field || typeof field.querySelectorAll !== 'function' || !kind) return [];
  return Array.from(field.querySelectorAll('[data-const-key]'))
    .filter((node) => (node.dataset.constKey || '').indexOf(`${kind}:`) === 0);
}

/* E051-01 / E051-09 — point d'entrée de Tab : l'ère marquée `0`, sinon la
   première, sinon le champ lui-même. */
function entryOf(field) {
  if (!field || typeof field.querySelectorAll !== 'function') return null;
  const suns = Array.from(field.querySelectorAll('.const-sun'));
  if (!suns.length) return null;
  return suns.find((sun) => sun.getAttribute('tabindex') === '0') || suns[0];
}

register('E051', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  if (typeof ctx.css !== 'function') return;

  /* Une seule feuille de style pour toute la lentille. */
  ctx.css(STYLE_ID, CSS);

  /* E051-10 — trace de la préférence de mouvement, relue par la feuille CSS. */
  layout.dataset.e051Motion = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()
    ? 'reduced' : 'full';
  lastAnnounce = '';

  /* E051-04 — le champ reçoit l'ancre locale et devient focalisable par
   programme : cible du lien d'évitement et repli sans soleil. */
  field.id = FIELD_ID;
  field.setAttribute('tabindex', '-1');

  /* E051-01 — roving tabindex des soleils : un seul `0`, calculé depuis
   l'état réel (.is-active), les autres retirés de l'ordre de Tab. */
  const sunLayer = layout.querySelector('.const-layer-suns');
  const suns = sunLayer
    ? Array.from(sunLayer.querySelectorAll('.const-sun'))
    : Array.from(field.querySelectorAll('.const-sun'));
  if (suns.length) {
    const active = Math.max(0, suns.findIndex((sun) => sun.classList && sun.classList.contains('is-active')));
    suns.forEach((sun, index) => {
      sun.setAttribute('tabindex', index === active ? '0' : '-1');
      /* E051-10 — raccourcis exposés aux technologies d'assistance. */
      sun.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End Alt+F');
    });
  }

  /* E051-02 — flèches gauche/droite : focus circulaire des ères, avec
   retour au début après la dernière et à la fin avant la première. */
  const navHost = sunLayer || field;
  if (navHost && navHost.dataset.e051Nav !== '1') {
    navHost.dataset.e051Nav = '1';
    navHost.addEventListener('keydown', (event) => {
      if (!event.target || !event.target.classList || !event.target.classList.contains('const-sun')) return;
      const nodes = Array.from(navHost.querySelectorAll('.const-sun'));
      if (!nodes.length) return;
      const current = nodes.indexOf(event.target);
      if (current < 0) return;
      let target = -1;
      if (event.key === 'ArrowRight') target = (current + 1) % nodes.length;
      else if (event.key === 'ArrowLeft') target = (current - 1 + nodes.length) % nodes.length;
      /* E051-03 — Début/Fin : saut direct aux extrémités de la série. */
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = nodes.length - 1;
      if (target < 0) return;
      event.preventDefault();
      event.stopPropagation();
      nodes.forEach((node, index) => node.setAttribute('tabindex', index === target ? '0' : '-1'));
      nodes[target].focus({ preventScroll: true });
    }, true);
  }

  /* E051-04 — lien d'évitement : un seul Tab depuis le haut de la vue pour
   atteindre le champ, puis Entrée recentre le focus sur l'ère active. */
  const skip = ensureNode(SKIP_ID, 'a', 'e051-skip', layout, ctx);
  if (!skip.getAttribute('href')) skip.setAttribute('href', `#${FIELD_ID}`);
  if (!skip.textContent) skip.textContent = 'Aller à la constellation (ères, repères, points)';
  skip.setAttribute('aria-label', 'Aller au champ de la constellation');
  if (layout.firstChild !== skip) layout.insertBefore(skip, layout.firstChild);
  if (skip.dataset.e051Bound !== '1') {
    skip.dataset.e051Bound = '1';
    skip.addEventListener('click', (event) => {
      event.preventDefault();
      const target = entryOf(field);
      if (target) target.focus({ preventScroll: true });
      else field.focus({ preventScroll: true });
    });
  }

  /* E051-07 — région d'annonce : chaque changement de nœud focalisé émet
   une phrase complète, avec le rang, le total et le libellé du balisage. */
  const live = ensureNode(LIVE_ID, 'p', 'e051-sr', layout, ctx);
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = 'Navigation clavier active dans la constellation.';

  /* E051-08 — pastille « rang / total » placée dans la légende, lisible
   sans lecteur d'écran et synchronisée sur le focus. */
  const caption = layout.querySelector('.constellation-caption') || layout;
  const counter = ensureNode(COUNTER_ID, 'span', 'e051-counter', caption, ctx);

  /* E051-10 — aide indexable, référencée par le champ via aria-describedby. */
  const help = ensureNode(HELP_ID, 'p', 'e051-help', caption, ctx);
  help.textContent = 'Clavier : ← → parcourir les ères, Début/Fin sauter aux extrémités, Tab rejoindre le groupe suivant, Alt+F revenir à l’ère active, Entrée ouvrir le détail du repère ou du point.';
  const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(HELP_ID) < 0) described.push(HELP_ID);
  field.setAttribute('aria-describedby', described.join(' '));

  /* E051-07 / E051-08 — écouteur de focus délégué sur le champ : met à jour
   le compteur et l'annonce, quel que soit le type de nœud focalisé. */
  if (field.dataset.e051Focus !== '1') {
    field.dataset.e051Focus = '1';
    field.addEventListener('focusin', (event) => {
      const node = event.target instanceof Element ? event.target.closest('[data-const-key]') : null;
      if (!node || !field.contains(node)) return;
      const kind = (node.dataset.constKey || '').split(':')[0];
      const group = groupOf(field, kind);
      if (!group.length) return;
      const index = group.indexOf(node) + 1;
      if (index < 1) return;
      counter.textContent = `${index} / ${group.length}`;
      const names = { sun: 'Ère', planet: 'Repère', moon: 'Point vérifié' };
      const label = (node.dataset && node.dataset.label) || node.getAttribute('aria-label') || '';
      const message = `${names[kind] || 'Élément'} ${index} sur ${group.length} : ${label}`;
      if (message !== lastAnnounce) {
        lastAnnounce = message;
        live.textContent = message;
      }
      field.dataset.e051FocusKind = kind;
    });
  }
  const firstEntry = entryOf(field);
  if (firstEntry) {
    const kind = (firstEntry.dataset.constKey || '').split(':')[0];
    const group = groupOf(field, kind);
    counter.textContent = `${Math.max(1, group.indexOf(firstEntry) + 1)} / ${group.length || 1}`;
  }

  /* E051-09 — Alt+F : retour direct à l'entrée de tabulation depuis
   n'importe quelle zone de la vue. Le modificateur Alt est ignoré par le
   routeur global ; la garde `isConnected` neutralise les rendus anciens. */
  activeLayout = layout;
  if (!globalBound && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    globalBound = true;
    document.addEventListener('keydown', (event) => {
      const current = activeLayout;
      if (!current || !current.isConnected) return;
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'f' && event.key !== 'F') return;
      const currentField = current.querySelector('.constellation-field');
      if (!currentField) return;
      const target = entryOf(currentField);
      if (!target) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
    }, true);
  }
});
