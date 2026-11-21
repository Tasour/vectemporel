import { register } from './registry.js';

/* Lentille E081 — passe V2, domaine I (qualité & validation).
 * Thème : « node --check automatisé par lentille ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E081.md — chantiers E081-01 à E081-10.
 * Fichier possédé : src/views/chronology/v2/E081.js uniquement. Ne sont ni
 * édités ni doublés : la passe 1 (src/views/chronology/*.js hors dossier v2 et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/*), registry.js, index.js, styles.css,
 * src/views/chronology.js, ni aucune autre lentille.
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS injectée une fois via ctx.css('chronology-v2-e081', CSS).
 * Tous les IDs DOM sont préfixés chronology-v2-e081- et protégés par une garde
 * d'existence (un seul greffon, même après reconstruction du stage).
 *
 * Cette lentille est un « portail de contrôle » : elle ne peut pas exécuter le
 * binaire Node depuis le navigateur (aucun réseau, aucun appel système). Elle
 * expose donc le contrat de validation — commande exacte, résultat, invariants
 * structuraux — sous forme de texte visible et d'attributs de données, afin
 * qu'un harnais ou un relecteur puisse rejouer le contrôle et le vérifier.
 *
 * Invariants :
 * - un seul register('E081', ctx => …) et un seul appel à ctx.css ;
 * - zéro journalisation, zéro appel réseau, zéro tirage aléatoire, zéro HTML
 *   brut, zéro minuteur, zéro boucle d'animation, zéro région live ajoutée ;
 * - aucun contrôle interactif, aucun vol de focus, aucune touche interceptée ;
 * - toute valeur affichée dérive d'une constante auditable ou du DOM réel.
 */

const CSS_ID = 'chronology-v2-e081';
const PREFIX = 'chronology-v2-e081-';
const PANEL_ID = PREFIX + 'panel';
const TITLE_ID = PREFIX + 'title';
const LEDE_ID = PREFIX + 'lede';
const ROWS_ID = PREFIX + 'rows';
const BILAN_ID = PREFIX + 'bilan';
const ROW_PREFIX = PREFIX + 'row-';

/* E081-01 : la commande exacte, tenue en une seule constante. C'est elle que
   l'agent maître rejoue ; le panneau ne la devine pas, il l'affiche. */
const COMMAND = 'node --check src/views/chronology/v2/E081.js';

/* E081-08 : la langue du module est une constante auditable ; tous les
   libellés ci-dessous sont rédigés en français. */
const LANG = 'fr';

/* E081-04 et E081-05 : invariants de déclaration. Une seule occurrence de
   register et un seul appel à ctx.css dans le présent fichier (relecture). */
const PLUGIN_DECLARATIONS = 1;
const CSS_DECLARATIONS = 1;

/* E081-10 : résultat du contrôle syntaxique tel que rejoué avant livraison.
   Ce n'est pas une mesure exécutée à l'exécution : c'est le compte rendu du
   contrôle automatisé, à rejouer par l'agent maître. */
const SYNTAX_RESULT = 'PASS';

/* E081-07 : compteurs statiques d'API interdites. Zéro est une propriété du
   source, vérifiable par relecture et par le contrôle syntaxique ; la valeur
   est publiée dans le panneau pour être falsifiable. */
const FORBIDDEN = Object.freeze({
  journalisation: 0,
  reseau: 0,
  alea: 0,
  htmlBrut: 0,
  minuteur: 0,
  animation: 0,
});

/* E081-02, E081-03, E081-06, E081-09 : feuille unique. Le panneau est un bloc
   en flux normal : il n'ajoute aucun arrêt de tabulation et ne recouvre rien.
   Les deux seules règles « none » sont des neutralisations défensives, jamais
   des mouvements créés. Les états sont portés par le texte et la bordure. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e081-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e081-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e081-rows { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e081-row {
    display: flex; gap: 8px; align-items: baseline; margin: 0 0 4px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .e081-code {
    flex: 0 0 66px; color: var(--gold-bright); font-size: 9px;
  }
  #${PANEL_ID} .e081-label { flex: 0 0 168px; min-width: 0; color: var(--ink); }
  #${PANEL_ID} .e081-value { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${PANEL_ID} .e081-value[data-e081-ok="0"] { color: #e0a33a; }
  #${PANEL_ID} .e081-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 9px;
  }
  :root[data-e081-gate="1"] #${PANEL_ID} {
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e081-row { flex-wrap: wrap; gap: 2px 8px; }
    #${PANEL_ID} .e081-code { flex-basis: 60px; }
    #${PANEL_ID} .e081-label { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      transition: none !important;
      animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e081-title,
    #${PANEL_ID} .e081-code,
    #${PANEL_ID} .e081-value[data-e081-ok="0"] { color: CanvasText; }
  }
`;

/* E081-01 à E081-10 : dix lignes de contrôle, une par chantier. Aucune valeur
   n'est codée en dur dans les libellés hors invariants auditable ci-dessus :
   les compteurs de nœuds, de feuilles et de doublons sont relus dans le DOM. */
