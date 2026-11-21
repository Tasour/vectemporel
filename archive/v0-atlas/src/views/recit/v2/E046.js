import { register } from './registry.js';

/* V2 lentille E046 — « Mobile et reflow responsive » (vue Récit, complément).
   Thème repris de la passe 1, mais dix chantiers V2 neufs et distincts :
   01 typographie fluide du récit ; 02 titre fluide à tous les paliers ;
   03 recherche à 16 px (anti-zoom iOS) ; 04 filtres à 44 px ;
   05 confinement du défilement vertical ; 06 adaptation au paysage court ;
   07 indicateur d'orientation (mesuré) ; 08 compteur de défilement (mesuré) ;
   09 légende et traçabilité compactes ; 10 mouvement réduit des ajouts V2.
   Les mesures affichées sont dérivées du DOM réel (scrollHeight/clientHeight)
   et de window.innerWidth/innerHeight, jamais inventées.
   Un seul point d'entrée `register` et une seule feuille de style injectée
   une fois (identifiant recit-v2-e046).
   Classes recit-v2-e046-, ids DOM v2-e046- (jamais les ids e046- de la passe 1
   qui tourne sur le même DOM). Zéro console, réseau, aléa ou minuteur ;
   enrichissement non destructif, gardes partout, try/catch global. */

const CSS = `
/* E046-01 — Typographie fluide du récit entre les paliers. */
.recit-layout[data-v2-e046="on"] .recit-body{line-height:1.6}
.recit-layout[data-v2-e046="on"] .recit-context{
  font-size:clamp(14px,0.9vw + 11px,16px);line-height:1.7
}

/* E046-02 — Titre fluide à tous les paliers, sans débordement. */
.recit-layout[data-v2-e046="on"] #recit-point-title.recit-title{
  font-size:clamp(24px,3.2vw,40px);line-height:1.18;overflow-wrap:anywhere
}

/* E046-03 — Champ de recherche à 16 px sur mobile (anti-zoom iOS). */
@media (max-width:620px){
  .recit-layout[data-v2-e046="on"] .c3a-search{
    font-size:16px;min-height:44px
  }
}

/* E046-04 — Filtres et réinitialisation : cibles tactiles ≥ 44 px. */
@media (max-width:620px){
  .recit-layout[data-v2-e046="on"] .c3a-filter{
    min-height:44px;padding:6px 10px
  }
  .recit-layout[data-v2-e046="on"] .c3a-reset{min-height:44px}
}

/* E046-05 — Confinement du défilement vertical et barre discrète. */
.recit-layout[data-v2-e046="on"] .recit-v2-e046-corps{
  overscroll-behavior-y:contain;scrollbar-width:thin
}

/* E046-06 — Paysage court : densité verticale resserrée. */
@media (max-height:480px) and (orientation:landscape){
  .recit-layout[data-v2-e046="on"] .recit-body{
    padding-top:8px;padding-bottom:12px
  }
  .recit-layout[data-v2-e046="on"] .recit-media{min-height:72px}
  .recit-layout[data-v2-e046="on"] .recit-legend{margin-top:8px;padding-top:6px}
}

/* E046-07 — Indicateur d'orientation, texte mesuré. */
.recit-v2-e046-readout{
  margin:2px 0 0;color:var(--muted-2);font-size:10px;
  line-height:1.45;font-variant-numeric:tabular-nums
}

/* E046-08 — Compteur de défilement du récit, texte mesuré. */
.recit-v2-e046-scroll{color:var(--muted)}

/* E046-09 — Légende et traçabilité compactes sur mobile. */
@media (max-width:620px){
  .recit-layout[data-v2-e046="on"] .recit-legend{
    margin-top:10px;padding-top:8px;font-size:9px;line-height:1.55
  }
  .recit-layout[data-v2-e046="on"] .recit-legend p{margin:4px 0}
  .recit-layout[data-v2-e046="on"] .recit-trace{margin-top:8px}
}

/* E046-10 — Mouvement réduit des seuls ajouts de cette lentille. */
.recit-v2-e046-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e046="on"][data-v2-e046-motion="reduce"] .recit-v2-e046-readout{
  transition:none
}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e046-readout{transition:none}
}
`;

