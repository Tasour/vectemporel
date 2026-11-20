import { register } from './registry.js';

/* Lentille E095 — Adaptabilité responsive appliquée au champ d'étoiles de la
   vue Constellation. Dix chantiers locaux et déterministes : une seule feuille
   de style, un seul greffon, aucun appel réseau, aucune source d'aléa, aucun
   minuteur ni boucle d'animation propre, aucun fichier partagé modifié.
   Le greffon reste tolérant : sans layout fourni, il ne touche pas au DOM. */

const E095_LECTEUR = 'e095-state';

/* Observateur unique conservé entre deux rendus du shell (le DOM est recréé
   à chaque changement d'état) : jamais deux observateurs actifs à la fois. */
let e095Observateur = null;
let e095Champ = null;

const CSS = `
/* E095-02 — Hauteur minimale fluide : la vue pose une borne fixe en dur, on la
   remplace par la variable écrite par la mesure, avec une valeur de repli. */
.constellation-field.e095-field{
  min-height:var(--e095-hauteur,420px);
}

/* E095-03 — Trame d'étoiles de fond : huit points fixes, sans aucune source
   aléatoire ni ressource externe. Le palier étroit en réduit le nombre. */
.constellation-field.e095-field{
  background-color:rgba(6,9,15,.55);
  background-repeat:no-repeat;
  background-image:
    radial-gradient(circle 1.4px at 12% 18%,rgba(244,214,158,.55),transparent 70%),
    radial-gradient(circle 1.1px at 27% 64%,rgba(178,139,221,.45),transparent 70%),
    radial-gradient(circle 1.6px at 41% 31%,rgba(244,214,158,.40),transparent 70%),
    radial-gradient(circle 1.0px at 58% 77%,rgba(207,222,240,.38),transparent 70%),
    radial-gradient(circle 1.3px at 69% 22%,rgba(230,185,111,.48),transparent 70%),
    radial-gradient(circle 1.0px at 81% 58%,rgba(178,139,221,.42),transparent 70%),
    radial-gradient(circle 1.5px at 34% 86%,rgba(244,214,158,.34),transparent 70%),
    radial-gradient(circle 1.1px at 92% 88%,rgba(207,222,240,.30),transparent 70%);
}
@media (max-width:480px){
  .constellation-field.e095-field{
    background-color:rgba(6,9,15,.72);
    background-image:
      radial-gradient(circle 1.3px at 14% 24%,rgba(244,214,158,.55),transparent 70%),
      radial-gradient(circle 1.1px at 46% 70%,rgba(178,139,221,.45),transparent 70%),
      radial-gradient(circle 1.4px at 72% 28%,rgba(230,185,111,.48),transparent 70%),
      radial-gradient(circle 1.0px at 88% 82%,rgba(207,222,240,.36),transparent 70%);
  }
}
.constellation-field.e095-field[data-e095-trame="claire"]{ background-color:rgba(6,9,15,.78); }

/* E095-04 — Traits du réseau : épaisseur et opacité pilotées par les variables
   écrites selon le palier ; la priorité l'emporte sur les traits de la vue. */
.constellation-field.e095-field{
  --e095-trait:1;
  --e095-opacite:1;
}
.constellation-field.e095-field .constellation-edges line{
  stroke-width:var(--e095-trait);
  opacity:var(--e095-opacite);
}

/* E095-05 — Lunes : disque piloté par le palier, contour renforcé sur champ
   étroit, anneau de focus réservé au clavier et légende tassée sur mobile. */
.constellation-field.e095-field{
  --e095-lune:14px;
}
.constellation-field.e095-field .const-moon{
  width:var(--e095-lune);
  height:var(--e095-lune);
}
.constellation-field.e095-field[data-e095-palier="etroit"] .const-moon{
  border-width:2px;
}
.constellation-field.e095-field .const-moon:focus-visible{
  outline:2px solid var(--gold-bright,#f0cf8f);
  outline-offset:2px;
}
@media (max-width:480px){
  .constellation-field.e095-field .const-moon::after{ display:none; }
}

/* E095-06 — Légende : les trois pastilles deviennent des lignes pleine largeur
   quand le champ se resserre, avec une hauteur d'appui d'au moins 24 px. */
.constellation-legend.e095-legende{
  display:flex;
  flex-wrap:wrap;
  gap:6px 12px;
}
.constellation-legend.e095-legende > *{
  display:inline-flex;
  align-items:center;
  min-height:24px;
}
@media (max-width:480px){
  .constellation-head.e095-tete .constellation-legend.e095-legende > *{
    flex:1 1 100%;
  }
}

/* E095-07 — En-tête : le titre suit une échelle fluide et l'espacement se
   resserre ; le surtitre perd de l'écartement sur les très petits écrans. */
.constellation-head.e095-tete{
  gap:4px 10px;
}
.constellation-head.e095-tete .constellation-title{
  font-size:clamp(15px,2.4vw,20px);
}
@media (max-width:420px){
  .constellation-head.e095-tete .constellation-kicker{ letter-spacing:.08em; }
}

/* E095-08 — Pied de légende : la note, l'état et le bouton s'empilent en
   colonne sur champ étroit au lieu de se partager une ligne fragile. */
.constellation-caption.e095-caption{
  gap:6px 12px;
}
@media (max-width:480px){
  .constellation-caption.e095-caption{
    flex-direction:column;
    align-items:flex-start;
  }
  .constellation-caption.e095-caption .constellation-note{ flex-basis:auto; }
}

/* E095-09 — Lecteur d'état : message discret, lisible et annoncé, en dessous
   duquel on trouve la mesure réellement utilisée par les chantiers 01 à 05. */
.e095-readout{
  margin:0;
  color:var(--muted,#93a0b4);
  font-size:9px;
  font-variant-numeric:tabular-nums;
}
@media (max-width:480px){
  .e095-readout{ flex-basis:100%; }
}

/* E095-10 — Mouvement réduit et orientation courte : aucune transition quand
   le contexte le demande, et un champ moins haut en paysage peu profond. */
.constellation-field.e095-field.e095-calm *{ transition:none !important; }
@media (prefers-reduced-motion:reduce){
  .constellation-field.e095-field *{ transition:none !important; }
}
@media (orientation:landscape) and (max-height:520px){
  .constellation-field.e095-field{ min-height:300px; }
  .constellation-field.e095-field .constellation-edges line{ stroke-width:.8; }
}
`;

