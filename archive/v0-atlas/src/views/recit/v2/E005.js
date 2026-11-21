import { register } from './registry.js';

/* V2 lentille E005 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
   Dix chantiers NEUFS, distincts de ceux de la passe 1 (progressbar, sémantique
   de liste, description de l'image, pastille de certitude, liens d'évitement,
   groupes commandes/légende, compteur de filtres, région d'annonce, restauration
   du focus et repère de lecture). Ici : repère de recherche, langue du document,
   récapitulatif textuel du fil, focus visible, cibles tactiles, position dans la
   liste, description du champ de recherche, traçabilité décrite, raccourcis du
   fil et mouvement réduit. Tout est additif : aucun attribut existant n'est
   écrasé, aucun texte n'est inventé, chaque chiffre est lu dans le DOM réel.
   Préfixes : ids v2-e005-, classes recit-v2-e005-. */

const RULES = `
.recit-v2-e005-thread-summary{margin:0 0 8px;color:var(--muted,#b9a98c);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}

/* E005-04 — focus visible renforcé sur TOUS les contrôles interactifs de la vue
   (la coque ne couvre que certains boutons). Contour ajouté, jamais retiré. */
.recit-layout button:focus-visible,
.recit-layout input:focus-visible,
.recit-layout summary:focus-visible,
.recit-layout a:focus-visible,
.recit-layout [role="button"]:focus-visible,
.recit-layout [tabindex]:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}

/* E005-05 — cibles tactiles portées à 36 px minimum sur les petits contrôles
   qui restaient à 28/30 px dans la feuille de la vue. */
.recit-layout .c3a-filter,
.recit-layout .c3a-reset,
.recit-layout .recit-trace summary{min-height:36px}

/* Repli mouvement réduit, propre à la V2, ciblé sur les seuls
   éléments animés de la vue (aucune règle globale, aucun !important large). */
html[data-recit-v2-e005-motion="reduce"] .recit-progress>span,
html[data-recit-v2-e005-motion="reduce"] .recit-thread-item,
html[data-recit-v2-e005-motion="reduce"] .c3a-filter{transition:none!important;animation:none!important}
`;

/* Pose un attribut seulement s'il est absent : enrichissement non destructif,
   y compris si une autre lentille est déjà passée sur le même nœud. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants (aria-describedby) sans écraser
   les valeurs déjà présentes ni créer de doublon. */
function addToken(node, name, token) {
  if (!node || !token) return;
  const current = node.getAttribute(name) || '';
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) !== -1) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Reprend l'identifiant existant d'un nœud, ou lui en donne un seul. */
function idOf(node, wanted) {
  if (!node || node.nodeType !== 1) return null;
  if (!node.id) node.id = wanted;
  return node.id || null;
}

/* Lecture de « Étape i / n · kind » : les deux nombres viennent du libellé réel
   calculé par la vue, jamais d'une constante. */
