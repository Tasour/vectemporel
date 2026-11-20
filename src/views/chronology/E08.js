import { register } from './registry.js';

/* Lentille E008 — accessibilité ARIA de la vue Chronologie.
 *
 * Dix chantiers E08-01 … E08-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E08.md. Lectures seules :
 * src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/E01.js, E04.js, E07.js, E010.js,
 * src/ui/shell.js, src/platform/keyboard.js.
 *
 * Greffon strictement additif et déclaratif : aucun rôle existant n'est
 * écrasé, aucun nœud vivant n'est supprimé, aucun écouteur, timer,
 * observateur, rAF, aléa, réseau ni journal. La coque reconstruisant #app
 * à chaque rendu (shell.js:533), tous les attributs sont recalculés de
 * façon idempotente. Zéro région live créée : E07 et E13 en possèdent déjà.
 *
 * Délimitations : E07-07 arbitre aria-current des ères et des repères ;
 * E08-04 ne touche donc que le fil de situation. E01/E10/E19 possèdent
 * leurs propres bascules aria-pressed ; E08-05 ne normalise que les puces
 * de thème ([data-tag]) et retire aria-pressed des contrôles à choix
 * unique, sans jamais viser les bascules d'autres lentilles.
 */

const CSS_ID = 'chronology-e08';
/* E08-02 : id visible, déterministe et hors du motif de diagnostic
   /^(e\d\d[-_ ]|.*-e\d\d)/ de _diagnostics.js:72 — sinon le paragraphe
   d'aide serait masqué par défaut. */
const HINT_ID = 'atlas-chrono-hint-a08';

/* E08-10 : CSS injecté une seule fois, limité aux contrôles de focus que
   E07 ne couvre pas (E07:39-44 vise .era-band, .event-card,
   .atlas-chrono-tag et #nav-c2a-back). Aucune règle de styles.css
   surchargée, aucune information portée par la seule couleur. */
const CSS = `
#atlas-stage .chronology-layout .atlas-chrono-search:focus-visible,
#atlas-stage .chronology-layout .aside-actions button:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
}
`;

