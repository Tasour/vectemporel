import { register } from './registry.js';

/*
 * Lentille E027 — « Contraste et perception » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E027-01 … E027-10) sont implémentés dans
 * CE seul module : aucun fichier partagé n'est modifié. La coque reconstruisant
 * le DOM à chaque rendu, les nœuds sont recréés dans le layout courant tandis
 * que les préférences (contraste, diagnostic) survivent dans l'état module.
 *
 * CSS unique : ctx.css('recit-e027', …), cadré par .recit-layout[data-e027="on"].
 * Toutes les classes créées sont préfixées `recit-e027-` ; tous les ids sont
 * préfixés `e027-` et uniques. Zéro console, zéro réseau, zéro aléa, zéro
 * innerHTML. Enrichissement non destructif : sans JS, le récit reste lisible.
 * Mouvement reducedMotion() :aucune transition lorsque la préférence est réduite.
 */

const CSS_ID = 'recit-e027';

/* Préférences conservées entre deux reconstructions du DOM. */
const prefs = { contraste: false, diagnosticOuvert: false };
let latest = null;

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Tout est cadré par [data-e027="on"] posé sur la
 * grille .recit-layout : aucune règle ne déborde sur une autre vue.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E027-01 — contraste renforcé : variables scopées à la racine de la vue. */
.recit-layout[data-e027="on"][data-e027-contraste="on"] {
  --muted: #e2e6ea;
  --muted-2: #cdd3d9;
  --line: rgba(255,255,255,.5);
  --line-strong: rgba(255,255,255,.8);
  --ink: #ffffff;
}
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-thread-item,
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-conf,
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-e027-diagnostic {
  background-color: #0b0d10;
  border-color: rgba(255,255,255,.75);
  color: #ffffff;
}
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-thread-item.is-current {
  background-color: #2a2113;
  border-color: #ffd694;
  color: #ffffff;
}
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-e027-item { opacity: 1 !important; }
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-legend { color: #ffffff; }
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-actions button:not([disabled]) {
  color: #ffffff;
  border-color: rgba(255,255,255,.8);
  background-color: #101319;
}
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-e027-primaire {
  background-color: #ffd694 !important;
  color: #151007 !important;
  border-color: #ffffff !important;
}

/* E027-01 — bascule de contraste. */
.recit-e027-bascule {
  min-height: 36px; padding: 5px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: transparent; color: var(--gold-bright);
  font: inherit; font-size: 10px; cursor: pointer;
}
.recit-e027-bascule[aria-pressed="true"] {
  background: var(--gold); color: #151007;
  border-color: var(--gold-bright); font-weight: 600;
}
.recit-e027-bascule:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(230,185,111,.2);
}

/* E027-02 — jauge de certitude à quatre crans, forme + motif + texte. */
.recit-e027-jauge {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; color: var(--muted); font-size: 10px;
}
.recit-e027-jauge-label {
  color: var(--muted-2); font-size: 9px;
  text-transform: uppercase; letter-spacing: .08em;
}
.recit-e027-piste { display: inline-flex; gap: 4px; }
.recit-e027-cran {
  display: inline-block; min-width: 16px; padding: 1px 2px;
  border: 1px solid var(--line); border-radius: 3px;
  color: var(--muted-2); font-size: 13px; line-height: 1; text-align: center;
}
.recit-e027-cran-plein {
  color: var(--ink); border-color: var(--gold);
  background-image: repeating-linear-gradient(135deg, rgba(230,185,111,.35) 0 3px, transparent 3px 6px);
}
.recit-e027-cran-vide { opacity: .7; border-style: dashed; }
.recit-e027-jauge-texte {
  color: var(--gold-bright); font-variant-numeric: tabular-nums; white-space: nowrap;
}

