import { register } from './registry.js';

/* Lentille E057 — Contraste et perception (vue Récit).
 *
 * Dix chantiers indépendants (E057-01 … E057-10), tous non destructifs :
 * aucun texte n'est effacé, aucun gestionnaire existant n'est ré-attribué,
 * aucun fichier partagé n'est modifié. La lentille pose une classe racine,
 * injecte UN seul bloc CSS (id `recit-e057` via `css()`), enrichit les nœuds
 * déjà présents et ajoute deux commandes réversibles. Toutes les classes
 * créées sont préfixées `recit-e057-`, tous les identifiants `e057-`, tous
 * les attributs de données `data-e057-`. Zéro réseau, zéro journalisation,
 * zéro aléa, aucune animation pilotée par JavaScript.
 *
 * Les dix chantiers sont détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E057.md.
 */

const RACINE = 'recit-e057-root';
const CSS_ID = 'recit-e057';

/* Couleurs de référence du thème, lues dans les règles existantes :
   or `--gold`/`--gold-bright` = rgba(230,185,111) → #e6b96f ;
   fond de la coque = rgba(8,11,18) → #080b12 ;
   texte secondaire de référence = #9aa6b8. Elles servent uniquement à
   calculer un ratio WCAG affiché, jamais à réécrire une donnée. */
const OR = '#e6b96f';
const FOND = '#080b12';
const SECONDAIRE = '#9aa6b8';

/* Préférences de bascule, conservées d'un rendu à l'autre (la coque
   reconstruit le DOM à chaque changement de point). */
const prefs = { contraste: false, espacement: false };
let contrasteInitialise = false;

/* Bloc CSS unique. Les sélecteurs sont portés par la classe racine afin de
   ne jamais s'appliquer hors de la vue Récit. */
