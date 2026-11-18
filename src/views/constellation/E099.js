import { register } from './registry.js';

/* Lentille E099 — robustesse et garde-fous appliqués au champ d'étoiles.
   Dix chantiers locaux et complémentaires : aucun appel réseau, aucune source
   aléatoire, aucun minuteur ni boucle d'animation propre. Le greffon reste
   tolérant : chaque accès au DOM est protégé et une structure inattendue ne
   provoque jamais d'exception. */
register('E099', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;

  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.setAttribute !== 'function') return;

  /* Feuille unique de la lentille : ceinture dimensionnelle, zone de sécurité,
     densité, trame vectorielle, repli, garde de focus et mode sobre. */
  ctx.css('constellation-e099', `
#e099-field{position:relative}
.e099-ceinture{box-sizing:border-box;min-width:0;max-width:100%}
.e099-ceinture[data-e099-bord="1"]{outline:1px solid rgba(244,214,158,.28);outline-offset:-1px}
#e099-zone{position:absolute;inset:8% 10%;z-index:0;pointer-events:none;border:1px dashed rgba(244,214,158,.18);border-radius:10px}
#e099-zone::before,#e099-zone::after{position:absolute;width:10px;height:10px;border:1px solid rgba(244,214,158,.45);content:''}
#e099-zone::before{left:-1px;top:-1px;border-right:0;border-bottom:0}
#e099-zone::after{right:-1px;bottom:-1px;border-left:0;border-top:0}
.e099-dense .const-sun:not(.is-active){width:30px;height:30px;font-size:8px}
.e099-dense .const-planet:not(.is-active){width:20px;height:20px;font-size:7px}
.e099-dense .const-moon:not(.is-active){width:10px;height:10px}
.constellation-edges[data-e099-trame="repere"] line{vector-effect:non-scaling-stroke}
#e099-field[data-e099-focus="hors"]{outline:1px dashed rgba(178,139,221,.55);outline-offset:-2px}
#e099-repli{position:absolute;top:50%;left:50%;z-index:5;max-width:80%;margin:0;padding:8px 12px;transform:translate(-50%,-50%);border:1px dashed rgba(244,214,158,.35);border-radius:8px;background:rgba(7,10,14,.94);color:var(--muted,#9aa7b8);font-size:10px;line-height:1.5;text-align:center}
.e099-sobre *{animation:none!important;transition:none!important}
.e099-sobre .const-sun:focus-visible,.e099-sobre .const-planet:focus-visible,.e099-sobre .const-moon:focus-visible{outline:2px dashed var(--gold-bright,#f4d69e);outline-offset:3px;box-shadow:none;transform:translate(-50%,-50%)}
@media (prefers-reduced-motion: reduce){#e099-field *{animation:none!important;transition:none!important}}
`);

  /* E099-01 — Ancrage nominal du champ : identifiant unique et marqueur de garde. */
  if (!field.id) field.id = 'e099-field';
  field.setAttribute('data-e099-garde', 'ancre');
  field.setAttribute('data-e099-noyau', '1');

  /* E099-02 — Ceinture dimensionnelle anti-débordement (classe + CSS dédié). */
  field.classList.add('e099-ceinture');
  field.setAttribute('data-e099-bord', '1');

  /* E099-03 — Zone de sécurité matérialisée : repère visuel non interactif. */
  if (!layout.querySelector('#e099-zone')) {
    const zone = typeof ctx.el === 'function'
      ? ctx.el('div', 'e099-zone', '')
      : document.createElement('div');
    zone.id = 'e099-zone';
    zone.setAttribute('aria-hidden', 'true');
    field.appendChild(zone);
  }

  /* E099-04 — Audit de confinement des astres : calcul déterministe depuis
     les variables --x / --y, puis marquage de chaque nœud et comptage. */
  const astres = Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon'));
  let horsChamp = 0;
  astres.forEach(astre => {
    const px = Number.parseFloat(astre.style.getPropertyValue('--x'));
    const py = Number.parseFloat(astre.style.getPropertyValue('--y'));
    const dedans = Number.isFinite(px) && Number.isFinite(py)
      && px >= 10 && px <= 90 && py >= 8 && py <= 92;
    astre.setAttribute('data-e099-confine', dedans ? 'oui' : 'non');
    if (!dedans) horsChamp += 1;
  });
  field.setAttribute('data-e099-hors-champ', String(horsChamp));

  /* E099-05 — Garde-fou de densité : au-delà de douze astres, la feuille
     réduit les nœuds inactifs pour préserver la lisibilité de la scène. */
  field.setAttribute('data-e099-densite', String(astres.length));
  if (astres.length > 12) field.classList.add('e099-dense');
  else field.classList.remove('e099-dense');

  /* E099-06 — Filet de repli de la trame vectorielle : sans viewBox, les
     coordonnées 0–100 du SVG étaient lues en pixels et s'effondraient. */
  const edges = field.querySelector('.constellation-edges');
  if (edges) {
    if (!edges.getAttribute('viewBox')) edges.setAttribute('viewBox', '0 0 100 100');
    edges.setAttribute('preserveAspectRatio', 'none');
    edges.setAttribute('aria-hidden', 'true');
    edges.setAttribute('focusable', 'false');
    edges.setAttribute('data-e099-trame', 'repere');
  }

  /* E099-07 — Garde-fou de focus : la scène sait si le focus est encore
     dans le champ, sans voler ni déplacer le focus lui-même. */
  field.addEventListener('focusin', () => {
    field.setAttribute('data-e099-focus', 'dans');
  });
  field.addEventListener('focusout', (event) => {
    const suivant = event && event.relatedTarget;
    const reste = !!(suivant && typeof suivant.nodeType === 'number'
      && typeof field.contains === 'function' && field.contains(suivant));
    field.setAttribute('data-e099-focus', reste ? 'dans' : 'hors');
  });

  /* E099-08 — Sentinelle de dimension : un écouteur de redimensionnement,
     sans rAF ni minuteur, consigne la taille réelle du champ. */
  const RESIZE_KEY = '__e099_resize';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const precedent = window[RESIZE_KEY];
    if (typeof precedent === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', precedent);
    }
    const mesurer = () => {
      if (field.isConnected === false) return;
      field.setAttribute('data-e099-largeur', String(Math.round(field.clientWidth || 0)));
      field.setAttribute('data-e099-hauteur', String(Math.round(field.clientHeight || 0)));
    };
    window[RESIZE_KEY] = mesurer;
    window.addEventListener('resize', mesurer);
    mesurer();
  }

  /* E099-09 — Repli pour champ vide : un message neutre remplace la scène
     fantôme lorsque le pays n'a ni astre ni donnée exploitable. */
  const peuple = astres.length > 0 && !field.querySelector('.constellation-empty');
  field.setAttribute('data-e099-etat', peuple ? 'peuple' : 'vide');
  if (!peuple && !layout.querySelector('#e099-repli')) {
    const repli = typeof ctx.el === 'function'
      ? ctx.el('p', '', 'Champ d’étoiles indisponible pour ce pays : la scène reste lisible, sans astre à afficher.')
      : document.createElement('p');
    repli.id = 'e099-repli';
    field.appendChild(repli);
  }

  /* E099-10 — Mode sobre et repères non chromatiques : la préférence
     système est interrogée via le contexte, sans sonde propre. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    field.classList.add('e099-sobre');
  } else {
    field.classList.remove('e099-sobre');
  }
});
