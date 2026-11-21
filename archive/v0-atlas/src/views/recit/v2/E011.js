import { register } from './registry.js';

/* V2 lentille E011 — Lisibilité : mesures avancées (second regard).
 *
 * La passe 1 (`src/views/recit/E011.js`) a posé la mesure de la colonne, le
 * nombre de mots, l'échelle, l'interlignage, le mode concentration, la densité,
 * le suivi des points lus, la césure, le contraste renforcé et la fiche de
 * lecture. Cette passe V2 ne reprend aucun de ces chantiers : elle ajoute des
 * mesures de lisibilité **différentes et complémentaires**, toutes dérivées du
 * DOM réel (texte du point et géométrie de la ligne) :
 *
 *   E011-01 indice Flesch de lisibilité · E011-02 syllabes et mot le plus long
 *   E011-03 lecture à voix haute (150 mots/min) · E011-04 mesure géométrique
 *   de la ligne · E011-05 signet de relecture · E011-06 règle de lecture
 *   E011-07 espacement élargi · E011-08 recalcul des mesures
 *   E011-09 fiche de mesure V2 · E011-10 filets de sécurité et responsive
 *
 * Greffon strictement additif : une seule classe racine `recit-v2-e011-root`
 * posée sur `layout`, un seul appel `css('recit-v2-e011', …)` (cssOnce assure
 * l'idempotence), un seul panneau `#v2-e011-panel`. Tout identifiant créé est
 * préfixé `v2-e011-` (la passe 1 occupe déjà `e011-…` sur le MÊME DOM). Aucune
 * sortie réseau, aucune console, aucune graine aléatoire, aucun `Date.now()`.
 *
 * Les dix chantiers sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E011.md.
 */

const CSS_ID = 'recit-v2-e011';
const RACINE = 'recit-v2-e011-root';
const PANEL_ID = 'v2-e011-panel';
const PANEL_TITRE_ID = 'v2-e011-panel-title';

/* Identifiants DOM — tous préfixés « v2-e011- » et uniques dans le document. */
const FLESCH_ID = 'v2-e011-flesch';
const SYLLABES_ID = 'v2-e011-syllabes';
const ORAL_ID = 'v2-e011-oral';
const GEOM_ID = 'v2-e011-geom';
const SIGNETS_ID = 'v2-e011-signets';
const RESUME_ID = 'v2-e011-resume';
const SIGNET_BTN_ID = 'v2-e011-signet-btn';
const REGLE_BTN_ID = 'v2-e011-regle-btn';
const ESPACE_BTN_ID = 'v2-e011-espace-btn';
const EFFACER_BTN_ID = 'v2-e011-effacer-btn';
const RECALC_BTN_ID = 'v2-e011-recalc-btn';

/* Références pédagogiques explicites — constantes, jamais des données inventées. */
const ORAL_WPM = 150; // lecture à voix haute, adulte (la passe 1 cite 220 wpm en silence)

const VOYELLES = 'aàâaeéèêëiîïoôöuùûüœy';

/* État module : survit au `innerHTML = ''` de la coque (shell.js). */
const S = {
  ctx: null,
  signets: new Set(), // clés de points à relire
  regle: false,
  espace: false,
  nodes: {},
  cle: '',
};

/* Un seul bloc CSS, injecté via ctx.css (garde d'id par cssOnce). Les réglages
   sont pilotés par des attributs sur <html> : JS et CSS partagent la même
   source de vérité, sans style en ligne sur le contenu. */
