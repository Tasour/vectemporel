import { register } from './registry.js';

/* Lentille M48 — Documentation de la vue Monde (domaine E : qualité & validation).
 * Un seul fichier possédé. Aide affichable et vocabulaire sont greffés dans la
 * colonne de décision déjà présente, sans modale, sans fichier partagé modifié.
 * Le vocabulaire est LU sur window.VATLAS.lexicon (aucun terme n'est redéfini
 * ici) ; les chiffres sont recalculés depuis ctx.countries (aucune constante
 * figée recopiée). Zéro réseau, zéro aléa, aucune journalisation, aucune donnée
 * historique inventée.
 *
 * UI/UX : bouton d'action explicite (caret + consigne permanente), panneau
 * replié au montage, sections courtes numérotées, vocabulaire filtrable,
 * cibles tactiles ≥ 36 px (44 px sur mobile), focus conservé puis restitué.
 */

const CSS_ID = 'monde-m48';
const DOC_ID = 'm48-doc';
const BUTTON_ID = 'm48-doc-toggle';
const HINT_ID = 'm48-doc-hint';
const PANEL_ID = 'm48-help';
const TITLE_ID = 'm48-help-title';
const CLOSE_ID = 'm48-help-close';
const SUMMARY_ID = 'm48-help-summary';
const LEAD_ID = 'm48-help-lead';
const NAV_ID = 'm48-sec-nav';
const VOCAB_ID = 'm48-sec-vocab';
const COUNTS_ID = 'm48-sec-counts';
const FILTER_ID = 'm48-lex-filter';
const FILTER_STATUS_ID = 'm48-lex-status';
const LEX_LIST_ID = 'm48-lex-list';

const CHANTIERS = Object.freeze([
  'M48-01', 'M48-02', 'M48-03', 'M48-04', 'M48-05',
  'M48-06', 'M48-07', 'M48-08', 'M48-09', 'M48-10',
]);

const SECTIONS = Object.freeze([
  Object.freeze({ label: '1 · Navigation', target: `${NAV_ID}-title` }),
  Object.freeze({ label: '2 · Vocabulaire', target: `${VOCAB_ID}-title` }),
  Object.freeze({ label: '3 · Chiffres', target: `${COUNTS_ID}-title` }),
]);

/* M48-08 : l'état d'ouverture ne survit qu'à un rendu en place. Un montage
   neuf (nouvelle vue Monde) repart toujours replié : aucun panneau visible par
   défaut. Tout le reste est retrouvé dans le DOM courant. */
let open = false;
let lastCtx = null;

