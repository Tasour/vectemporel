import { register } from './registry.js';
import { state, currentCountry } from '../../domain/store.js';

/* Lentille E024 — « Filtres » (domaine C : consultation de la preuve).
 *
 * La vue Chronologie possède déjà une recherche locale et des boutons de
 * thèmes (chronology.js:309-345, chantier ATLAS-CHRONO-06). Cette lentille ne
 * réécrit aucune de ces règles : elle rend l'état du filtre lisible en texte,
 * réversible en un geste, et audible sans doubler la voix unique de
 * #nav-c2a-live. Les dix chantiers sont décrits dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E24.md.
 *
 * Un seul fichier possédé, aucun sélecteur de test modifié, aucune écriture
 * dans le store, zéro réseau, zéro aléa, zéro console, zéro minuteur, zéro rAF.
 */

const CSS_ID = 'chronology-e24';
const BAR_ID = 'e24-filter-bar';
const SUMMARY_ID = 'e24-filter-summary';
const RESET_ID = 'e24-reset';
const GROUP_ID = 'e24-tag-group';
const HELP_ID = 'e24-search-help';
const EMPTY_HINT_ID = 'e24-empty-hint';
const EMPTY_RESET_ID = 'e24-empty-reset';

const CSS = `
.e24-filter-bar{box-sizing:border-box;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
  min-width:0;margin:-2px 0 12px;padding:7px 10px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.02)}
.e24-filter-summary{flex:1 1 260px;min-width:0;margin:0;color:var(--muted);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e24-reset{min-height:36px;padding:6px 12px;border:1px solid var(--line);
  border-radius:8px;background:transparent;color:var(--gold-bright);
  font:inherit;font-size:10px;white-space:nowrap;cursor:pointer}
.e24-reset:hover:not([disabled]){border-color:var(--gold)}
.e24-reset[disabled]{opacity:.45;cursor:not-allowed}
.e24-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e24-tag-group{display:flex;flex:1 1 260px;flex-wrap:wrap;gap:5px;align-items:center;min-width:0}
.e24-tag-hint{flex:1 1 100%;margin:0;color:var(--muted-2);font-size:8px;line-height:1.3}
.e24-tag-count{margin-left:4px;padding:0 4px;border-radius:999px;
  background:rgba(230,185,111,.14);color:var(--gold-bright);
  font-size:8px;font-variant-numeric:tabular-nums}
.e24-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e24-empty-hint{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.4}
@media (max-width:620px){
  .e24-filter-bar{flex-direction:column;align-items:stretch}
  .e24-reset{width:100%}
}
@media (prefers-reduced-motion:reduce){
  .e24-filter-bar,.e24-reset,.e24-tag-count{transition:none!important}
}`;

function byId(id) {
  return document.getElementById(id);
}