/* État module : survit aux reconstructions du DOM, jamais écrit ailleurs. */
let dernier = null;        // dernier contexte enrichi
let ecouteursPoses = false; // garde d'installation unique
let frame = 0;             // au plus une requête d'animation en vol

/* Ajoute une classe sans écraser les classes déjà portées par le nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose ou réutilise un paragraphe visible, à un emplacement stable. */
function placeParagraphe(el, id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = null;
  try { noeud = document.getElementById(id); } catch { return null; }
  if (!noeud) {
    noeud = el('p', classe);
    noeud.id = id;
    noeud.setAttribute('role', 'note');
  }
  if (noeud.textContent !== texte) noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Mesures réelles : dimensions de la fenêtre et hauteur de contenu du récit. */
function calculeMesures(corps) {
  let largeur = 0;
  let hauteur = 0;
  try {
    if (typeof window !== 'undefined') {
      largeur = window.innerWidth || 0;
      hauteur = window.innerHeight || 0;
    }
  } catch { /* fenêtre indisponible */ }

  let orientation = 'indéterminée';
  let dimensions = '—';
  if (largeur > 0 && hauteur > 0) {
    orientation = largeur >= hauteur ? 'paysage' : 'portrait';
    dimensions = `${largeur} × ${hauteur} px`;
  }

  let defilement = 'indisponible';
  try {
    if (corps && typeof corps.scrollHeight === 'number' && typeof corps.clientHeight === 'number') {
      const contenu = corps.scrollHeight;
      const visible = corps.clientHeight;
      if (visible > 0) {
        defilement = contenu > visible + 1
          ? `défilant · ${contenu} px de contenu pour ${visible} px visibles`
          : `tient à l'écran · ${contenu} px de contenu pour ${visible} px visibles`;
      }
    }
  } catch { /* mesure indisponible */ }

  return {
    orientation: `Orientation : ${orientation} (${dimensions}).`,
    defilement: `Contenu du récit : ${defilement}.`,
  };
}

/* Peinture unique : uniquement les deux lectures chiffrées de la V2. */
function peint() {
  const cur = dernier;
  if (!cur || !cur.corps || !cur.corps.isConnected) return;
  const textes = calculeMesures(cur.corps);
  if (cur.orientation && cur.orientation.textContent !== textes.orientation) {
    cur.orientation.textContent = textes.orientation;
  }
  if (cur.defilement && cur.defilement.textContent !== textes.defilement) {
    cur.defilement.textContent = textes.defilement;
  }
}

/* Une seule frame pour redimensionnement, orientation et retour de visibilité. */
function planifie() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { peint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; peint(); });
}

/* Installation unique, silencieuse et bornée des écouteurs. */
function installeEcouteurs() {
  if (ecouteursPoses || typeof window === 'undefined' || typeof document === 'undefined') return;
  ecouteursPoses = true;
  window.addEventListener('resize', planifie, { passive: true });
  window.addEventListener('orientationchange', planifie, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) planifie(); });
}

register('E046', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e046', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    layout.dataset.v2E046 = 'on';
    const reduce = typeof reducedMotion === 'function' && Boolean(reducedMotion());
    layout.setAttribute('data-v2-e046-motion', reduce ? 'reduce' : 'normal');
    ajouteClasse(corps, 'recit-v2-e046-corps');

    const status = corps.querySelector('#c3a-status') || corps.querySelector('.c3a-status');
    const timing = corps.querySelector('.recit-timing');
    const ancre = status || timing || null;
    const textes = calculeMesures(corps);

    /* E046-07 et E046-08 — deux lectures visibles, dérivées du réel. */
    const orientation = placeParagraphe(
      el, 'v2-e046-orientation',
      'recit-v2-e046-readout recit-v2-e046-orientation',
      corps, ancre, textes.orientation
    );
    const defilement = placeParagraphe(
      el, 'v2-e046-scroll',
      'recit-v2-e046-readout recit-v2-e046-scroll',
      corps, orientation, textes.defilement
    );

    dernier = { corps, orientation, defilement };
    installeEcouteurs();
    peint();
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