/* E027-03 — codage multimodal du fil : forme par type, glyphe par certitude. */
.recit-e027-item { border-left-width: 3px; border-left-style: solid; }
.recit-e027-item[data-kind="récit"]  { border-left-style: solid; }
.recit-e027-item[data-kind="figure"] { border-left-style: dashed; }
.recit-e027-item[data-kind="lieu"]   { border-left-style: double; border-left-width: 4px; }
.recit-e027-item[data-kind="audit"]  { border-left-style: dotted; }
.recit-e027-item::before {
  margin-right: 4px; color: var(--gold-bright); font-size: 9px; content: '·';
}
.recit-e027-item[data-kind="récit"]::before  { content: '¶'; }
.recit-e027-item[data-kind="figure"]::before { content: '◉'; }
.recit-e027-item[data-kind="lieu"]::before   { content: '⌖'; }
.recit-e027-item[data-kind="audit"]::before  { content: '≡'; }
.recit-e027-item::after {
  margin-left: 5px; color: var(--muted-2); font-size: 9px; content: '';
}
.recit-e027-item[data-confidence="vérifié"]::after { content: '✓'; }
.recit-e027-item[data-confidence="certain"]::after { content: '■'; }
.recit-e027-item[data-confidence="probable"]::after { content: '◐'; }
.recit-e027-item[data-confidence="disputed"]::after { content: '≈'; }

/* E027-04 — textes superposés au média : fond opaque et contraste mesuré. */
.recit-e027-media .media-caption,
.recit-e027-media .recit-media-credit {
  padding: 3px 7px; border: 1px solid rgba(255,255,255,.4); border-radius: 6px;
  background: rgba(0,0,0,.82); color: #ffffff;
  font-size: 9px; line-height: 1.45; text-shadow: none;
}
.recit-e027-media-vide .media-empty {
  padding: 8px 10px; border: 1px dashed var(--line-strong);
  background: rgba(0,0,0,.45); color: var(--ink);
}
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-e027-media .media-caption,
.recit-layout[data-e027="on"][data-e027-contraste="on"] .recit-e027-media .recit-media-credit {
  background: #000000; border-color: #ffffff;
}

/* E027-05 — progression sémantisée : graduations et lecture chiffrée. */
.recit-e027-progression { position: relative; }
.recit-e027-progression .recit-e027-quarts {
  position: absolute; inset: 0; pointer-events: none;
}
.recit-e027-quart {
  position: absolute; top: -2px; width: 1px; height: 7px;
  background: rgba(255,255,255,.55);
}
.recit-e027-pourcent {
  display: block; min-width: 38px; margin: -10px 0 10px;
  color: var(--gold-bright); font-size: 9px;
  font-variant-numeric: tabular-nums; text-align: right;
}

/* E027-06 — hiérarchie des commandes et état indisponible non coloré. */
.recit-e027-actions .recit-e027-bouton {
  min-height: 36px; padding: 5px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background-color: rgba(255,255,255,.04); color: var(--ink);
  font: inherit; font-size: 10px; cursor: pointer;
}
.recit-e027-actions .recit-e027-primaire {
  border-color: var(--gold); background-color: var(--gold);
  color: #151007; font-weight: 600;
}
.recit-e027-actions .recit-e027-bouton.recit-play[aria-pressed="true"] {
  border-color: var(--gold); background-color: rgba(230,185,111,.18);
  color: var(--gold-bright);
}
.recit-e027-actions .recit-e027-indisponible {
  opacity: .7; border-style: dashed !important; cursor: not-allowed;
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 4px, transparent 4px 8px) !important;
}
.recit-e027-bouton:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(230,185,111,.18);
}
.recit-e027-anime .recit-e027-bouton {
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

/* E027-07 — légende : hiérarchie perceptive sans toucher au texte. */
.recit-e027-legende { color: var(--muted); }
.recit-e027-legende-p {
  position: relative; margin: 5px 0 !important; padding-left: 18px;
  color: var(--muted); font-size: 9px; line-height: 1.7;
}
.recit-e027-legende-p::before {
  position: absolute; left: 0; top: 0; width: 14px; height: 14px;
  border: 1px solid var(--line-strong); border-radius: 4px;
  color: var(--gold-bright); font-size: 9px; line-height: 12px;
  text-align: center; content: '·';
}
.recit-e027-legende-p[data-e027-ligne="1"]::before { content: '✓'; }
.recit-e027-legende-p[data-e027-ligne="2"]::before { content: '◈'; }
.recit-e027-legende-p[data-e027-ligne="3"]::before { content: '⌨'; }
.recit-e027-legende-p[data-e027-ligne="4"]::before { content: '↕'; }

/* E027-08 — filtres et recherche : état actif par coche et anneau de focus. */
.recit-e027-filtre {
  min-height: 32px; color: var(--ink); border-color: var(--line-strong);
}
.recit-e027-filtre[aria-pressed="true"] {
  background-color: var(--gold); color: #151007;
  border-color: var(--gold-bright); font-weight: 600;
}
.recit-e027-filtre[aria-pressed="true"]::after { content: ' ✓'; margin-left: 4px; }
.recit-e027-filtre:not([aria-pressed="true"]) {
  color: var(--ink); border-color: var(--line-strong);
}
.recit-e027-filtre:focus-visible,
.recit-e027-recherche:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(230,185,111,.18);
}
.recit-e027-statut { color: var(--ink) !important; font-size: 10px; }

