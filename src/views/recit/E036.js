import { register } from './registry.js';

/* Lentille E036 — Mobile et reflow responsive (vue Récit).
 *
 * Fichier possédé : src/views/recit/E036.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E036.md (E036-01 … E036-10).
 *
 * Dix chantiers indépendants, tous additifs et non destructifs : sans ce module,
 * la vue reste intégralement lisible et aucune règle CSS n'est portée hors du
 * périmètre `.recit-layout.recit-e036-scope`. Le stage étant reconstruit à
 * chaque rendu (coque), le layout courant est toujours retrouvé depuis `ctx`,
 * jamais mémorisé. Seul l'état de la bascule de filtres survit aux rendus.
 *
 * Garde-fous : un seul register, un seul appel css('recit-e036', …) regroupant
 * toutes les règles, classes préfixées « recit-e036- », ids DOM préfixés
 * « e036- » et uniques, zéro réseau, zéro console, zéro Math.random, zéro
 * minuteur, zéro canvas, zéro boucle rAF. Les trois ids créés ont pour parent
 * `.recit-body` ou `.recit-thread`, donc échappent au masquage de
 * _diagnostics.js qui ne marque que les ids dont le parent direct est
 * body / stage / layout.
 */

const STYLE_ID = 'recit-e036';
const GLOBAL_KEY = 'VECTEMPOREL_E036';
const VERSION = '1.0.0';
const SCOPE = 'recit-e036-scope';
const STILL = 'recit-e036-still';
const COLLAPSE = 'recit-e036-tools-collapsed';
const IDS = {
  bascule: 'e036-tools-toggle',
  indice: 'e036-thread-hint',
  retour: 'e036-current-btn',
};

/* null = choix automatique (replié seulement sur écran étroit) ;
   true/false = choix explicite de l'utilisateur, conservé entre deux rendus. */
let choixFiltres = null;
let mouvementCalme = false;

/* Une seule feuille : les dix chantiers y sont regroupés et ordonnés. Les
   règles de grille (E036-01) précèdent le paysage court (E036-07) afin que ce
   dernier reprenne la main à spécificité égale. */
