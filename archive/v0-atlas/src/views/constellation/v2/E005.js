import { register } from './registry.js';

/* Lentille V2 E005 — adaptabilité responsive des soleils, seconde passe.
   Dix chantiers inédits, tous locaux et déterministes : zéro réseau, zéro
   source aléatoire, zéro minuteur ni boucle d'animation propre. Tout le
   marquage DOM porte le préfixe v2e005, sans collision avec la passe 1. */
register('E005', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field || !field.style || typeof field.style.setProperty !== 'function') return;

  /* Feuille unique de la lentille V2 : valeurs par défaut, positions bornées,
     étiquettes orientées, zones de sécurité et mouvement réduit. */
  css('constellation-v2-e005', `
.v2e005-field{
  --v2e005-radius:1;
  --v2e005-stretch:1;
  --v2e005-min:6%;
  --v2e005-max:94%;
  --v2e005-pad-l:env(safe-area-inset-left,0px);
  --v2e005-pad-r:env(safe-area-inset-right,0px);
}
.v2e005-field .const-sun{
  left:clamp(var(--v2e005-min),calc(50% + (var(--x) - 50%) * var(--v2e005-radius) * var(--v2e005-ring,1)),var(--v2e005-max));
  top:clamp(6%,calc(50% + (var(--y) - 50%) * var(--v2e005-radius) * var(--v2e005-ring,1) * var(--v2e005-stretch)),94%);
  transition:left .18s ease,top .18s ease;
}
.v2e005-field .const-sun::after{
  top:calc(100% + 4px);bottom:auto;left:50%;right:auto;
  width:min(128px,30vw);max-width:30vw;
  transform:translateX(-50%);
  white-space:normal;line-height:1.2;
}
.v2e005-field.v2e005-safe .const-sun::after{
  max-width:min(128px,calc(30vw - var(--v2e005-pad-l) - var(--v2e005-pad-r)));
}
.v2e005-field .const-sun[data-v2e005-side="haut"]::after{
  top:auto;bottom:calc(100% + 4px);
}
.v2e005-field .const-sun[data-v2e005-side="gauche"]::after{
  top:50%;left:auto;right:calc(100% + 4px);transform:translateY(-50%);
}
.v2e005-field .const-sun[data-v2e005-side="droite"]::after{
  top:50%;left:calc(100% + 4px);right:auto;transform:translateY(-50%);
}
.v2e005-field[data-v2e005-compact="1"] .const-sun:not(.is-active)::after{display:none}
.v2e005-field[data-v2e005-compact="1"] .const-sun.is-active::after{
  width:min(148px,36vw);max-width:36vw;color:var(--gold-bright);font-weight:600;
}
.v2e005-field .const-sun[data-v2e005-active="1"]{color:var(--gold-bright);font-weight:700}
.v2e005-readout{
  margin:0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;
  padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);
}
.v2e005-field[data-v2e005-motion="0"] .const-sun{transition:none}
@media (prefers-reduced-motion:reduce){
  .v2e005-field .const-sun{transition:none}
}
`);

  field.classList.add('v2e005-field');
  const suns = Array.prototype.slice.call(field.querySelectorAll('button.const-sun'));
  if (!suns.length) return;

  const caption = layout.querySelector('.constellation-caption');
  let readout = layout.querySelector('#v2e005-readout');
  if (!readout) {
    readout = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e005-readout', '')
      : document.createElement('p');
    readout.id = 'v2e005-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    (caption || layout).appendChild(readout);
  }

  /* Taille de référence lue une fois sur la passe 1, sans sonde périodique. */
  let sizePx = 44;
  if (typeof getComputedStyle === 'function') {
    try {
      const brut = getComputedStyle(field).getPropertyValue('--e005-sun-size');
      const valeur = parseFloat(brut);
      if (isFinite(valeur) && valeur > 0) sizePx = valeur;
    } catch (erreur) { sizePx = 44; }
  }

  /* E005-10 — Mouvement réduit : l'état est porté par le champ une seule fois ;
     la feuille unique neutralise les transitions des deux couronnes. */
  const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  field.dataset.v2e005Motion = reduit ? '0' : '1';

  function mesure() {
    const largeur = field.clientWidth || layout.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1024) || 1024;
    const hauteur = field.clientHeight || layout.clientHeight || 420;
    const ratio = largeur / Math.max(1, hauteur);

  /* E005-01 — Classement par forme : la hauteur du champ complète la largeur
       de la passe 1. Quatre silhouettes déterministes, stockées sur le champ. */
    const forme = ratio < 0.9 ? 'haute' : ratio < 1.4 ? 'carree'
      : ratio < 2.2 ? 'large' : 'plate';
    field.dataset.v2e005Shape = forme;

  /* E005-02 — Écart angulaire : l'arc entre deux soleils voisins est comparé
       à la cible tactile. Un écart inférieur à 8 px signale un chevauchement. */
    const count = suns.length;
    const rayonPx = 0.22 * (largeur + hauteur) / 2;
    const arcPx = count > 1 ? (2 * Math.PI * rayonPx) / count : Math.max(largeur, hauteur);
    const ecart = arcPx - sizePx;
    const chevauchement = ecart < 8;
    field.dataset.v2e005Overlap = chevauchement ? 'oui' : 'non';
    field.style.setProperty('--v2e005-gap', ecart.toFixed(1) + 'px');
    field.style.setProperty('--v2e005-radius',
      (chevauchement ? 0.9 : forme === 'haute' ? 0.94 : 1).toFixed(3));

  /* E005-03 — Couronnes alternées : en cas de chevauchement, les soleils
       impairs et pairs occupent deux rayons distincts, sans déplacer les
       planètes ni les lunes. */
    suns.forEach((sun, index) => {
      const externe = index % 2 === 0;
      sun.style.setProperty('--v2e005-ring',
        chevauchement ? (externe ? '1.06' : '0.82') : '1');
      sun.dataset.v2e005Ring = chevauchement
        ? (externe ? 'externe' : 'interne') : 'unique';
    });

  /* E005-04 — Garde de bords : la marge est calculée depuis la taille réelle
       du soleil, puis bornée entre 4 % et 12 % avant d'écrire les limites. */
    const marge = Math.min(12, Math.max(4, (sizePx / Math.max(1, largeur)) * 100 + 2));
    field.style.setProperty('--v2e005-min',
      'calc(env(safe-area-inset-left,0px) + ' + marge.toFixed(2) + '%)');
    field.style.setProperty('--v2e005-max',
      'calc(100% - env(safe-area-inset-right,0px) - ' + marge.toFixed(2) + '%)');

  /* E005-05 — Orientation de l'étiquette : le quadrant du soleil décide du
       côté où la légende est posée, toujours vers l'intérieur du champ. */
    suns.forEach((sun) => {
      const x = parseFloat(sun.style.getPropertyValue('--x'));
      const y = parseFloat(sun.style.getPropertyValue('--y'));
      const dx = isFinite(x) ? x - 50 : 0;
      const dy = isFinite(y) ? y - 50 : 0;
      let cote = 'bas';
      if (Math.abs(dx) > Math.abs(dy)) cote = dx < 0 ? 'droite' : 'gauche';
      else cote = dy < 0 ? 'bas' : 'haut';
      sun.dataset.v2e005Side = cote;
    });

  /* E005-06 — Priorité à l'ère active : en champ contraint, seule l'ère
       sélectionnée garde sa légende ; les autres restent des numéros. */
    const compact = chevauchement || largeur < 380;
    field.dataset.v2e005Compact = compact ? '1' : '0';
    suns.forEach((sun) => {
      if (sun.classList.contains('is-active')) sun.dataset.v2e005Active = '1';
      else sun.removeAttribute('data-v2e005-active');
    });

  /* E005-07 — Zones de sécurité : les encoches de l'appareil sont injectées
       dans les bornes de position et dans la largeur des étiquettes. */
    field.classList.add('v2e005-safe');

  /* E005-08 — Étirement vertical : un champ haut gagne 16 % d'amplitude
       verticale, sans toucher aux planètes ni aux lunes. */
    field.style.setProperty('--v2e005-stretch',
      (forme === 'haute' ? 1.16 : 1).toFixed(3));

  /* E005-09 — Lecteur d'état : les métriques responsive sont annoncées en
       français via une région live dédiée, distincte de la passe 1. */
    readout.textContent = 'Forme ' + forme + ' · ratio ' + ratio.toFixed(2) +
      ' · écart ' + Math.round(ecart) + ' px · chevauchement ' +
      (chevauchement ? 'oui, deux couronnes' : 'non') + '.';
  }

  mesure();

  /* Observateur passif, sans minuteur ni boucle : il ne recalcule que les
     métriques V2 et se déconnecte proprement à chaque rendu du shell. */
  if (typeof window !== 'undefined' && window.__v2e005_obs &&
      typeof window.__v2e005_obs.disconnect === 'function') {
    try { window.__v2e005_obs.disconnect(); } catch (erreur) { /* repli muet */ }
  }
  if (typeof ResizeObserver === 'function') {
    try {
      const observateur = new ResizeObserver(() => { mesure(); });
      if (typeof observateur.observe === 'function') {
        observateur.observe(field);
        if (typeof window !== 'undefined') window.__v2e005_obs = observateur;
      }
    } catch (erreur) { /* valeurs du rendu conservées */ }
  }
});
