import { register } from './registry.js';

/* Lentille V2 E051 — itinéraires de focus et repères de tabulation de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sous
   le préfixe exclusif v2e051 (aucune collision avec la passe 1 e051-…).
   Zéro réseau, zéro source aléatoire, zéro minuteur, zéro boucle d'animation
   propre, zéro journalisation. Textes, libellés et commentaires en français. */

const STYLE_ID = 'constellation-v2-e051';
const FAMILIES = ['sun', 'planet', 'moon'];
const LABELS = { sun: 'Ère', planet: 'Repère', moon: 'Point' };
const NAMES = { sun: 'Ères', planet: 'Repères', moon: 'Points vérifiés' };
const ROLES = { sun: 'ensemble d’ères', planet: 'ensemble de repères', moon: 'ensemble de points vérifiés' };
const NAV_KEY = '__v2e051_nav';

/* État module : un seul gestionnaire clavier pour tous les rendus successifs. */
let currentLayout = null;
let currentField = null;
let navBound = false;
let lastFamily = '';

const CSS = `
/* E051-10 — marqueur de focus non coloriel : trait discontinu posé sur le nœud
   courant, indépendamment du :focus-visible de la passe 1. */
.v2e051-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-field [data-v2e051-current="1"]{outline:2px dashed var(--gold-bright,#f0c880);outline-offset:5px}
#v2e051-trail{display:inline-flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:20px;color:var(--muted,#93a0b4);font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
#v2e051-trail .v2e051-sep{opacity:.55}
#v2e051-help{flex:1 1 420px;max-width:820px;margin:0;color:var(--muted,#93a0b4);font-size:9px;line-height:1.5}
/* E051-10 — repli mouvement réduit : aucune transition, aucun défilement fluide. */
[data-v2e051-motion="reduced"] .constellation-field *{transition:none!important;scroll-behavior:auto}
@media (max-width:620px){#v2e051-trail{font-size:8px}#v2e051-help{flex-basis:100%;font-size:8px}}
@media (prefers-reduced-motion:reduce){.constellation-field *{transition:none!important;scroll-behavior:auto}}
`;

