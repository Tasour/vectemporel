import { register } from './registry.js';

/* Lentille V2 E080 — raffinements du mouvement et des transitions du survol
   dans la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e080 (aucune collision avec la
   passe 1, qui utilisait e080-, constellation-e080, data-e080-…). */
register('E080', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille. Les règles préfixées v2e080 composent avec
     celles de la passe 1 : elles n'effacent ni le halo, ni l'échelle, ni la
     mise en retrait des arêtes. Aucune couleur n'est le seul vecteur d'un état. */
  css('constellation-v2-e080', `
.v2e080-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e080-motion{--v2e080-ease:cubic-bezier(.2,.7,.3,1);--v2e080-dur:200ms}

/* V2E080-02 — Cascade échelonnée : le délai de transition des libellés est
   calculé depuis l'ordre du nœud, sans minuteur ni boucle d'animation. */
.v2e080-motion[data-v2e080-cascade="1"] .const-sun::after,
.v2e080-motion[data-v2e080-cascade="1"] .const-planet::after,
.v2e080-motion[data-v2e080-cascade="1"] .const-moon::after{
  transition-delay:calc(var(--v2e080-order,0) * 12ms)
}

/* V2E080-03 / V2E080-08 / V2E080-09 — Le libellé anime quatre propriétés
   supplémentaires : halo textuel, interlettrage, échelle et origine de
   transformation. Les propriétés de la passe 1 (opacité, couleur, translation)
   sont conservées dans la même déclaration. */
.v2e080-motion .const-sun::after,
.v2e080-motion .const-planet::after,
.v2e080-motion .const-moon::after{
  transition:opacity var(--v2e080-dur,200ms) var(--v2e080-ease,ease),
             color var(--v2e080-dur,200ms) var(--v2e080-ease,ease),
             transform var(--v2e080-dur,200ms) var(--v2e080-ease,ease),
             text-shadow var(--v2e080-dur,200ms) var(--v2e080-ease,ease),
             letter-spacing var(--v2e080-dur,200ms) var(--v2e080-ease,ease);
  transform-origin:center top
}
.v2e080-motion .const-sun:hover::after,
.v2e080-motion .const-sun:focus-visible::after,
.v2e080-motion .const-planet:hover::after,
.v2e080-motion .const-planet:focus-visible::after{
  text-shadow:0 0 6px var(--v2e080-glow,rgba(230,185,111,.55));
  letter-spacing:var(--v2e080-track,.25px);
  transform:translateX(-50%) scale(var(--v2e080-grow,1.06))
}
.v2e080-motion .const-moon:hover::after,
.v2e080-motion .const-moon:focus-visible::after{
  transform:translateX(-50%) translateY(-2px) scale(var(--v2e080-grow,1.06))
}

/* V2E080-04 / V2E080-05 — Respiration concentrique de la lune : keyframes
   déterministes, joués uniquement pendant le survol ou le focus (play-state). */
.v2e080-motion .const-moon::before{
  content:'';position:absolute;inset:-3px;
  border:1px solid var(--violet,#b28bdd);
  border-radius:50%;opacity:0;pointer-events:none
}
@keyframes v2e080-breathe{
  0%,100%{transform:scale(.9);opacity:.2}
  50%{transform:scale(1.3);opacity:.7}
}
.v2e080-motion .const-moon::before{
  animation:v2e080-breathe var(--v2e080-breath,1800ms) ease-in-out infinite;
  animation-play-state:paused
}
.v2e080-motion[data-v2e080-motion="full"] .const-moon[data-v2e080-active="true"]::before,
.v2e080-motion[data-v2e080-motion="full"] .const-moon:focus-visible::before{
  animation-play-state:running
}

/* V2E080-06 — Nudage directionnel : la translation ajoutée au centre est tirée
   des variables de position déjà posées par la vue (aucun tirage aléatoire). */
.v2e080-motion .const-sun[data-v2e080-active="true"],
.v2e080-motion .const-planet[data-v2e080-active="true"],
.v2e080-motion .const-moon[data-v2e080-active="true"]{
  transform:translate(calc(-50% + var(--v2e080-nx,0px)),calc(-50% + var(--v2e080-ny,0px))) scale(1.16)
}

/* V2E080-01 — Retour d'activation : :active et le marqueur de pression ont une
   échelle propre (.92), distincte de l'échelle de survol (1.16). */
.v2e080-motion .const-sun:active,
.v2e080-motion .const-planet:active,
.v2e080-motion .const-moon:active,
.v2e080-motion .const-sun[data-v2e080-pressed="true"],
.v2e080-motion .const-planet[data-v2e080-pressed="true"],
.v2e080-motion .const-moon[data-v2e080-pressed="true"]{
  transform:translate(-50%,-50%) scale(.92)
}

/* V2E080-07 — Épaississement animé de l'arête du chemin actif ; la transition
   d'opacité de la passe 1 est conservée dans la même déclaration. */
.v2e080-motion .constellation-edges line{
  transition:opacity var(--e080-dur-planet,180ms) var(--e080-ease,ease),
             stroke-width var(--v2e080-dur,200ms) var(--v2e080-ease,ease)
}
.v2e080-motion[data-v2e080-path="1"] .constellation-edges line.is-path{
  stroke-width:2.6
}

/* V2E080-10 — Mode sobre V2 : tous les nouveaux effets sont neutralisés, y
   compris ceux que la passe 1 ne couvrait pas (libellés, respiration, press). */
.v2e080-motion[data-v2e080-motion="reduced"] .const-sun[data-v2e080-active="true"],
.v2e080-motion[data-v2e080-motion="reduced"] .const-planet[data-v2e080-active="true"],
.v2e080-motion[data-v2e080-motion="reduced"] .const-moon[data-v2e080-active="true"],
.v2e080-motion[data-v2e080-motion="reduced"] .const-sun:active,
.v2e080-motion[data-v2e080-motion="reduced"] .const-planet:active,
.v2e080-motion[data-v2e080-motion="reduced"] .const-moon:active,
.v2e080-motion[data-v2e080-motion="reduced"] .const-sun[data-v2e080-pressed="true"],
.v2e080-motion[data-v2e080-motion="reduced"] .const-planet[data-v2e080-pressed="true"],
.v2e080-motion[data-v2e080-motion="reduced"] .const-moon[data-v2e080-pressed="true"]{
  transform:translate(-50%,-50%)!important
}
.v2e080-motion[data-v2e080-motion="reduced"] .const-sun::after,
.v2e080-motion[data-v2e080-motion="reduced"] .const-planet::after,
.v2e080-motion[data-v2e080-motion="reduced"] .const-moon::after{
  transition-delay:0ms!important;text-shadow:none!important;
  letter-spacing:normal!important;transform:translateX(-50%)!important
}
.v2e080-motion[data-v2e080-motion="reduced"] .const-moon::before{animation:none!important}
.v2e080-motion[data-v2e080-motion="reduced"] .constellation-edges line{stroke-width:1.6!important}
@media (prefers-reduced-motion: reduce){
  .v2e080-motion .const-sun[data-v2e080-active="true"],
  .v2e080-motion .const-planet[data-v2e080-active="true"],
  .v2e080-motion .const-moon[data-v2e080-active="true"],
  .v2e080-motion .const-sun[data-v2e080-pressed="true"],
  .v2e080-motion .const-planet[data-v2e080-pressed="true"],
  .v2e080-motion .const-moon[data-v2e080-pressed="true"]{transform:translate(-50%,-50%)!important}
  .v2e080-motion .const-sun::after,
  .v2e080-motion .const-planet::after,
  .v2e080-motion .const-moon::after{transition-delay:0ms!important;text-shadow:none!important;letter-spacing:normal!important}
  .v2e080-motion .const-moon::before{animation:none!important}
  .v2e080-motion .constellation-edges line{stroke-width:1.6!important}
}
`);

  const champ = layout.querySelector('.constellation-field');
  if (!champ || typeof champ.querySelectorAll !== 'function') return;
  const noeuds = Array.from(champ.querySelectorAll('button.const-sun, button.const-planet, button.const-moon'));
  const NOEUD = 'button.const-sun, button.const-planet, button.const-moon';

  /* Préférence de mouvement lue une seule fois, dans un try/catch tolérant. */
  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); } catch (error) { reduit = false; }
  }
  /* Survol fin : évite un état « collant » après un tap sur écran tactile. */
  let pointeurFin = false;
  try {
    const vue = layout.ownerDocument && layout.ownerDocument.defaultView;
    pointeurFin = !!(vue && vue.matchMedia
      && vue.matchMedia('(hover: hover) and (pointer: fine)').matches);
  } catch (error) {
    pointeurFin = false;
  }

  champ.classList.add('v2e080-motion');
  champ.setAttribute('data-v2e080-motion', reduit ? 'reduced' : 'full');

  const libelle = node => node.getAttribute('data-label')
    || node.getAttribute('data-const-key') || 'un nœud';

  /* E080-10 — Région live V2 distincte de la pastille de la passe 1 : elle
     rappelle que le survol est un aperçu non destructif. */
  let live = layout.querySelector('#v2e080-live');
  if (!live) {
    live = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e080-sr', '')
      : document.createElement('p');
    live.id = 'v2e080-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.textContent = reduit
      ? 'Mouvement réduit : aucun aperçu animé.'
      : 'Aperçu V2 : au repos.';
    layout.appendChild(live);
  }
  const annoncer = texte => {
    if (live && live.isConnected) live.textContent = texte;
  };

  /* E080-02 — Ordre de cascade : un rang par nœud alimente le transition-delay. */
  /* E080-03 — Halo textuel : la teinte du glow suit le type de nœud. */
  /* E080-04 — Respiration lunaire : la durée est une variable deterministe. */
  /* E080-06 — Nudage directionnel : vecteur unitaire issu de --x et --y. */
  /* E080-08 — Interlettrage : valeur posée une fois par nœud, sans aléa. */
  /* E080-09 — Échelle du libellé : facteur unique, réutilisé au survol. */
  noeuds.forEach((node, index) => {
    node.style.setProperty('--v2e080-order', String(index));
    const lune = node.classList.contains('const-moon');
    node.style.setProperty('--v2e080-glow', lune
      ? 'rgba(178,139,221,.55)' : 'rgba(230,185,111,.55)');
    if (lune) node.style.setProperty('--v2e080-breath', '1800ms');
    node.style.setProperty('--v2e080-track', '.25px');
    node.style.setProperty('--v2e080-grow', '1.06');
    const x = parseFloat(node.style.getPropertyValue('--x'));
    const y = parseFloat(node.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const dx = x - 50;
    const dy = y - 50;
    const norme = Math.hypot(dx, dy) || 1;
    node.style.setProperty('--v2e080-nx', `${(dx / norme * 2).toFixed(2)}px`);
    node.style.setProperty('--v2e080-ny', `${(dy / norme * 2).toFixed(2)}px`);
    node.dataset.v2e080Dir = `${dx >= 0 ? 'est' : 'ouest'}-${dy >= 0 ? 'sud' : 'nord'}`;
  });

  /* E080-07 — Marquage du chemin : attribut dédié, sans écraser data-e080-path
     de la passe 1. Retiré à la sortie, il laisse la transition rejouer. */
  const marquerChemin = actif => {
    if (actif) champ.setAttribute('data-v2e080-path', '1');
    else champ.removeAttribute('data-v2e080-path');
  };

  /* E080-05 — pilotage de l'animation par l'état actif : un seul nœud porte le
     marqueur à la fois, ce qui garantit une seule respiration simultanée. */
  const nettoyerActifs = () => {
    noeuds.forEach(node => node.removeAttribute('data-v2e080-active'));
  };
  const activer = node => {
    nettoyerActifs();
    if (!node || !champ.contains(node)) return;
    node.setAttribute('data-v2e080-active', 'true');
    champ.setAttribute('data-v2e080-cascade', '1');
    champ.setAttribute('data-v2e080-hover', node.getAttribute('data-const-key') || '1');
    marquerChemin(true);
    annoncer(reduit
      ? `Mouvement réduit : ${libelle(node)}.`
      : `Aperçu V2 : ${libelle(node)} — le survol ne sélectionne pas.`);
  };
  const reposer = () => {
    nettoyerActifs();
    champ.removeAttribute('data-v2e080-cascade');
    champ.removeAttribute('data-v2e080-hover');
    marquerChemin(false);
    annoncer(reduit
      ? 'Mouvement réduit : aucun aperçu animé.'
      : 'Aperçu V2 : au repos.');
  };

  /* E080-01 — Marqueur de pression : :active suffit à la souris, mais un
     attribut explicite rend l'enfoncement observable et testable. */
  const presse = cible => {
    noeuds.forEach(node => node.removeAttribute('data-v2e080-pressed'));
    if (cible) cible.setAttribute('data-v2e080-pressed', 'true');
  };

  if (typeof champ.addEventListener === 'function') {
    champ.addEventListener('pointerover', event => {
      if (!pointeurFin) return;
      const cible = event.target && event.target.closest
        ? event.target.closest(NOEUD) : null;
      if (cible && champ.contains(cible)) activer(cible);
    }, true);
    champ.addEventListener('pointerout', event => {
      if (!pointeurFin) return;
      const suivant = event.relatedTarget && event.relatedTarget.closest
        ? event.relatedTarget.closest(NOEUD) : null;
      if (suivant && champ.contains(suivant)) activer(suivant);
      else reposer();
    }, true);
    champ.addEventListener('pointerleave', () => { if (pointeurFin) reposer(); });
    champ.addEventListener('pointercancel', () => { if (pointeurFin) reposer(); });
    champ.addEventListener('focusin', event => {
      const cible = event.target && event.target.closest
        ? event.target.closest(NOEUD) : null;
      if (cible && champ.contains(cible)) activer(cible);
    }, true);
    champ.addEventListener('focusout', reposer, true);
    champ.addEventListener('pointerdown', event => {
      const cible = event.target && event.target.closest
        ? event.target.closest(NOEUD) : null;
      if (cible && champ.contains(cible)) presse(cible);
    }, true);
    champ.addEventListener('pointerup', () => presse(null), true);
    champ.addEventListener('pointercancel', () => presse(null), true);
  }

  /* Nettoyage à la perte de fenêtre, enregistré sous une clé dédiée pour ne
     pas accumuler d'écouteurs d'un rendu à l'autre. */
  const vue = layout.ownerDocument && layout.ownerDocument.defaultView;
  if (vue && typeof vue.addEventListener === 'function') {
    const CLE = '__v2e080_blur';
    if (typeof vue.removeEventListener === 'function' && typeof vue[CLE] === 'function') {
      vue.removeEventListener('blur', vue[CLE]);
    }
    vue[CLE] = () => { reposer(); presse(null); };
    vue.addEventListener('blur', vue[CLE]);
  }
});