function make(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function first(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function all(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

/* E24-03 : lectures seules du store. Aucun set(), aucune écriture dans state. */
function contextData() {
  const country = currentCountry();
  const events = country && Array.isArray(country.events) ? country.events : [];
  const eras = country && Array.isArray(country.eras) ? country.eras : [];
  const index = Number.isInteger(state.eraIndex) ? state.eraIndex : 0;
  const era = eras[Math.max(0, Math.min(eras.length - 1, index))] || null;
  const eraEvents = era ? events.filter((item) => item && item.eraId === era.id) : [];
  return { country, events, era, eraEvents };
}

/* L'état du filtre appartient à chronology.js (local.query / local.tag). La
 * lentille le relit dans le DOM plutôt que de le dupliquer. */
function activeQuery() {
  const search = byId('atlas-chrono-search');
  return search && typeof search.value === 'string' ? search.value.trim() : '';
}

function activeTagNode() {
  return first(document, '#atlas-chrono-tools .atlas-chrono-tag[aria-pressed="true"]')
    || first(document, '#atlas-chrono-aside .atlas-chrono-tag[aria-pressed="true"]');
}

function activeTag() {
  const node = activeTagNode();
  return node && node.dataset ? (node.dataset.tag || '') : '';
}

/* Les cartes, pas les <li> : en état vide la liste contient un <li> de message. */
function shownCount() {
  return all(document, '#atlas-chrono-events .event-card').length;
}

function criteriaText(query, tag) {
  const parts = [];
  if (query) parts.push(`recherche « ${query} »`);
  if (tag) parts.push(`thème « ${tag} »`);
  return parts;
}

/* E24-01 + E24-03 : texte visible, jamais aria-live (E24-08). */
function summaryText(data, query, tag, shown) {
  if (!data.country) return 'Filtres : aucun pays sélectionné.';
  const parts = criteriaText(query, tag);
  const criteria = parts.length ? parts.join(' · ') : 'aucun filtre actif';
  const filtering = Boolean(query || tag);
  const counts = filtering
    ? `${shown} / ${data.events.length} repères du pays · ${Math.max(0, data.events.length - shown)} masqué(s) · ère courante : ${data.eraEvents.length} repère(s)`
    : `${shown} / ${data.eraEvents.length} repère(s) de l'ère · ${data.events.length} repères au total dans ce pays`;
  const eraName = data.era ? `ère « ${data.era.name} »` : 'ère non documentée';
  return `Filtres : ${criteria} · ${eraName} · ${counts}.`;
}

function focusSearch() {
  const search = byId('atlas-chrono-search');
  if (!search || typeof search.focus !== 'function') return;
  try { search.focus({ preventScroll: true }); }
  catch { try { search.focus(); } catch { /* focus indisponible : sans effet */ } }
}

/* E24-02 : le geste passe par les écouteurs de la vue. On relit le thème
 * APRÈS le « input » car ce rendu remplace les nœuds du dom. */
function resetFilters() {
  const search = byId('atlas-chrono-search');
  if (search && search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const tag = activeTagNode();
  if (tag && typeof tag.click === 'function') tag.click();
  focusSearch();
}

function bindReset() {
  const reset = byId(RESET_ID);
  if (!reset || reset.dataset.e24Bound === '1') return;
  reset.dataset.e24Bound = '1';
  reset.addEventListener('click', () => resetFilters());
}

function buildBar(ctx) {
  const tools = byId('atlas-chrono-tools');
  if (!tools) return null;
  const existing = byId(BAR_ID);
  if (existing && existing.isConnected) return existing;

  const bar = make(ctx, 'div', 'e24-filter-bar');
  bar.id = BAR_ID;
  const summary = make(ctx, 'p', 'e24-filter-summary');
  summary.id = SUMMARY_ID;
  const reset = make(ctx, 'button', 'e24-reset', 'Réinitialiser les filtres');
  reset.id = RESET_ID;
  reset.type = 'button';
  reset.setAttribute('aria-controls', 'atlas-chrono-events');
  bar.append(summary, reset);

  const parent = tools.parentNode;
  if (parent) parent.insertBefore(bar, tools.nextSibling);
  else tools.appendChild(bar);
  return bar;
}

/* E24-06 : on regroupe les boutons existants sans les recréer ; leurs ids,
 * data-tag, aria-pressed et écouteurs restent ceux de la vue. */
function groupThemeButtons(ctx) {
  const tools = byId('atlas-chrono-tools');
  if (!tools) return;
  const buttons = Array.from(tools.children || []).filter(
    (node) => node.classList && node.classList.contains('atlas-chrono-tag')
  );
  if (!buttons.length) return;

  let group = byId(GROUP_ID);
  if (!group || !group.isConnected) {
    group = make(ctx, 'div', 'e24-tag-group');
    group.id = GROUP_ID;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Filtrer par un thème — un seul à la fois');
    const hint = make(ctx, 'p', 'e24-tag-hint',
      'Un seul thème à la fois ; recliquer le thème actif retire le filtre.');
    hint.id = 'e24-tag-hint';
    group.appendChild(hint);

    const search = byId('atlas-chrono-search');
    if (search && search.parentNode === tools) tools.insertBefore(group, search.nextSibling);
    else tools.appendChild(group);
  }
  buttons.forEach((button) => group.insertBefore(button, group.firstChild));
}

/* E24-04 : le compteur est dérivé des tags réels du pays, jamais codé en dur. */
function badgeTags(data) {
  all(document, '.atlas-chrono-tag[data-tag]').forEach((node) => {
    const tag = node.dataset.tag || '';
    if (!tag) return;
    const count = data.events.filter((item) => item && Array.isArray(item.tags)
      && item.tags.includes(tag)).length;
    let badge = first(node, '.e24-tag-count');
    if (!badge) {
      badge = make(null, 'span', 'e24-tag-count', String(count));
      badge.setAttribute('aria-hidden', 'true');
      node.appendChild(badge);
    } else {
      badge.textContent = String(count);
    }
    node.setAttribute('aria-label', `Thème « ${tag} » — ${count} repère(s)`);
  });
}

/* E24-05 + E24-07 : description du périmètre et Échap déterministe. */
function describeSearch(ctx) {
  const search = byId('atlas-chrono-search');
  if (!search) return;

  let help = byId(HELP_ID);
  if (!help || !help.isConnected) {
    help = make(ctx, 'p', 'e24-sr-only',
      'La recherche porte sur le titre, le sous-titre, le résumé, l’année, les thèmes et le texte des points des repères de ce pays. Dès qu’un filtre est actif, la liste parcourt tous les repères du pays et non plus la seule ère courante. Échap vide le champ.');
    help.id = HELP_ID;
    const tools = byId('atlas-chrono-tools');
    if (tools) tools.appendChild(help);
  }

  const described = (search.getAttribute('aria-describedby') || '')
    .split(/\s+/).filter(Boolean);
  if (!described.includes(HELP_ID)) {
    described.push(HELP_ID);
    search.setAttribute('aria-describedby', described.join(' '));
  }

  if (search.dataset.e24EscBound === '1') return;
  search.dataset.e24EscBound = '1';
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const field = byId('atlas-chrono-search');
    if (!field || !field.value) return;
    event.preventDefault();
    event.stopPropagation();
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/* E24-09 : l'état vide garde ses critères lisibles et son bouton adressable. */
function enrichEmptyState(ctx, query, tag) {
  const empty = byId('nav-c2a-empty-filter');
  if (!empty) return;
  const parts = criteriaText(query, tag);
  const text = parts.length
    ? `Aucun repère pour ${parts.join(' et ')}. Retirez un critère ou utilisez « Réinitialiser les filtres ».`
    : 'Aucun repère pour ce filtre. Retirez un critère ou utilisez « Réinitialiser les filtres ».';

  let hint = byId(EMPTY_HINT_ID);
  if (!hint || !hint.isConnected) {
    hint = make(ctx, 'p', 'e24-empty-hint');
    hint.id = EMPTY_HINT_ID;
    empty.insertBefore(hint, empty.firstChild);
  }
  hint.textContent = text;

  const baseReset = first(empty, 'button');
  if (baseReset && !baseReset.id) baseReset.id = EMPTY_RESET_ID;
}

function updateBar(data) {
  const summary = byId(SUMMARY_ID);
  const reset = byId(RESET_ID);
  if (!summary || !reset) return;
  const query = activeQuery();
  const tag = activeTag();
  summary.textContent = summaryText(data, query, tag, shownCount());
  reset.disabled = !(query || tag);
}

register('E024', (ctx) => {
  if (!ctx || (!ctx.stage && !ctx.layout)) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (!byId('atlas-chrono-tools')) return;

  groupThemeButtons(ctx);
  if (!buildBar(ctx)) return;
  const data = contextData();
  badgeTags(data);
  describeSearch(ctx);
  enrichEmptyState(ctx, activeQuery(), activeTag());
  updateBar(data);
  bindReset();
});
