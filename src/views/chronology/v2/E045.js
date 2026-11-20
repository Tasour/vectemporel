import { register } from './registry.js';

/* Lentille E045 — bandes étiquetées (ère, amplitude, compte).
 *
 * Domaine E (accessibilité & ARIA), sous-domaine A (frise & ères) de la passe
 * V2. Fichier possédé : src/views/chronology/v2/E045.js uniquement.
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E045.md — chantiers E045-01 à
 * E045-10. Lectures seules : les modèles de qualité de la passe 1
 * (src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md).
 * Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, ctx.css, ctx.el, ctx.reducedMotion.
 * Le registre V2 n'expose pas say() : la lentille n'ajoute AUCUNE région live,
 * elle n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E045', ctx => …), un seul
 *   ctx.css('chronology-v2-e045', …) ;
 * - tous les IDs créés sont préfixés chronology-v2-e045- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - chaque chiffre est dérivé du DOM (data-start, data-end, li[data-era-id]),
 *   jamais codé en dur ; le statut visible détermine le périmètre du compte ;
 * - zéro console.*, zéro réseau, zéro Math.random, zéro innerHTML, zéro timer,
 *   zéro boucle d'animation, zéro vol de focus.
 *
 * Répartition des dix chantiers (aucun chevauchement d'effet) :
 * 01 nom accessible (aria-label) · 02 amplitude visible · 03 compte visible ·
 * 04 description associée (aria-describedby) · 05 rang ordinal ·
 * 06 état « ère courante » en texte · 07 valeurs machine <data> ·
 * 08 légende globale · 09 récapitulatif et signature de fraîcheur ·
 * 10 contraste et mouvement réduit.
 */

const CSS_ID = 'chronology-v2-e045';
const LEGEND_ID = 'chronology-v2-e045-legend';
const LEGEND_TITLE_ID = 'chronology-v2-e045-legend-title';
const RECAP_ID = 'chronology-v2-e045-recap';
const DESC_PREFIX = 'chronology-v2-e045-desc-';
const MAIN_ID = 'atlas-chrono-main';
const ERAS_ID = 'atlas-chrono-eras';
const EVENTS_ID = 'atlas-chrono-events';
const STATUS_ID = 'atlas-chrono-status';

/* E045-08 et E045-10 : une seule feuille, injectée une fois par ctx.css. Le
   panneau est un bloc en flux normal en fin de colonne (jamais une modale,
   jamais superposé, jamais tabindex=-1) : il n'ajoute aucun arrêt Tab et ne
   masque ni la frise ni la fiche. Aucune animation n'est créée. */
const CSS = `
  #${LEGEND_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${LEGEND_ID} .e045-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${LEGEND_ID} .e045-lede { margin: 0 0 8px; color: var(--muted); }
  #${LEGEND_ID} .e045-keys { margin: 0 0 8px; padding: 0; list-style: none; }
  #${LEGEND_ID} .e045-key { display: flex; gap: 8px; margin: 0 0 4px; }
  #${LEGEND_ID} .e045-key-name {
    flex: 0 0 76px; color: var(--gold-bright); font-weight: 600;
  }
  #${LEGEND_ID} .e045-key-text { flex: 1 1 auto; min-width: 0; }
  #${LEGEND_ID} .e045-descriptions {
    margin: 8px 0 0; padding: 8px 0 0; list-style: none;
    border-top: 1px solid var(--line);
  }
  #${LEGEND_ID} .e045-descriptions li { margin: 0 0 3px; color: var(--muted-2); }
  #${LEGEND_ID} .e045-recap { margin: 6px 0 0; color: var(--ink-soft); }
  #${LEGEND_ID} .e045-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E045-02, E045-03, E045-05, E045-06, E045-07 : les étiquettes sont des
     fragments en flux dans la bande ; elles n'ajoutent aucun arrêt Tab. */
  .era-band .e045-meta {
    display: flex; flex-wrap: wrap; gap: 2px 8px;
    margin: 1px 0 0; font-size: 8px; line-height: 1.35;
    font-variant-numeric: tabular-nums;
  }
  .era-band .e045-amplitude,
  .era-band .e045-count,
  .era-band .e045-rank,
  .era-band .e045-current,
  .era-band .e045-machine { color: var(--muted); }
  .era-band .e045-current {
    padding: 0 4px; border: 1px solid var(--gold); border-radius: 4px;
    color: var(--gold-bright);
  }
  .era-band .e045-machine { color: var(--muted-2); }

  @media (max-width: 620px) {
    #${LEGEND_ID} .e045-key { flex-wrap: wrap; gap: 2px 8px; }
    #${LEGEND_ID} .e045-key-name { flex-basis: 64px; }
    .era-band .e045-meta { gap: 2px 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${LEGEND_ID}, #${LEGEND_ID} *, .era-band .e045-meta * {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${LEGEND_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${LEGEND_ID} .e045-title,
    #${LEGEND_ID} .e045-key-name,
    .era-band .e045-current { color: CanvasText; border-color: CanvasText; }
  }
`;