const CSS = `
/* E011-01 — indice Flesch : chiffres tabulaires et pastille de niveau en texte. */
.recit-v2-e011-panel .recit-v2-e011-flesch{
  margin:0 0 8px;font-size:11px;line-height:1.55;font-variant-numeric:tabular-nums;
}
.recit-v2-e011-panel .recit-v2-e011-flesch strong{color:var(--gold-bright,#f4d69e)}
.recit-v2-e011-panel .recit-v2-e011-flesch[data-v2-e011-niveau]::after{
  content:' · niveau ' attr(data-v2-e011-niveau);
  font-weight:700;color:var(--gold,#e6b96f);
}
/* E011-02 — syllabes et mot le plus long : lecture chiffrée, sans couleur seule. */
.recit-v2-e011-panel .recit-v2-e011-detail{
  margin:0 0 6px;font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums;
}
.recit-v2-e011-panel .recit-v2-e011-mot{
  color:var(--ink,#e9e2d6);font-style:italic;overflow-wrap:anywhere;
}
/* E011-03 — temps de lecture à voix haute : référence rappelée en toutes lettres. */
.recit-v2-e011-panel .recit-v2-e011-oral{
  margin:0 0 8px;font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
}
/* E011-04 — géométrie réelle de la ligne : garde d'affichage par data attribute. */
.recit-v2-e011-panel .recit-v2-e011-geom{
  margin:0 0 8px;font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.recit-v2-e011-panel .recit-v2-e011-geom[data-v2-e011-geom="1"] strong{
  color:var(--gold-bright,#f4d69e);
}
/* E011-05 — signet de relecture : état porté par aria-pressed et par le libellé. */
.recit-v2-e011-panel .recit-v2-e011-signet[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16);
  color:var(--gold-bright,#f4d69e);font-weight:700;
}
/* E011-06 — règle de lecture : bandes alignées sur l'interlignage du texte mesuré. */
html[data-v2-e011-regle="1"] .recit-layout .recit-e011-measured,
html[data-v2-e011-regle="1"] .recit-layout .recit-title{
  background-image:repeating-linear-gradient(
    to bottom,transparent 0,transparent calc(1.6em - 1px),
    rgba(230,185,111,.16) calc(1.6em - 1px),rgba(230,185,111,.16) 1.6em);
  background-repeat:repeat-y;
}
/* E011-07 — espacement élargi des lettres et des mots (repère dyslexie). */
html[data-v2-e011-espace="1"] .recit-layout .recit-e011-measured,
html[data-v2-e011-espace="1"] .recit-layout .recit-title{
  letter-spacing:.04em;word-spacing:.16em;
}
/* E011-08 — recalcul : le bouton ne change pas la largeur du panneau. */
.recit-v2-e011-panel .recit-v2-e011-btn{
  flex:1 1 auto;min-width:96px;min-height:36px;padding:6px 9px;
  border:1px solid rgba(255,255,255,.28);border-radius:7px;
  background:var(--surface-2,#10151d);color:inherit;font:inherit;font-size:10px;
  cursor:pointer;touch-action:manipulation;
}
.recit-v2-e011-panel .recit-v2-e011-btn:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
/* E011-09 — fiche de mesure consolidée : paragraphe fluide et visible. */
.recit-v2-e011-panel .recit-v2-e011-resume{
  margin:8px 0 0;padding-top:8px;border-top:1px solid rgba(255,255,255,.18);
  font-size:10px;line-height:1.6;
}
/* E011-10 — filets de sécurité : contraste système et mouvement réduit. */
@media (prefers-contrast:more){
  .recit-v2-e011-panel{color:#f4eee2}
  .recit-v2-e011-panel .recit-v2-e011-detail,
  .recit-v2-e011-panel .recit-v2-e011-oral,
  .recit-v2-e011-panel .recit-v2-e011-geom{color:#f4eee2}
}
html[data-v2-e011-motion="reduced"] .recit-v2-e011-panel *{transition:none!important}

/* Cadre du panneau — ajouté en fin de colonne, jamais destructif. */
.recit-v2-e011-panel{
  margin-top:14px;padding:12px 13px;border:1px solid rgba(255,255,255,.28);
  border-radius:10px;background:rgba(8,11,16,.94);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.5;
}
.recit-v2-e011-panel .recit-v2-e011-heading{
  margin:0 0 3px;color:var(--gold-bright,#f4d69e);font-size:13px;font-weight:700;
}
.recit-v2-e011-panel .recit-v2-e011-intro{
  margin:0 0 9px;color:var(--muted,#a8a198);font-size:10px;
}
.recit-v2-e011-panel .recit-v2-e011-row{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.recit-v2-e011-panel .recit-v2-e011-signets{margin:0 0 6px;font-size:10px;line-height:1.5}
@media (max-width:620px){
  .recit-v2-e011-panel .recit-v2-e011-btn{min-width:0;width:100%}
}
`;

