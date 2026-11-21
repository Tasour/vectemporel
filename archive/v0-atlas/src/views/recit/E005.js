import { register } from './registry.js';

/* Lentille E005 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
   Dix chantiers additifs et distincts (E005-01 … E005-10). Tout est enrichi :
   aucun attribut existant n'est écrasé, aucun texte supprimé, aucune région
   live supplémentaire, aucune donnée historique inventée. Une défaillance
   locale est neutralisée sans jamais interrompre le rendu de la vue. */

const STYLE_ID = 'recit-e005';

const RULES = `
.recit-e005-skip{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.recit-e005-skip:focus{position:static!important;width:auto!important;height:auto!important;margin:0 0 8px!important;clip:auto!important;white-space:normal!important;display:inline-block;padding:8px 12px;border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(12,16,24,.96);color:var(--gold-bright,#f5e9d0);font-size:11px;line-height:1.3;z-index:70}
.recit-e005-skip:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.recit-e005-skip--fil:focus{margin-left:8px!important}
.recit-thread:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.recit-e005-skip{transition:none}}
html[data-e005-recit-motion="reduce"] .recit-e005-skip{transition:none}
`;

/* Pose un attribut seulement s'il n'existe pas déjà : l'enrichissement reste
   non destructif, même si une autre lentille est passée avant la nôtre. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants (aria-describedby) sans écraser
   les valeurs déjà présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token) return;
  const current = node.getAttribute(name) || '';
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.includes(token)) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Retourne l'identifiant existant d'un nœud ou lui en attribue un, une seule
   fois. Evite de créer un id double si un autre module l'a déjà nommé. */
function idOf(node, wanted) {
  if (!node || node.nodeType !== 1) return null;
  if (!node.id) node.id = wanted;
  return node.id || null;
}

/* Lecture de "Étape 3 / 10 · récit" : la mesure vient du libellé réel calculé
   par la vue, jamais d'une valeur inventée. Repli sur le nombre d'items du fil. */
function progression(body) {
  const kicker = body.querySelector('.view-kicker');
  const found = kicker && String(kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  if (found) return { now: Number(found[1]), max: Number(found[2]) };
  const count = body.querySelectorAll('#c3a-thread .recit-thread-item').length;
  return { now: count ? 1 : 0, max: count };
}

/* E005-01 — la barre de progression devient un progressbar nommé et valorisé. */
function chantier01(body) {
  const bar = body.querySelector('.recit-progress');
  if (!bar || bar.hasAttribute('role')) return;
  const { now, max } = progression(body);
  const safeNow = Math.min(Math.max(now, 0), max);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(max));
  bar.setAttribute('aria-valuenow', String(safeNow));
  bar.setAttribute('aria-valuetext', max ? `Point ${safeNow} sur ${max}` : 'Aucun point à parcourir');
  const fill = bar.querySelector('span');
  if (fill) setOnce(fill, 'aria-hidden', 'true');
}

/* E005-02 — restauration des sémantiques de liste perdues par list-style:none
   (Safari / VoiceOver). Aucun style n'est modifié. */
function chantier02(body) {
  const list = body.querySelector('#c3a-thread') || body.querySelector('.recit-thread-list');
  if (list && list.tagName === 'OL') setOnce(list, 'role', 'list');
  if (!list) return;
  Array.prototype.forEach.call(list.querySelectorAll('li'), (item) => {
    setOnce(item, 'role', 'listitem');
  });
}

/* E005-03 — description longue de l'image : la légende et le crédit, déjà
   visibles, sont reliés au <img> par aria-describedby. */
function chantier03(layout) {
  const media = layout.querySelector('.recit-media');
  const img = media && media.querySelector('img');
  if (!media) return;
  setOnce(media, 'role', 'group');
  setOnce(media, 'aria-label', 'Illustration du repère');
  if (!img || !img.getAttribute('alt')) return;
  const caption = idOf(media.querySelector('.media-caption'), 'e005-recit-media-caption');
  const credit = idOf(media.querySelector('.recit-media-credit'), 'e005-recit-media-credit');
  const ids = [caption, credit].filter(Boolean);
  if (ids.length) addToken(img, 'aria-describedby', ids.join(' '));
}

/* E005-04 — la pastille de certitude ne peut pas compter sur le seul title,
   souvent tu par les lecteurs d'écran : elle reçoit un nom accessible complet. */
function chantier04(body) {
  const chip = body.querySelector('.recit-conf');
  if (!chip || chip.hasAttribute('aria-label')) return;
  const visible = String(chip.textContent || '').trim();
  chip.setAttribute('aria-label', `Certitude : ${visible || 'non précisée'}. Mention reprise de l'audit.`);
}

/* E005-05 — deux liens d'évitement vers le point et le fil, insérés en tête du
   corps de lecture. Cibles rendues focalisables sans changer leur aspect. */
