import { register } from './registry.js';

/* V2 lentille E024 — Navigation clavier : infrastructure et découvrabilité.
   Dix chantiers V2 neufs (E024-01 … E024-10), distincts de la passe 1 qui
   couvrait déjà le mode clavier, les flèches/Page/ chiffres dans le fil, Échap,
   la traçabilité, J/K, Début/Fin, la région live et la recherche. Ici : aide
   découvrable, piège de focus, évitement, position visible, focus restauré,
   indices de touches, garde-fou de tabulation, indicateur de mode, sauts f/t
   et repère suivant « ] ». Un register, une feuille css, ids v2-e024-*, classes
   recit-v2-e024-*, zéro réseau/console/aléa, enrichissement non destructif. */

const CSS = `
/* Chantiers 01/02 — panneau d'aide et piège de focus */
.recit-v2-e024-help{min-height:36px;padding:5px 10px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(230,185,111,.06);color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;white-space:nowrap}
.recit-v2-e024-help:hover{border-color:var(--gold);background:rgba(230,185,111,.14)}
.recit-v2-e024-help:focus-visible,.recit-v2-e024-close:focus-visible,.recit-v2-e024-skip:focus-visible{outline:3px solid var(--gold-bright,#f5e9d0);outline-offset:2px;border-radius:6px}
.recit-v2-e024-panel{margin:8px 0 4px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(12,16,24,.94);color:var(--ink);font-size:10px;line-height:1.55}
.recit-v2-e024-panel[hidden]{display:none}
.recit-v2-e024-panel p{margin:0 0 6px}
.recit-v2-e024-panel ul{margin:0 0 8px;padding-left:16px}
.recit-v2-e024-panel li{margin:2px 0}
.recit-v2-e024-close{min-height:36px;padding:4px 12px;border:1px solid var(--gold);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
/* Chantier 03 — lien d'évitement */
.recit-v2-e024-skip{position:absolute;left:-9999px;top:0;z-index:60;display:inline-flex;align-items:center;min-height:36px;padding:6px 12px;border:1px solid var(--gold);border-radius:0 0 8px 0;background:rgba(12,16,24,.97);color:var(--gold-bright);font:inherit;font-size:10px;text-decoration:none}
.recit-v2-e024-skip:focus{left:8px;top:8px}
/* Chantier 04 — badge de position courante */
.recit-v2-e024-pos{margin:0 0 7px;color:var(--gold-bright);font-size:9px;font-variant-numeric:tabular-nums;letter-spacing:.04em}
/* Chantier 05 — indices de touches */
.recit-v2-e024-kbd{margin-left:5px;padding:0 5px;border:1px solid var(--line-strong);border-radius:4px;color:var(--muted-2);font-size:8px;line-height:16px;white-space:nowrap}
/* Chantier 08 — indicateur de mode clavier (piloté par la classe passe 1) */
.recit-v2-e024-mode{display:none;align-items:center;min-height:24px;margin-left:4px;padding:2px 8px;border:1px solid var(--gold);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap}
.recit-e024-clavier .recit-v2-e024-mode{display:inline-flex}
.recit-v2-e024-sans-mouvement .recit-v2-e024-panel,
.recit-v2-e024-sans-mouvement .recit-v2-e024-mode{transition:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e024-panel,.recit-v2-e024-mode{transition:none}
}
@media (max-width:620px){.recit-v2-e024-help{min-height:40px}.recit-v2-e024-panel{font-size:11px}}
`;

/* État module : survive aux reconstructions complètes du DOM opérées par la
   coque ; les écouteurs, eux, ne sont armés qu'une seule fois. */
let racine = null;
let ecouteursArmes = false;
let focusinArme = false;
let derniereCibleFk = '';

/* Un chantier défaillant est neutralisé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Complète une liste d'identifiants sans écraser les jetons existants. */
function addToken(node, name, token) {
  if (!node || node.nodeType !== 1 || !token) return;
  const tokens = String(node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) === -1) tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Nœud déjà inséré et encore connecté, sinon null (idempotence). */
function existing(id) {
  if (typeof document === 'undefined' || !id) return null;
  const node = document.getElementById(id);
  return node && node.isConnected ? node : null;
}