function present(node) {
  return !!(node && node.nodeType === 1);
}

function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function data(node, name, value) {
  if (!present(node) || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(`data-v2-e011-${name}`, String(value)); }
  catch { /* attribut facultatif */ }
}

function safeReduced(ctx) {
  try { return typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { return false; }
}

function scopeOf(ctx) {
  return (ctx && ctx.layout) || (ctx && ctx.stage) || null;
}

/* — Mesures dérivées du texte réel du point (aucune donnée inventée) -------- */

function estVoyelle(ch) {
  return VOYELLES.indexOf(String(ch).toLowerCase()) >= 0;
}

/* Approximation déterministe du nombre de syllabes d'un mot : groupes de
   voyelles, moins le « e » muet final. Aucune graine, aucune table externe. */
function compterSyllabes(mot) {
  const m = String(mot || '').toLowerCase();
  let groupes = 0;
  let enVoyelle = false;
  for (let i = 0; i < m.length; i += 1) {
    if (estVoyelle(m[i])) {
      if (!enVoyelle) { groupes += 1; enVoyelle = true; }
    } else {
      enVoyelle = false;
    }
  }
  if (groupes > 1 && /[^aàâaeéèêëiîïoôöuùûüœy]es?$/.test(m)) groupes -= 1;
  return Math.max(1, groupes);
}

function fr(value) {
  const arrondi = Math.round(value * 10) / 10;
  return String(arrondi).replace('.', ',');
}

function texteCourant(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelector !== 'function') return '';
  const titre = scope.querySelector('#recit-point-title') || scope.querySelector('.recit-title');
  return titre ? String(titre.textContent || '').trim() : '';
}

/* Identité stable du point courant : indice du fil (aria-current), sinon le
   texte lui-même. Survit aux reconstructions du DOM. */
function cleCourante(ctx) {
  const scope = scopeOf(ctx);
  if (scope && typeof scope.querySelectorAll === 'function') {
    const items = scope.querySelectorAll('.recit-thread-item[aria-current="step"], .c3a-thread-item[aria-current="step"]');
    for (let i = 0; i < items.length; i += 1) {
      const found = /c3a-point-(\d+)/.exec(items[i].getAttribute('data-fk') || '');
      if (found) return `point-${found[1]}`;
    }
  }
  const texte = texteCourant(ctx);
  return texte ? `texte:${texte}` : '';
}

/* E011-01 / E011-02 / E011-03 — toutes les grandeurs viennent du textContent. */
function mesurerTexte(texte) {
  const valeur = String(texte || '');
  const mots = valeur.match(/\S+/g) || [];
  const nbMots = mots.length;
  const nbPhrases = (valeur.match(/[.!?…]+/g) || []).length || (nbMots ? 1 : 0);
  let nbSyllabes = 0;
  let motLong = '';
  for (let i = 0; i < mots.length; i += 1) {
    nbSyllabes += compterSyllabes(mots[i]);
    if (mots[i].length > motLong.length) motLong = mots[i];
  }

  /* Flesch — version française : 207 − 1,015·(mots/phrases) − 73,6·(syllabes/mots). */
  let flesch = null;
  let niveau = 'indéterminé';
  if (nbMots && nbPhrases) {
    flesch = 207 - 1.015 * (nbMots / nbPhrases) - 73.6 * (nbSyllabes / nbMots);
    if (flesch >= 60) niveau = 'facile';
    else if (flesch >= 40) niveau = 'moyen';
    else niveau = 'difficile';
  }
  const oralSecondes = nbMots ? Math.max(1, Math.round((nbMots / ORAL_WPM) * 60)) : 0;
  return { nbMots, nbPhrases, nbSyllabes, motLong, flesch, niveau, oralSecondes };
}