const CSS = `
/* E036-01 — Reflow à trois seuils, hauteur du média en unités de viewport
   stables (svh quand le navigateur le prend en charge, sinon vh). */
.recit-layout.recit-e036-scope{--e036-media-row:clamp(104px,22vh,220px)}
@supports (height:1svh){
  .recit-layout.recit-e036-scope{--e036-media-row:clamp(104px,22svh,220px)}
}
@media (max-width:620px){
  .recit-layout.recit-e036-scope{--e036-media-row:clamp(88px,18vh,150px)}
}
@supports (height:1svh){
  @media (max-width:620px){
    .recit-layout.recit-e036-scope{--e036-media-row:clamp(88px,18svh,150px)}
  }
}
@media (max-width:380px){
  .recit-layout.recit-e036-scope{--e036-media-row:clamp(76px,16vh,116px)}
}
@supports (height:1svh){
  @media (max-width:380px){
    .recit-layout.recit-e036-scope{--e036-media-row:clamp(76px,16svh,116px)}
  }
}
@media (max-width:1000px){
  .recit-layout.recit-e036-scope{
    grid-template-columns:minmax(0,1fr);
    grid-template-rows:var(--e036-media-row) minmax(0,1fr);
  }
}

/* E036-02 — Endiguement du débordement horizontal et stabilité du défilement. */
.recit-layout.recit-e036-scope{min-width:0;max-width:100%}
.recit-layout.recit-e036-scope .recit-media,
.recit-layout.recit-e036-scope .recit-body{min-width:0;max-width:100%}
.recit-layout.recit-e036-scope .recit-body{
  overflow-x:hidden;overflow-y:auto;
  overscroll-behavior:contain;scrollbar-gutter:stable;
  overflow-wrap:anywhere;word-break:break-word;
}
.recit-layout.recit-e036-scope .recit-media img{
  max-width:100%;height:100%;object-fit:cover;
}
.recit-layout.recit-e036-scope .media-caption{
  max-width:calc(100% - 16px);overflow-wrap:anywhere;
}
@media (max-width:380px){
  .recit-layout.recit-e036-scope .view-kicker,
  .recit-layout.recit-e036-scope .recit-meta{overflow-wrap:anywhere}
}

/* E036-03 — Cibles tactiles : plancher de 44 px sur pointeur grossier ou
   écran étroit, sans modifier l'ordre ni le libellé des commandes. */
@media (max-width:620px),(pointer:coarse){
  .recit-layout.recit-e036-scope .recit-actions button,
  .recit-layout.recit-e036-scope .recit-thread-item,
  .recit-layout.recit-e036-scope .c3a-filter,
  .recit-layout.recit-e036-scope .c3a-search,
  .recit-layout.recit-e036-scope .c3a-reset,
  .recit-layout.recit-e036-scope .recit-trace summary,
  .recit-layout.recit-e036-scope .recit-e036-tools-toggle,
  .recit-layout.recit-e036-scope .recit-e036-current-btn{min-height:44px}
  .recit-layout.recit-e036-scope .c3a-filter{padding-inline:10px}
}

/* E036-04 — Barre d'outils compactable : la recherche reste visible, seuls
   les deux groupes de filtres se replient, sur décision explicite. */
.recit-e036-tools-toggle{
  display:none;align-items:center;justify-content:center;gap:6px;
  margin:6px 0 0;padding:0 12px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright);
  font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s linear,background-color .18s linear,color .18s linear;
}
.recit-e036-tools-toggle:focus-visible,
.recit-e036-current-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:620px){
  .recit-layout.recit-e036-scope .recit-e036-tools-toggle{display:inline-flex}
  .recit-layout.recit-e036-tools-collapsed .c3a-tools .c3a-group{display:none}
}

/* E036-05 — Fil narratif défilable horizontalement sur écran étroit :
   une seule ligne, accroche douce au point, zone de défilement dédiée. */
.recit-e036-hint{
  display:none;margin:4px 0 6px;
  color:var(--muted-2);font-size:10px;line-height:1.4;
}
@media (max-width:620px){
  .recit-layout.recit-e036-scope .recit-e036-hint{display:block}
  .recit-layout.recit-e036-scope .recit-thread-list{
    position:relative;flex-wrap:nowrap;
    overflow-x:auto;overflow-y:hidden;
    scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;
    overscroll-behavior-x:contain;scrollbar-width:thin;padding-bottom:6px;
  }
  .recit-layout.recit-e036-scope .recit-thread-list>li{
    flex:0 0 auto;max-width:86vw;scroll-snap-align:start;
  }
  .recit-layout.recit-e036-scope .recit-thread-item{
    width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
}

/* E036-06 — Bande média mobile : cadrage, légende enveloppée et lisible,
   état vide centré. La hauteur de la bande est bornée par E036-01. */
.recit-layout.recit-e036-scope .recit-media img{object-position:center 42%}
@media (max-width:620px){
  .recit-layout.recit-e036-scope .media-caption{
    right:8px;bottom:8px;left:8px;max-width:none;
    padding:4px 6px;border-radius:5px;
    background:rgba(8,11,18,.62);color:#fff;
    font-size:10px;line-height:1.35;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;
    overflow:hidden;
  }
  .recit-layout.recit-e036-scope .media-empty{
    padding:10px 14px;text-align:center;font-size:11px;line-height:1.4;
  }
}

/* E036-07 — Paysage court : on abandonne l'empilement pour deux colonnes
   compactes, afin de ne pas gaspiller une hauteur déjà insuffisante. */
@media (max-height:520px) and (orientation:landscape) and (max-width:1000px){
  .recit-layout.recit-e036-scope{
    grid-template-columns:minmax(0,32%) minmax(0,68%);
    grid-template-rows:minmax(0,1fr);
  }
  .recit-layout.recit-e036-scope .recit-body{padding:10px 14px 18px}
  .recit-layout.recit-e036-scope #recit-point-title.recit-title{
    font-size:clamp(19px,3.4vw,27px);margin:4px 0 6px;
  }
  .recit-layout.recit-e036-scope .recit-media img{object-position:center center}
  .recit-layout.recit-e036-scope .media-caption{font-size:9px}
}

/* E036-08 — Retour explicite au point courant dans le fil défilable. */
.recit-e036-current-btn{
  display:none;align-items:center;justify-content:center;gap:6px;
  margin:6px 0 0;padding:0 12px;min-height:36px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);
  font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear;
}
@media (max-width:620px){
  .recit-layout.recit-e036-scope .recit-e036-current-btn{display:inline-flex}
}

/* E036-09 — Mouvement réduit, contraste renforcé et couleurs forcées :
   le défilement du fil reste instantané quand l'utilisateur l'a demandé. */
.recit-layout.recit-e036-still .recit-e036-tools-toggle,
.recit-layout.recit-e036-still .recit-e036-current-btn,
.recit-layout.recit-e036-still .recit-thread-list,
.recit-layout.recit-e036-still .recit-thread-list>li{transition:none;scroll-behavior:auto}
@media (prefers-reduced-motion:reduce){
  .recit-layout.recit-e036-scope .recit-e036-tools-toggle,
  .recit-layout.recit-e036-scope .recit-e036-current-btn,
  .recit-layout.recit-e036-scope .recit-thread-list,
  .recit-layout.recit-e036-scope .recit-thread-list>li{
    transition:none;scroll-behavior:auto;
  }
}
@media (prefers-contrast:more){
  .recit-layout.recit-e036-scope .recit-e036-hint,
  .recit-layout.recit-e036-scope .media-caption{color:#fff;background:rgba(0,0,0,.82)}
}
@media (forced-colors:active){
  .recit-layout.recit-e036-scope .recit-e036-tools-toggle,
  .recit-layout.recit-e036-scope .recit-e036-current-btn,
  .recit-layout.recit-e036-scope .recit-thread-item{
    border:1px solid CanvasText;color:CanvasText;
  }
}

/* E036-10 — Audit en lecture seule : aucune règle CSS supplémentaire ; le
   point d'observation est une API JavaScript exposée en fin de module. */
`;

