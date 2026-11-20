import { register } from './registry.js';

/* Lentille E069 — vue Récit : transitions et mouvement.
 *
 * Fichier possédé : src/views/recit/E069.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E069.md (E069-01 à E069-10).
 *
 * Enrichissement non destructif déposé après stage.appendChild(layout)
 * (recit.js:451). Aucune donnée n'est importée : les grandeurs affichées sont
 * dérivées du DOM rendu (kicker « Étape X / N », item aria-current, pastille
 * de certitude). Zéro réseau, zéro console, zéro Math.random, zéro minuteur,
 * zéro boucle rAF, zéro canvas. Tout mouvement est CSS, joué une seule fois,
 * jamais en boucle, et neutralisé par reducedMotion() comme par @media.
 *
 * Les dix chantiers sont complémentaires et non redondants avec E019 : ici le
 * mouvement est piloté par une CADENCE réglable, une PISTE de jalons, une
 * AIGUILLE qui suit le focus, et des micro-transitions de surface.
 */

const STYLE_ID = 'recit-e069';
const CADENCES = ['lent', 'normal', 'rapide'];
const ECHELLES = { lent: 1.6, normal: 1, rapide: 0.55 };
const LIBELLES = { lent: 'lente', normal: 'normale', rapide: 'rapide' };
const IDS = [
  'e069-tempo-btn',
  'e069-trail',
  'e069-cursor',
  'e069-bead',
  'e069-underline',
  'e069-motion-note',
];

/* Une seule feuille pour les dix chantiers. --e069-t est la durée de référence,
 * multipliée par --e069-scale posé par le cadran de tempo (E069-01). Aucune
 * règle ne touche aux durées définies par recit.js ou par les autres lentilles. */