/* Paliers déterministes : largeur du champ (px) → réglages dérivés. */
function palierPour(largeur) {
  if (largeur < 480) {
    return { cle: 'etroit', trait: '0.8', opacite: '0.9', lune: '18px', trame: 'claire' };
  }
  if (largeur < 900) {
    return { cle: 'moyen', trait: '1', opacite: '1', lune: '16px', trame: 'moyenne' };
  }
  return { cle: 'large', trait: '1.2', opacite: '1', lune: '14px', trame: 'pleine' };
}

register('E095', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.layout.querySelector !== 'function') return;

  const layout = ctx.layout;
  const champ = layout.querySelector('.constellation-field');
  if (!champ || !champ.style || typeof champ.style.setProperty !== 'function') return;

  /* Une seule feuille de style pour toute la lentille. */
  ctx.css('constellation-e095', CSS);
  champ.classList.add('e095-field');

  let lecteur = null;

  /* Mesure unique, réutilisée par le rendu initial et par l'observateur. */
  const mesurer = () => {
    const largeur = champ.clientWidth || layout.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1024) || 1024;
    const palier = palierPour(largeur);
    const hauteur = Math.round(Math.max(360, Math.min(520, largeur * 0.62)));
    const etoiles = champ.querySelectorAll('.const-sun,.const-planet,.const-moon').length;

    /* E095-01 — Mesure et classement du champ : la largeur réelle (avec repli
       sur le layout puis la fenêtre) fixe un palier écrit dans le DOM. */
    champ.dataset.e095Palier = palier.cle;

    /* E095-02 — Hauteur minimale fluide : 62 % de la largeur, bornée entre
       360 et 520 px, exposée en variable CSS au lieu d'une valeur fixe. */
    champ.style.setProperty('--e095-hauteur', hauteur + 'px');

    /* E095-03 — Densité de la trame : le palier pilote l'intensité du fond
       étoilé ; la feuille réduit elle-même le nombre de points sous 480 px. */
    champ.dataset.e095Trame = palier.trame;

    /* E095-04 — Traits adaptatifs : épaisseur et opacité sont calculées ici
       puis consommées par la règle CSS du réseau de constellation. */
    champ.style.setProperty('--e095-trait', palier.trait);
    champ.style.setProperty('--e095-opacite', palier.opacite);

    /* E095-05 — Dimension des lunes : disque plus large sur champ étroit pour
       préserver la cible tactile, plus fin sur grand écran. */
    champ.style.setProperty('--e095-lune', palier.lune);

    /* E095-09 — Lecteur : la mesure sert de témoin chiffré, annoncé poliment
       et mis à jour à chaque recalcul sans jamais générer d'aléa. */
    if (lecteur && lecteur.isConnected) {
      lecteur.textContent = 'Champ ' + Math.round(largeur) + ' px · palier ' + palier.cle +
        ' · hauteur ' + hauteur + ' px · ' + etoiles + ' étoiles';
    }
  };

  /* E095-06 — Légende : marquage de la légende existante pour la mise en
     colonne responsive, sans toucher au balisage produit par la vue. */
  const legende = layout.querySelector('.constellation-legend');
  if (legende) legende.classList.add('e095-legende');

  /* E095-07 — En-tête : marquage de la tête pour le titre fluide et la
     réduction des gouttières décrite dans la feuille unique. */
  const tete = layout.querySelector('.constellation-head');
  if (tete) tete.classList.add('e095-tete');

  /* E095-08 — Pied : marquage du pied de légende pour l'empilement en colonne
     sur les champs étroits, avec un id préfixé conforme au contrat. */
  const caption = layout.querySelector('.constellation-caption');
  if (caption) caption.classList.add('e095-caption');

  /* E095-09 — Lecteur d'état : un seul par rendu, rôle et live region posés,
     avec un repli tolérant si ctx.el n'est pas fourni. */
  lecteur = layout.querySelector('#' + E095_LECTEUR);
  if (!lecteur) {
    const fabriquer = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, classe, texte) => {
          const n = document.createElement(tag);
          if (classe) n.className = classe;
          if (texte !== undefined) n.textContent = texte;
          return n;
        };
    lecteur = fabriquer('p', 'e095-readout', '');
    lecteur.id = E095_LECTEUR;
    lecteur.setAttribute('role', 'status');
    lecteur.setAttribute('aria-live', 'polite');
    lecteur.setAttribute('aria-atomic', 'true');
    (caption || layout).appendChild(lecteur);
  }

  /* E095-10 — Mouvement réduit : l'état est lu une fois via l'API du contexte
     et porté par le champ ; la feuille s'en charge, sans écouteur système. */
  const calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  champ.classList.toggle('e095-calm', !!calme);
  champ.dataset.e095Motion = calme ? '0' : '1';

  mesurer();

  /* E095-01 — Réactivité : un seul observateur rebranché sur le champ courant.
     Aucun minuteur ni boucle d'animation propre ; repli silencieux si l'API
     est absente, la mesure initiale restant alors acquise. */
  if (e095Observateur && typeof e095Observateur.disconnect === 'function') {
    try { e095Observateur.disconnect(); } catch (erreur) { e095Observateur = null; }
  }
  if (typeof ResizeObserver === 'function') {
    try {
      if (!e095Observateur) e095Observateur = new ResizeObserver(() => mesurer());
      if (e095Champ && e095Champ !== champ && typeof e095Observateur.unobserve === 'function') {
        e095Observateur.unobserve(e095Champ);
      }
      e095Observateur.observe(champ);
      e095Champ = champ;
    } catch (erreur) {
      e095Observateur = null;
    }
  }
});