/* E011-04 — géométrie réellement rendue : chaque rect d'un Range sur le texte
   du titre correspond à une ligne visuelle. Largeur et lignes sont mesurées,
   jamais supposées. */
function mesurerGeometrie(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelector !== 'function' || typeof document === 'undefined') return null;
  const titre = scope.querySelector('#recit-point-title') || scope.querySelector('.recit-title');
  if (!present(titre) || typeof titre.getElementsByTagName !== 'function') return null;
  const textes = titre.getElementsByTagName('*');
  const cible = titre.firstChild && titre.firstChild.nodeType === 3
    ? titre.firstChild
    : (textes.length ? textes[0].firstChild : null);
  if (!cible || typeof document.createRange !== 'function') return null;

  try {
    const range = document.createRange();
    range.selectNodeContents(titre);
    const rects = range.getClientRects();
    if (!rects || !rects.length) return null;
    let largeurMax = 0;
    const sommets = [];
    for (let i = 0; i < rects.length; i += 1) {
      largeurMax = Math.max(largeurMax, rects[i].width || 0);
      const haut = Math.round(rects[i].top || 0);
      if (sommets.indexOf(haut) < 0) sommets.push(haut);
    }
    const lignes = sommets.length || 1;
    const caractres = String(titre.textContent || '').length;
    return {
      lignes,
      largeurPx: Math.round(largeurMax),
      carParLigne: caractres ? Math.round(caractres / lignes) : 0,
    };
  } catch {
    return null;
  }
}

/* — Construction (ou réutilisation idempotente) du panneau V2 --------------- */

function bouton(ctx, id, label, className) {
  const node = ctx.el('button', className || 'recit-v2-e011-btn', label);
  node.type = 'button';
  node.id = id;
  return node;
}

