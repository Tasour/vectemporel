import { register, viewDiagnostics } from './registry.js';

/* Lentille E016 — « Gestion d'erreurs » de la vue chronologie.
 *
 * Dix filets de sécurité (E16-01 à E16-10) appliqués APRÈS le rendu de
 * chronology.js, qui appelle runEnhancements({ viewId, stage, layout }) en
 * fin de fonction (chronology.js:539). Aucune ligne de la vue ni du dataset
 * n'est modifiée : la lentille ne fait que réparer, signaler et annoncer.
 *
 * Contrat respecté : un seul register('E016', …), CSS unique via
 * ctx.css('chronology-e16', …), identifiants uniques, messages en français,
 * aucun appel à la console, aucun appel réseau, aucun aléa. Les nœuds créés ne
 * portent PAS d'identifiant contenant « -e16 » : _diagnostics.js masque par
 * défaut les éléments dont l'id suit /.*-e\d\d/ ; la traçabilité passe par
 * l'attribut data-e16, qui n'est pas concerné par ce masquage.
 */

const CSS_ID = 'chronology-e16';
const LIVE_ID = 'chronology-guard-live';
const DEGRADED_ID = 'chronology-guard-degraded';
const EMPTY_ID = 'chronology-guard-empty';

const CSS = `
.chrono-e16-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e16-fallback{color:var(--muted);font-size:9px;font-style:italic}
.e16-error,.e16-degraded{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:11px;line-height:1.5}
.e16-error strong,.e16-degraded strong{display:block;margin-bottom:3px;color:var(--gold-bright);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
@media (prefers-reduced-motion:reduce){.e16-fallback,.e16-error,.e16-degraded{transition:none!important}}
`;

/* Vocabulaire réellement observé dans src/data/dataset.js (six valeurs). */
const KNOWN_CONFIDENCE = new Set([
  'certain', 'probable', 'vérifié', 'disputé', 'disputed', 'non documenté',
]);
const ARIA_REF_ATTRS = ['aria-controls', 'aria-labelledby', 'aria-describedby'];
/* Seules les références créées par chronology.js sont réparées : un id
   introduit par une lentille postérieure n'est jamais supprimé ici. */
const CHRONO_ID = /^(atlas-chrono-|nav-c2a-|event-btn-|era-|tag-btn-|point-)/;
const BAD_YEAR = /NaN|undefined|Infinity/;

let api = null;

/* Aucun chantier ne peut faire échouer un autre chantier, ni le rendu. */
function guard(fn) {
  try { return fn(); } catch { return null; }
}

function makeEl(tag, className, text) {
  if (api && typeof api.el === 'function') return api.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mark(node, kind) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute('data-e16', kind);
}

function fallback(text) {
  const node = makeEl('span', 'e16-fallback', text);
  mark(node, 'fallback');
  return node;
}

/* Le stage est reconstruit à chaque rendu : une recherche locale suffit à
   garantir un identifiant unique sans interroger le réseau. */
function findById(stage, id) {
  if (!id) return null;
  if (typeof document !== 'undefined' && document.getElementById) {
    const found = document.getElementById(id);
    if (found) return found;
  }
  return guard(() => stage.querySelector(`[id='${id}']`));
}

/* Une seule région live par rendu, créée en fin de passe : les messages sont
   regroupés pour ne pas multiplier les annonces. */
function announce(stage, reports) {
  const messages = reports.filter(Boolean);
  if (!messages.length) return;
  guard(() => {
    let live = stage.querySelector(`#${LIVE_ID}`);
    if (!live) {
      live = makeEl('p', 'chrono-e16-sr-only');
      live.id = LIVE_ID;
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      mark(live, 'live');
      stage.appendChild(live);
    }
    live.textContent = `Contrôles d'affichage : ${messages.join(' · ')}.`;
  });
}

/* E16-01 — filet anti-rendu vide. chronology.js:209 sort tôt sans pays et
   ne peut pas appeler runEnhancements ; ici on couvre le cas où le layout a
   disparu entre la construction et la passe de greffons. */
function ensureRenderable(stage, layout) {
  if (layout && layout.parentNode === stage && stage.querySelector('#atlas-chrono-main')) return '';
  const box = makeEl('div', 'e16-error');
  box.id = EMPTY_ID;
  box.setAttribute('role', 'note');
  box.append(
    makeEl('strong', '', 'Affichage indisponible'),
    makeEl('span', '', ' La chronologie n’a pas pu être construite : certaines données sont manquantes ou un rendu a été interrompu. Les données vérifiées restent consultables depuis les autres vues.')
  );
  stage.appendChild(box);
  return 'vue indisponible signalée';
}