/* E027-09 — traçabilité absente : badge explicite et cadre contrasté. */
.recit-e027-sans-source {
  position: relative; max-width: 100%; margin: 10px 0;
  padding: 7px 9px 7px 34px;
  border: 1px dashed var(--gold); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(230,185,111,.07);
  color: var(--ink); font-size: 9px; line-height: 1.55; overflow-wrap: anywhere;
}
.recit-e027-badge-source {
  position: absolute; left: 9px; top: 7px; width: 18px; height: 18px;
  border: 1px solid var(--gold); border-radius: 5px;
  color: var(--gold-bright); font-size: 11px; line-height: 16px; text-align: center;
}
.recit-e027-trace { color: var(--ink); }
.recit-e027-trace-resume {
  min-height: 34px; color: var(--gold-bright); font-weight: 600;
}
.recit-e027-trace-resume:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}

/* E027-10 — panneau de diagnostic perceptif. */
.recit-e027-diagnostic {
  margin-top: 14px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.03); color: var(--muted); font-size: 9px;
}
.recit-e027-diagnostic-resume {
  display: flex; align-items: center; min-height: 34px;
  color: var(--gold-bright); font-weight: 600; cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.recit-e027-diagnostic-resume:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.recit-e027-diagnostic-corps { margin-top: 6px; }
.recit-e027-diag-ligne { margin: 3px 0; color: var(--muted); line-height: 1.5; }
.recit-e027-diag-ligne-1 { color: var(--ink); }
`;

const NIVEAUX = [
  { brut: 'disputed', nom: 'Contesté', niveau: 1, glyphe: '≈' },
  { brut: 'probable', nom: 'Probable', niveau: 2, glyphe: '◐' },
  { brut: 'certain', nom: 'Certain', niveau: 3, glyphe: '■' },
  { brut: 'vérifié', nom: 'Vérifié', niveau: 4, glyphe: '✓' },
];

/* ------------------------------------------------------------------------- *
 * Utilitaires de lecture et de garde : jamais d'exception, jamais de casse.
 * ------------------------------------------------------------------------- */
function un(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function tous(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try { return Array.from(root.querySelectorAll(selector)); }
  catch { return []; }
}

function texte(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function lectureEtat(layout) {
  const kicker = texte(un(layout, '.view-kicker'));
  const found = kicker.match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  let index = found ? Number(found[1]) - 1 : -1;
  let total = found ? Number(found[2]) : 0;
  const items = tous(layout, '.recit-thread-item');
  if (!total) total = items.length;
  if (index < 0 || index >= total) {
    const current = un(layout, '.recit-thread-item.is-current')
      || un(layout, '.recit-thread-item[aria-current="step"]');
    index = current ? Math.max(0, items.indexOf(current)) : 0;
  }
  return {
    index, total,
    pourcent: total ? Math.round(((index + 1) / total) * 100) : 0,
  };
}

function lectureConfiance(layout) {
  const current = un(layout, '.recit-thread-item.is-current')
    || un(layout, '.recit-thread-item[aria-current="step"]');
  const brut = current && current.dataset ? String(current.dataset.confidence || '') : '';
  let found = NIVEAUX.find((niveau) => niveau.brut === brut);
  if (!found) {
    const chip = texte(un(layout, '.recit-conf')).toLowerCase();
    found = NIVEAUX.find((niveau) => chip.includes(niveau.nom.toLowerCase()));
  }
  return found || { brut: '', nom: 'Non précisée', niveau: 0, glyphe: '•' };
}

/* ------------------------------------------------------------------------- *
 * E027-01 — bascule de contraste renforcé (persistée entre les rendus).
 * ------------------------------------------------------------------------- */
function addBasculeContraste(el, layout) {
  const actions = un(layout, '.recit-actions');
  if (!actions || un(layout, '#e027-contraste')) return null;
  const button = el('button', 'recit-e027-bascule', '');
  button.type = 'button';
  button.id = 'e027-contraste';
  button.dataset.fk = 'e027-contraste';
  const sync = () => {
    button.setAttribute('aria-pressed', String(prefs.contraste));
    button.textContent = `Contraste renforcé : ${prefs.contraste ? 'activé' : 'désactivé'}`;
    layout.dataset.e027Contraste = prefs.contraste ? 'on' : 'off';
    if (latest && latest.nodes && latest.nodes.contrasteEtat) {
      latest.nodes.contrasteEtat.textContent = prefs.contraste
        ? 'Contraste renforcé actif.' : 'Contraste standard actif.';
    }
  };
  button.addEventListener('click', () => {
    prefs.contraste = !prefs.contraste;
    sync();
  });
  actions.insertBefore(button, actions.firstChild);
  sync();
  return button;
}

/* ------------------------------------------------------------------------- *
 * E027-02 — jauge de certitude en quatre crans (forme, motif, texte).
 * ------------------------------------------------------------------------- */
function addJaugeConfiance(el, layout, conf) {
  if (un(layout, '#e027-jauge')) return null;
  const ancre = un(layout, '.recit-meta') || un(layout, '.recit-timing');
  if (!ancre || typeof ancre.insertAdjacentElement !== 'function') return null;
  const jauge = el('div', 'recit-e027-jauge');
  jauge.id = 'e027-jauge';
  jauge.appendChild(el('span', 'recit-e027-jauge-label', 'Certitude :'));
  const piste = el('span', 'recit-e027-piste');
  piste.setAttribute('role', 'img');
  piste.setAttribute('aria-label', `Niveau de certitude : ${conf.nom} (${conf.niveau} sur 4)`);
  for (let i = 1; i <= 4; i += 1) {
    const plein = i <= conf.niveau;
    const cran = el('span', `recit-e027-cran ${plein ? 'recit-e027-cran-plein' : 'recit-e027-cran-vide'}`);
    cran.textContent = plein ? '■' : '□';
    cran.setAttribute('aria-hidden', 'true');
    cran.dataset.e027Niveau = String(conf.niveau);
    piste.appendChild(cran);
  }
  jauge.appendChild(piste);
  jauge.appendChild(el('span', 'recit-e027-jauge-texte', `${conf.glyphe} ${conf.nom} · ${conf.niveau}/4`));
  ancre.insertAdjacentElement('afterend', jauge);
  return jauge;
}

/* ------------------------------------------------------------------------- *
 * E027-05 — barre de progression sémantisée et graduée. Les graduations sont
 * dans un <div> (jamais un <span> enfant direct) pour ne pas perturber les
 * sélecteurs existants .recit-progress > span.
 * ------------------------------------------------------------------------- */
function addProgression(el, layout, etat) {
  const progress = un(layout, '.recit-progress');
  if (!progress) return null;
  progress.classList.add('recit-e027-progression');
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-label', 'Progression de la lecture guidée');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', String(etat.total || 0));
  progress.setAttribute('aria-valuenow', String(etat.index + 1));
  progress.setAttribute('aria-valuetext',
    `Étape ${etat.index + 1} sur ${etat.total || 0}, ${etat.pourcent} pour cent`);
  if (!un(layout, '#e027-pourcent')) {
    const quarts = el('div', 'recit-e027-quarts');
    quarts.setAttribute('aria-hidden', 'true');
    for (let q = 1; q < 4; q += 1) {
      const graduation = el('span', 'recit-e027-quart');
      graduation.style.left = `${q * 25}%`;
      quarts.appendChild(graduation);
    }
    progress.appendChild(quarts);
    const pourcent = el('span', 'recit-e027-pourcent', `${etat.pourcent} %`);
    pourcent.id = 'e027-pourcent';
    pourcent.setAttribute('aria-hidden', 'true');
    progress.insertAdjacentElement('afterend', pourcent);
  }
  return progress;
}

/* E027-03 — marquage multimodal du fil. */
function marquerFil(layout) {
  const fil = un(layout, '.recit-thread');
  if (!fil) return;
  fil.classList.add('recit-e027-fil');
  tous(fil, '.recit-thread-item').forEach((item) => item.classList.add('recit-e027-item'));
}

/* E027-04 — marquage du média et de ses textes superposés. */
function marquerMedia(layout) {
  const media = un(layout, '.recit-media');
  if (!media) return;
  media.classList.add('recit-e027-media');
  if (!un(media, 'img')) media.classList.add('recit-e027-media-vide');
}

/* E027-06 — hiérarchie des commandes et état indisponible explicite. */
function marquerActions(layout) {
  const actions = un(layout, '.recit-actions');
  if (!actions) return;
  actions.classList.add('recit-e027-actions');
  tous(actions, 'button').forEach((button) => {
    button.classList.add('recit-e027-bouton');
    const fk = button.dataset && button.dataset.fk ? String(button.dataset.fk) : '';
    if (fk === 'c3a-next' || fk === 'c3a-prev') button.classList.add('recit-e027-primaire');
    if (button.disabled) {
      button.classList.add('recit-e027-indisponible');
      const libelle = texte(button) || button.getAttribute('aria-label') || 'Cette commande';
      button.title = `${libelle} — indisponible à cette étape`;
    }
  });
}

/* E027-08 — contraste des filtres, de la recherche et du statut. */
function marquerOutils(layout) {
  const outils = un(layout, '.c3a-tools');
  if (outils) {
    outils.classList.add('recit-e027-outils');
    tous(outils, '.c3a-filter').forEach((button) => button.classList.add('recit-e027-filtre'));
    const search = un(outils, '.c3a-search');
    if (search) search.classList.add('recit-e027-recherche');
  }
  const statut = un(layout, '#c3a-status') || un(layout, '.c3a-status');
  if (statut) statut.classList.add('recit-e027-statut');
}

/* E027-07 — légende : marqueurs et hiérarchie, texte intact. */
function marquerLegende(layout) {
  const legend = un(layout, '.recit-legend');
  if (!legend) return;
  legend.classList.add('recit-e027-legende');
  legend.setAttribute('role', 'note');
  legend.setAttribute('aria-label', 'Légende des certitudes, des types de points et des raccourcis');
  tous(legend, 'p').forEach((paragraph, i) => {
    paragraph.classList.add('recit-e027-legende-p');
    paragraph.dataset.e027Ligne = String(i + 1);
  });
}

/* E027-09 — traçabilité absente : badge ∅ et cadre contrasté. */
function marquerSources(layout) {
  const sources = un(layout, '.recit-sources');
  if (sources) {
    sources.classList.add('recit-e027-sans-source');
    sources.setAttribute('role', 'note');
    if (!un(sources, '.recit-e027-badge-source')) {
      const badge = el('span', 'recit-e027-badge-source', '∅');
      badge.setAttribute('aria-hidden', 'true');
      sources.insertBefore(badge, sources.firstChild);
    }
  }
  const trace = un(layout, '.recit-trace');
  if (trace) {
    trace.classList.add('recit-e027-trace');
    const summary = un(trace, 'summary');
    if (summary) summary.classList.add('recit-e027-trace-resume');
  }
}

/* E027-10 — panneau de diagnostic perceptif, replié par défaut. */
function addDiagnostic(el, layout) {
  if (un(layout, '#e027-diagnostic')) return null;
  const body = un(layout, '.recit-body');
  if (!body) return null;
  const details = el('details', 'recit-e027-diagnostic');
  details.id = 'e027-diagnostic';
  const summary = el('summary', 'recit-e027-diagnostic-resume', '');
  summary.id = 'e027-diagnostic-resume';
  details.appendChild(summary);
  const contenu = el('div', 'recit-e027-diagnostic-corps');
  contenu.id = 'e027-diagnostic-corps';
  details.appendChild(contenu);
  body.appendChild(details);
  details.addEventListener('toggle', () => { prefs.diagnosticOuvert = details.open; });
  return { details, summary, contenu };
}

function peuplerDiagnostic(el, nodes, layout, etat, conf, reduced) {
  const contenu = nodes && nodes.diagnosticCorps;
  if (!contenu) return;
  const items = tous(layout, '.recit-thread-item');
  const parType = {};
  const parConf = {};
  items.forEach((item) => {
    const type = item.dataset && item.dataset.kind ? String(item.dataset.kind) : 'point';
    const certitude = item.dataset && item.dataset.confidence ? String(item.dataset.confidence) : '—';
    parType[type] = (parType[type] || 0) + 1;
    parConf[certitude] = (parConf[certitude] || 0) + 1;
  });
  const controles = tous(layout,
    '.recit-actions button, .c3a-filter, .c3a-search, .c3a-reset, .recit-trace summary').length;
  const indisponibles = tous(layout, '.recit-actions button[disabled]').length;
  const lignes = [
    `Fil : ${items.length} point(s) affiché(s) · étape ${etat.index + 1} sur ${etat.total || 0}.`,
    `Types : ${Object.keys(parType).map((k) => `${k} ${parType[k]}`).join(' · ') || 'aucun'}.`,
    `Certitudes : ${Object.keys(parConf).map((k) => `${k} ${parConf[k]}`).join(' · ') || 'aucune'}.`,
    `Contrôles interactifs repérés : ${controles} · boutons indisponibles : ${indisponibles}.`,
    `Point courant : ${conf.nom} (${conf.niveau}/4), lu sur l'élément courant du fil.`,
    `Contraste : ${prefs.contraste ? 'renforcé' : 'standard'} · mouvement système : ${reduced ? 'réduit' : 'complet'}.`,
    `Traçabilité de ce point : ${un(layout, '.recit-sources') ? 'identifiant absent du jeu de données' : 'identifiants locaux présents'}.`,
  ];
  while (contenu.firstChild) contenu.removeChild(contenu.firstChild);
  lignes.forEach((ligne, i) => {
    contenu.appendChild(el('p', `recit-e027-diag-ligne recit-e027-diag-ligne-${i + 1}`, ligne));
  });
  if (nodes.diagnosticSummary) {
    nodes.diagnosticSummary.textContent =
      `Perception · diagnostic (${items.length} points, ${controles} contrôles)`;
  }
  if (nodes.diagnostic) nodes.diagnostic.open = prefs.diagnosticOuvert;
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E027', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { layout, css, el, reducedMotion } = ctx;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  css(CSS_ID, RULES);

  const reduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  layout.dataset.e027 = 'on';
  layout.dataset.e027Contraste = prefs.contraste ? 'on' : 'off';
  if (!reduced) layout.classList.add('recit-e027-anime');

  const etat = lectureEtat(layout);
  const conf = lectureConfiance(layout);

  marquerMedia(layout);
  marquerFil(layout);
  marquerActions(layout);
  marquerOutils(layout);
  marquerLegende(layout);
  marquerSources(layout);
  addProgression(el, layout, etat);
  addJaugeConfiance(el, layout, conf);
  const boutonContraste = addBasculeContraste(el, layout);
  const diagnostic = addDiagnostic(el, layout);

  latest = {
    layout, etat, conf, reduced,
    nodes: {
      contrasteEtat: null,
      diagnostic: diagnostic ? diagnostic.details : null,
      diagnosticSummary: diagnostic ? diagnostic.summary : null,
      diagnosticCorps: diagnostic ? diagnostic.contenu : null,
    },
  };
  if (boutonContraste) {
    boutonContraste.setAttribute('aria-pressed', String(prefs.contraste));
    boutonContraste.textContent =
      `Contraste renforcé : ${prefs.contraste ? 'activé' : 'désactivé'}`;
  }
  peuplerDiagnostic(el, latest.nodes, layout, etat, conf, reduced);
});