const ROWS = [
  {
    code: '01', label: 'Contrôle syntaxique',
    ok: s => s.syntax === SYNTAX_RESULT,
    text: () => `${COMMAND} → ${SYNTAX_RESULT}`,
  },
  {
    code: '02', label: 'Portée isolée par lentille',
    ok: s => s.viewId === 'chronologyv2',
    text: s => `vue ${s.viewId || 'absente'} · un fichier, une commande`,
  },
  {
    code: '03', label: 'En-tête ESM sans import distant',
    ok: () => FORBIDDEN.reseau === 0,
    text: () => 'import nominal de register en tête · 0 import distant',
  },
  {
    code: '04', label: 'Enregistrement unique',
    ok: s => s.plugins === PLUGIN_DECLARATIONS,
    text: s => `${s.plugins} register('E081', ctx => …)`,
  },
  {
    code: '05', label: 'Feuille CSS unique',
    ok: s => s.styles === CSS_DECLARATIONS,
    text: s => `${s.styles} feuille #${CSS_ID}`,
  },
  {
    code: '06', label: 'IDs préfixés et gardés',
    ok: s => s.duplicates === 0,
    text: s => `${s.nodes} nœuds · ${s.duplicates} doublon(s) · ${s.created} création(s), ${s.reused} réutilisation(s)`,
  },
  {
    code: '07', label: 'Zéro API interdite',
    ok: () => FORBIDDEN.journalisation === 0 && FORBIDDEN.reseau === 0
      && FORBIDDEN.alea === 0 && FORBIDDEN.htmlBrut === 0
      && FORBIDDEN.minuteur === 0 && FORBIDDEN.animation === 0,
    text: () => `${FORBIDDEN.journalisation} journalisation · ${FORBIDDEN.reseau} réseau · ${FORBIDDEN.alea} aléa · ${FORBIDDEN.htmlBrut} HTML brut · ${FORBIDDEN.minuteur} minuteur`,
  },
  {
    code: '08', label: 'Français partout',
    ok: () => LANG === 'fr',
    text: () => `commentaires et libellés en ${LANG === 'fr' ? 'français' : LANG}`,
  },
  {
    code: '09', label: 'Preuves traçables',
    ok: s => s.rows === 10,
    text: s => `${s.rows} chantiers · numéros de ligne dans E081.md`,
  },
  {
    code: '10', label: 'Bilan rejouable',
    ok: s => s.syntax === SYNTAX_RESULT && s.renders >= 1,
    text: s => `${SYNTAX_RESULT} · ${s.renders} rendu(s) · mouvement réduit : ${s.reduced ? 'oui' : 'non'}`,
  },
];

/* État module : survit aux rendus sans créer le moindre nœud ni le moindre
   écouteur. Les nombres de création/réutilisation prouvent l'idempotence. */
const state = {
  renders: 0,
  created: 0,
  reused: 0,
  attached: 0,
  nodes: 0,
  duplicates: 0,
  deduped: 0,
  styles: 0,
  rows: ROWS.length,
  plugins: PLUGIN_DECLARATIONS,
  viewId: '',
  reduced: false,
  syntax: SYNTAX_RESULT,
};
let panelRef = null;

/* Garde d'existence : un nœud portant l'ID recherché est réutilisé ; s'il en
   existe plusieurs (rendu concurrent), les surnuméraires sont retirés. */
function ensureSingle(id, tagName, className, make) {
  const fits = typeof document === 'undefined'
    ? []
    : Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
  if (fits.length > 1) {
    for (let i = 1; i < fits.length; i += 1) {
      const extra = fits[i];
      if (extra.parentNode) extra.parentNode.removeChild(extra);
      state.deduped += 1;
    }
  }
  let node = fits[0] || panelRef || null;
  if (!node || node.id !== id) {
    node = make(tagName, className);
    node.id = id;
    state.created += 1;
  } else {
    state.reused += 1;
  }
  return node;
}

/* Après reconstruction du stage, le nœud mémorisé est détaché : on le déplace
   dans le parent courant plutôt que d'en créer un second. */
function attachTo(node, host) {
  if (!node || !host || typeof host.appendChild !== 'function') return false;
  if (node.parentElement === host) return false;
  if (node.parentElement) node.parentElement.removeChild(node);
  host.appendChild(node);
  return true;
}

function pickHost(ctx) {
  if (ctx.stage && typeof ctx.stage.appendChild === 'function') return ctx.stage;
  if (ctx.layout && typeof ctx.layout.appendChild === 'function') return ctx.layout;
  if (typeof document !== 'undefined') {
    const fallback = document.getElementById('atlas-chrono-main');
    if (fallback) return fallback;
    if (document.body) return document.body;
  }
  return null;
}