/* E16-02 — images en échec. chronology.js:397 et :434 posent un src local
   sans garde ; un fichier absent produit une image cassée muette. L'écoute
   error est posée après l'insertion, donc l'événement asynchrone est capté,
   et le contrôle immédiat couvre le cas déjà chargé en échec. */
function guardImages(stage) {
  let count = 0;
  stage.querySelectorAll('img').forEach((img) => {
    if (img.dataset && img.dataset.e16 === 'image') return;
    const replace = () => {
      if (!img.isConnected || (img.dataset && img.dataset.e16 === 'image')) return;
      if (img.dataset) img.dataset.e16 = 'image';
      const alt = (img.alt || '').trim();
      const node = fallback(alt ? `Illustration indisponible : ${alt}` : 'Illustration indisponible');
      if (img.parentNode) img.parentNode.replaceChild(node, img);
      count += 1;
    };
    img.addEventListener('error', replace, { once: true });
    if (img.complete && img.naturalWidth === 0) replace();
  });
  return count ? `${count} illustration(s) indisponible(s) remplacée(s) par du texte` : '';
}

/* E16-03 — années invalides. formatYear() (chronology.js:26) renvoie
   littéralement String(year) : NaN, undefined ou Infinity peuvent donc
   apparaître dans .event-year, .atlas-chrono-era-range et .aside-year. */
function guardYears(stage) {
  let count = 0;
  stage.querySelectorAll('.event-year, .atlas-chrono-era-range, .aside-year').forEach((node) => {
    const text = node.textContent || '';
    if (!BAD_YEAR.test(text) && text.trim()) return;
    if (node.classList.contains('aside-year')) {
      const parts = text.split(' · ');
      parts[0] = 'Année non renseignée';
      node.textContent = parts.join(' · ');
    } else {
      node.textContent = node.classList.contains('atlas-chrono-era-range')
        ? 'Période non renseignée'
        : 'Année non renseignée';
    }
    mark(node, 'year');
    count += 1;
  });
  return count ? `${count} année(s) ou période(s) non renseignée(s) signalée(s)` : '';
}

/* E16-04 — sources non résolues. chronology.js:493 retombe sur l'identifiant
   brut lorsqu'aucune source du pays ne correspond : on le dit explicitement
   sans inventer de titre bibliographique. */
function guardSources(stage) {
  let count = 0;
  stage.querySelectorAll('.point-sources li[data-source-id]').forEach((li) => {
    const id = (li.getAttribute('data-source-id') || '').trim();
    if (!id || (li.textContent || '').trim() !== id) return;
    li.appendChild(fallback(' — source non référencée'));
    mark(li, 'source');
    count += 1;
  });
  return count ? `${count} source(s) non référencée(s) signalée(s)` : '';
}

/* E16-05 — confiance inconnue. chronology.js:484 recopie point.confiance
   sans validation ; toute valeur hors du vocabulaire du dataset est signalée
   en texte et dans title, jamais par la seule couleur. */
function guardConfidence(stage) {
  let count = 0;
  stage.querySelectorAll('.confidence').forEach((node) => {
    if (node.dataset && node.dataset.e16 === 'confidence') return;
    const value = (node.textContent || '').trim();
    if (value && KNOWN_CONFIDENCE.has(value.toLowerCase())) return;
    node.appendChild(fallback(value ? ` « ${value} » (valeur non reconnue)` : 'non renseignée'));
    node.title = value
      ? `Valeur de confiance non reconnue : ${value}`
      : 'Niveau de confiance non renseigné';
    mark(node, 'confidence');
    count += 1;
  });
  return count ? `${count} niveau(x) de confiance non reconnu(s) signalé(s)` : '';
}

/* E16-06 — références ARIA orphelines. Les attributs sont posés aux
   lignes 291, 318, 335, 389, 511 et 512 de chronology.js. Une cible absente
   est retirée de l'attribut afin de ne pas annoncer un contrôle mort. */
function guardAriaRefs(stage) {
  let count = 0;
  [stage, ...stage.querySelectorAll('*')].forEach((node) => {
    if (!node || typeof node.getAttribute !== 'function') return;
    ARIA_REF_ATTRS.forEach((attr) => {
      const raw = node.getAttribute(attr);
      if (!raw) return;
      const ids = raw.split(/\s+/).filter(Boolean);
      const kept = ids.filter((id) => !CHRONO_ID.test(id) || Boolean(findById(stage, id)));
      if (kept.length === ids.length) return;
      if (kept.length) node.setAttribute(attr, kept.join(' '));
      else node.removeAttribute(attr);
      mark(node, 'aria');
      count += 1;
    });
  });
  return count ? `${count} référence(s) d’accessibilité orpheline(s) retirée(s)` : '';
}