const CSS = `
  #${DOC_ID}{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
  #${BUTTON_ID}{
    display:inline-flex;align-items:center;gap:8px;
    min-height:40px;padding:8px 12px;border:1px solid var(--line-strong);border-radius:8px;
    background:rgba(230,185,111,.08);color:var(--gold-bright);
    font:inherit;font-size:13px;cursor:pointer;
  }
  #${BUTTON_ID}:hover{border-color:var(--gold-bright);background:rgba(230,185,111,.14)}
  #${BUTTON_ID}:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .m48-caret{flex:0 0 auto;width:10px;color:var(--gold);font-size:11px;line-height:1}
  #${HINT_ID}{margin:5px 0 0;color:var(--muted-2);font-size:11px;line-height:1.4}
  #${PANEL_ID}{
    margin-top:10px;padding:14px;border:1px solid var(--line-strong);border-radius:9px;
    background:rgba(8,11,16,.96);color:var(--ink);font-size:12px;line-height:1.55;
    max-width:70ch;overflow-wrap:anywhere;
  }
  #${PANEL_ID}[hidden],.m48-term[hidden],.m48-def[hidden]{display:none}
  #${PANEL_ID}:focus-visible{outline:2px solid var(--gold-bright);outline-offset:-2px}
  .m48-head{display:flex;align-items:flex-start;gap:10px}
  .m48-h2{flex:1 1 auto;margin:0;color:var(--gold-bright);font-family:var(--serif);font-size:15px;font-weight:600;line-height:1.3}
  .m48-close{
    flex:0 0 auto;min-width:36px;min-height:36px;padding:6px 9px;
    border:1px solid var(--line-strong);border-radius:7px;
    background:transparent;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;
  }
  .m48-close:hover{color:var(--gold-bright);border-color:var(--gold-bright)}
  .m48-close:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${LEAD_ID}{margin:6px 0 0;color:var(--muted)}
  #${SUMMARY_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
  .m48-summary-link{
    display:inline-block;padding:3px 8px;border:1px solid var(--line);border-radius:999px;
    color:var(--muted);font-size:11px;text-decoration:none;
  }
  .m48-summary-link:hover{color:var(--gold-bright);border-color:var(--gold-bright)}
  .m48-summary-link:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .m48-block{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
  .m48-h3{margin:0;color:var(--gold);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
  .m48-h3:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .m48-purpose{margin:4px 0 7px;color:var(--muted-2);font-size:11px}
  .m48-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px;margin:0 0 5px;color:var(--muted)}
  .m48-kbd{
    display:inline-block;min-width:20px;padding:1px 5px;border:1px solid var(--line-strong);
    border-radius:4px;background:rgba(230,185,111,.06);color:var(--ink);
    font:inherit;font-size:11px;text-align:center;
  }
  .m48-line-text{flex:1 1 180px}
  .m48-filter-label{display:block;margin:0 0 4px;color:var(--muted);font-size:11px}
  .m48-filter{
    box-sizing:border-box;width:100%;min-height:36px;padding:7px 9px;
    border:1px solid var(--line-strong);border-radius:7px;
    background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:12px;
  }
  .m48-filter:focus-visible{outline:2px solid var(--gold-bright);outline-offset:1px}
  .m48-lex-status{margin:6px 0 0;color:var(--muted-2);font-size:11px}
  .m48-lexicon{margin:8px 0 0;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:4px 10px}
  .m48-term{margin:0;color:var(--gold-bright);font-weight:600}
  .m48-def{margin:0;color:var(--muted)}
  .m48-counts{margin:0;color:var(--ink);font-variant-numeric:tabular-nums}
  .m48-note{margin:8px 0 0;color:var(--muted-2);font-size:11px}
  @media (max-width:700px){
    #${BUTTON_ID}{width:100%;min-height:44px;justify-content:center}
    #${PANEL_ID}{max-height:60vh;overflow:auto;padding:12px;font-size:11.5px}
    .m48-close,.m48-filter{min-height:44px}
    .m48-lexicon{grid-template-columns:1fr;gap:2px}
    .m48-def{margin-bottom:7px}
  }
  @media (prefers-reduced-motion:reduce){
    #${BUTTON_ID},.m48-close,.m48-summary-link{transition:none}
  }
`;

/* M48-02 : le lexique normatif vit dans app.js (VOCABULARY) et est publié sur
   window.VATLAS.lexicon. On le lit, on ne le recopie jamais. */
function readLexicon() {
  const api = typeof window !== 'undefined' ? window.VATLAS : null;
  const lex = api && api.lexicon;
  if (!lex || typeof lex !== 'object') return null;
  return Object.keys(lex).map((term) => ({ term, definition: String(lex[term]) }));
}

/* M48-04 : la plage de touches est dérivée de la taxonomie publique (6 vues),
   jamais du libellé figé « 1–5 » encore présent dans NAV_SHORTCUTS. */
function viewDigits() {
  const api = typeof window !== 'undefined' ? window.VATLAS : null;
  const taxonomy = api && api.taxonomy;
  if (!Array.isArray(taxonomy) || !taxonomy.length) return null;
  const digits = taxonomy.map((view) => view && view.digit).filter((value) => typeof value === 'string' && value);
  return digits.length === taxonomy.length ? `${digits[0]}–${digits[digits.length - 1]}` : null;
}