const CSS = `
.recit-layout.recit-e069-scope{--e069-dur:.5s;--e069-t:calc(var(--e069-dur)*var(--e069-scale,1))}

/* E069-01 — cadran de tempo */
.recit-layout.recit-e069-scope .recit-actions button.recit-e069-tempo{min-height:36px;padding:4px 10px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(230,185,111,.06);color:var(--gold-bright);font-size:10px;cursor:pointer;transition:background-color calc(var(--e069-t)*.35) ease-out}
.recit-layout.recit-e069-scope .recit-actions button.recit-e069-tempo:hover{background:rgba(230,185,111,.16)}
.recit-layout.recit-e069-scope .recit-actions button.recit-e069-tempo:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E069-02 — cascade d'entrée du fil */
.recit-layout.recit-e069-scope .recit-e069-entree{animation:recit-e069-glissement var(--e069-t) ease-out both}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(2) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.06)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(3) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.12)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(4) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.18)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(5) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.24)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(6) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.3)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(7) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.36)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(8) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.42)}
.recit-layout.recit-e069-scope .recit-thread-list li:nth-child(n+9) .recit-e069-entree{animation-delay:calc(var(--e069-t)*.5)}
@keyframes recit-e069-glissement{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}

/* E069-03 — piste de jalons et curseur voyageur */
.recit-layout.recit-e069-scope .recit-e069-piste{position:relative;height:14px;margin:2px 0 10px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
.recit-layout.recit-e069-scope .recit-e069-piste::before{content:"";position:absolute;left:0;right:0;top:6px;height:1px;background:var(--line-strong);opacity:.75}
.recit-layout.recit-e069-scope .recit-e069-jalon{position:relative;width:2px;height:5px;border-radius:1px;background:var(--muted-2)}
.recit-layout.recit-e069-scope .recit-e069-curseur{position:absolute;top:2px;width:9px;height:9px;margin-left:-4.5px;border-radius:3px;background:var(--gold-bright);box-shadow:0 0 0 1px rgba(0,0,0,.35);transition:left calc(var(--e069-t)*.9) cubic-bezier(.2,.7,.2,1)}

/* E069-04 — aiguille posée sur le point courant du fil */
.recit-layout.recit-e069-scope .recit-e069-fil{position:relative}
.recit-layout.recit-e069-scope .recit-e069-aiguille{position:absolute;left:0;top:0;width:10px;height:3px;border-radius:2px;background:var(--gold-bright);list-style:none;pointer-events:none;z-index:2;transition:left calc(var(--e069-t)*.85) cubic-bezier(.2,.8,.2,1),top calc(var(--e069-t)*.85) cubic-bezier(.2,.8,.2,1)}

/* E069-05 — trait qui se déploie sous le titre */
.recit-layout.recit-e069-scope .recit-e069-titre{position:relative}
.recit-layout.recit-e069-scope .recit-e069-trait{position:absolute;left:0;bottom:-.16em;width:min(100%,9em);height:2px;border-radius:2px;background:linear-gradient(90deg,var(--gold),transparent);transform-origin:left center;pointer-events:none;animation:recit-e069-deploiement var(--e069-t) ease-out both}
@keyframes recit-e069-deploiement{from{transform:scaleX(0);opacity:.2}to{transform:scaleX(1);opacity:1}}

/* E069-06 — respiration d'entrée de la pastille de certitude */
.recit-layout.recit-e069-scope .recit-e069-pastille{animation:recit-e069-pastille calc(var(--e069-t)*.6) ease-out both}
@keyframes recit-e069-pastille{from{transform:scale(.9);opacity:.45}to{transform:scale(1);opacity:1}}

/* E069-07 — entrée différée du bas de page */
.recit-layout.recit-e069-scope .recit-e069-queue{animation:recit-e069-montee calc(var(--e069-t)*.7) ease-out both;animation-delay:calc(var(--e069-t)*.55)}
@keyframes recit-e069-montee{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* E069-08 — glacis qui balaie les commandes au survol / focus */
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-actions button,
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-thread-item{position:relative;overflow:hidden}
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-actions button::after,
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-thread-item::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 25%,rgba(230,185,111,.16) 50%,transparent 75%);transform:translateX(-110%);pointer-events:none;transition:transform calc(var(--e069-t)*.8) ease-out}
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-actions button:hover::after,
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-actions button:focus-visible::after,
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-thread-item:hover::after,
.recit-layout.recit-e069-scope.recit-e069-glacis .recit-thread-item:focus-visible::after{transform:translateX(110%)}

/* E069-09 — anneau de focus visiblement décalé */
.recit-layout.recit-e069-scope.recit-e069-focus .recit-actions button:focus-visible,
.recit-layout.recit-e069-scope.recit-e069-focus .recit-thread-item:focus-visible{outline-offset:4px}

/* E069-10 — témoin de mouvement */
.recit-layout.recit-e069-scope .recit-legend .recit-e069-note{margin-top:6px;font-size:10px;line-height:1.6;color:var(--muted);font-variant-numeric:tabular-nums}

/* Mouvement réduit : une seule porte, doublée par le media query pour les
   environnements sans matchMedia fiable. Les positions (left/top) restent
   intactes : seules les interpolations et les surcharges sont retirées. */
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-entree,
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-trait,
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-pastille,
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-queue,
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-curseur,
.recit-layout.recit-e069-scope.recit-e069-still .recit-e069-aiguille{animation:none!important;transition:none!important;transform:none!important}
.recit-layout.recit-e069-scope.recit-e069-still.recit-e069-glacis .recit-actions button::after,
.recit-layout.recit-e069-scope.recit-e069-still.recit-e069-glacis .recit-thread-item::after{display:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-layout.recit-e069-scope .recit-e069-entree,
  .recit-layout.recit-e069-scope .recit-e069-trait,
  .recit-layout.recit-e069-scope .recit-e069-pastille,
  .recit-layout.recit-e069-scope .recit-e069-queue,
  .recit-layout.recit-e069-scope .recit-e069-curseur,
  .recit-layout.recit-e069-scope .recit-e069-aiguille{animation:none!important;transition:none!important;transform:none!important}
  .recit-layout.recit-e069-scope.recit-e069-glacis .recit-actions button::after,
  .recit-layout.recit-e069-scope.recit-e069-glacis .recit-thread-item::after{display:none!important}
}
@media (forced-colors:active){
  .recit-layout.recit-e069-scope .recit-e069-curseur,
  .recit-layout.recit-e069-scope .recit-e069-aiguille,
  .recit-layout.recit-e069-scope .recit-e069-trait{background:CanvasText}
  .recit-layout.recit-e069-scope .recit-e069-jalon{background:CanvasText}
}
@media (max-width:620px){
  .recit-layout.recit-e069-scope .recit-actions button.recit-e069-tempo{min-height:40px}
}
`;

/* La cadence survit aux reconstructions complètes du DOM par la coque. */
let cadence = 'normal';