/* E045-08 : vocabulaire de la légende. Les cinq entrées correspondent
   exactement aux cinq effets DOM distincts des chantiers 02, 03, 05, 06 et 07. */
const LEGEND_ROWS = [
  ['Nom', 'Le nom de l’ère reste le premier texte de la bande ; il est repris dans le nom accessible.'],
  ['Amplitude', 'Durée calculée depuis les attributs data-start et data-end de la bande, en années.'],
  ['Compte', 'Nombre de repères portant l’attribut data-era-id de l’ère dans la liste affichée.'],
  ['Rang', 'Position ordinale de la bande parmi toutes les bandes de ères du pays.'],
  ['État courant', 'Mention « Ère courante » en texte, doublée de l’attribut aria-current existant.'],
];

let installCount = 0;
let refs = {
  legend: null, recap: null, metric: null,
  bands: 0, counted: 0, amplitude: 0, filtering: false, reduced: false, signature: '',
};

/* E045-08 et E045-10 : garde d'existence pour toute ID préfixée e045. Un nœud
   déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app (shell.js:533), un nœud du rendu précédent est détaché
   et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E045-02, E045-03, E045-05, E045-06, E045-07 : les étiquettes de bande n'ont
   pas d'ID (les IDs sont réservés aux nœuds préfixés du panneau). La garde
   s'appuie donc sur un enfant direct de classe e045-*, réutilisé puis réécrit. */
function ensureChild(make, parent, className, tagName) {
  let node = null;
  const children = parent.children;
  for (let index = 0; index < children.length; index += 1) {
    const candidate = children[index];
    if (candidate.classList && candidate.classList.contains(className)) {
      node = candidate;
      break;
    }
  }
  if (!node) {
    node = make(tagName, className);
    parent.appendChild(node);
  }
  return node;
}

function setChild(make, parent, className, tagName, text) {
  if (text === null || text === undefined || text === '') {
    const stale = ensureChild(make, parent, className, tagName);
    if (stale && stale.parentElement) stale.remove();
    return null;
  }
  const node = ensureChild(make, parent, className, tagName);
  if (node.textContent !== text) node.textContent = text;
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, name, value) {
  const key = `e045${name}`;
  if (node.dataset[key] !== value) node.dataset[key] = value;
}