/* Repli accent/casse pour filtrer « ère » comme « ere » (motif de app.js:36). */
function fold(value) {
  return String(value ?? '').trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function countList(list) {
  return Array.isArray(list) ? list.length : 0;
}

/* M48-06 : mêmes règles que countryMeta() (globe.js:124-133) : .eras, .events,
   .points et point.domain. Aucun chiffre « 784 » recopié du sous-titre. */
function counts(ctx) {
  const countries = Array.isArray(ctx && ctx.countries) ? ctx.countries : [];
  let eras = 0;
  let events = 0;
  let points = 0;
  const domains = new Set();
  countries.forEach((country) => {
    if (!country) return;
    eras += countList(country.eras);
    events += countList(country.events);
    const items = Array.isArray(country.points) ? country.points : [];
    points += items.length;
    items.forEach((point) => { if (point && point.domain) domains.add(point.domain); });
  });
  return { countries: countries.length, eras, events, points, domains: domains.size };
}

/* Section courte, numérotée et adressable : titre focusable (ancre unique) et
   sous-titre d'une phrase, pour rendre le panneau lisible d'un coup d'œil. */
function section(ctx, id, label, purpose) {
  const block = ctx.el('section', 'm48-block');
  block.id = id;
  const heading = ctx.el('h3', 'm48-h3', label);
  heading.id = `${id}-title`;
  heading.tabIndex = -1;
  block.appendChild(heading);
  if (purpose) block.appendChild(ctx.el('p', 'm48-purpose', purpose));
  return block;
}

function keyLine(ctx, keys, text) {
  const row = ctx.el('p', 'm48-line');
  keys.forEach((key) => row.appendChild(ctx.el('kbd', 'm48-kbd', key)));
  row.appendChild(ctx.el('span', 'm48-line-text', text));
  return row;
}

/* M48-05 : commandes réellement actives dans la vue Monde, alignées sur
   #globe-help (globe.js:275) et sur VECTEMPOREL_KEYS.helpMap (keyboard.js:211-219). */
function buildNavigation(ctx) {
  const block = section(ctx, NAV_ID, '1 · Navigation', 'Touches actives dans la vue Monde.');
  block.appendChild(keyLine(ctx, ['Tab'], 'atteindre le globe ou la liste des pays.'));
  block.appendChild(keyLine(ctx, ['←', '→'], 'parcourir les pays (↑ ↓ aussi).'));
  block.appendChild(keyLine(ctx, ['Entrée'], 'ouvrir le pays sélectionné.'));
  block.appendChild(keyLine(ctx, ['Échap'], 'fermer cette aide ou revenir au Monde.'));
  block.appendChild(keyLine(ctx, ['?'], 'ouvrir l’aide clavier générale.'));
  const digits = viewDigits();
  if (digits) block.appendChild(keyLine(ctx, [digits], 'changer de vue (Monde → Points).'));
  return block;
}

/* Vocabulaire utile : definition lue sur l'API, jamais réécrite ici ; un filtre
   local et instantané permet de trouver un terme sans parcourir toute la liste. */
function buildVocabulary(ctx) {
  const block = section(ctx, VOCAB_ID, '2 · Vocabulaire', 'Termes normatifs de l’atlas, définis une seule fois.');
  const entries = readLexicon();
  if (!entries) {
    /* M48-03 : pas encore de publication : consigne neutre, aucune définition
       locale inventée (README:115 : aucun terme défini autrement dans une vue). */
    block.appendChild(ctx.el('p', 'm48-note', 'Lexique normatif en cours de publication (window.VATLAS.lexicon).'));
    return block;
  }

  const label = ctx.el('label', 'm48-filter-label', `Filtrer les ${entries.length} termes`);
  label.htmlFor = FILTER_ID;
  const input = ctx.el('input', 'm48-filter');
  input.id = FILTER_ID;
  input.type = 'search';
  input.placeholder = 'ex. ère, point, source';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-describedby', FILTER_STATUS_ID);

  const status = ctx.el('p', 'm48-lex-status', `${entries.length} termes affichés.`);
  status.id = FILTER_STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const list = ctx.el('dl', 'm48-lexicon');
  list.id = LEX_LIST_ID;
  const rows = entries.map(({ term, definition }) => {
    const dt = ctx.el('dt', 'm48-term', term);
    const dd = ctx.el('dd', 'm48-def', definition);
    list.append(dt, dd);
    return { dt, dd, hay: fold(`${term} ${definition}`) };
  });

  input.addEventListener('input', () => {
    const query = fold(input.value);
    let shown = 0;
    rows.forEach(({ dt, dd, hay }) => {
      const visible = !query || hay.includes(query);
      dt.hidden = !visible;
      dd.hidden = !visible;
      if (visible) shown += 1;
    });
    status.textContent = query
      ? `${shown} terme${shown > 1 ? 's' : ''} sur ${entries.length} pour « ${input.value.trim()} »`
      : `${entries.length} termes affichés.`;
  });

  block.append(label, input, status, list);
  return block;
}

function buildCounts(ctx) {
  const block = section(ctx, COUNTS_ID, '3 · Chiffres', 'Recalculés depuis les pays, sans valeur figée.');
  const c = counts(ctx);
  block.appendChild(ctx.el('p', 'm48-counts',
    `${c.countries} pays · ${c.eras} ères · ${c.events} repères · ${c.points} points · ${c.domains} domaines`));
  return block;
}

function buildSummary(ctx) {
  const nav = ctx.el('nav', 'm48-summary');
  nav.id = SUMMARY_ID;
  nav.setAttribute('aria-label', 'Aller à une section de l’aide');
  SECTIONS.forEach(({ label, target }) => {
    const link = ctx.el('a', 'm48-summary-link', label);
    link.href = `#${target}`;
    link.addEventListener('click', (event) => {
      const heading = document.getElementById(target);
      if (!heading) return;
      event.preventDefault();
      heading.focus({ preventScroll: true });
    });
    nav.appendChild(link);
  });
  return nav;
}

/* Remplacement du contenu : les rappels et microtâches périmés retrouvent
   toujours le panneau courant par son ID (M48-03, M48-08). */
function fillPanel(ctx, panel) {
  while (panel.firstChild) panel.removeChild(panel.firstChild);

  const head = ctx.el('div', 'm48-head');
  const title = ctx.el('h2', 'm48-h2', 'Aide et vocabulaire du Monde');
  title.id = TITLE_ID;
  const close = ctx.el('button', 'm48-close', 'Fermer');
  close.id = CLOSE_ID;
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’aide et le vocabulaire du Monde');
  close.addEventListener('click', () => setOpen(false, true));
  head.append(title, close);
  panel.appendChild(head);

  const api = typeof window !== 'undefined' ? window.VATLAS : null;
  const info = api && typeof api.viewInfo === 'function' ? api.viewInfo('globe') : null;
  if (info && info.role) {
    const lead = ctx.el('p', 'm48-lead', `Cette vue répond à : ${info.role}`);
    lead.id = LEAD_ID;
    panel.appendChild(lead);
  }

  panel.appendChild(buildSummary(ctx));
  panel.appendChild(buildNavigation(ctx));
  panel.appendChild(buildVocabulary(ctx));
  panel.appendChild(buildCounts(ctx));
  panel.appendChild(ctx.el('p', 'm48-note',
    'Aucun lien externe, aucune requête réseau : cette aide ne décrit que les commandes et les données déjà présentes dans l’atlas.'));
}

/* M48-07 : le panneau n'est pas un dialogue. Pas d'aria-modal, pas de piège
   de Tab, pas d'écouteur document ; Échap est traité sur le panneau lui-même.
   Le focus reste sur le bouton à l'ouverture (motif « disclosure ») et y
   revient à la fermeture ou via le bouton « Fermer ». */
function setOpen(next, moveFocus) {
  open = Boolean(next);
  const button = document.getElementById(BUTTON_ID);
  const panel = document.getElementById(PANEL_ID);
  if (button) {
    button.setAttribute('aria-expanded', String(open));
    const label = button.querySelector('.m48-toggle-label');
    if (label) label.textContent = open ? 'Masquer l’aide du Monde' : 'Afficher l’aide et le vocabulaire';
    const caret = button.querySelector('.m48-caret');
    if (caret) caret.textContent = open ? '▾' : '▸';
  }
  if (panel) {
    panel.hidden = !open;
    panel.dataset.state = open ? 'open' : 'closed';
  }
  if (moveFocus && open && panel && panel.isConnected) panel.focus({ preventScroll: true });
  if (moveFocus && !open && button && button.isConnected) button.focus({ preventScroll: true });
}

function buildPanel(ctx) {
  const panel = ctx.el('div', 'm48-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;
  panel.hidden = true; /* aucun panneau visible par défaut, même avant setOpen() */
  fillPanel(ctx, panel);
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false, true);
  });
  return panel;
}