function buildPanel(ctx) {
  const deja = document.getElementById(PANEL_ID);
  if (present(deja) && deja.parentElement && deja.parentElement.isConnected) {
    return {
      panel: deja,
      flesch: document.getElementById(FLESCH_ID),
      syllabes: document.getElementById(SYLLABES_ID),
      oral: document.getElementById(ORAL_ID),
      geom: document.getElementById(GEOM_ID),
      signets: document.getElementById(SIGNETS_ID),
      resume: document.getElementById(RESUME_ID),
      signetBtn: document.getElementById(SIGNET_BTN_ID),
      regleBtn: document.getElementById(REGLE_BTN_ID),
      espaceBtn: document.getElementById(ESPACE_BTN_ID),
      effacerBtn: document.getElementById(EFFACER_BTN_ID),
      recalcBtn: document.getElementById(RECALC_BTN_ID),
      fresh: false,
    };
  }

  const panel = ctx.el('section', 'recit-v2-e011-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', PANEL_TITRE_ID);

  const heading = ctx.el('h2', 'recit-v2-e011-heading', 'Lisibilité — mesures avancées');
  heading.id = PANEL_TITRE_ID;
  const intro = ctx.el('p', 'recit-v2-e011-intro',
    'Mesures recalculées à partir du texte et de la ligne réellement affichés. Aucune valeur n’est inventée.');

  const flesch = ctx.el('p', 'recit-v2-e011-flesch');
  flesch.id = FLESCH_ID;
  flesch.setAttribute('role', 'status');
  flesch.setAttribute('aria-live', 'polite');

  const syllabes = ctx.el('p', 'recit-v2-e011-detail');
  syllabes.id = SYLLABES_ID;

  const oral = ctx.el('p', 'recit-v2-e011-oral');
  oral.id = ORAL_ID;

  const geom = ctx.el('p', 'recit-v2-e011-geom');
  geom.id = GEOM_ID;

  const signets = ctx.el('p', 'recit-v2-e011-signets');
  signets.id = SIGNETS_ID;

  const rangee = ctx.el('div', 'recit-v2-e011-row');
  const signetBtn = bouton(ctx, SIGNET_BTN_ID, 'Signet de relecture', 'recit-v2-e011-btn recit-v2-e011-signet');
  const regleBtn = bouton(ctx, REGLE_BTN_ID, 'Règle de lecture', 'recit-v2-e011-btn');
  const espaceBtn = bouton(ctx, ESPACE_BTN_ID, 'Espacement élargi', 'recit-v2-e011-btn');
  const effacerBtn = bouton(ctx, EFFACER_BTN_ID, 'Effacer les signets', 'recit-v2-e011-btn');
  const recalcBtn = bouton(ctx, RECALC_BTN_ID, 'Recalculer les mesures', 'recit-v2-e011-btn');
  rangee.append(signetBtn, regleBtn, espaceBtn, effacerBtn, recalcBtn);

  const resume = ctx.el('p', 'recit-v2-e011-resume');
  resume.id = RESUME_ID;

  panel.append(heading, intro, flesch, syllabes, oral, geom, signets, rangee, resume);

  const host = (ctx.layout && typeof ctx.layout.querySelector === 'function'
    && ctx.layout.querySelector('.recit-body')) || ctx.stage;
  if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, flesch, syllabes, oral, geom, signets, resume,
    signetBtn, regleBtn, espaceBtn, effacerBtn, recalcBtn,
    fresh: true,
  };
}

/* — Application de l'état (texte visible + attributs, sans toucher au source) */