/* E045-02 et E045-07 : même formateur que la vue (chronology.js:27-29) pour
   que les bornes lisibles restent cohérentes avec la frise, sans date inventée. */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function readYear(band, key) {
  const raw = band.dataset[key];
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function plural(count, singular, multiple) {
  return `${count} ${count > 1 ? multiple : singular}`;
}

/* E045-03 : le compte est dérivé des seules cartes réellement présentes dans
   la liste (chronology.js:349-384), jamais d'une copie du store. */
function collectCounts() {
  const counts = new Map();
  const list = document.getElementById(EVENTS_ID);
  if (!list) return counts;
  const items = list.querySelectorAll('li[data-era-id]');
  for (let index = 0; index < items.length; index += 1) {
    const id = items[index].dataset.eraId;
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

/* E045-03 : le statut visible (chronology.js:248-256) distingue le périmètre
   « ère courante » du périmètre « recherche dans tout le pays ». Le compte
   change donc de portée sans lire l'état interne de la vue. */
function isFiltering() {
  const status = document.getElementById(STATUS_ID);
  const text = status ? status.textContent || '' : '';
  return text.includes('Recherche dans les') || text.includes('périmètre de recherche');
}

function bandList() {
  const nav = document.getElementById(ERAS_ID);
  if (!nav) return [];
  return Array.prototype.slice.call(nav.querySelectorAll('.era-band'));
}

function buildLegend(make, host, descriptions) {
  const legend = ensureNode(make, LEGEND_ID, 'section', 'e045-legend', host);
  legend.setAttribute('role', 'region');
  legend.setAttribute('aria-labelledby', LEGEND_TITLE_ID);

  const title = make('h2', 'e045-title', 'Étiquettes des bandes d’ère');
  title.id = LEGEND_TITLE_ID;
  const lede = make('p', 'e045-lede', 'Lecture des bandes : chaque ère porte un nom, une amplitude, un compte de repères, un rang et un état courant. Tous les chiffres sont dérivés du DOM de la frise, aucun n’est codé en dur.');

  const keys = make('ul', 'e045-keys');
  LEGEND_ROWS.forEach(([name, text]) => {
    const row = make('li', 'e045-key');
    row.append(make('span', 'e045-key-name', name), make('span', 'e045-key-text', text));
    keys.appendChild(row);
  });

  const list = make('ul', 'e045-descriptions');
  descriptions.forEach(({ id, text }) => {
    const item = make('li');
    const line = make('p', 'e045-desc', text);
    line.id = id;
    item.appendChild(line);
    list.appendChild(item);
  });

  const recap = make('p', 'e045-recap');
  recap.id = RECAP_ID;
  const metric = make('p', 'e045-metric');

  legend.replaceChildren(title, lede, keys, list, recap, metric);
  return { legend, recap, metric };
}

/* E045-01 à E045-07 : une seule passe sur les bandes. Chaque chantier écrit
   un effet distinct : attribut aria-label, texte d'amplitude, texte de compte,
   aria-describedby, rang, état courant, éléments <data>. */
function labelBands(make, counts, filtering) {
  const bands = bandList();
  const total = bands.length;
  const descriptions = [];
  let amplitudeTotal = 0;
  let counted = 0;

  bands.forEach((band, index) => {
    const start = readYear(band, 'start');
    const end = readYear(band, 'end');
    const amplitude = start !== null && end !== null && end >= start ? end - start : null;
    const eraId = band.dataset.eraId || '';
    const count = counts.get(eraId) || 0;
    const nameNode = band.querySelector(':scope > span:not([class])');
    const name = nameNode ? (nameNode.textContent || '').trim() : eraId;
    const current = band.getAttribute('aria-current') === 'true';
    const range = start !== null && end !== null
      ? `${formatYear(start)} → ${formatYear(end)}`
      : 'bornes indisponibles';
    const amplitudeText = amplitude === null
      ? 'Amplitude : indisponible'
      : `Amplitude : ${plural(amplitude, 'an', 'ans')}`;
    const countText = `Compte : ${plural(count, 'repère affiché', 'repères affichés')}`;
    const rankText = `Ère ${index + 1} / ${total}`;

    if (amplitude !== null) amplitudeTotal += amplitude;
    counted += count;

    /* E045-02, E045-03, E045-05, E045-06, E045-07 : un conteneur unique par
       bande, réutilisé à chaque rendu, puis cinq fragments distincts. */
    let meta = null;
    const children = band.children;
    for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
      if (children[childIndex].classList && children[childIndex].classList.contains('e045-meta')) {
        meta = children[childIndex];
        break;
      }
    }
    if (!meta) {
      meta = make('span', 'e045-meta');
      band.appendChild(meta);
    }
    setChild(make, meta, 'e045-amplitude', 'span', amplitudeText);
    setChild(make, meta, 'e045-count', 'span', countText);
    setChild(make, meta, 'e045-rank', 'span', rankText);
    setChild(make, meta, 'e045-current', 'span', current ? 'Ère courante' : null);
    let machine = ensureChild(make, meta, 'e045-machine', 'span');
    if (start !== null && end !== null) {
      const lower = make('data', 'e045-bound', formatYear(start));
      const upper = make('data', 'e045-bound', formatYear(end));
      lower.value = String(start);
      upper.value = String(end);
      machine.replaceChildren(
        make('span', 'e045-machine-label', 'Bornes lisibles par machine : '),
        lower, make('span', 'e045-sep', ' → '), upper
      );
    } else {
      if (machine.parentElement) machine.remove();
      machine = null;
    }

    /* E045-01 : le nom accessible agrège nom, bornes, amplitude, compte et
       rang. Il remplace le title court de la vue (chronology.js:293) sans
       toucher au contenu visible ni à aria-current. */
    const accessibleName = current
      ? `Ère courante : ${name}. ${range}. ${amplitudeText}. ${countText}. ${rankText}.`
      : `Ère ${name}. ${range}. ${amplitudeText}. ${countText}. ${rankText}.`;
    if (band.getAttribute('aria-label') !== accessibleName) {
      band.setAttribute('aria-label', accessibleName);
    }

    /* E045-04 : description méthodologique associée, distincte du nom
       accessible ; elle dit d'où viennent les chiffres et leur portée. */
    const descId = `${DESC_PREFIX}${index}`;
    if (band.getAttribute('aria-describedby') !== descId) {
      band.setAttribute('aria-describedby', descId);
    }
    descriptions.push({
      id: descId,
      text: `${name} : amplitude et bornes lues dans data-start et data-end ; compte de ${plural(count, 'repère', 'repères')} ${filtering ? 'dans le périmètre de recherche affiché' : 'dans l’ère affichée'}.`,
    });

    setData(band, 'Name', '1');
    setData(band, 'Amplitude', amplitude === null ? '' : String(amplitude));
    setData(band, 'Count', String(count));
    setData(band, 'Rank', String(index + 1));
    setData(band, 'Current', current ? '1' : '0');
    setData(band, 'Machine', machine ? '1' : '0');
  });

  return { total, counted, amplitudeTotal, descriptions };
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const counts = collectCounts();
  const filtering = isFiltering();
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const result = labelBands(make, counts, filtering);
  const { legend, recap, metric } = buildLegend(make, host, result.descriptions);

  /* E045-09 : signature de fraîcheur. Elle change quand le périmètre ou les
     comptes changent ; les réécritures inutiles sont évitées par write/setData. */
  const signature = [result.total, result.counted, result.amplitudeTotal, filtering ? 1 : 0].join(':');
  write(recap, `${plural(result.total, 'bande étiquetée', 'bandes étiquetées')} sur ${result.total} · amplitude cumulée ${plural(result.amplitudeTotal, 'an', 'ans')} · ${plural(result.counted, 'repère compté', 'repères comptés')} ${filtering ? 'dans le périmètre de recherche' : 'dans l’ère affichée'}.`);
  write(metric, `Installations : ${installCount} · signature : ${signature} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
  setData(legend, 'Signature', signature);
  setData(legend, 'Filtered', filtering ? '1' : '0');
  setData(legend, 'Bands', String(result.total));
  setData(legend, 'Counted', String(result.counted));

  /* E045-10 : l'état de préférence est publié en texte et en attribut, sans
     créer d'animation : le CSS neutralise déjà toute transition. */
  setData(legend, 'Reduced', reduced ? '1' : '0');
  refs = {
    legend, recap, metric,
    bands: result.total, counted: result.counted,
    amplitude: result.amplitudeTotal, filtering, reduced, signature,
  };
}

register('E045', ctx => {
  install(ctx);
});
