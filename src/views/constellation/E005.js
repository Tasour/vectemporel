import { register } from './registry.js';

/* Lentille E005 — Adaptabilité responsive des soleils de la vue Constellation.
   Dix chantiers déterministes, tous locaux : aucun appel réseau, aucun aléa,
   aucune boucle d'animation propre, aucun fichier partagé modifié. Les soleils
   (.const-sun) sont pilotés par des variables CSS calculées ici et consommées
   par la feuille de style unique injectée via ctx.css. */

const READOUT_ID = 'e005-readout';

const CSS = `
.e005-readout{margin:0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}

/* E005-02 — Taille fluide des soleils : la base impose 42 px ; on pilote désormais
   la dimension par la variable calculée en E005-01, avec un plancher tactile. */
.e005-field .const-sun{
  width:var(--e005-sun-size,44px);
  height:var(--e005-sun-size,44px);
  min-width:44px;
  min-height:44px;
  border:1px solid rgba(230,185,111,.55);
  border-radius:50%;
  background:radial-gradient(circle at 38% 34%,rgba(255,244,214,.28),rgba(230,185,111,.12) 58%,rgba(8,11,16,.55) 100%);
  box-shadow:0 0 0 1px rgba(8,11,16,.45),0 0 14px rgba(230,185,111,.18);
  transition:width .18s ease,height .18s ease,box-shadow .18s ease;
}
.e005-field .const-sun.is-active{
  box-shadow:0 0 0 2px var(--gold-bright),0 0 22px rgba(230,185,111,.42);
}

/* E005-03 — Rayon compressé : les positions en pourcentage sont réinterprétées
   autour du centre avec le facteur --e005-radius écrit par E005-10. */
.e005-field .const-sun{
  left:calc(50% + (var(--x) - 50%) * var(--e005-radius,1));
  top:calc(50% + (var(--y) - 50%) * var(--e005-radius,1));
}

/* E005-04 — Étiquettes contenues : la légende suit la densité du champ et ne
   déborde plus sur les bords ; les effectifs denses la masquent. */
.e005-field .const-sun::after{
  width:min(160px,34vw);
  max-width:34vw;
  white-space:normal;
  line-height:1.2;
}
.e005-field[data-e005-density="compact"] .const-sun::after{
  width:96px;max-width:96px;font-size:8px;
}
.e005-field[data-e005-count="dense"] .const-sun::after{display:none}

/* E005-05 — Cible tactile et focus visible : plancher 44 px, 48 px sur pointeur
   grossier, anneau de focus exclusif au clavier. */
.e005-field .const-sun:focus-visible{
  outline:3px solid var(--gold-bright);
  outline-offset:3px;
}
@media (pointer:coarse){
  .e005-field .const-sun{min-width:48px;min-height:48px}
}

/* E005-07 — Mouvement réduit : la transition de E005-02 est neutralisée quand
   le host porte l'attribut e005-motion à 0, et par la préférence système. */
.e005-field[data-e005-motion="0"] .const-sun{transition:none}
@media (prefers-reduced-motion:reduce){
  .e005-field .const-sun{transition:none}
}

/* E005-08 — Étiquette accessible pérenne : texte réel, même quand le contenu
   CSS ::after est supprimé en densité compacte. */
.e005-sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}

/* E005-09 — Orientation courte : en paysage peu haut, on resserre le rayon
   vertical et on retire les étiquettes pour préserver le champ. */
@media (orientation:landscape) and (max-height:520px){
  .e005-field .const-sun{
    top:calc(50% + (var(--y) - 50%) * .8);
  }
  .e005-field .const-sun::after{display:none}
}

/* E005-10 — Effet de l'effectif sur la lisibilité : beaucoup de soleils imposent
   une typographie plus petite et l'absence d'étiquette. */
.e005-field[data-e005-count="dense"] .const-sun{font-size:9px}
.e005-field[data-e005-count="multiple"] .const-sun{font-size:10px}
`;

let currentObserver = null;

function bucketFor(width) {
  if (width < 420) return { key: 'compact', radius: 0.74, size: 44 };
  if (width < 720) return { key: 'medium', radius: 0.88, size: 46 };
  return { key: 'wide', radius: 1, size: 52 };
}

register('E005', (ctx) => {
  /* Garde-fou : sans layout exploitable, aucun ajout au DOM. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field || !field.style || typeof field.style.setProperty !== 'function') return;

  ctx.css('constellation-e005', CSS);
  field.classList.add('e005-field');

  const suns = Array.prototype.slice.call(field.querySelectorAll('.const-sun'));
  const caption = layout.querySelector('.constellation-caption');
  let readout = layout.querySelector('#' + READOUT_ID);
  if (!readout) {
    readout = ctx.el('p', 'e005-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    (caption || layout).appendChild(readout);
  }

  function measure() {
    /* E005-01 — Mesure et classement de la densité : la largeur réelle du champ
       fixe une classe (compact / medium / wide) et la taille de référence. */
    const width = field.clientWidth || layout.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1024) || 1024;
    const bucket = bucketFor(width);
    field.dataset.e005Density = bucket.key;
    field.style.setProperty('--e005-sun-size', bucket.size + 'px');

    /* E005-10 — Régulation par effectif : le nombre de soleils affine le rayon
       et qualifie la densité (few / multiple / dense) pour la feuille de style. */
    const count = suns.length;
    const effectif = count > 10 ? 'dense' : count > 6 ? 'multiple' : 'few';
    field.dataset.e005Count = effectif;
    let radius = bucket.radius;
    if (effectif === 'dense') radius *= 0.84;
    else if (effectif === 'multiple') radius *= 0.93;
    field.style.setProperty('--e005-radius', radius.toFixed(3));

    readout.textContent = 'Soleils : ' + count + ' · densité ' + bucket.key +
      ' · rayon ' + Math.round(radius * 100) + ' %';
  }

  /* E005-08 — Étiquette accessible pérenne : on injecte un texte réel dans
     chaque soleil, là où la légende CSS n'est qu'un contenu généré. */
  suns.forEach((sun) => {
    if (sun.querySelector('.e005-sr')) return;
    const sr = ctx.el('span', 'e005-sr', sun.dataset.label || 'Ère');
    sun.appendChild(sr);
    sun.dataset.e005Labelled = '1';
  });

  /* E005-07 — Mouvement réduit : l'état est lu une fois et porté par le host,
     la feuille de style s'en charge (aucun écouteur système ajouté ici). */
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  field.dataset.e005Motion = reduced ? '0' : '1';

  measure();

  /* E005-06 — Réactivité au redimensionnement : un seul observateur partagé,
     reconnecté à chaque rendu, recalcule les métriques sans minuteur ni boucle. */
  if (currentObserver && typeof currentObserver.disconnect === 'function') {
    try { currentObserver.disconnect(); } catch (erreur) { currentObserver = null; }
  }
  if (typeof ResizeObserver === 'function') {
    try {
      currentObserver = new ResizeObserver(() => { measure(); });
      currentObserver.observe(field);
    } catch (erreur) {
      currentObserver = null;
    }
  }
});
