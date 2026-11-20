import { register } from './registry.js';

/* V2 lentille E036 — Mobile et reflow responsive (complément de la passe 1).
   La passe 1 traite déjà : seuils 1000/620/380 px avec svh, endiguement du
   débordement, cibles 44 px, repli des filtres, fil horizontal, bande média,
   paysage court, retour au point courant, mouvement réduit et audit en lecture seule.
   La V2 propose donc DIX chantiers neufs et distincts, tous centrés sur le
   confort de lecture mobile : barre de défilement du corps, lien d'évitement,
   deux lectures chiffrées dérivées du DOM, légende en colonnes sur tablette,
   commandes en grille, métadonnées souples, espacement dégressif, ancrage de
   retour et confort des seuls éléments introduits ici.

   Préfixes : classes recit-v2-e036-, ids DOM v2-e036- (jamais les ids e036-
   de la passe 1 qui tourne sur le MÊME DOM). Une seule feuille css
   'recit-v2-e036'. Zéro réseau, zéro console, zéro aléa, aucun timer, aucun
   canvas. Enrichissement non destructif : sans ce module la vue reste lisible. */

const IDS = {
  barre: 'v2-e036-scroll',
  evasion: 'v2-e036-skip',
  hauteur: 'v2-e036-hauteur',
  partmedia: 'v2-e036-partmedia',
};

/* Une seule feuille : les dix chantiers y sont regroupés et ordonnés. */
const CSS = `
/* E036-01 — Barre de défilement du corps : repère fin, collé en haut de la
   zone de lecture, largeur calculée depuis le vrai défilement (voir JS). */
.recit-layout .recit-v2-e036-corps{position:relative}
.recit-v2-e036-barre{
  position:sticky;top:0;z-index:6;
  width:0;height:3px;margin:0;border-radius:0 0 3px 3px;
  background:linear-gradient(90deg,var(--gold),var(--gold-bright));
  pointer-events:none;transition:width .12s linear;
}

/* E036-02 — Lien d'évitement vers le point : hors écran au repos, révélé au
   focus, cible d'au moins 36 px, libellé et href dérivés du DOM réel. */
.recit-v2-e036-evasion{
  position:absolute;left:-9999px;top:0;z-index:20;
  min-height:36px;padding:6px 12px;
  border:1px solid var(--gold);border-radius:8px;
  background:#0b0e15;color:var(--gold-bright);
  font:inherit;font-size:11px;text-decoration:none;
}
.recit-v2-e036-evasion:focus{left:8px;top:8px}
.recit-v2-e036-evasion:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E036-03 / E036-04 — Lectures chiffrées visibles, insérées dans le corps. */
.recit-v2-e036-readout{
  margin:3px 0 0;color:var(--muted-2);font-size:9px;
  line-height:1.5;font-variant-numeric:tabular-nums;
}

/* E036-05 — Légende en deux colonnes sur tablette (largeur intermédiaire,
   entre les deux seuils déjà couverts par la passe 1). */
@media (min-width:621px) and (max-width:1000px){
  .recit-layout .recit-v2-e036-legendecols .recit-legend{column-count:2;column-gap:18px}
  .recit-layout .recit-v2-e036-legendecols .recit-legend p{break-inside:avoid;margin:0 0 8px}
}

/* E036-06 — Commandes en grille de deux colonnes sur mobile : les six
   boutons forment des rangées nettes au lieu d'un flex-wrap serré. */
@media (max-width:620px){
  .recit-layout .recit-v2-e036-actionsgrid .recit-actions{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;
  }
}

/* E036-07 — Métadonnées souples sur très petit écran : la pastille de
   certitude passe à la ligne sans casser le texte environnant. */
@media (max-width:380px){
  .recit-layout .recit-v2-e036-meta .recit-meta{
    display:flex;flex-wrap:wrap;gap:6px;align-items:center;
  }
}

/* E036-08 — Respiration verticale dégressive sur mobile : on récupère de la
   hauteur pour le texte sans retirer le moindre contenu. */
@media (max-width:620px){
  .recit-layout .recit-v2-e036-compact .view-kicker{margin-top:2px}
  .recit-layout .recit-v2-e036-compact .recit-title{margin:6px 0}
  .recit-layout .recit-v2-e036-compact .recit-legend{margin-top:12px;padding-top:10px}
}
@media (max-width:380px){
  .recit-layout .recit-v2-e036-compact .recit-title{margin:4px 0}
}

/* E036-09 — Ancrage de retour : marge de défilement sur la cible du lien
   d'évitement et défilement doux du panneau. */
.recit-layout .recit-v2-e036-ancrage #recit-point-title,
.recit-layout .recit-v2-e036-ancrage .recit-context{scroll-margin-top:12px}
.recit-layout .recit-v2-e036-ancrage .recit-body{scroll-behavior:smooth}

/* E036-10 — Confort des éléments V2 : mouvement réduit, contraste renforcé
   et couleurs forcées, limités aux seuls nœuds introduits par cette lentille. */
.recit-layout[data-v2-e036-motion="reduce"] .recit-v2-e036-barre{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e036-barre{transition:none}
  .recit-layout .recit-v2-e036-ancrage .recit-body{scroll-behavior:auto}
}
@media (prefers-contrast:more){
  .recit-v2-e036-readout{color:#fff}
  .recit-v2-e036-evasion{background:#000;color:#fff;border-color:#fff}
}
@media (forced-colors:active){
  .recit-v2-e036-barre{background:Highlight}
  .recit-v2-e036-evasion{border:1px solid CanvasText;color:CanvasText}
}
`;