function applyState(ctx) {
  const n = S.nodes;
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (root && root.dataset) {
    root.dataset.v2E011Regle = S.regle ? '1' : '0';
    root.dataset.v2E011Espace = S.espace ? '1' : '0';
    root.dataset.v2E011Motion = S.reduced ? 'reduced' : 'full';
  }

  const m = mesurerTexte(texteCourant(ctx));
  const g = mesurerGeometrie(ctx);

  if (n.flesch) {
    n.flesch.textContent = m.flesch === null
      ? 'Indice Flesch : texte indisponible.'
      : `Indice Flesch : ${fr(m.flesch)} sur 100 (référence : ≥ 60 facile, 40–59 moyen, < 40 difficile).`;
    if (m.flesch !== null) data(n.flesch, 'niveau', m.niveau);
    else if (typeof n.flesch.removeAttribute === 'function') n.flesch.removeAttribute('data-v2-e011-niveau');
  }
  if (n.syllabes) {
    n.syllabes.textContent = m.nbMots
      ? `Syllabes : ${m.nbSyllabes} (≈ ${fr(m.nbSyllabes / m.nbMots)} par mot) · mot le plus long : `
      : 'Syllabes : texte indisponible.';
    if (m.motLong) {
      /* textContent ci-dessus a déjà retiré l'ancien span : on en crée un seul. */
      const mot = ctx.el('span', 'recit-v2-e011-mot', m.motLong);
      n.syllabes.appendChild(mot);
      n.syllabes.appendChild(document.createTextNode('.'));
    }
  }
  if (n.oral) {
    n.oral.textContent = m.nbMots
      ? `Lecture à voix haute : ≈ ${m.oralSecondes} s (référence : ${ORAL_WPM} mots/min, voix haute adulte ; `
        + `la passe 1 utilise 220 mots/min en silence).`
      : 'Lecture à voix haute : texte indisponible.';
  }
  if (n.geom) {
    n.geom.textContent = g
      ? `Ligne réellement affichée : ${g.lignes} ligne(s) · ${g.largeurPx} px de large · `
        + `≈ ${g.carParLigne} caractères par ligne (mesuré sur le titre).`
      : 'Ligne réellement affichée : mesure indisponible.';
    data(n.geom, 'geom', g ? '1' : '0');
  }
  if (n.signets) {
    n.signets.textContent = `Points marqués à relire : ${S.signets.size} `
      + `(ce point est ${S.cle && S.signets.has(S.cle) ? 'marqué' : 'non marqué'}).`;
  }
  if (n.signetBtn) {
    const actif = !!(S.cle && S.signets.has(S.cle));
    n.signetBtn.textContent = actif ? 'Signet : retirer de la relecture' : 'Signer pour relecture';
    n.signetBtn.setAttribute('aria-pressed', actif ? 'true' : 'false');
    n.signetBtn.disabled = !S.cle;
  }
  if (n.regleBtn) {
    n.regleBtn.textContent = S.regle ? 'Règle de lecture : activée' : 'Règle de lecture : désactivée';
    n.regleBtn.setAttribute('aria-pressed', S.regle ? 'true' : 'false');
  }
  if (n.espaceBtn) {
    n.espaceBtn.textContent = S.espace ? 'Espacement élargi : activé' : 'Espacement élargi : désactivé';
    n.espaceBtn.setAttribute('aria-pressed', S.espace ? 'true' : 'false');
  }
  if (n.resume) {
    n.resume.textContent = 'Fiche de mesure V2 · '
      + `Flesch ${m.flesch === null ? 'indisponible' : fr(m.flesch)} (${m.niveau}) · `
      + `${m.nbSyllabes} syllabes · voix haute ≈ ${m.oralSecondes} s · `
      + `${g ? `${g.lignes} ligne(s), ≈ ${g.carParLigne} car./ligne` : 'géométrie indisponible'} · `
      + `${S.signets.size} signet(s) · règle ${S.regle ? 'active' : 'inactive'} · `
      + `espacement ${S.espace ? 'élargi' : 'standard'}.`;
  }
}

function attachListeners(ctx) {
  const n = S.nodes;
  if (!n.fresh) return;

  if (n.signetBtn && typeof n.signetBtn.addEventListener === 'function') {
    n.signetBtn.addEventListener('click', () => {
      if (!S.cle) return;
      if (S.signets.has(S.cle)) S.signets.delete(S.cle);
      else S.signets.add(S.cle);
      applyState(S.ctx || ctx);
    });
  }
  if (n.regleBtn && typeof n.regleBtn.addEventListener === 'function') {
    n.regleBtn.addEventListener('click', () => { S.regle = !S.regle; applyState(S.ctx || ctx); });
  }
  if (n.espaceBtn && typeof n.espaceBtn.addEventListener === 'function') {
    n.espaceBtn.addEventListener('click', () => { S.espace = !S.espace; applyState(S.ctx || ctx); });
  }
  if (n.effacerBtn && typeof n.effacerBtn.addEventListener === 'function') {
    n.effacerBtn.addEventListener('click', () => { S.signets.clear(); applyState(S.ctx || ctx); });
  }
  if (n.recalcBtn && typeof n.recalcBtn.addEventListener === 'function') {
    n.recalcBtn.addEventListener('click', () => applyState(S.ctx || ctx));
  }
}

register('E011', (ctx) => {
  /* Garde d'existence globale : une lentille ne doit jamais faire échouer le rendu. */
  try {
    if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    const root = ctx.layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    try { ctx.css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }

    marquer(root, RACINE);
    S.ctx = ctx;
    S.reduced = safeReduced(ctx);
    S.cle = cleCourante(ctx);
    S.nodes = buildPanel(ctx);
    applyState(ctx);
    attachListeners(ctx);
  } catch {
    /* Enrichissement non destructif : le récit reste lisible sans cette lentille. */
  }
});