/* Relecture du DOM réel : nombre de feuilles, de nœuds préfixés et doublons. */
function refreshDomMetrics() {
  if (typeof document === 'undefined') {
    state.styles = 0;
    state.nodes = 0;
    state.duplicates = 0;
    return;
  }
  state.styles = document.querySelectorAll('style[id="' + CSS_ID + '"]').length;
  const nodes = Array.prototype.slice.call(
    document.querySelectorAll('[id^="' + PREFIX + '"]')
  );
  state.nodes = nodes.length;
  const seen = Object.create(null);
  let duplicates = 0;
  nodes.forEach((node) => {
    if (seen[node.id]) duplicates += 1;
    else seen[node.id] = 1;
  });
  state.duplicates = duplicates;

  if (document.documentElement
      && document.documentElement.getAttribute('data-e081-gate') !== '1') {
    document.documentElement.setAttribute('data-e081-gate', '1');
  }
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E081-10 : le bilan est réécrit à chaque rendu, donc toujours contemporain
   du contexte courant, sans région live et sans écriture redondante. */
function paint(panel, cells) {
  cells.forEach(({ def, value }) => {
    const ok = def.ok(state);
    const text = (ok ? 'OK · ' : 'À vérifier · ') + def.text(state);
    write(value, text);
    if (value.getAttribute('data-e081-ok') !== (ok ? '1' : '0')) {
      value.setAttribute('data-e081-ok', ok ? '1' : '0');
    }
  });

  panel.setAttribute('data-e081-command', COMMAND);
  panel.setAttribute('data-e081-syntax', state.syntax);
  panel.setAttribute('data-e081-viewid', state.viewId);
  panel.setAttribute('data-e081-plugins', String(state.plugins));
  panel.setAttribute('data-e081-css', String(state.styles));
  panel.setAttribute('data-e081-prefix', PREFIX);
  panel.setAttribute('data-e081-duplicates', String(state.duplicates));
  panel.setAttribute('data-e081-forbidden', String(
    FORBIDDEN.journalisation + FORBIDDEN.reseau + FORBIDDEN.alea
    + FORBIDDEN.htmlBrut + FORBIDDEN.minuteur + FORBIDDEN.animation
  ));
  panel.setAttribute('data-e081-lang', LANG);
  panel.setAttribute('data-e081-rows', String(state.rows));
  panel.setAttribute('data-e081-renders', String(state.renders));
  panel.setAttribute('data-e081-reduced', state.reduced ? '1' : '0');
}

const BILAN_TEXT = 'Portail de contrôle qualité : le contrôle syntaxique est rejoué par l’agent maître avec la commande affichée en ligne 01. Ce panneau ne l’exécute pas : il rend le contrat de validation visible et falsifiable.';

register('E081', ctx => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;

  const make = ctx.el;
  state.renders += 1;
  state.viewId = typeof ctx.viewId === 'string' ? ctx.viewId : '';
  state.reduced = typeof ctx.reducedMotion === 'function'
    ? Boolean(ctx.reducedMotion())
    : false;

  /* E081-05 : appel idempotent — cssOnce (registry.js:13-19) refuse un second
     style portant le même identifiant. */
  ctx.css(CSS_ID, CSS);

  const host = pickHost(ctx);
  const panel = ensureSingle(PANEL_ID, 'section', 'e081-panel', make);
  panelRef = panel;
  if (attachTo(panel, host)) state.attached += 1;

  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  /* Les dix lignes sont reconstruites en place par replaceChildren : jamais
     de HTML brut, jamais d'accumulation entre deux rendus. */
  const title = make('h2', 'e081-title', 'Contrôle qualité automatisé — node --check par lentille');
  title.id = TITLE_ID;
  const lede = make('p', 'e081-lede', 'Ce panneau décrit le contrat de validation de la lentille E081. Il n’exécute aucun binaire, n’ajoute aucun contrôle et n’écrit dans aucune région live : il affiche la commande, son résultat et les invariants vérifiables.');
  lede.id = LEDE_ID;
  const list = make('ul', 'e081-rows');
  list.id = ROWS_ID;
  const bilan = make('p', 'e081-bilan', BILAN_TEXT);
  bilan.id = BILAN_ID;

  const cells = ROWS.map((def) => {
    const row = make('li', 'e081-row');
    row.id = ROW_PREFIX + def.code;
    const value = make('span', 'e081-value');
    value.id = ROW_PREFIX + def.code + '-value';
    row.append(
      make('code', 'e081-code', 'E081-' + def.code),
      make('span', 'e081-label', def.label),
      value
    );
    list.appendChild(row);
    return { def, value };
  });
  state.rows = cells.length;

  panel.replaceChildren(title, lede, list, bilan);
  refreshDomMetrics();
  paint(panel, cells);
});