/* E16-07 — identifiants dupliqués. Les doublons sont suffixés avec
   « -secours- » (et non « -e16- », voir en-tête) ; la recherche d'un id libre
   est déterministe, sans aléa. */
function guardDuplicateIds(stage) {
  const seen = new Set();
  let count = 0;
  stage.querySelectorAll('[id]').forEach((node) => {
    const id = node.id;
    if (!id) return;
    if (!seen.has(id)) { seen.add(id); return; }
    let suffix = 2;
    let next = `${id}-secours-${suffix}`;
    while (findById(stage, next)) { suffix += 1; next = `${id}-secours-${suffix}`; }
    node.id = next;
    mark(node, 'id');
    count += 1;
  });
  return count ? `${count} identifiant(s) dupliqué(s) rendu(s) unique(s)` : '';
}

/* E16-08 — état vide du filtre. chronology.js:359 pose déjà un texte ; on
   couvre le cas d'un nœud vidé ou masqué par une passe ultérieure. */
function guardEmptyFilter(stage) {
  const empty = stage.querySelector('#nav-c2a-empty-filter');
  if (!empty) return '';
  let changed = false;
  if (!(empty.textContent || '').trim()) {
    empty.textContent = 'Aucun repère ne correspond au filtre. Modifiez la recherche ou réinitialisez le filtre.';
    changed = true;
  }
  if (empty.hasAttribute('aria-hidden')) {
    empty.removeAttribute('aria-hidden');
    changed = true;
  }
  if (!changed) return '';
  mark(empty, 'empty');
  return 'état vide du filtre explicité';
}

/* E16-09 — cible de focus de secours. applyFocusIntent() (chronology.js:199)
   échoue silencieusement si le contrôle visé a disparu : garantir un h1
   tabindex=-1 donne une landing zone sans voler le focus. */
function guardFocusTarget(stage) {
  const target = stage.querySelector('[data-fk]')
    || stage.querySelector('#atlas-chrono-title')
    || stage.querySelector('h1');
  if (!target || target.getAttribute('tabindex') === '-1') return '';
  target.setAttribute('tabindex', '-1');
  mark(target, 'focus');
  return 'cible de focus de secours ajoutée';
}

/* E16-10 — mode dégradé. Le registre neutralise les greffons fautifs et
   conserve leurs messages dans viewDiagnostics(). Seuls les échecs des
   lentilles déjà appliquées (E001…E015) sont comptés, jamais une erreur
   future. Aucun détail technique n'est exposé à la personne qui lit. */
function guardDegraded(stage) {
  if (stage.querySelector(`#${DEGRADED_ID}`)) return '';
  const diag = guard(() => (typeof viewDiagnostics === 'function' ? viewDiagnostics() : null));
  if (!diag || !Array.isArray(diag.diagnostics)) return '';
  const order = Array.isArray(diag.entries) ? diag.entries : [];
  const position = order.indexOf('E016');
  const before = position > 0 ? order.slice(0, position) : [];
  const failures = diag.diagnostics.filter((item) => before.includes(item && item.id));
  if (!failures.length) return '';
  const box = makeEl('div', 'e16-degraded');
  box.id = DEGRADED_ID;
  box.setAttribute('role', 'note');
  box.append(
    makeEl('strong', '', 'Affichage dégradé'),
    makeEl('span', '', ` Certains modules d’aide à la lecture ne sont pas disponibles (${failures.length}). Les données vérifiées de la chronologie restent consultables.`)
  );
  stage.appendChild(box);
  return `affichage dégradé signalé (${failures.length} module(s))`;
}

register('E016', (ctx) => {
  api = ctx;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return;

  const reports = [];
  const run = (fn) => {
    const message = guard(() => fn());
    if (message) reports.push(message);
  };

  run(() => ensureRenderable(stage, ctx.layout));
  run(() => guardImages(stage));
  run(() => guardYears(stage));
  run(() => guardSources(stage));
  run(() => guardConfidence(stage));
  run(() => guardAriaRefs(stage));
  run(() => guardDuplicateIds(stage));
  run(() => guardEmptyFilter(stage));
  run(() => guardFocusTarget(stage));
  run(() => guardDegraded(stage));
  announce(stage, reports);
});