function estPresent(noeud) {
  return Boolean(noeud && typeof noeud.appendChild === 'function');
}

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (estPresent(noeud) && noeud.classList && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Réutilise un nœud déjà inséré (idempotent). S'il a changé de parent, on lui
   retire son id avant d'en créer un neuf, pour garantir l'unicité du document. */
function trouveOuCree(parent, id, fabrique, el) {
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

/* Dépose un nœud juste après une ancre, sans le déplacer s'il est déjà là. */
function placeApres(parent, noeud, ancre) {
  if (!estPresent(parent) || !estPresent(noeud)) return;
  const ref = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (ref && noeud.nextSibling !== ref)) {
    parent.insertBefore(noeud, ref);
  }
}

/* E036-03 — hauteur réelle du panneau de lecture, lue sur le rectangle. */
function hauteurCorps(corps) {
  if (!estPresent(corps) || typeof corps.getBoundingClientRect !== 'function') return 0;
  try { return Math.round(corps.getBoundingClientRect().height || 0); }
  catch { return 0; }
}

/* E036-04 — part du média dans la fenêtre, les deux valeurs étant réelles. */
function partMedia(media) {
  if (typeof window === 'undefined' || !window.innerHeight || !estPresent(media)
      || typeof media.getBoundingClientRect !== 'function') return null;
  try {
    const h = media.getBoundingClientRect().height || 0;
    return Math.max(0, Math.min(100, Math.round((h / window.innerHeight) * 100)));
  } catch { return null; }
}

/* E036-01 — largeur de la barre déduite du seul défilement du corps. */
function metreBarre() {
  if (typeof document === 'undefined') return;
  let barre = null;
  try { barre = document.getElementById(IDS.barre); } catch { return; }
  if (!estPresent(barre)) return;
  const corps = barre.parentElement;
  const max = corps ? Math.max(0, (corps.scrollHeight || 0) - (corps.clientHeight || 0)) : 0;
  const pct = max > 0
    ? Math.max(0, Math.min(100, Math.round(((corps.scrollTop || 0) / max) * 100)))
    : 100;
  try { barre.style.width = `${pct}%`; } catch { /* garde-fou */ }
}

function exposeParametre(layout) {
  if (!estPresent(layout) || typeof layout.setAttribute !== 'function') return;
  let calme = false;
  try {
    calme = Boolean(typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
  } catch { calme = false; }
  /* Attribut propre à la V2 : jamais data-e036-motion de la passe 1. */
  layout.setAttribute('data-v2-e036-motion', calme ? 'reduce' : 'normal');
}

register('E036', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined') return;
    const cadre = (layout && estPresent(layout))
      ? layout
      : (stage && typeof stage.querySelector === 'function'
        ? stage.querySelector('.recit-layout') : null);
    if (!estPresent(cadre) || typeof cadre.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;

    css('recit-v2-e036', CSS); /* un seul appel, toutes les règles du module. */

    const corps = cadre.querySelector('.recit-body');
    if (!estPresent(corps)) return;

    /* E036-01 — barre de défilement, décorative donc retirée de l'arbre
       sémantique. Une seule liaison d'écouteur par nœud. */
    const barre = trouveOuCree(corps, IDS.barre, () => {
      const neuf = el('div', 'recit-v2-e036-barre');
      neuf.setAttribute('aria-hidden', 'true');
      return neuf;
    }, el);
    if (estPresent(barre)) {
      if (barre.getAttribute('data-v2-e036-bound') !== '1'
          && typeof corps.addEventListener === 'function') {
        barre.setAttribute('data-v2-e036-bound', '1');
        corps.addEventListener('scroll', metreBarre, { passive: true });
      }
      metreBarre();
    }

    /* E036-02 — lien d'évitement : la cible est le vrai titre du point. */
    const cible = document.getElementById('recit-point-title')
      || corps.querySelector('.recit-title');
    if (cible) {
      const evasion = trouveOuCree(corps, IDS.evasion, () => {
        const neuf = el('a', 'recit-v2-e036-evasion', 'Aller au point courant');
        neuf.href = cible.id ? `#${cible.id}` : '#';
        return neuf;
      }, el);
      if (estPresent(evasion) && typeof evasion.setAttribute === 'function') {
        if (cible.id) evasion.setAttribute('href', `#${cible.id}`);
      }
    }

    /* E036-03 — lecture de la hauteur disponible, jamais une valeur figée. */
    const kicker = corps.querySelector('.view-kicker');
    const timing = corps.querySelector('.recit-timing');
    if (timing || kicker) {
      const lecture = trouveOuCree(corps, IDS.hauteur, () => {
        const neuf = el('p', 'recit-v2-e036-readout');
        neuf.setAttribute('role', 'status');
        neuf.setAttribute('aria-live', 'polite');
        return neuf;
      }, el);
      if (estPresent(lecture)) {
        lecture.textContent = `Lecture disponible : ${hauteurCorps(corps)} px de haut dans le panneau.`;
        placeApres(corps, lecture, timing || kicker);
      }
    }

    /* E036-04 — part du média, calculée depuis ses deux grandeurs réelles. */
    const media = cadre.querySelector('.recit-media');
    const pct = partMedia(media);
    if (pct !== null) {
      const part = trouveOuCree(corps, IDS.partmedia, () => {
        const neuf = el('p', 'recit-v2-e036-readout');
        neuf.setAttribute('role', 'status');
        neuf.setAttribute('aria-live', 'polite');
        return neuf;
      }, el);
      if (estPresent(part)) {
        part.textContent = `Bande d'image : ${pct} % de la hauteur de fenêtre.`;
        placeApres(corps, part, timing || kicker);
      }
    }

    /* E036-05 à E036-09 — simples classes d'activation des règles CSS. */
    ajouteClasse(corps, 'recit-v2-e036-corps');
    ajouteClasse(corps, 'recit-v2-e036-legendecols');
    ajouteClasse(corps, 'recit-v2-e036-actionsgrid');
    ajouteClasse(corps, 'recit-v2-e036-meta');
    ajouteClasse(corps, 'recit-v2-e036-compact');
    ajouteClasse(corps, 'recit-v2-e036-ancrage');

    /* E036-10 — préférence de mouvement lue une fois par rendu. */
    try {
      if (typeof reducedMotion === 'function' && reducedMotion()) {
        if (typeof cadre.setAttribute === 'function') {
          cadre.setAttribute('data-v2-e036-motion', 'reduce');
        }
      } else {
        exposeParametre(cadre);
      }
    } catch {
      exposeParametre(cadre);
    }
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu. */
  }
});