function chantier05(body, el) {
  if (body.querySelector('#e005-recit-skip-point')) return;
  const title = document.getElementById('recit-point-title');
  const thread = body.querySelector('.recit-thread');
  if (!title || !thread) return;
  const filId = idOf(thread, 'e005-recit-fil');
  if (filId) setOnce(thread, 'tabindex', '-1');
  const first = el('a', 'recit-e005-skip recit-e005-skip--point', 'Aller au point courant');
  first.id = 'e005-recit-skip-point';
  first.href = '#recit-point-title';
  const second = el('a', 'recit-e005-skip recit-e005-skip--fil', 'Aller au fil du repère');
  second.id = 'e005-recit-skip-fil';
  second.href = filId ? `#${filId}` : '#recit-point-title';
  body.insertBefore(first, body.firstChild);
  body.insertBefore(second, first.nextSibling);
}

/* E005-06 — les commandes et la légende deviennent des groupes nommés ; les
   commandes décrivent la légende, qui contient l'aide clavier en texte réel. */
function chantier06(body) {
  const actions = body.querySelector('.recit-actions');
  const legend = body.querySelector('.recit-legend');
  if (actions) {
    setOnce(actions, 'role', 'group');
    setOnce(actions, 'aria-label', 'Commandes de lecture du récit');
  }
  if (!legend) return;
  const legendId = idOf(legend, 'e005-recit-legende');
  setOnce(legend, 'role', 'group');
  setOnce(legend, 'aria-label', 'Légende et aide clavier');
  if (actions && legendId) addToken(actions, 'aria-describedby', legendId);
}

/* E005-07 — le compte de résultats filtrés est audible au moment où l'on
   atteint le champ de recherche, et lu en entier à chaque mise à jour. */
function chantier07(body) {
  const status = body.querySelector('#c3a-status');
  const search = body.querySelector('#c3a-search');
  if (!status || !search) return;
  setOnce(status, 'aria-atomic', 'true');
  addToken(search, 'aria-describedby', status.id || 'c3a-status');
}

/* E005-08 — la région d'annonce du point est durcie (atomic + relevant) sans
   jamais créer de deuxième région live. */
function chantier08() {
  const live = document.getElementById('atlas-recit-live');
  if (!live) return;
  setOnce(live, 'role', 'status');
  setOnce(live, 'aria-live', 'polite');
  setOnce(live, 'aria-atomic', 'true');
  setOnce(live, 'aria-relevant', 'additions text');
}

/* E005-09 — restauration du focus après reconstruction du DOM par la coque.
   Un seul écouteur document, armé une fois ; le focus n'est repris que s'il a
   réellement été perdu (nœud mémorisé déconnecté). */
let focusBound = false;
let lastKey = null;
let lastNode = null;

function focusKey(target) {
  if (!target || !target.closest) return null;
  if (!target.closest('.recit-layout')) return null;
  const control = target.closest('.recit-actions button, .recit-thread-item, .c3a-search, .c3a-filter, .c3a-reset, .recit-trace summary');
  if (!control) return null;
  return control.dataset.fk || control.id || null;
}

function bindFocus() {
  if (focusBound || typeof document === 'undefined') return;
  focusBound = true;
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target || !target.closest || !target.closest('.recit-layout')) {
      if (target !== document.body) {
        lastKey = null;
        lastNode = null;
      }
      return;
    }
    const key = focusKey(target);
    if (key) {
      lastKey = key;
      lastNode = target;
    }
  }, true);
}

function restoreFocus(layout) {
  if (!lastKey || !lastNode || lastNode.isConnected) return;
  const active = document.activeElement;
  if (active && active !== document.body && active !== document.documentElement) return;
  let target = null;
  try { target = document.querySelector(`[data-fk="${lastKey}"]`); }
  catch { return; }
  if (!target || !layout.contains(target)) return;
  lastKey = null;
  lastNode = null;
  try { target.focus({ preventScroll: true }); }
  catch { target.focus(); }
}

function chantier09(layout) {
  bindFocus();
  const later = () => { try { restoreFocus(layout); } catch { /* neutralisé */ } };
  if (typeof queueMicrotask === 'function') queueMicrotask(later);
  else later();
}

/* E005-10 — le corps de lecture devient un repère (landmark) nommé, accessible
   à la navigation par régions des lecteurs d'écran. */
function chantier10(body) {
  setOnce(body, 'role', 'region');
  setOnce(body, 'aria-label', 'Lecture guidée du point courant');
}

/* Le mouvement réduit est réévalué à chaque rendu et publié dans le document
   pour le repli CSS des liens d'évitement. */
function chantierMotion(reducedMotion) {
  if (typeof document === 'undefined') return;
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  document.documentElement.dataset.e005RecitMotion = reduce ? 'reduce' : 'full';
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E005', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !stage || !layout) return;
  safe(() => css(STYLE_ID, RULES));
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  safe(() => chantierMotion(reducedMotion));
  safe(() => chantier01(body));
  safe(() => chantier02(body));
  safe(() => chantier03(layout));
  safe(() => chantier04(body));
  safe(() => chantier05(body, el));
  safe(() => chantier06(body));
  safe(() => chantier07(body));
  safe(() => chantier08());
  safe(() => chantier09(layout));
  safe(() => chantier10(body));
});