/* Les boutons présents dans #c3a-thread sont exactement les points affichés. */
function threadButtons(layout) {
  if (!layout) return [];
  const list = layout.querySelector('#c3a-thread');
  if (!list) return [];
  return Array.prototype.slice.call(list.querySelectorAll('.c3a-thread-item, .recit-thread-item'));
}

/* Rang 1-based du point courant, déduit de is-current / aria-current. */
function indexCourant(buttons) {
  const at = buttons.findIndex((button) => button.classList.contains('is-current')
    || button.getAttribute('aria-current') === 'step');
  return at >= 0 ? at : 0;
}

/* États de modale lus via le store exposé, avec repli silencieux. */
function modaleOuverte() {
  try {
    const st = typeof window !== 'undefined' && window.VATLAS
      && typeof window.VATLAS.getState === 'function' ? window.VATLAS.getState() : null;
    return Boolean(st && (st.helpOpen || st.detailOpen));
  } catch { return false; }
}

function focusNode(node, preventScroll) {
  if (!node || node.nodeType !== 1) return;
  if (typeof preventScroll === 'boolean') {
    try { node.focus({ preventScroll }); }
    catch { node.focus(); }
  } else node.focus();
}

function layoutCourant() {
  if (racine && racine.isConnected) return racine;
  if (typeof document === 'undefined') return null;
  return document.querySelector('.recit-v2-e024-racine');
}

function panneauEstOuvert() {
  const button = existing('v2-e024-help-btn');
  return Boolean(button && button.getAttribute('aria-expanded') === 'true');
}

/* E024-01 — Panneau de découverte des raccourcis (touche « ? », bouton
   aria-expanded). La liste est intégralement dérivée des aria-keyshortcuts
   réellement portés par le DOM : aucun chiffre n'est inventé. */
function majAideContenu(layout, panel) {
  const intro = panel.querySelector('.recit-v2-e024-intro');
  const list = panel.querySelector('ul');
  if (!intro || !list) return;
  const controls = Array.prototype.slice.call(layout.querySelectorAll('[aria-keyshortcuts]'))
    .filter((node) => node.nodeType === 1 && String(node.getAttribute('aria-keyshortcuts')).trim());
  const rows = controls.map((node) => {
    const tokens = String(node.getAttribute('aria-keyshortcuts')).trim().split(/\s+/).filter(Boolean);
    let label = node.tagName === 'INPUT'
      ? (node.getAttribute('aria-label') || node.id || 'Champ de saisie')
      : String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 64);
    if (!label) label = node.getAttribute('aria-label') || node.tagName.toLowerCase();
    return { label, keys: tokens.join(', ') };
  });
  intro.textContent = `Raccourcis actifs dans cette vue : ${rows.length} contrôle(s) répertorié(s).`;
  while (list.firstChild) list.removeChild(list.firstChild);
  const cap = Math.min(rows.length, 24);
  for (let i = 0; i < cap; i += 1) {
    const li = document.createElement('li');
    li.textContent = `${rows[i].label} — ${rows[i].keys}`;
    list.appendChild(li);
  }
  if (rows.length > cap) {
    const li = document.createElement('li');
    li.textContent = `… et ${rows.length - cap} autre(s) contrôle(s) documenté(s).`;
    list.appendChild(li);
  }
}

function ouvrirAide(layout) {
  const button = existing('v2-e024-help-btn');
  const panel = existing('v2-e024-help-panel');
  if (!button || !panel) return;
  majAideContenu(layout, panel);
  panel.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  focusNode(panel.querySelector('.recit-v2-e024-close'));
}

function fermerAide(rendreFocus) {
  const button = existing('v2-e024-help-btn');
  const panel = existing('v2-e024-help-panel');
  if (!button || !panel) return;
  panel.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  if (rendreFocus) focusNode(button, true);
}