function stepOf(body) {
  const kicker = body.querySelector('.view-kicker');
  const found = kicker && String(kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  if (found) return { now: Number(found[1]), max: Number(found[2]) };
  const count = body.querySelectorAll('#c3a-thread .c3a-thread-item').length;
  return { now: count ? 1 : 0, max: count };
}

/* Comptage des facettes réellement présentes dans le fil filtré : les valeurs
   sont lues sur data-kind / data-confidence posés par la vue (recit.js). */
function facetsOf(thread) {
  const buttons = thread.querySelectorAll('#c3a-thread .c3a-thread-item');
  const kinds = {};
  const confs = {};
  Array.prototype.forEach.call(buttons, (button) => {
    const kind = button.getAttribute('data-kind') || 'point';
    const conf = button.getAttribute('data-confidence') || '—';
    kinds[kind] = (kinds[kind] || 0) + 1;
    confs[conf] = (confs[conf] || 0) + 1;
  });
  return { total: buttons.length, kinds: kinds, confs: confs };
}

function formatFacet(map) {
  return Object.keys(map).map((key) => `${key} ${map[key]}`).join(', ');
}

/* E005-01 — la barre d'outils devient un repère de recherche nommé, distinct
   des groupes « commandes » et « légende » déjà posés en passe 1. */
function chantier01(body) {
  const tools = body.querySelector('.c3a-tools');
  if (!tools) return;
  setOnce(tools, 'role', 'search');
  setOnce(tools, 'aria-label', 'Recherche et filtres du repère');
}

/* E005-02 — langue du document, posée une seule fois et seulement si absente.
   Un lang préexistant (fr, en, …) est impérativement conservé. */
function chantier02() {
  setOnce(document.documentElement, 'lang', 'fr');
}

/* E005-03 — récapitulatif textuel VISIBLE du fil : nombre d'items affichés,
   étape courante, répartition par type et par certitude. Tout est compté depuis
   les boutons réels du fil ; le paragraphe est relié au nav par aria-describedby. */
function chantier03(body, thread, el) {
  if (!thread) return;
  const facets = facetsOf(thread);
  const step = stepOf(body);
  const parts = [`Fil affiché : ${facets.total} point(s) sur ${step.max}.`];
  if (step.now) parts.push(`Point courant : ${step.now} sur ${step.max}.`);
  if (facets.total) {
    parts.push(`Types : ${formatFacet(facets.kinds)}.`);
    parts.push(`Certitudes : ${formatFacet(facets.confs)}.`);
  }
  const text = parts.join(' ');
  let summary = thread.querySelector('#v2-e005-thread-summary');
  if (!summary) {
    summary = el('p', 'recit-v2-e005-thread-summary', text);
    summary.id = 'v2-e005-thread-summary';
    const title = thread.querySelector('.recit-thread-title');
    if (title && title.nextSibling) thread.insertBefore(summary, title.nextSibling);
    else thread.appendChild(summary);
  } else if (String(summary.textContent || '') !== text) {
    summary.textContent = text;
  }
  addToken(thread, 'aria-describedby', summary.id);
}

/* E005-06 — position et taille des entrées du fil, recalculées à chaque rendu
   et donc exactes même après filtrage. Complète les role="listitem" de la passe 1. */
function chantier06(thread) {
  if (!thread) return;
  const items = thread.querySelectorAll('#c3a-thread > li');
  const size = items.length;
  Array.prototype.forEach.call(items, (item, i) => {
    setOnce(item, 'aria-posinset', String(i + 1));
    setOnce(item, 'aria-setsize', String(size));
  });
}

/* E005-07 — le champ de recherche est décrit à la fois par le compteur live de
   la passe 1 et par le récapitulatif du chantier 03 ; addToken préserve tout
   aria-describedby antérieur. */
function chantier07(body, thread) {
  const search = body.querySelector('#c3a-search');
  const summary = thread && thread.querySelector('#v2-e005-thread-summary');
  if (!search || !summary) return;
  addToken(search, 'aria-describedby', summary.id);
}

/* E005-08 — la liste d'identifiants de traçabilité devient la description du
   résumé <details> : l'auditeur entend les références sans ouvrir le panneau,
   et le texte réel du <summary> reste inchangé. */
function chantier08(body) {
  const trace = body.querySelector('details.recit-trace');
  if (!trace) return;
  const summary = trace.querySelector('summary');
  const ids = Array.prototype.find.call(trace.querySelectorAll('p'), (p) => /^Identifiants\s*:/.test(String(p.textContent || '').trim()));
  if (!summary || !ids) return;
  addToken(summary, 'aria-describedby', idOf(ids, 'v2-e005-trace-ids'));
}

/* E005-09 — le fil se parcourt avec ↑ ↓ Début/Fin (gestionnaire clé de la vue) :
   l'information est exposée aux lecteurs d'écran via aria-keyshortcuts. */
function chantier09(thread) {
  if (!thread) return;
  const buttons = thread.querySelectorAll('.c3a-thread-item');
  Array.prototype.forEach.call(buttons, (button) => {
    setOnce(button, 'aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
  });
}

/* E005-10 — mouvement réduit réévalué à chaque rendu, publié sur <html> sous un
   attribut propre à la V2, distinct de celui de la passe 1. */
function chantier10(reducedMotion) {
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  const wanted = reduce ? 'reduce' : 'full';
  if (document.documentElement.getAttribute('data-recit-v2-e005-motion') !== wanted) {
    document.documentElement.setAttribute('data-recit-v2-e005-motion', wanted);
  }
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E005', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !stage || !layout) return;
    safe(() => css('recit-v2-e005', RULES));
    const body = layout.querySelector('.recit-body');
    if (!body) return;
    const thread = body.querySelector('.recit-thread') || layout.querySelector('.recit-thread');
    safe(() => chantier01(body));
    safe(() => chantier02());
    safe(() => chantier03(body, thread, el));
    safe(() => chantier06(thread));
    safe(() => chantier07(body, thread));
    safe(() => chantier08(body));
    safe(() => chantier09(thread));
    safe(() => chantier10(reducedMotion));
  } catch { /* neutralisé : la vue reste lisible et inchangée */ }
});