const LIST_SELECTORS = [
  '.nav-c2-trail-list',
  '.atlas-chrono-era-list',
  '.event-list.atlas-chrono-events',
  '.points.atlas-chrono-points',
  '.point-sources',
];

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function text(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

/* E08-02 : id unique sans aléa — en cas de collision, suffixe déterministe. */
function ensureId(node, base) {
  if (!node) return '';
  if (node.id) return node.id;
  let candidate = base;
  if (document.getElementById(candidate) && document.getElementById(candidate) !== node) {
    let suffix = 2;
    while (document.getElementById(`${base}-${suffix}`)) suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  node.id = candidate;
  return candidate;
}

/* E08-02 / E08-09 : gestion non destructrice de aria-describedby. Les jetons
   posés par cette lentille sont mémorisés dans data-e08-described pour être
   retirés sans effacer ceux d'une autre lentille. */
function describe(node, token, add) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const split = (value) => trim(value).split(/\s+/).filter(Boolean);
  const current = split(node.getAttribute('aria-describedby'));
  /* Un id peut être repris par une lentille postérieure (E028 pose
     'chrono-a11y-keys' sur la même aide) : on ne réaffirme que les jetons
     qui résolvent encore vers un nœud existant. */
  const owned = split(node.getAttribute('data-e08-described'))
    .filter((item) => document.getElementById(item));
  /* Sans jeton explicite, on ne retire que les états vides : l'aide clavier
     posée par E08-02 sur le même nœud doit survivre à un retour au normal. */
  const removed = add && token
    ? []
    : token ? [token] : owned.filter((item) => item.indexOf('nav-c2a-empty-') === 0);
  const nextOwned = add && token
    ? Array.from(new Set([...owned, token]))
    : owned.filter((item) => !removed.includes(item));
  const next = current.filter((item) => !removed.includes(item));
  if (add && token && !next.includes(token)) next.push(token);
  nextOwned.forEach((item) => { if (!next.includes(item)) next.push(item); });
  if (next.length) node.setAttribute('aria-describedby', next.join(' '));
  else node.removeAttribute('aria-describedby');
  if (nextOwned.length) node.setAttribute('data-e08-described', nextOwned.join(' '));
  else node.removeAttribute('data-e08-described');
}

/* E08-01 — list-style:none retire la sémantique de liste sous Safari/
   VoiceOver quand un aria-label est présent. role="list"/"listitem"
   explicite la restaure sans changer le rendu ni les sélecteurs de test. */
function restoreLists(root) {
  LIST_SELECTORS.forEach((selector) => {
    qa(root, selector).forEach((list) => {
      if (!list.hasAttribute('role')) list.setAttribute('role', 'list');
      Array.from(list.children).forEach((child) => {
        if (child.tagName === 'LI' && !child.hasAttribute('role')) {
          child.setAttribute('role', 'listitem');
        }
      });
    });
  });
  /* Miroir : état présent, pas nombre d'écritures — stable entre la passe
     synchrone et la microtâche de réaffirmation. */
  return {
    lists: qa(root, LIST_SELECTORS.map((selector) => `${selector}[role="list"]`).join(', ')).length,
    items: qa(root, LIST_SELECTORS.map((selector) => `${selector} > li[role="listitem"]`).join(', ')).length,
  };
}

/* E08-02 — l'aide clavier visible (.atlas-chrono-hint, chronology.js:231)
   n'a pas d'id : on la nomme puis on la relie aux trois contrôles qui
   portent le contrat clavier. */
function linkHint(root) {
  const hint = q(root, '.atlas-chrono-hint');
  if (!hint) return 0;
  const id = ensureId(hint, HINT_ID);
  const targets = [
    q(root, '#atlas-chrono-search'),
    q(root, '#atlas-chrono-eras'),
    q(root, '#atlas-chrono-events'),
  ];
  targets.forEach((node) => describe(node, id, true));
  return targets.filter(Boolean).length;
}

/* E08-03 — le nom des bandes vient de leurs <span> réels (nom et plage) ;
   la position est dérivée de l'index DOM, aucune donnée historique
   inventée. Garde « si absent » pour ne pas écraser une autre lentille. */
function labelEras(root) {
  const bands = qa(root, '.era-band');
  bands.forEach((band, index) => {
    if (band.hasAttribute('aria-label')) return;
    const nameNode = qa(band, 'span')
      .find((span) => !span.classList.contains('atlas-chrono-era-range'));
    const range = text(q(band, '.atlas-chrono-era-range'));
    const name = text(nameNode);
    if (!name) return;
    band.setAttribute('aria-label', range
      ? `${name}, ère ${index + 1} sur ${bands.length} (${range})`
      : `${name}, ère ${index + 1} sur ${bands.length}`);
  });
  return qa(root, '.era-band[aria-label]').length;
}

/* E08-04 — E07-07 possède déjà les ères et les repères ; E08 ne normalise
   que le fil de situation (chronology.js:161-162), dont la valeur
   "location" doit rester unique. */
function normalizeTrail(root) {
  const crumbs = qa(root, '.nav-c2-crumb');
  let kept = 0;
  crumbs.forEach((crumb) => {
    if (crumb.classList.contains('is-current')) {
      if (crumb.getAttribute('aria-current') !== 'location') {
        crumb.setAttribute('aria-current', 'location');
      }
      kept += 1;
    } else if (crumb.hasAttribute('aria-current')) {
      crumb.removeAttribute('aria-current');
    }
  });
  return { crumbs: crumbs.length, kept };
}

/* E08-05 — aria-pressed = bascule indépendante. Les puces de thème
   (chronology.js:334 et :449) en portent une ; les contrôles à choix
   unique n'en auront jamais. */
function normalizePressed(root) {
  const toggles = qa(root, '[data-tag]')
    .filter((node) => node.tagName === 'BUTTON');
  toggles.forEach((node) => {
    const value = node.getAttribute('aria-pressed');
    if (value !== 'true' && value !== 'false') node.setAttribute('aria-pressed', 'false');
  });
  const singleChoice = qa(root, '.era-band, .event-card, .nav-c2-back, .aside-actions button');
  singleChoice.forEach((node) => {
    if (node.hasAttribute('aria-pressed')) node.removeAttribute('aria-pressed');
  });
  return {
    toggles: toggles.filter((node) =>
      node.getAttribute('aria-pressed') === 'true' || node.getAttribute('aria-pressed') === 'false').length,
    removed: singleChoice.filter((node) => node.hasAttribute('aria-pressed')).length,
  };
}

/* E08-06 — recenser les régions live sans en ajouter : shell.js:122-128,
   keyboard.js:93-99, chronology.js:121-132, E07:86 et E13 en ont déjà. */
function liveBudget(layout) {
  const unique = new Set(qa(document, '[role="status"], [role="alert"], [aria-live]'));
  if (layout) {
    layout.dataset.e08Live = String(unique.size);
    layout.dataset.e08LiveAdded = '0';
    layout.dataset.e08NavLive = document.getElementById('nav-c2a-live') ? '1' : '0';
  }
  return unique.size;
}

function fallbackName(node) {
  const heading = q(node, 'h1, h2, h3');
  if (text(heading)) return text(heading);
  if (node.tagName === 'ASIDE') return 'Fiche du repère';
  if (node.tagName === 'NAV') return 'Navigation de la chronologie';
  return 'Région de la chronologie';
}

/* E08-07 — un seul mécanisme de nom par landmark, avec cible existante ;
   un aria-labelledby mort est retiré au profit d'un aria-label issu du
   texte visible (ou du libellé déjà utilisé par la vue). */
function nameLandmarks(root) {
  const nodes = qa(root, 'section[aria-labelledby], aside, nav');
  let named = 0;
  nodes.forEach((node) => {
    const labelledBy = node.getAttribute('aria-labelledby');
    if (labelledBy) {
      const valid = labelledBy.split(/\s+/).filter(Boolean).every((token) => {
        const target = document.getElementById(token);
        return target && text(target).length > 0;
      });
      if (valid) {
        named += 1;
        return;
      }
      node.removeAttribute('aria-labelledby');
    }
    if (!trim(node.getAttribute('aria-label'))) {
      node.setAttribute('aria-label', fallbackName(node));
    }
    if (trim(node.getAttribute('aria-label'))) named += 1;
  });
  return { named, total: nodes.length };
}

/* E08-08 — aucune relation aria-controls pendante ; les puces de thème de
   l'aside (chronology.js:445-451), seules à ne pas déclarer leur cible,
   reçoivent la leur. */
function auditControls(root) {
  let ok = 0;
  let broken = 0;
  qa(root, '[aria-controls]').forEach((node) => {
    const tokens = trim(node.getAttribute('aria-controls')).split(/\s+/).filter(Boolean);
    const valid = tokens.filter((token) => document.getElementById(token));
    const invalid = tokens.filter((token) => !document.getElementById(token));
    broken += invalid.length;
    ok += valid.length;
    if (invalid.length) {
      if (valid.length) node.setAttribute('aria-controls', valid.join(' '));
      else node.removeAttribute('aria-controls');
    }
  });
  const events = document.getElementById('atlas-chrono-events');
  const chips = qa(root, '.atlas-chrono-tags [data-tag]');
  if (events) {
    chips.forEach((chip) => {
      if (!chip.hasAttribute('aria-controls')) chip.setAttribute('aria-controls', events.id);
    });
  }
  return { ok, broken, added: chips.filter((chip) => chip.hasAttribute('aria-controls')).length };
}

/* E08-09 — les états vides sont du texte visible mais non relié : sous
   lecteur d'écran, entrer dans une liste vide ne dit pas pourquoi. */
function describeEmpty(root) {
  const list = q(root, '#atlas-chrono-events');
  let listEmpty = 0;
  if (list) {
    const empty = qa(list, '[id^="nav-c2a-empty-"]')[0] || null;
    describe(list, empty ? empty.id : '', Boolean(empty));
    listEmpty = empty ? 1 : 0;
  }
  const aside = q(root, '#atlas-chrono-aside');
  let asideEmpty = 0;
  if (aside) {
    const empty = q(aside, '#nav-c2a-empty-event');
    describe(aside, empty ? empty.id : '', Boolean(empty));
    asideEmpty = empty ? 1 : 0;
  }
  return { listEmpty, asideEmpty };
}

/* E08-10 — miroir d'audit lisible par un test, sans console ni écouteur. */
function mirror(layout, s) {
  if (!layout || typeof layout.setAttribute !== 'function') return;
  layout.dataset.e08Aria = [
    `lists:${s.lists.lists}`,
    `items:${s.lists.items}`,
    `hint:${s.hint}`,
    `era:${s.era}`,
    `trail:${s.trail.kept}/${s.trail.crumbs}`,
    `pressed:${s.pressed.toggles}`,
    `pressedRemoved:${s.pressed.removed}`,
    `live:${s.live}`,
    `landmark:${s.landmarks.named}/${s.landmarks.total}`,
    `controls:${s.controls.ok}`,
    `broken:${s.controls.broken}`,
    `controlAdded:${s.controls.added}`,
    `empty:${s.empty.listEmpty}/${s.empty.asideEmpty}`,
  ].join(' ');
}

function apply(ctx) {
  const stage = ctx.stage || null;
  const layout = ctx.layout || null;
  const root = stage || layout;
  if (!root) return;
  mirror(layout, {
    lists: restoreLists(root),
    hint: linkHint(root),
    era: labelEras(root),
    trail: normalizeTrail(root),
    pressed: normalizePressed(root),
    live: liveBudget(layout),
    landmarks: nameLandmarks(root),
    controls: auditControls(root),
    empty: describeEmpty(root),
  });
}

register('E08', (ctx) => {
  if (!ctx) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  apply(ctx);
  /* E08 est greffé tôt (index.js:8) : E028/E057/E060/E078 écrivent plus tard
     sur les mêmes nœuds. Une seule microtâche par rendu réaffirme les
     attributs une fois tous les greffons passés — ni timer, ni observateur,
     ni écouteur, ni boucle. Le calcul reste idempotent sur un nœud détaché. */
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      try { apply(ctx); } catch { /* un rendu concurrent a détaché le stage */ }
    });
  }
});