function assurerAide(layout, el) {
  const body = layout.querySelector('.recit-body');
  if (!body || typeof el !== 'function') return;
  let button = existing('v2-e024-help-btn');
  let panel = existing('v2-e024-help-panel');
  if (!button) {
    button = el('button', 'recit-v2-e024-help');
    button.type = 'button';
    button.id = 'v2-e024-help-btn';
    button.setAttribute('aria-controls', 'v2-e024-help-panel');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-keyshortcuts', '?');
    const icon = el('span', '', '⌨');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, document.createTextNode(' Raccourcis'));
    button.addEventListener('click', () => {
      safe(() => { if (panneauEstOuvert()) fermerAide(true); else ouvrirAide(layoutCourant() || layout); });
    });
  }
  if (!panel) {
    panel = el('div', 'recit-v2-e024-panel');
    panel.id = 'v2-e024-help-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Raccourcis clavier de la vue Récit');
    panel.hidden = true;
    panel.appendChild(el('p', 'recit-v2-e024-intro', ''));
    panel.appendChild(document.createElement('ul'));
    const close = el('button', 'recit-v2-e024-close', 'Fermer');
    close.type = 'button';
    close.addEventListener('click', () => safe(() => fermerAide(true)));
    panel.appendChild(close);
  }
  const barre = layout.querySelector('#c3a-tools') || layout.querySelector('.recit-actions') || body;
  if (button.parentNode !== barre) barre.appendChild(button);
  if (panel.parentNode !== body) body.appendChild(panel);
  if (!panneauEstOuvert()) majAideContenu(layout, panel);
}

/* E024-02 — Piège de focus dans le panneau ouvert : Tab et Maj+Tab cyclent
   entre le bouton d'aide et les contrôles du panneau ; Échap ferme et rend le
   focus au bouton (traitement prioritaire dans surTouche). */
function focusablesAide(panel) {
  const button = existing('v2-e024-help-btn');
  const inside = panel
    ? Array.prototype.slice.call(panel.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.disabled && node.getAttribute('aria-hidden') !== 'true')
    : [];
  return (button ? [button] : []).concat(inside);
}

function surTabDansAide(event, panel) {
  const focusables = focusablesAide(panel);
  if (!focusables.length) return false;
  const at = focusables.indexOf(document.activeElement);
  let next;
  if (at < 0) next = 0;
  else if (event.shiftKey) next = at <= 0 ? focusables.length - 1 : at - 1;
  else next = at >= focusables.length - 1 ? 0 : at + 1;
  event.preventDefault();
  event.stopPropagation();
  focusNode(focusables[next], false);
  return true;
}

/* E024-03 — Lien d'évitement « Aller au fil » : premier enfant de .recit-body,
   masqué hors focus. Le nombre de points est lu sur #c3a-thread. */
function assurerEvitement(layout, el) {
  const body = layout.querySelector('.recit-body');
  if (!body || typeof el !== 'function') return;
  const total = threadButtons(layout).length;
  let skip = existing('v2-e024-skip');
  if (!skip) {
    skip = el('a', 'recit-v2-e024-skip', '');
    skip.id = 'v2-e024-skip';
    skip.href = '#c3a-thread';
    skip.addEventListener('click', (event) => {
      const boutons = threadButtons(layoutCourant() || layout);
      if (boutons.length) {
        event.preventDefault();
        focusNode(boutons[indexCourant(boutons)], false);
      }
    });
  }
  const libelle = `Aller au fil (${total} point${total > 1 ? 's' : ''})`;
  if (skip.textContent !== libelle) skip.textContent = libelle;
  if (body.firstChild !== skip) body.insertBefore(skip, body.firstChild);
}

/* E024-04 — Badge visible de position courante dans le fil : « Point i / n »,
   i et n étant déduits de aria-current/is-current et du compte des boutons. */
function assurerPosition(layout, el) {
  const thread = layout.querySelector('.recit-thread');
  if (!thread || typeof el !== 'function') return;
  const buttons = threadButtons(layout);
  const texte = buttons.length
    ? `Point courant : ${indexCourant(buttons) + 1} / ${buttons.length}`
    : 'Aucun point affiché';
  let badge = existing('v2-e024-pos');
  if (!badge) {
    badge = el('p', 'recit-v2-e024-pos', '');
    badge.id = 'v2-e024-pos';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-atomic', 'true');
  }
  if (badge.textContent !== texte) badge.textContent = texte;
  if (badge.parentNode !== thread) {
    const list = thread.querySelector('#c3a-thread');
    if (list) thread.insertBefore(badge, list);
    else thread.appendChild(badge);
  }
}