register('E069', (contexte) => {
  const ctx = contexte || {};
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;

  try { if (typeof css === 'function') css(STYLE_ID, CSS); } catch { /* repli silencieux */ }

  let réduit = false;
  try { réduit = typeof reducedMotion === 'function' && Boolean(reducedMotion()); }
  catch { réduit = false; }

  /* ---------- gardes, fabriques et utilitaires ---------- */
  function q(racine, sélecteur) {
    try { return racine && typeof racine.querySelector === 'function' ? racine.querySelector(sélecteur) : null; }
    catch { return null; }
  }

  function qa(racine, sélecteur) {
    try { return racine && typeof racine.querySelectorAll === 'function' ? Array.from(racine.querySelectorAll(sélecteur)) : []; }
    catch { return []; }
  }

  function fabrique(balise, classe, texte) {
    try {
      if (typeof el === 'function') return el(balise, classe, texte);
    } catch { /* repli sur le DOM natif */ }
    try {
      const noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
      return noeud;
    } catch { return null; }
  }

  function parId(id) {
    try { return document.getElementById(id); } catch { return null; }
  }

  /* Un seul nœud par identifiant maison : les doublons éventuels laissés par
     une reconstruction interrompue sont retirés, jamais un nœud étranger. */
  function unique(id) {
    try {
      const tous = Array.from(document.querySelectorAll(`[id="${id}"]`));
      for (let i = 1; i < tous.length; i += 1) {
        try { tous[i].remove(); } catch { /* garde */ }
      }
      return tous.length ? tous[0] : null;
    } catch { return null; }
  }

  function dépose(parent, id, balise, classe, texte) {
    if (!parent || typeof parent.appendChild !== 'function') return null;
    let noeud = unique(id);
    if (noeud && noeud.parentNode !== parent) {
      try { noeud.remove(); } catch { /* garde */ }
      noeud = null;
    }
    if (!noeud) {
      noeud = fabrique(balise, classe, texte);
      if (!noeud) return null;
      try { noeud.id = id; } catch { return null; }
      try { parent.appendChild(noeud); } catch { return null; }
    }
    return noeud;
  }

  function ajouteClasse(noeud, classe) {
    try { if (noeud && noeud.classList && !noeud.classList.contains(classe)) noeud.classList.add(classe); }
    catch { /* garde */ }
  }

  function protège(nom, tâche) {
    try { tâche(); } catch { /* une chantier défaillant n'en bloque aucun autre */ }
  }

  function appliqueCadence() {
    const echelle = ECHELLES[cadence] || 1;
    try { layout.dataset.e069Tempo = cadence; } catch { /* garde */ }
    try { layout.dataset.e069Motion = réduit ? 'reduced' : 'full'; } catch { /* garde */ }
    try { layout.style.setProperty('--e069-scale', String(echelle)); } catch { /* garde */ }
    if (réduit) ajouteClasse(layout, 'recit-e069-still');
    else { try { layout.classList.remove('recit-e069-still'); } catch { /* garde */ } }
    try { if (stage && stage.dataset) stage.dataset.e069Tempo = cadence; } catch { /* garde */ }
  }

  function metAJourNote(note) {
    const cible = note || parId('e069-motion-note');
    if (!cible || typeof cible.textContent !== 'string' && typeof cible.textContent !== 'number') return;
    let jalons = '—';
    try { jalons = layout.dataset.e069Jalons || '—'; } catch { /* garde */ }
    const etat = réduit
      ? 'animations désactivées selon votre réglage système'
      : 'animations actives dans le respect de votre réglage système';
    try {
      cible.textContent = `Mouvement : cadence ${LIBELLES[cadence]} · ${etat} · piste de ${jalons} jalon(s). Aucune animation en boucle.`;
    } catch { /* garde */ }
  }

  function positionneAiguille(aiguille, item) {
    if (!aiguille || !item) return;
    try {
      const x = Number(item.offsetLeft) + Number(item.offsetWidth) / 2 - 5;
      const y = Number(item.offsetTop) - 4;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      aiguille.style.left = `${Math.round(x)}px`;
      aiguille.style.top = `${Math.round(y)}px`;
      try { layout.dataset.e069Aiguille = '1'; } catch { /* garde */ }
    } catch { /* géométrie indisponible : l'aiguille reste à son origin */ }
  }

  /* Portée unique : toutes les règles sont sous .recit-layout.recit-e069-scope. */
  ajouteClasse(layout, 'recit-e069-scope');
  if (réduit) ajouteClasse(layout, 'recit-e069-still');
  try { layout.dataset.e069Motion = réduit ? 'reduced' : 'full'; } catch { /* garde */ }

  /* ---------- E069-01 — cadran de tempo ---------- */
  protège('E069-01', () => {
    const actions = q(layout, '.recit-actions');
    if (!actions) return;
    const bouton = dépose(actions, 'e069-tempo-btn', 'button', 'recit-e069-tempo', `Cadence : ${LIBELLES[cadence]}`);
    if (!bouton) return;
    try { bouton.type = 'button'; } catch { /* garde */ }
    try {
      bouton.setAttribute('aria-label', `Cadence de mouvement : ${LIBELLES[cadence]}. Activer pour changer.`);
      bouton.title = `Cadence ${LIBELLES[cadence]} — activer pour passer à la cadence suivante`;
    } catch { /* garde */ }
    if (!bouton.dataset || bouton.dataset.e069Bound !== '1') {
      try { bouton.dataset.e069Bound = '1'; } catch { /* garde */ }
      try {
        bouton.addEventListener('click', () => {
          const position = CADENCES.indexOf(cadence);
          cadence = CADENCES[(position + 1) % CADENCES.length];
          appliqueCadence();
          try {
            bouton.textContent = `Cadence : ${LIBELLES[cadence]}`;
            bouton.setAttribute('aria-label', `Cadence de mouvement : ${LIBELLES[cadence]}. Activer pour changer.`);
            bouton.title = `Cadence ${LIBELLES[cadence]} — activer pour passer à la cadence suivante`;
          } catch { /* garde */ }
          metAJourNote();
        });
      } catch { /* garde */ }
    }
    appliqueCadence();
  });

  /* ---------- E069-02 — cascade d'entrée du fil ---------- */
  protège('E069-02', () => {
    const titreFil = q(layout, '.recit-thread-title');
    if (titreFil) ajouteClasse(titreFil, 'recit-e069-entree');
    qa(layout, '.recit-thread .recit-thread-item').forEach((item) => ajouteClasse(item, 'recit-e069-entree'));
  });

  /* ---------- E069-03 — piste de jalons et curseur voyageur ---------- */
  protège('E069-03', () => {
    const kicker = q(layout, '.view-kicker');
    const texteKicker = kicker ? String(kicker.textContent || '') : '';
    const found = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texteKicker);
    let etape = found ? Number(found[1]) : 0;
    let total = found ? Number(found[2]) : 0;
    if (!Number.isFinite(etape) || !Number.isFinite(total) || total < 1) {
      const items = qa(layout, '.recit-thread-item');
      total = items.length;
      let courant = -1;
      items.forEach((item, i) => {
        if (item.classList && (item.classList.contains('is-current') || item.getAttribute('aria-current') === 'step')) courant = i;
      });
      etape = courant >= 0 ? courant + 1 : 1;
    }
    if (!Number.isFinite(total) || total < 1) return;
    const jalons = Math.max(1, Math.min(24, Math.round(total)));
    const borne = Math.max(1, Math.min(jalons, Math.round(etape)));

    const corps = q(layout, '.recit-body');
    const progression = q(layout, '.recit-progress');
    const parent = progression && progression.parentNode === corps ? corps : (corps || (progression && progression.parentNode));
    if (!parent) return;
    const piste = dépose(parent, 'e069-trail', 'div', 'recit-e069-piste');
    if (!piste) return;
    try {
      piste.setAttribute('role', 'img');
      piste.setAttribute('aria-label', `Piste de lecture : étape ${borne} sur ${total}`);
    } catch { /* garde */ }

    const jalonsExistants = qa(piste, '.recit-e069-jalon');
    if (jalonsExistants.length !== jalons) {
      jalonsExistants.forEach((ancien) => { try { ancien.remove(); } catch { /* garde */ } });
      for (let i = 0; i < jalons; i += 1) {
        const jalon = fabrique('span', 'recit-e069-jalon');
        if (!jalon) continue;
        try { jalon.setAttribute('aria-hidden', 'true'); } catch { /* garde */ }
        try { piste.appendChild(jalon); } catch { /* garde */ }
      }
    }
    const curseur = dépose(piste, 'e069-cursor', 'span', 'recit-e069-curseur');
    if (!curseur) return;
    try { curseur.setAttribute('aria-hidden', 'true'); } catch { /* garde */ }
    const fraction = jalons > 1 ? (borne - 1) / (jalons - 1) : 0.5;
    try { curseur.style.left = `${Math.round(fraction * 1000) / 10}%`; } catch { /* garde */ }
    try {
      layout.dataset.e069Jalons = String(jalons);
      layout.dataset.e069Etape = String(borne);
      layout.dataset.e069Total = String(total);
    } catch { /* garde */ }
  });

  /* ---------- E069-04 — aiguille posée sur le point courant du fil ---------- */
  protège('E069-04', () => {
    const liste = q(layout, '.recit-thread-list');
    if (!liste) return;
    ajouteClasse(liste, 'recit-e069-fil');
    const aiguille = dépose(liste, 'e069-bead', 'li', 'recit-e069-aiguille');
    if (!aiguille) return;
    try { aiguille.setAttribute('aria-hidden', 'true'); } catch { /* garde */ }
    const courant = q(liste, '.recit-thread-item.is-current') || q(liste, '.recit-thread-item[aria-current="step"]');
    if (courant) positionneAiguille(aiguille, courant);
    else { try { layout.dataset.e069Aiguille = '0'; } catch { /* garde */ } }
  });

  /* ---------- E069-05 — trait qui se déploie sous le titre ---------- */
  protège('E069-05', () => {
    const titre = q(layout, '#recit-point-title') || q(layout, '.recit-title');
    if (!titre) return;
    ajouteClasse(titre, 'recit-e069-titre');
    const trait = dépose(titre, 'e069-underline', 'span', 'recit-e069-trait');
    if (!trait) return;
    try { trait.setAttribute('aria-hidden', 'true'); } catch { /* garde */ }
  });

  /* ---------- E069-06 — respiration d'entrée de la pastille ---------- */
  protège('E069-06', () => {
    const pastille = q(layout, '.recit-conf');
    if (pastille) ajouteClasse(pastille, 'recit-e069-pastille');
  });

  /* ---------- E069-07 — entrée différée du bas de page ---------- */
  protège('E069-07', () => {
    ['.recit-legend', '.recit-trace', '.recit-sources'].forEach((sélecteur) => {
      qa(layout, sélecteur).forEach((noeud) => ajouteClasse(noeud, 'recit-e069-queue'));
    });
  });

  /* ---------- E069-08 — glacis au survol et au focus ---------- */
  protège('E069-08', () => {
    ajouteClasse(layout, 'recit-e069-glacis');
  });

  /* ---------- E069-09 — l'aiguille suit le focus clavier du fil ---------- */
  protège('E069-09', () => {
    const liste = q(layout, '.recit-thread-list');
    const aiguille = liste ? q(liste, '#e069-bead') : null;
    if (!liste || !aiguille) return;
    ajouteClasse(liste, 'recit-e069-focus');
    if (!liste.dataset || liste.dataset.e069Focus !== '1') {
      try { liste.dataset.e069Focus = '1'; } catch { /* garde */ }
      try {
        liste.addEventListener('focusin', (événement) => {
          try {
            const cible = événement.target && typeof événement.target.closest === 'function'
              ? événement.target.closest('.recit-thread-item') : null;
            if (cible && liste.contains(cible)) positionneAiguille(aiguille, cible);
          } catch { /* garde */ }
        });
        liste.addEventListener('focusout', (événement) => {
          try {
            if (événement.relatedTarget && liste.contains(événement.relatedTarget)) return;
            const courant = q(liste, '.recit-thread-item.is-current') || q(liste, '.recit-thread-item[aria-current="step"]');
            if (courant) positionneAiguille(aiguille, courant);
          } catch { /* garde */ }
        });
      } catch { /* garde */ }
    }
  });

  /* ---------- E069-10 — témoin auditable ---------- */
  protège('E069-10', () => {
    const légende = q(layout, '.recit-legend');
    if (!légende) return;
    const note = dépose(légende, 'e069-motion-note', 'p', 'recit-e069-note');
    if (!note) return;
    metAJourNote(note);
    try {
      layout.dataset.e069Enhancements = '10';
      layout.dataset.e069Unique = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length === 1) ? '1' : '0';
    } catch { /* garde */ }
  });
});