function buildDoc(ctx) {
  const wrap = ctx.el('section', 'm48-doc');
  wrap.id = DOC_ID;
  wrap.setAttribute('aria-label', 'Documentation de la vue Monde');

  const button = ctx.el('button', 'm48-toggle');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-controls', PANEL_ID);
  button.setAttribute('aria-describedby', HINT_ID);
  const caret = ctx.el('span', 'm48-caret', open ? '▾' : '▸');
  caret.setAttribute('aria-hidden', 'true');
  button.append(caret, ctx.el('span', 'm48-toggle-label',
    open ? 'Masquer l’aide du Monde' : 'Afficher l’aide et le vocabulaire'));
  button.addEventListener('click', () => setOpen(!open, false));

  const hint = ctx.el('p', 'm48-hint', 'Touches, vocabulaire et chiffres de cette vue, sans quitter le Monde.');
  hint.id = HINT_ID;

  wrap.append(button, hint, buildPanel(ctx));
  return wrap;
}

function refreshDoc() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.isConnected || !lastCtx) return;
  const active = document.activeElement;
  const hadFocus = panel.contains(active);
  const focusId = hadFocus && active && active.id ? active.id : null;
  fillPanel(lastCtx, panel);
  if (focusId) {
    const replacement = document.getElementById(focusId);
    if (replacement && panel.contains(replacement)) replacement.focus({ preventScroll: true });
    else panel.focus({ preventScroll: true });
  } else if (hadFocus) {
    panel.focus({ preventScroll: true });
  }
}

