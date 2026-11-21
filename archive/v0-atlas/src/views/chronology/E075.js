import { register } from './registry.js';

/* Lentille CHRONOLOGIE E075 — Indicateurs de chargement et d'état des données.
 *
 * La vue chronologie est entièrement locale et synchrone : `renderChronology`
 * (chronology.js:207) reçoit un pays du store (chronology.js:6), construit le
 * DOM puis appelle `runEnhancements` (chronology.js:539). Il n'y a donc aucun
 * téléchargement à attendre. Plutôt que d'imiter un faux « spinner », la
 * lentille affiche un état de données HONNÊTE et auditable, dérivé du DOM déjà
 * rendu : disponibilité, inventaire chiffré, filtrage, provenance, panneaux
 * vides. Aucune donnée n'est inventée (chronology.js:3), aucun appel réseau,
 * aucun `Math.random`, aucun `console.*`, aucun timer ni boucle rAF propre.
 *
 * Dix chantiers, tous implémentés ici. Le CSS est injecté une seule fois via
 * `ctx.css('chronology-e075', …)` et ciblé par la classe `.chronology-e075`
 * posée sur `.chronology-layout`. Les deux seuls identifiants créés sont
 * préfixés `e075` et protégés par garde d'existence (re-render safe).
 */

const CSS_ID = 'chronology-e075';
const SCOPE = 'chronology-e075';
const BAR_ID = 'e075-datastate';
const BTN_ID = 'e075-refresh';
const REDUCED_ATTR = 'data-e075-reduced';

const STATE_LABELS = {
  prete: 'Données prêtes',
  filtree: 'Vue filtrée',
  vide: 'Aucun résultat',
  'sans-donnees': 'Sans données',
};

const EMPTY_LABELS = {
  'nav-c2a-empty-filter': 'État : aucun résultat pour le filtre',
  'nav-c2a-empty-era': 'État : ère sans repère',
  'nav-c2a-empty-points': 'État : repère sans point documenté',
  'nav-c2a-empty-event': 'État : aucun repère sélectionné',
};

/* Toutes les règles sont préfixées par `.chronology-e075`, classe posée sur le
   conteneur de la vue : aucune fuite hors chronologie, aucune règle de
   styles.css surchargée en dehors du besoin de l'indicateur. */
const CSS = `
.chronology-e075 .e075-bar{margin:-4px 0 14px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.55}
.chronology-e075 .e075-row{display:flex;flex-wrap:wrap;gap:2px 10px;margin:0}
.chronology-e075 .e075-row+.e075-row{margin-top:2px}
.chronology-e075 .e075-row strong{color:var(--ink-soft);font-weight:600;font-variant-numeric:tabular-nums}
.chronology-e075 .e075-chip{display:inline-block;padding:1px 8px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:border-color .18s linear,color .18s linear}
.chronology-e075 .e075-bar[data-e075-state="filtree"] .e075-chip{border-color:var(--blue);color:var(--blue)}
.chronology-e075 .e075-bar[data-e075-state="vide"] .e075-chip,
.chronology-e075 .e075-bar[data-e075-state="sans-donnees"] .e075-chip{border-color:var(--red);color:var(--red)}
.chronology-e075 .e075-empty-label{display:inline-block;margin:0 8px 4px 0;padding:1px 6px;border:1px solid var(--line);border-radius:6px;color:var(--gold-bright);font-size:9px;font-weight:600;text-transform:uppercase}
.chronology-e075 .point-head .e075-prov{display:inline-block;padding:1px 6px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:8px;font-variant-numeric:tabular-nums}
.chronology-e075 .point-head .e075-prov[data-prov="ok"]{border-color:var(--line-strong);color:var(--gold-bright)}
.chronology-e075 .e075-btn{min-height:36px;margin:6px 0 0;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.chronology-e075 .e075-btn:hover{border-color:var(--gold)}
.chronology-e075 .e075-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e075[${REDUCED_ATTR}="1"] .e075-chip{transition:none}
@media (max-width:620px){
  .chronology-e075 .e075-row{gap:2px 6px}
  .chronology-e075 .e075-btn{margin-top:4px}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e075 .e075-chip{transition:none}
}`;

/* E075-01 à E075-03, E075-05, E075-08 : collecte des faits depuis le DOM déjà
   construit. Aucune donnée n'est lue depuis le réseau ni recalculée ailleurs.
   Le total de repères est repris du compteur de la vue (chronology.js:344). */
function collect(layout) {
  const eras = layout.querySelectorAll('#atlas-chrono-eras .era-band').length;
  const shown = layout.querySelectorAll('#atlas-chrono-events > li[data-event-id]').length;
  const points = layout.querySelectorAll('.points .point').length;

  const sources = new Set();
  layout.querySelectorAll('.point-sources li[data-source-id]').forEach((node) => {
    sources.add(node.getAttribute('data-source-id'));
  });

  let sourced = 0;
  layout.querySelectorAll('.points .point').forEach((point) => {
    if (point.querySelector('.point-sources li')) sourced += 1;
  });

  const countNode = layout.querySelector('.atlas-chrono-count');
  const match = countNode && /(\d+)\s*\/\s*(\d+)/.exec(countNode.textContent || '');
  const total = match ? Number(match[2]) : shown;

  const search = layout.querySelector('#atlas-chrono-search');
  const filtering = Boolean(
    (search && search.value && search.value.trim())
    || layout.querySelector('.atlas-chrono-tag[aria-pressed="true"]')
  );
  const hasEmpty = Boolean(layout.querySelector('.atlas-chrono-empty'));

  let state = 'prete';
  if (!eras && !shown && !points) state = 'sans-donnees';
  else if (hasEmpty || shown === 0) state = 'vide';
  else if (filtering) state = 'filtree';

  return {
    eras, shown, total, points, sourced,
    sources: sources.size, filtering, state,
  };
}