/* E024-05 — Restauration du focus après reconstruction du DOM. L'écouteur
   focusin mémorise le data-fk des contrôles de barre d'outils et d'actions ;
   la restauration cible uniquement ces contrôles, jamais le titre ni le fil,
   afin de ne pas contrarier le focusTitle() de la coque. */
function armerFocusRestoration() {
  if (focusinArme || typeof window === 'undefined') return;
  focusinArme = true;
  window.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target || target.nodeType !== 1 || typeof target.getAttribute !== 'function') return;
    const fk = target.getAttribute('data-fk');
    if (!fk || fk === 'c3a-title' || /^c3a-point-/.test(fk)) return;
    if (typeof target.closest === 'function' && target.closest('.c3a-tools, .recit-actions')) {
      derniereCibleFk = fk;
    }
  }, true);
}

function parFk(layout, fk) {
  const all = layout.querySelectorAll('[data-fk]');
  for (let i = 0; i < all.length; i += 1) {
    if (all[i].getAttribute('data-fk') === fk) return all[i];
  }
  return null;
}

function restaurerFocus(layout) {
  if (!derniereCibleFk || !layout) return;
  const cible = parFk(layout, derniereCibleFk);
  if (cible && !cible.disabled && document.activeElement !== cible) focusNode(cible, true);
}

/* E024-06 — Indices de touches visibles : un <span> décoratif aria-hidden
   accolé aux boutons portant aria-keyshortcuts, dont le libellé est dérivé des
   jetons réels de l'attribut. Aucun attribut existant n'est modifié. */
const LIBELLES_TOUCHES = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  PageUp: 'Pg↑', PageDown: 'Pg↓', Home: 'Début', End: 'Fin',
  Enter: '↵', Escape: 'Échap', Space: 'Espace', '?': '?',
  BracketRight: ']',
};

function libelleTouch(token) {
  if (LIBELLES_TOUCHES[token]) return LIBELLES_TOUCHES[token];
  if (/^Digit\d$/.test(token)) return token.slice(5);
  if (/^Key[A-Z]$/.test(token)) return token.slice(3);
  return token;
}