const CSS = `
.recit-e057-root{--e057-or:#e6b96f;--e057-encre:#f4f1ea;--e057-ligne:rgba(230,185,111,.45)}
/* E057-01 — mode contraste renforcé : texte et bordures remontés, opacités
   supprimées, sans toucher au contenu ni à la structure. */
.recit-e057-root.recit-e057-contraste .recit-title,
.recit-e057-root.recit-e057-contraste .recit-context,
.recit-e057-root.recit-e057-contraste .recit-legend p{color:var(--e057-encre);opacity:1}
.recit-e057-root.recit-e057-contraste .recit-meta,
.recit-e057-root.recit-e057-contraste .recit-timing,
.recit-e057-root.recit-e057-contraste .recit-sources,
.recit-e057-root.recit-e057-contraste .recit-e057-pct{color:#e8e3d6;opacity:1}
.recit-e057-root.recit-e057-contraste .recit-thread-item{color:#f3ecdd;opacity:1;border-color:var(--e057-ligne)}
.recit-e057-root.recit-e057-contraste .recit-thread-item.is-current{border-color:#ffe6b0}
.recit-e057-root.recit-e057-contraste .recit-progress{background:rgba(255,255,255,.22)}
.recit-e057-root.recit-e057-contraste .recit-conf{border-color:#ffe6b0;color:#ffe6b0}
.recit-e057-root.recit-e057-contraste .recit-e057-titre{background:linear-gradient(90deg,rgba(230,185,111,.18),rgba(230,185,111,0) 80%)}
/* E057-02 — indicateur de ratio : uniquement du texte, aucune région live. */
.recit-e057-root .recit-e057-ratio{
  margin:8px 0;padding:6px 10px;border-left:2px solid var(--e057-ligne);border-radius:0 6px 6px 0;
  background:rgba(230,185,111,.04);color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
/* E057-03 — certitude encodée par le motif de bordure et un mot, jamais
   par la seule couleur. */
.recit-e057-root .recit-e057-conf{border-width:2px;border-style:solid}
.recit-e057-root .recit-e057-conf[data-e057-rang="3"]{border-style:solid}
.recit-e057-root .recit-e057-conf[data-e057-rang="2"]{border-style:dashed}
.recit-e057-root .recit-e057-conf[data-e057-rang="1"]{border-style:dotted}
.recit-e057-root .recit-e057-conf[data-e057-rang="0"]{border-style:double}
.recit-e057-root .recit-e057-conf::after{
  content:' · ' attr(data-e057-niveau);font-weight:400;font-size:8px;letter-spacing:.04em;
}
/* E057-04 — contraste du focus clavier renforcé (contours épais + liseré). */
.recit-e057-root .recit-actions button:focus-visible,
.recit-e057-root .recit-e057-bouton:focus-visible,
.recit-e057-root .c3a-search:focus-visible,
.recit-e057-root .c3a-filter:focus-visible,
.recit-e057-root .c3a-reset:focus-visible,
.recit-e057-root .recit-thread-item:focus-visible,
.recit-e057-root .recit-trace summary:focus-visible{
  outline:3px solid #ffe6b0;outline-offset:2px;box-shadow:0 0 0 1px #080b12;
}
/* E057-05 — figure/fond du point courant : bandeau de contraste derrière le
   titre, sans modifier son padding ni sa bordure (aucun conflit de mise en page). */
.recit-e057-root .recit-e057-titre{
  background:linear-gradient(90deg,rgba(230,185,111,.10),rgba(230,185,111,0) 70%);
  border-radius:6px;
}
.recit-e057-root .recit-e057-kicker{color:var(--e057-or)}
/* E057-06 — états désactivés lisibles par texture et contraste, pas seulement
   par une opacité faible. */
.recit-e057-root .recit-actions button[disabled],
.recit-e057-root .c3a-filter[disabled],
.recit-e057-root .recit-thread-item[disabled]{
  opacity:.55;border-style:dashed;
  background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 4px,transparent 4px 8px);
}
/* E057-07 — barre de progression texturée + pourcentage chiffré à côté. */
.recit-e057-root .recit-e057-progress{background:rgba(255,255,255,.16);border:1px solid var(--line)}
.recit-e057-root .recit-e057-progress>span{
  background-image:repeating-linear-gradient(45deg,rgba(0,0,0,.20) 0 3px,transparent 3px 6px);
}
.recit-e057-root .recit-e057-pct{
  margin:0 0 10px;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;
}
/* E057-08 — contraste des légendes d'image et de la traçabilité. */
.recit-e057-root .recit-e057-legende-image{color:#f0e9da;text-shadow:0 1px 3px #000,0 0 2px #000}
.recit-e057-root .recit-e057-trace summary,
.recit-e057-root .recit-e057-sources{color:var(--muted);opacity:1}
.recit-e057-root .recit-e057-trace::before{content:'▸ ';color:var(--e057-or)}
/* E057-09 — espacement de lecture élargi pour la perception. */
.recit-e057-root .recit-e057-espacement.recit-e057-corps .recit-context,
.recit-e057-root .recit-e057-espacement.recit-e057-corps .recit-title,
.recit-e057-root .recit-e057-espacement.recit-e057-corps .recit-legend p{
  line-height:1.85;letter-spacing:.035em;word-spacing:.16em;
}
/* E057-10 — préférence système « contraste renforcé » : s'applique même sans
   JavaScript ; les transitions ne sont ajoutées que si le mouvement est permis. */
@media (prefers-contrast:more){
  .recit-e057-root .recit-title,
  .recit-e057-root .recit-context,
  .recit-e057-root .recit-legend p,
  .recit-e057-root .recit-meta,
  .recit-e057-root .recit-timing{color:#ffffff;opacity:1}
  .recit-e057-root .recit-thread-item{color:#ffffff;opacity:1;border-color:#f0d49a}
  .recit-e057-root .recit-progress{background:rgba(255,255,255,.30)}
}
@media (prefers-reduced-motion:reduce){
  .recit-e057-root *{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .recit-e057-root .recit-e057-ratio,
  .recit-e057-root .recit-e057-pct{font-size:10px;line-height:1.6}
}
`;

/* --- Utilitaires, tous gardés contre l'absence de DOM ------------------- */

function securiser(fn) {
  try { fn(); } catch { /* rendu préservé coûte que coûte */ }
}

function marquer(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function retirer(node, className) {
  if (node && node.classList && typeof node.classList.remove === 'function') {
    node.classList.remove(className);
  }
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') {
    try { node.setAttribute(name, value); } catch { /* attribut facultatif */ }
  }
}

/* Lit « Étape X / Y » dans le surtitre sans modifier son texte. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const found = texte.match(/(\d+)\s*\/\s*(\d+)/);
  if (!found) return null;
  return { etape: found[1], total: found[2] };
}

/* Rang de certitude, du plus fort au plus faible, lu sur la pastille. */
function rangCertitude(texte) {
  const value = String(texte || '').toLowerCase();
  if (value.indexOf('vérifié') >= 0 || value.indexOf('verifie') >= 0) return 4;
  if (value.indexOf('certain') >= 0) return 3;
  if (value.indexOf('probable') >= 0) return 2;
  if (value.indexOf('contesté') >= 0 || value.indexOf('disputed') >= 0) return 1;
  return 0;
}