function estPresent(noeud) {
  return Boolean(noeud && typeof noeud.appendChild === 'function');
}

function ajouteClasse(noeud, nom) {
  if (estPresent(noeud) && noeud.classList && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

function retrancheClasse(noeud, nom) {
  if (estPresent(noeud) && noeud.classList && noeud.classList.contains(nom)) {
    noeud.classList.remove(nom);
  }
}

function correspond(requete) {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? Boolean(window.matchMedia(requete).matches) : false;
  } catch {
    return false;
  }
}

function nouvelleFeuille(css) {
  if (typeof css !== 'function') return;
  css(STYLE_ID, CSS); /* un seul appel, toutes les règles du module. */
}

/* Idempotent : si apply est rejoué sur un DOM non reconstruit, on réutilise le
   nœud existant ; s'il a changé de parent, on lui retire son id avant d'en
   créer un neuf, pour garantir l'unicité. */
function trouveOuCree(parent, id, fabrique) {
  if (!estPresent(parent) || typeof document === 'undefined') return null;
  let noeud = null;
  try { noeud = document.getElementById(id); } catch { noeud = null; }
  if (noeud && noeud.parentElement !== parent) {
    try { noeud.removeAttribute('id'); } catch { /* garde-fou */ }
    noeud = null;
  }
  if (!noeud) {
    noeud = fabrique();
    if (!estPresent(noeud)) return null;
    noeud.id = id;
    parent.appendChild(noeud);
  }
  return noeud;
}

/* E036-04 — bascule de la barre d'outils. */
function installeBascule(el, layout, corps, outils) {
  if (!estPresent(corps) || !estPresent(outils)) return;
  const bouton = trouveOuCree(corps, IDS.bascule, () => {
    const neuf = el('button', 'recit-e036-tools-toggle', 'Filtres : afficher');
    neuf.type = 'button';
    return neuf;
  });
  if (!estPresent(bouton)) return;

  /* On insère juste avant la barre d'outils : le bouton n'est jamais inclus
     dans la zone repliée et reste donc toujours actionnable. */
  if (outils.parentElement === corps && bouton.nextElementSibling !== outils) {
    corps.insertBefore(bouton, outils);
  } else if (bouton.parentElement !== corps) {
    corps.appendChild(bouton);
  }

  const etroit = correspond('(max-width:620px)');
  const replie = choixFiltres === null ? etroit : !choixFiltres;
  if (replie) ajouteClasse(layout, COLLAPSE);
  else retrancheClasse(layout, COLLAPSE);
  bouton.textContent = replie ? 'Filtres : afficher' : 'Filtres : masquer';
  bouton.setAttribute('aria-expanded', String(!replie));
  bouton.setAttribute('aria-controls', outils.id || 'c3a-tools');

  if (bouton.getAttribute('data-e036-bound') === '1') return;
  bouton.setAttribute('data-e036-bound', '1');
  bouton.addEventListener('click', () => {
    choixFiltres = !layout.classList.contains(COLLAPSE);
    const cadre = document.querySelector('.recit-layout.recit-e036-scope');
    if (cadre) {
      if (choixFiltres) retrancheClasse(cadre, COLLAPSE);
      else ajouteClasse(cadre, COLLAPSE);
    }
    const courant = document.getElementById(IDS.bascule);
    if (estPresent(courant)) {
      courant.textContent = choixFiltres ? 'Filtres : masquer' : 'Filtres : afficher';
      courant.setAttribute('aria-expanded', String(choixFiltres));
    }
  });
}

/* E036-05 / E036-08 — recentrage du point courant dans le fil horizontal.
   Le calcul ne touche que scrollLeft de la liste : jamais le défilement de la
   page, jamais de nœud déplacé. */
function centreCourant(liste, avecMouvement) {
  if (!estPresent(liste) || typeof liste.querySelectorAll !== 'function') return null;
  const courant = liste.querySelector('[aria-current="step"]') || liste.querySelector('.is-current');
  if (!estPresent(courant)) return null;
  const gauche = Number(courant.offsetLeft) || 0;
  const largeur = Number(courant.offsetWidth) || 0;
  const voulu = Math.max(0, gauche - (liste.clientWidth - largeur) / 2);
  const borne = Math.max(0, liste.scrollWidth - liste.clientWidth);
  const cible = Math.min(voulu, borne);
  const comportement = avecMouvement && !mouvementCalme ? 'smooth' : 'auto';
  try {
    liste.scrollTo({ left: cible, behavior: comportement });
  } catch {
    liste.scrollLeft = cible;
  }
  return courant;
}

function installeFil(el, layout, thread) {
  if (!estPresent(thread)) return;
  const liste = thread.querySelector('.recit-thread-list');
  const titre = thread.querySelector('.recit-thread-title');
  const etroit = correspond('(max-width:620px)');

  /* E036-05 — aide visible seulement en mode défilable, et point d'arrêt
     clavier sur la zone de défilement elle-même. */
  const indice = trouveOuCree(thread, IDS.indice, () =>
    el('p', 'recit-e036-hint', 'Fil défilable horizontalement sur écran étroit.'));
  if (estPresent(indice) && estPresent(liste) && indice.nextElementSibling !== liste) {
    thread.insertBefore(indice, liste);
  }
  if (estPresent(liste) && typeof liste.setAttribute === 'function') {
    if (etroit) liste.setAttribute('tabindex', '0');
    else if (liste.getAttribute('tabindex') === '0') liste.removeAttribute('tabindex');
  }
  if (etroit) centreCourant(liste, false);

  /* E036-08 — bouton de retour au point courant, toujours présent dans le
     fil mais révélé par la feuille seulement sur écran étroit. */
  const retour = trouveOuCree(thread, IDS.retour, () => {
    const neuf = el('button', 'recit-e036-current-btn', '◎ Revenir au point courant');
    neuf.type = 'button';
    return neuf;
  });
  if (!estPresent(retour)) return;
  if (estPresent(liste) && titre && titre.nextElementSibling !== retour
      && retour.nextElementSibling !== titre) {
    thread.insertBefore(retour, titre.nextSibling);
  }
  if (estPresent(liste)) retour.setAttribute('aria-controls', liste.id || 'c3a-thread');

  if (retour.getAttribute('data-e036-bound') === '1') return;
  retour.setAttribute('data-e036-bound', '1');
  retour.addEventListener('click', () => {
    const courant = centreCourant(liste, true);
    if (estPresent(courant) && typeof courant.focus === 'function') {
      try { courant.focus({ preventScroll: true }); }
      catch { courant.focus(); }
    }
  });
}

/* E036-10 — observation en lecture seule, recalculée depuis le DOM courant. */
function styleOf(noeud, propriete) {
  if (!estPresent(noeud) || typeof window === 'undefined' || !window.getComputedStyle) return '';
  try { return window.getComputedStyle(noeud)[propriete] || ''; }
  catch { return ''; }
}

function hauteurOf(noeud) {
  if (!estPresent(noeud) || typeof noeud.getBoundingClientRect !== 'function') return 0;
  try { return noeud.getBoundingClientRect().height || 0; }
  catch { return 0; }
}

function premierChiffre(valeur) {
  const nombre = parseFloat(valeur);
  return Number.isFinite(nombre) ? nombre : 0;
}

function audit() {
  const doc = typeof document !== 'undefined' ? document : null;
  const layout = doc && doc.querySelector ? doc.querySelector('.recit-layout.recit-e036-scope') : null;
  const corps = layout ? layout.querySelector('.recit-body') : null;
  const liste = layout ? layout.querySelector('.recit-thread-list') : null;
  const media = layout ? layout.querySelector('.recit-media') : null;
  const legende = layout ? layout.querySelector('.media-caption') : null;
  const courant = liste ? (liste.querySelector('[aria-current="step"]') || liste.querySelector('.is-current')) : null;
  const bascule = doc && doc.getElementById ? doc.getElementById(IDS.bascule) : null;
  const retour = doc && doc.getElementById ? doc.getElementById(IDS.retour) : null;

  const etroit = correspond('(max-width:620px)');
  const paysageCourt = correspond('(max-height:520px) and (orientation:landscape)');
  const grossier = correspond('(pointer:coarse)');
  const calme = correspond('(prefers-reduced-motion:reduce)');
  const colonnes = styleOf(layout, 'gridTemplateColumns').trim().split(/\s+/).filter(Boolean).length;
  const rangee = premierChiffre(styleOf(layout, 'gridTemplateRows'));
  const debordement = corps ? Math.max(0, corps.scrollWidth - corps.clientWidth) : 0;

  let cibleMin = 0;
  if (layout && typeof layout.querySelectorAll === 'function') {
    const cibles = layout.querySelectorAll(
      '.recit-actions button:not([disabled]), .recit-thread-item, .c3a-filter, '
      + '.c3a-search, .c3a-reset, .recit-trace summary, '
      + '.recit-e036-tools-toggle, .recit-e036-current-btn'
    );
    const hauteurs = Array.from(cibles).map(hauteurOf).filter((h) => h > 0);
    cibleMin = hauteurs.length ? Math.min(...hauteurs) : 0;
  }

  let courantVisible = true;
  try {
    if (etroit && estPresent(courant) && estPresent(liste)) {
      const a = courant.getBoundingClientRect();
      const b = liste.getBoundingClientRect();
      courantVisible = a.left >= b.left - 2 && a.right <= b.right + 2;
    }
  } catch { courantVisible = false; }

  const checks = {
    'E036-01': Boolean(layout) && colonnes >= 1 && rangee > 0,
    'E036-02': Boolean(corps) && styleOf(corps, 'overflowX') === 'hidden'
      && styleOf(corps, 'minWidth') === '0px' && debordement === 0,
    'E036-03': !(etroit || grossier) || cibleMin >= 44,
    'E036-04': estPresent(bascule) && bascule.hasAttribute('aria-expanded')
      && bascule.hasAttribute('aria-controls'),
    'E036-05': !etroit || (estPresent(liste) && ['auto', 'scroll'].includes(styleOf(liste, 'overflowX'))),
    'E036-06': (!etroit || rangee <= 160)
      && (!estPresent(legende) || premierChiffre(styleOf(legende, 'fontSize')) >= 10),
    'E036-07': !paysageCourt || colonnes >= 2,
    'E036-08': estPresent(retour) && retour.hasAttribute('aria-controls'),
    'E036-09': !layout || layout.classList.contains(STILL) === calme,
    'E036-10': Boolean(typeof window !== 'undefined' && window[GLOBAL_KEY]
      && window[GLOBAL_KEY].version === VERSION),
  };
  const passed = Object.keys(checks).filter((cle) => checks[cle]).length;

  return {
    version: VERSION,
    styleId: STYLE_ID,
    largeur: typeof window !== 'undefined' ? window.innerWidth : 0,
    etroit,
    paysageCourt,
    grossier,
    colonnes,
    rangeeMedia: rangee,
    debordement,
    cibleMin,
    courantVisible,
    replie: Boolean(layout && layout.classList.contains(COLLAPSE)),
    calme: Boolean(layout && layout.classList.contains(STILL)),
    checks,
    passed,
  };
}

function exposeApi() {
  if (typeof window === 'undefined') return;
  const actuel = window[GLOBAL_KEY];
  if (actuel && actuel.version === VERSION) return;
  try {
    window[GLOBAL_KEY] = Object.freeze({ version: VERSION, styleId: STYLE_ID, audit });
  } catch { /* l'absence d'API ne doit jamais casser le rendu */ }
}

register('E036', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !estPresent(stage)) return;
    const cadre = (layout && layout.classList)
      ? layout : stage.querySelector('.recit-layout');
    if (!estPresent(cadre)) return;

    nouvelleFeuille(css);
    ajouteClasse(cadre, SCOPE);

    /* E036-09 — mouvement réduit lu une seule fois par rendu. */
    try {
      mouvementCalme = Boolean(typeof reducedMotion === 'function' && reducedMotion());
    } catch { mouvementCalme = false; }
    if (mouvementCalme) ajouteClasse(cadre, STILL);
    else retrancheClasse(cadre, STILL);
    if (typeof cadre.setAttribute === 'function') {
      cadre.setAttribute('data-e036-motion', mouvementCalme ? 'reduce' : 'normal');
    }

    const corps = cadre.querySelector('.recit-body');
    const outils = cadre.querySelector('.c3a-tools');
    const thread = cadre.querySelector('.recit-thread');
    installeBascule(el, cadre, corps, outils);
    installeFil(el, cadre, thread);
    exposeApi();
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu. */
  }
});