/* Fabrique tolérante : le contrat fournit ctx.el, repli local sinon. */
function makeEl(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Création idempotente d'un nœud annexe dans le layout courant. */
function ensureNode(id, tag, className, parent, ctx) {
  let node = document.getElementById ? document.getElementById(id) : null;
  if (!node) {
    node = makeEl(ctx, tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function allNodes(field) {
  return field && typeof field.querySelectorAll === 'function'
    ? Array.from(field.querySelectorAll('[data-const-key]')) : [];
}

function familyOf(node) {
  return ((node && node.dataset && node.dataset.constKey) || '').split(':')[0];
}

function groupOf(field, kind) {
  return allNodes(field).filter(node => familyOf(node) === kind);
}

function setRoving(group, index) {
  group.forEach((node, i) => node.setAttribute('tabindex', i === index ? '0' : '-1'));
}

function focusNode(node) {
  if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
}

/* Déplacement circulaire dans une famille : l'index courant est lu depuis le
   focus réel, avec repli sur le tabindex 0, puis le roving est déplacé. */
function withinFamily(field, kind, step) {
  const group = groupOf(field, kind);
  if (group.length < 2) return null;
  const focused = group.indexOf(document.activeElement);
  const onTab = group.findIndex(node => node.getAttribute('tabindex') === '0');
  const from = focused >= 0 ? focused : (onTab >= 0 ? onTab : 0);
  const next = (from + step + group.length) % group.length;
  setRoving(group, next);
  focusNode(group[next]);
  return group[next];
}

/* Annonce V2 : région dédiée, distincte de l'annonce de la passe 1. */
function announceFamily(kind, total) {
  const live = currentLayout && currentLayout.querySelector('#v2e051-family-live');
  if (!live || !total) return;
  const message = `Famille : ${NAMES[kind] || 'Éléments'} — ${total} élément${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}.`;
  if (message !== lastFamily) {
    lastFamily = message;
    live.textContent = message;
  }
}

/* Saut d'une famille à l'autre, en cherchant la première famille non vide. */
function switchFamily(field, direction) {
  const kind = familyOf(document.activeElement);
  const position = FAMILIES.indexOf(kind);
  if (position < 0) return null;
  for (let offset = 1; offset <= FAMILIES.length; offset++) {
    const index = (position + direction * offset + FAMILIES.length * 3) % FAMILIES.length;
    const candidate = FAMILIES[index];
    const group = groupOf(field, candidate);
    if (!group.length) continue;
    const onTab = group.findIndex(node => node.getAttribute('tabindex') === '0');
    focusNode(group[onTab < 0 ? 0 : onTab]);
    announceFamily(candidate, group.length);
    return group[onTab < 0 ? 0 : onTab];
  }
  return null;
}

register('E051', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;

  currentLayout = layout;
  currentField = field;
  lastFamily = '';

  /* Une seule feuille de style pour toute la lentille V2. */
  css(STYLE_ID, CSS);

  /* E051-01 — Roving tabindex des repères et des points : une seule cible de
     Tab par famille, choisie depuis .is-active (ou la première). Les ères
     restent gérées par la passe 1. */
  ['planet', 'moon'].forEach(kind => {
    const group = groupOf(field, kind);
    if (!group.length) return;
    const active = Math.max(0, group.findIndex(node => node.classList && node.classList.contains('is-active')));
    setRoving(group, active);
  });

  /* E051-02 — Parcours circulaire des repères par les flèches horizontales.
     Lit le champ courant du module : le gestionnaire unique reste valable
     après les reconstructions successives du DOM. */
  const movePlanet = step => withinFamily(currentField, 'planet', step);

  /* E051-03 — Parcours circulaire des points par les flèches horizontales. */
  const moveMoon = step => withinFamily(currentField, 'moon', step);

  /* E051-04 — Changement de famille par les flèches verticales, uniquement
     depuis un repère ou un point (les ères gardent leur routeur). */
  const changeFamily = direction => switchFamily(currentField, direction);

  /* E051-05 — Couches nommées et décomptées : aria-roledescription et nombre
     d'éléments ajoutés aux groupes déjà créés par la vue, sans les remplacer. */
  [['.const-layer-suns', 'sun'], ['.const-layer-planets', 'planet'], ['.const-layer-moons', 'moon']]
    .forEach(([selector, kind]) => {
      const layer = layout.querySelector(selector);
      if (!layer) return;
      layer.setAttribute('aria-roledescription', ROLES[kind]);
      const count = groupOf(field, kind).length;
      const suffix = `${count} élément${count > 1 ? 's' : ''}`;
      const label = layer.getAttribute('aria-label') || '';
      if (label.indexOf(suffix) === -1) layer.setAttribute('aria-label', `${label} — ${suffix}`);
    });

  /* E051-06 — Position et taille exposées aux lecteurs d'écran sur les
     repères et les points, en complément du compteur visuel de la passe 1. */
  ['planet', 'moon'].forEach(kind => {
    const group = groupOf(field, kind);
    group.forEach((node, index) => {
      node.setAttribute('aria-posinset', String(index + 1));
      node.setAttribute('aria-setsize', String(group.length));
      node.dataset.v2e051Pos = `${index + 1}/${group.length}`;
    });
  });

  const caption = layout.querySelector('.constellation-caption') || layout;

  /* E051-07 — Fil d'Ariane de focus visible : Ère › Repère › Point, alimenté
     par l'écouteur délégué ci-dessous et rangé dans la légende. */
  const trail = ensureNode('v2e051-trail', 'span', 'v2e051-trail', caption, ctx);

  /* E051-08 — Annonce vocalisée du changement de famille, dans une région
     live distincte de celle de la passe 1. */
  const familyLive = ensureNode('v2e051-family-live', 'p', 'v2e051-sr', layout, ctx);
  familyLive.setAttribute('role', 'status');
  familyLive.setAttribute('aria-live', 'polite');
  familyLive.setAttribute('aria-atomic', 'true');

  /* E051-09 — Aide V2 et raccourcis déclarés, rattachés de façon non
     destructive au champ et à tous les nœuds focalisables. */
  const help = ensureNode('v2e051-help', 'p', 'v2e051-help', caption, ctx);
  help.textContent = 'Itinéraires V2 : ← → parcourent les repères ou les points ; ↑ ↓ changent de famille (ère, repère, point) ; le fil « Ère › Repère › Point » indique la position atteinte.';
  const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(help.id) < 0) described.push(help.id);
  field.setAttribute('aria-describedby', described.join(' '));
  allNodes(field).forEach(node => {
    const tokens = (node.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['ArrowUp', 'ArrowDown'].forEach(token => {
      if (tokens.indexOf(token) < 0) tokens.push(token);
    });
    node.setAttribute('aria-keyshortcuts', tokens.join(' '));
  });

  /* Écouteur délégué partagé : marqueur (E051-10), fil (E051-07) et annonce
     de famille (E051-08). Il est posé sur le champ courant, reconstruit à
     chaque rendu, donc sans accumulation entre rendus. */
  if (field.dataset.v2e051Focus !== '1') {
    field.dataset.v2e051Focus = '1';
    field.addEventListener('focusin', event => {
      const node = event.target instanceof Element ? event.target.closest('[data-const-key]') : null;
      if (!node || !field.contains(node)) return;
      allNodes(field).forEach(other => other.removeAttribute('data-v2e051-current'));
      node.setAttribute('data-v2e051-current', '1');
      const parts = FAMILIES.map(kind => {
        const group = groupOf(field, kind);
        const current = group.find(item => item.getAttribute('data-v2e051-current') === '1');
        return current ? `${LABELS[kind]} ${group.indexOf(current) + 1}` : null;
      }).filter(Boolean);
      trail.textContent = parts.join(' › ');
      const kind = familyOf(node);
      announceFamily(kind, groupOf(field, kind).length);
    });
  }

  /* E051-10 — Marqueur non coloriel et mouvement réduit : la préférence est
     consignée sur le layout et relue par la feuille unique ; le marqueur
     `data-v2e051-current` est posé par l'écouteur ci-dessus. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); } catch (error) { reduced = false; }
  }
  layout.dataset.v2e051Motion = reduced ? 'reduced' : 'full';

  /* Gestionnaire clavier unique, en capture sur window : il précède le
     routeur global posé sur document et n'intercepte que les familles V2. */
  if (!navBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    navBound = true;
    const previous = window[NAV_KEY];
    if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', previous, true);
    }
    const onNav = event => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const fieldNow = currentField;
      if (!fieldNow || !fieldNow.isConnected) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return;
      const node = target.closest('[data-const-key]');
      if (!node || !fieldNow.contains(node)) return;
      const kind = familyOf(node);
      const key = event.key || '';
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        if (kind !== 'planet' && kind !== 'moon') return;
        if (kind === 'planet') movePlanet(key === 'ArrowRight' ? 1 : -1);
        else moveMoon(key === 'ArrowRight' ? 1 : -1);
        event.preventDefault();
        event.stopPropagation();
      } else if (key === 'ArrowDown' || key === 'ArrowUp') {
        if (kind !== 'planet' && kind !== 'moon') return;
        changeFamily(key === 'ArrowDown' ? 1 : -1);
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window[NAV_KEY] = onNav;
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onNav);
  }
});