/* Luminance WCAG relative d'une couleur hexadécimale. */
function luminance(hex) {
  const found = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!found) return null;
  const n = parseInt(found[1], 16);
  const canaux = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lineaire = canaux.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lineaire[0] + 0.7152 * lineaire[1] + 0.0722 * lineaire[2];
}

/* Ratio de contraste WCAG entre deux couleurs (1 à 21). */
function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const clair = Math.max(la, lb);
  const sombre = Math.min(la, lb);
  return (clair + 0.05) / (sombre + 0.05);
}

function formatRatio(valeur) {
  if (valeur === null || !isFinite(valeur)) return '—';
  return valeur.toFixed(1).replace('.', ',');
}

function detecterContrasteSysteme() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-contrast: more)').matches;
  } catch { return false; }
}

/* Bascule réversible, unique par identifiant, insérée dans la barre d'actions
   (parent imbriqué : jamais directement sous body/stage/layout). */
function ajouterBouton(el, actions, id, libelleActif, libelleInactif, pressed, onChange) {
  if (typeof el !== 'function' || !actions || typeof actions.insertBefore !== 'function') return null;
  if (typeof document !== 'undefined' && document.getElementById(id)) return null;
  const bouton = el('button', 'recit-e057-bouton', pressed ? libelleActif : libelleInactif);
  bouton.id = id;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(pressed));
  bouton.setAttribute('data-fk', id);
  bouton.addEventListener('click', () => onChange(bouton));
  actions.insertBefore(bouton, actions.firstChild);
  return bouton;
}