/* M48-10 : surface de diagnostic additive, sur le modèle de VECTEMPOREL_M05. */
function exposeDiagnostic() {
  const api = {
    chantiers: () => CHANTIERS.slice(),
    open: () => setOpen(true, true),
    close: () => setOpen(false, true),
    state: () => {
      const entries = readLexicon();
      return {
        id: DOC_ID,
        panel: PANEL_ID,
        open,
        hasLexicon: Boolean(entries),
        terms: entries ? entries.length : 0,
        counts: counts(lastCtx),
      };
    },
  };
  window.VECTEMPOREL_M48 = api;
}

register('M48', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.el !== 'function') return;
  lastCtx = ctx;
  ctx.css(CSS_ID, CSS);

  /* M48-01 : greffe dans la colonne de décision, hors scène WebGL pour ne
     masquer ni #globe-reveal ni les commandes Zoom/Rotation. */
  const parent = (ctx.stage.querySelector && ctx.stage.querySelector('.globe-view')) || ctx.stage;
  if (!document.getElementById(DOC_ID)) {
    parent.appendChild(buildDoc(ctx));
    open = false; /* nouveau montage : panneau replié */
  }

  setOpen(open, false);

  /* M48-03 : app.js monte la coque (l.126) avant de publier window.VATLAS
     (l.132). Une microtâche, sans timer ni réseau, relit le lexique ensuite. */
  if (!readLexicon()) {
    if (typeof queueMicrotask === 'function') queueMicrotask(refreshDoc);
    else Promise.resolve().then(refreshDoc);
  }

  exposeDiagnostic();
});