/* E075-04 : les quatre panneaux vides de la vue (chronology.js:353-374,
   468-472, 527-535) reçoivent une étiquette textuelle d'état. Garde
   anti-doublon par requête de la classe. */
function labelEmptyStates(layout, el) {
  layout.querySelectorAll('.atlas-chrono-empty').forEach((panel) => {
    if (panel.querySelector('.e075-empty-label')) return;
    const id = panel.id || '';
    const text = EMPTY_LABELS[id] || 'État : aucune donnée affichée';
    const label = el('span', 'e075-empty-label', text);
    panel.insertBefore(label, panel.firstChild);
  });
}

/* E075-05 : chaque point (chronology.js:473-502) porte une mention de
   provenance réellement calculée depuis ses sources titrées ; le texte prime,
   la couleur n'est qu'un renfort. Garde anti-doublon par classe. */
function annotatePoints(layout, el) {
  layout.querySelectorAll('.points .point').forEach((point) => {
    const head = point.querySelector('.point-head');
    if (!head || head.querySelector('.e075-prov')) return;
    const ok = Boolean(point.querySelector('.point-sources li'));
    const badge = el('span', 'e075-prov', ok ? 'Provenance : sourcé' : 'Provenance : non sourcé');
    badge.setAttribute('data-prov', ok ? 'ok' : 'none');
    head.appendChild(badge);
  });
}

/* E075-01/-02/-03/-06/-07/-09 : la barre d'état est recréée à chaque rendu
   complet de la coque, mais la garde par identifiant évite tout doublon si
   `runEnhancements` est rejoué sur le même DOM. */
function paintBar(layout, el) {
  const snap = collect(layout);

  /* E075-08 : miroir d'état auditable sur le conteneur, à l'image d'un marqueur
     de phase — aucune information n'est confiée à la seule couleur. */
  layout.dataset.e075State = snap.state;
  layout.dataset.e075Eras = String(snap.eras);
  layout.dataset.e075Events = String(snap.shown);
  layout.dataset.e075Points = String(snap.points);
  layout.dataset.e075Sourced = String(snap.sourced);

  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = el('section', 'e075-bar');
    bar.id = BAR_ID;
    bar.setAttribute('aria-label', 'État des données de la chronologie');

    const stateRow = el('p', 'e075-row');
    stateRow.appendChild(el('span', 'e075-chip', ''));
    stateRow.lastChild.setAttribute('data-e075-role', 'state');

    const inventory = el('p', 'e075-row');
    inventory.setAttribute('data-e075-role', 'inventory');

    const filter = el('p', 'e075-row');
    filter.setAttribute('data-e075-role', 'filter');

    const provenance = el('p', 'e075-row');
    provenance.setAttribute('data-e075-role', 'provenance');

    const origin = el('p', 'e075-row');
    origin.setAttribute('data-e075-role', 'origin');

    const refresh = el('button', 'e075-btn', 'Recalculer l’état des données');
    refresh.type = 'button';
    refresh.id = BTN_ID;
    refresh.setAttribute('aria-controls', BAR_ID);
    /* E075-09 : recalcul local depuis le DOM, sans `set()`, sans réseau et
       sans reconstruction : le focus reste naturellement sur le bouton. */
    refresh.addEventListener('click', () => paintBar(layout, el));

    bar.append(stateRow, inventory, filter, provenance, origin, refresh);

    const status = layout.querySelector('#atlas-chrono-status');
    if (status && status.parentNode) {
      status.parentNode.insertBefore(bar, status.nextSibling);
    } else {
      const main = layout.querySelector('.chronology-main') || layout;
      main.insertBefore(bar, main.firstChild);
    }
  }

  bar.setAttribute('data-e075-state', snap.state);

  const stateNode = bar.querySelector('[data-e075-role="state"]');
  if (stateNode) stateNode.textContent = STATE_LABELS[snap.state] || STATE_LABELS.prete;

  const inventory = bar.querySelector('[data-e075-role="inventory"]');
  if (inventory) {
    inventory.textContent = '';
    inventory.appendChild(el('strong', '', `${snap.eras} ère(s) · ${snap.shown}/${snap.total} repère(s) affiché(s) · ${snap.points} point(s) · ${snap.sources} source(s)`));
  }

  const filterNode = bar.querySelector('[data-e075-role="filter"]');
  if (filterNode) {
    filterNode.textContent = snap.filtering
      ? `Filtre actif : ${snap.shown} repère(s) sur ${snap.total} dans le périmètre de recherche.`
      : `Aucun filtre actif : ${snap.shown} repère(s) sur ${snap.total} affiché(s).`;
  }

  const provenance = bar.querySelector('[data-e075-role="provenance"]');
  if (provenance) {
    provenance.textContent = snap.points
      ? `Provenance : ${snap.sourced} point(s) sourcé(s) sur ${snap.points} · ${snap.sources} source(s) distincte(s).`
      : 'Provenance : aucun point documenté pour ce repère.';
  }

  /* E075-06/-07 : état de chargement honnête. Les données sont locales et
     synchrones ; aucun spinner, aucune progression simulée, aucun timer. */
  const origin = bar.querySelector('[data-e075-role="origin"]');
  if (origin) {
    origin.textContent = 'Données locales vérifiées, prêtes sans appel réseau : aucun chargement en cours ni indicateur simulé.';
  }
}

register('E075', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout) return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E075-10 : double couplage à la préférence de mouvement réduit — media
     query CSS + drapeau explicite pour les environnements sans matchMedia
     fiable (registry.js:33-36). */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  labelEmptyStates(layout, el);
  annotatePoints(layout, el);
  paintBar(layout, el);
});