register('E057', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  const racine = layout && typeof layout.querySelector === 'function'
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!racine) return;

  const reduction = typeof reducedMotion === 'function' && reducedMotion();
  const transition = reduction ? ''
    : '.recit-e057-root .recit-title,.recit-e057-root .recit-conf{transition:color .18s ease,border-color .18s ease,background-color .18s ease}';

  /* Une seule feuille de styles, une seule fois. */
  securiser(() => { if (typeof css === 'function') css(CSS_ID, CSS + transition); });

  marquer(racine, RACINE);

  const systeme = detecterContrasteSysteme();
  if (systeme && !contrasteInitialise) {
    prefs.contraste = true;
    contrasteInitialise = true;
  }
  setAttr(racine, 'data-e057-systeme', systeme ? 'renforce' : 'standard');

  /* Repères du DOM, tous facultatifs. */
  const corps = racine.querySelector('.recit-body');
  const actions = racine.querySelector('.recit-actions');
  const kicker = racine.querySelector('.view-kicker');
  const titre = racine.querySelector('#recit-point-title, .recit-title');
  const conf = racine.querySelector('.recit-conf');
  const progression = racine.querySelector('.recit-progress');
  const media = racine.querySelector('.recit-media');
  const trace = racine.querySelector('.recit-trace');
  const sources = racine.querySelector('.recit-sources');
  const meta = racine.querySelector('.recit-meta');

  /* --- E057-01 : mode contraste renforcé --------------------------------- */
  securiser(() => {
    const actif = Boolean(prefs.contraste);
    if (actif) marquer(racine, 'recit-e057-contraste');
    const bouton = ajouterBouton(el, actions, 'e057-contraste',
      'Contraste : renforcé', 'Contraste : standard', actif, (b) => {
        prefs.contraste = !prefs.contraste;
        const r = racine;
        if (prefs.contraste) marquer(r, 'recit-e057-contraste');
        else retirer(r, 'recit-e057-contraste');
        b.setAttribute('aria-pressed', String(prefs.contraste));
        b.textContent = prefs.contraste ? 'Contraste : renforcé' : 'Contraste : standard';
      });
    if (bouton) bouton.title = 'Renforce le contraste des textes et des bordures du récit';
  });

  /* --- E057-02 : ratio WCAG chiffré -------------------------------------- */
  securiser(() => {
    if (typeof el !== 'function' || (typeof document !== 'undefined' && document.getElementById('e057-ratio'))) return;
    const principal = contraste(OR, FOND);
    const secondaire = contraste(SECONDAIRE, FOND);
    if (principal === null || secondaire === null) return;
    const respecteAA = principal >= 4.5;
    const texte = `Contraste estimé (thème) : texte principal ${formatRatio(principal)}:1, `
      + `texte secondaire ${formatRatio(secondaire)}:1 · seuil AA 4,5:1 `
      + `${respecteAA ? 'respecté' : 'à vérifier'}.`;
    const badge = el('p', 'recit-e057-ratio', texte);
    badge.id = 'e057-ratio';
    const ref = meta || progression || (corps && corps.firstChild);
    if (ref && typeof ref.insertAdjacentElement === 'function') {
      ref.insertAdjacentElement('afterend', badge);
    } else if (corps && typeof corps.appendChild === 'function') {
      corps.appendChild(badge);
    }
  });

  /* --- E057-03 : certitude encodée par motif ----------------------------- */
  securiser(() => {
    if (!conf) return;
    marquer(conf, 'recit-e057-conf');
    const rang = rangCertitude(conf.textContent);
    const niveaux = ['—', 'incertain', 'moyen', 'établi', 'confirmé'];
    setAttr(conf, 'data-e057-rang', String(rang));
    setAttr(conf, 'data-e057-niveau', niveaux[rang] || '—');
  });

  /* --- E057-04 : contraste du focus -------------------------------------- */
  /* Réglé intégralement par le bloc CSS (aucun nœud à créer). */

  /* --- E057-05 : figure/fond du point courant ---------------------------- */
  securiser(() => {
    marquer(titre, 'recit-e057-titre');
    marquer(kicker, 'recit-e057-kicker');
  });

  /* --- E057-06 : états désactivés ---------------------------------------- */
  /* Réglé intégralement par le bloc CSS (aucun nœud à créer). */

  /* --- E057-07 : progression texturée + pourcentage ---------------------- */
  securiser(() => {
    marquer(progression, 'recit-e057-progress');
    const etape = lireEtape(kicker);
    if (!etape || typeof el !== 'function') return;
    if (typeof document !== 'undefined' && document.getElementById('e057-pct')) return;
    const n = Number(etape.etape);
    const d = Number(etape.total);
    if (!d || !isFinite(n / d)) return;
    const pct = Math.max(0, Math.min(100, Math.round((n / d) * 100)));
    setAttr(progression, 'data-e057-pct', String(pct));
    const ligne = el('p', 'recit-e057-pct',
      `Progression du repère : ${pct} % (point ${etape.etape} sur ${etape.total}).`);
    ligne.id = 'e057-pct';
    const ref = progression || (corps && corps.firstChild);
    if (ref && typeof ref.insertAdjacentElement === 'function') {
      ref.insertAdjacentElement('afterend', ligne);
    } else if (corps && typeof corps.appendChild === 'function') {
      corps.appendChild(ligne);
    }
  });

  /* --- E057-08 : contraste des légendes et de la traçabilité ------------- */
  securiser(() => {
    marquer(media, 'recit-e057-media');
    if (media) {
      const img = media.querySelector('img');
      if (img) setAttr(img, 'data-e057-image', 'presente');
      marquer(media.querySelector('.media-caption'), 'recit-e057-legende-image');
      marquer(media.querySelector('.recit-media-credit'), 'recit-e057-legende-image');
    }
    marquer(trace, 'recit-e057-trace');
    marquer(sources, 'recit-e057-sources');
    if (trace) {
      const nb = /(\d+)\s*référence/i.exec(String(trace.textContent || ''));
      if (nb) setAttr(trace, 'data-e057-nb-sources', nb[1]);
    }
  });

  /* --- E057-09 : espacement de lecture ----------------------------------- */
  securiser(() => {
    if (!corps) return;
    marquer(corps, 'recit-e057-corps');
    if (prefs.espacement) marquer(corps, 'recit-e057-espacement');
    const bouton = ajouterBouton(el, actions, 'e057-espacement',
      'Espacement : large', 'Espacement : normal', prefs.espacement, (b) => {
        prefs.espacement = !prefs.espacement;
        const c = racine.querySelector('.recit-e057-corps');
        if (prefs.espacement) marquer(c, 'recit-e057-espacement');
        else retirer(c, 'recit-e057-espacement');
        b.setAttribute('aria-pressed', String(prefs.espacement));
        b.textContent = prefs.espacement ? 'Espacement : large' : 'Espacement : normal';
      });
    if (bouton) bouton.title = 'Élargit l’interlignage et l’espacement des mots du récit';
  });

  /* --- E057-10 : préférence système et mouvement réduit ------------------ */
  /* Détection faite en tête de fonction (data-e057-systeme) ; le bloc CSS
     applique la règle native `@media (prefers-contrast: more)`. */
});