function ajouterIndices(layout, el) {
  if (typeof el !== 'function') return;
  const controls = layout.querySelectorAll('button[aria-keyshortcuts]');
  Array.prototype.forEach.call(controls, (button) => {
    if (button.id === 'v2-e024-help-btn') return;
    if (button.querySelector('.recit-v2-e024-kbd')) return;
    const tokens = String(button.getAttribute('aria-keyshortcuts') || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return;
    const label = tokens.slice(0, 2).map(libelleTouch).join(' ');
    const kbd = el('span', 'recit-v2-e024-kbd', label);
    kbd.setAttribute('aria-hidden', 'true');
    button.appendChild(kbd);
  });
}

/* E024-07 — Garde-fou de tabulation dans le fil : après chaque rendu, un seul
   bouton porte tabIndex 0. Le rang retenu est celui de is-current/aria-current,
   sinon le premier ; aucun autre attribut n'est touché. */
function gardeTabulation(layout) {
  const buttons = threadButtons(layout);
  if (!buttons.length) return;
  const actifs = buttons.filter((button) => button.tabIndex === 0);
  if (actifs.length === 1 && buttons[indexCourant(buttons)].tabIndex === 0) return;
  buttons.forEach((button) => { button.tabIndex = -1; });
  buttons[indexCourant(buttons)].tabIndex = 0;
}

/* E024-08 — Indicateur visuel « Navigation clavier » : nœud purement décoratif
   dont l'affichage est piloté par la classe recit-e024-clavier posée par la
   passe 1 sur le même layout. Aucun état JS dupliqué, aucune info par couleur
   seule (le libellé est explicite). */
function assurerMode(layout, el) {
  const barre = layout.querySelector('#c3a-tools') || layout.querySelector('.recit-actions') || layout.querySelector('.recit-body');
  if (!barre || typeof el !== 'function') return;
  let mode = existing('v2-e024-mode');
  if (!mode) {
    mode = el('span', 'recit-v2-e024-mode', '');
    mode.id = 'v2-e024-mode';
    mode.setAttribute('aria-hidden', 'true');
  }
  if (mode.textContent !== '⌨ Navigation clavier') mode.textContent = '⌨ Navigation clavier';
  if (mode.parentNode !== barre) barre.appendChild(mode);
}

/* E024-09 — Sauts de focus rapides : « f » joint le champ de recherche,
   « t » joint le bouton du point courant dans le fil. Les jetons KeyF/KeyT sont
   documentés sur les contrôles cibles et repris par le panneau d'aide. */
function documenterSauts(layout) {
  const search = layout.querySelector('#c3a-search');
  if (search) addToken(search, 'aria-keyshortcuts', 'KeyF');
  const list = layout.querySelector('#c3a-thread');
  if (list) addToken(list, 'aria-keyshortcuts', 'KeyT');
}

function sautRecherche(layout) {
  const search = layout.querySelector('#c3a-search');
  if (!search) return false;
  focusNode(search, false);
  return true;
}

function sautFil(layout) {
  const buttons = threadButtons(layout);
  if (!buttons.length) return false;
  focusNode(buttons[indexCourant(buttons)], false);
  return true;
}

/* E024-10 — Repère suivant par la touche « ] » : déclenche le bouton natif
   data-fk="c3a-next-event" s'il existe et n'est pas désactivé, sans dupliquer
   la logique d'état. Le jeton BracketRight est documenté sur le bouton. */
function documenterRepere(layout) {
  const nextEvent = layout.querySelector('[data-fk="c3a-next-event"]');
  if (nextEvent) addToken(nextEvent, 'aria-keyshortcuts', 'BracketRight');
}

function repereSuivant(layout) {
  const nextEvent = layout.querySelector('[data-fk="c3a-next-event"]');
  if (!nextEvent || nextEvent.disabled) return false;
  nextEvent.click();
  return true;
}

/* Unique dispatch clavier. Échap du panneau est traité avant le garde
   defaultPrevented pour rester prioritaire même si la passe 1 consomme Échap
   dans le fil ; le piège de focus Tab vient ensuite. */
function surTouche(event) {
  if (!event) return;
  const key = event.key;
  const layout = layoutCourant();
  if (!layout || !layout.isConnected) return;

  if (key === 'Escape' && panneauEstOuvert()) {
    event.preventDefault();
    event.stopPropagation();
    safe(() => fermerAide(true));
    return;
  }
  if (event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (panneauEstOuvert() && key === 'Tab') {
    const panel = existing('v2-e024-help-panel');
    if (panel) safe(() => surTabDansAide(event, panel));
    return;
  }

  const target = event.target;
  if (typeof Element === 'undefined' || !(target instanceof Element) || !layout.contains(target)) return;
  const editable = target.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) >= 0;
  if (editable || modaleOuverte()) return;

  if (key === '?') {
    event.preventDefault();
    event.stopPropagation();
    safe(() => { if (panneauEstOuvert()) fermerAide(true); else ouvrirAide(layout); });
    return;
  }
  if (key === 'f' || key === 'F') {
    if (sautRecherche(layout)) { event.preventDefault(); event.stopPropagation(); }
    return;
  }
  if (key === 't' || key === 'T') {
    if (sautFil(layout)) { event.preventDefault(); event.stopPropagation(); }
    return;
  }
  if (key === ']') {
    if (repereSuivant(layout)) { event.preventDefault(); event.stopPropagation(); }
  }
}

function chargerEcouteurs() {
  if (ecouteursArmes || typeof window === 'undefined') return;
  ecouteursArmes = true;
  window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, (event) => safe(() => surTouche(event)));
}

register('E024', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !layout) return;
  safe(() => css('recit-v2-e024', CSS));
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  racine = layout;
  safe(() => layout.classList.add('recit-v2-e024-racine'));
  safe(() => {
    let reduce = false;
    try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduce = false; }
    layout.classList.toggle('recit-v2-e024-sans-mouvement', reduce);
  });
  safe(() => documenterSauts(layout));
  safe(() => documenterRepere(layout));
  safe(() => assurerAide(layout, el));
  safe(() => assurerEvitement(layout, el));
  safe(() => assurerPosition(layout, el));
  safe(() => ajouterIndices(layout, el));
  safe(() => gardeTabulation(layout));
  safe(() => assurerMode(layout, el));
  safe(() => armerFocusRestoration());
  safe(() => restaurerFocus(layout));
  safe(() => chargerEcouteurs());
});
