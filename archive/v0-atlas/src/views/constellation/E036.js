import { register } from './registry.js';

/* Lentille E036 — Gestion de l'état appliquée aux arêtes du graphe de la vue
   Constellation. Dix chantiers locaux et variés, tous déterministes : chaque
   valeur est dérivée des <line> réellement rendues, aucune donnée n'est
   inventée. Un seul register, une seule feuille CSS, des identifiants
   préfixés e036-. Zéro réseau, zéro source aléatoire, zéro journalisation,
   aucun minuteur ni boucle d'animation propre. */

const CSS = `
  .e036-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
  #e036-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;
    margin:8px 0 0;padding:0}
  #e036-toolbar::before{content:'Affichage des arêtes';color:var(--muted,#8b8b8b);
    font-size:9px;font-weight:600;letter-spacing:.04em;flex-basis:100%}
  #e036-toolbar .e036-mode,#e036-reset{min-height:36px;padding:5px 10px;
    border:1px solid var(--line,#444);border-radius:7px;background:transparent;
    color:var(--gold,#e6b96f);font:inherit;font-size:10px;cursor:pointer}
  #e036-toolbar .e036-mode[aria-checked=true]{border-color:var(--gold-bright,#f4d69e);
    font-weight:600;text-decoration:underline;text-underline-offset:3px}
  #e036-toolbar .e036-mode:focus-visible,#e036-reset:focus-visible{
    outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
  #e036-reset{color:var(--muted,#8b8b8b)}
  #e036-drift{margin:6px 0 0;color:var(--muted,#8b8b8b);font-size:9px;line-height:1.5}
  #e036-drift.e036-alerte{color:var(--gold-bright,#f4d69e);font-weight:600}
  #e036-snapshot{margin:6px 0 0;color:var(--muted,#8b8b8b);font-size:9px}
  #e036-snapshot summary{min-height:24px;cursor:pointer}
  #e036-snapshot .e036-liste{margin:4px 0 0;padding-left:18px;line-height:1.6}
  .e036-mode-actives .const-edge:not(.is-path){opacity:.16}
  .e036-mode-compte .const-edge{stroke-width:1.6}
  .e036-derive .const-edge{stroke-dasharray:3 2}
`;

/* État local de la lentille, gardé entre deux appels du registre. */
let cleSvg = null;
let empreinteRef = '';
let modeAffichage = 'toutes';
let journal = [];
let observeur = null;
let zoneClicLiee = null;
let barreLiee = null;
let boutonResetLie = null;

function empreinte(chaine) {
  let h = 0x811c9dc5;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function nombreAttribut(noeud, nom) {
  const brut = typeof noeud.getAttribute === 'function' ? noeud.getAttribute(nom) : null;
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? valeur : 0;
}

function coordonnee(noeud, nom) {
  return (Math.round(nombreAttribut(noeud, nom) * 100) / 100).toFixed(2);
}

function signature(noeud) {
  return `${coordonnee(noeud, 'x1')};${coordonnee(noeud, 'y1')};`
    + `${coordonnee(noeud, 'x2')};${coordonnee(noeud, 'y2')}`;
}

function estLune(noeud) {
  return !!(noeud.classList && noeud.classList.contains('is-moon'));
}

function estActive(noeud) {
  return !!(noeud.classList && noeud.classList.contains('is-path'));
}

register('E036', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (typeof document === 'undefined' || !ctx || !ctx.layout) return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const svg = layout.querySelector('svg.constellation-edges');
  if (!svg || typeof svg.querySelectorAll !== 'function'
      || typeof svg.setAttribute !== 'function' || !svg.classList) return;

  /* Feuille unique de la lentille, injectée une seule fois par cssOnce. */
  ctx.css('constellation-e036', CSS);

  /* Un nouveau SVG marque un nouveau rendu : l'état local est réinitialisé. */
  if (cleSvg !== svg) {
    cleSvg = svg;
    empreinteRef = '';
    modeAffichage = 'toutes';
    journal = [];
    zoneClicLiee = null;
    barreLiee = null;
    boutonResetLie = null;
    if (observeur && typeof observeur.disconnect === 'function') {
      try { observeur.disconnect(); } catch (_) { observeur = null; }
    }
    observeur = null;
  }

  let live = null;
  let toolbar = null;
  let badge = null;
  let miroir = null;

  function lireLignes() {
    return Array.prototype.slice.call(svg.querySelectorAll('line.const-edge'));
  }

  function placer(parent, id, tag, cls, texte) {
    let noeud = layout.querySelector(`#${id}`);
    if (!noeud) {
      noeud = ctx.el(tag, cls, texte);
      noeud.id = id;
      (parent || layout).appendChild(noeud);
    }
    return noeud;
  }

  function dire(message) {
    if (live && typeof live.textContent === 'string') live.textContent = message;
  }

  function noter(entree) {
    journal.push(String(entree));
    if (journal.length > 8) journal = journal.slice(-8);
    svg.setAttribute('data-e036-journal', String(journal.length));
    svg.setAttribute('data-e036-dernier', journal[journal.length - 1] || '');
  }

  function appliquerIdentite(liste) {
    /* E036-01 — Identité stable : chaque arête reçoit un id e036-, un type
       (rayon d'ère ou rayon de point) et un rang calculés depuis sa classe et
       sa position réelle, jamais depuis une constante codée en dur. */
    let planetes = 0;
    let lunes = 0;
    liste.forEach((ligne, index) => {
      const lune = estLune(ligne);
      const rang = lune ? lunes : planetes;
      if (lune) lunes += 1; else planetes += 1;
      const type = lune ? 'lune' : 'planete';
      const id = `e036-${type}-${rang}`;
      if (typeof ligne.setAttribute === 'function') {
        if (!ligne.id) ligne.id = id;
        ligne.setAttribute('data-e036-id', id);
        ligne.setAttribute('data-e036-type', type);
        ligne.setAttribute('data-e036-rang', String(rang));
        ligne.setAttribute('data-e036-position', String(index));
        ligne.setAttribute('data-e036-actif', estActive(ligne) ? 'oui' : 'non');
      }
    });
    svg.setAttribute('data-e036-identite', String(liste.length));
  }

  function appliquerSignature(liste) {
    /* E036-02 — Signature géométrique : les quatre coordonnées sont lues et
       arrondies, puis concaténées ; une empreinte FNV-1a (Math.imul, aucune
       source aléatoire) est écrite sur le SVG pour identifier l'état du graphe. */
    const chaines = liste.map((ligne) => {
      const s = signature(ligne);
      if (typeof ligne.setAttribute === 'function') ligne.setAttribute('data-e036-signature', s);
      return s;
    });
    const emp = empreinte(chaines.join('|'));
    svg.setAttribute('data-e036-empreinte', emp);
    svg.setAttribute('data-e036-signatures', String(chaines.length));
    return emp;
  }

  function appliquerSnapshot(liste, emp) {
    /* E036-03 — Snapshot d'état : le SVG porte le relevé complet — totaux,
       décompte par type, arêtes actives, rang actif, empreinte, mode et
       profondeur du journal — sous forme d'attributs réutilisables. */
    let rangActif = -1;
    let actives = 0;
    let lunes = 0;
    for (let i = 0; i < liste.length; i += 1) {
      if (estLune(liste[i])) lunes += 1;
      if (estActive(liste[i])) {
        actives += 1;
        if (rangActif < 0) rangActif = i;
      }
    }
    const releve = {
      'data-e036-edges': String(liste.length),
      'data-e036-planetes': String(liste.length - lunes),
      'data-e036-lunes': String(lunes),
      'data-e036-actives': String(actives),
      'data-e036-active-index': rangActif >= 0 ? String(rangActif) : '',
      'data-e036-empreinte-snapshot': emp,
      'data-e036-mode': modeAffichage,
      'data-e036-journal': String(journal.length),
      'data-e036-dernier': journal.length ? journal[journal.length - 1] : '',
    };
    Object.keys(releve).forEach((nom) => svg.setAttribute(nom, releve[nom]));
  }

  function appliquerDerive(liste, emp) {
    /* E036-08 — Détection de dérive : l'empreinte courante est comparée au
       relevé de référence ; l'écart est publié en attribut, en classe CSS et
       en texte visible dans un badge (jamais la seule couleur). */
    if (!empreinteRef) empreinteRef = emp;
    const derive = emp !== empreinteRef;
    svg.setAttribute('data-e036-derive', derive ? 'oui' : 'non');
    if (derive) svg.classList.add('e036-derive');
    else svg.classList.remove('e036-derive');
    if (badge) {
      badge.textContent = derive
        ? `Arêtes modifiées depuis le relevé : ${liste.length} arêtes, empreinte ${emp} (référence ${empreinteRef}).`
        : `Arêtes synchronisées : ${liste.length} arêtes, empreinte ${emp}.`;
      if (derive) badge.classList.add('e036-alerte');
      else badge.classList.remove('e036-alerte');
    }
  }

  function appliquerMiroir(liste) {
    /* E036-10 — Miroir textuel : une liste ordonnée sémantique décrit chaque
       arête (type, rang, état, géométrie, signature) sans dépendre du CSS ni
       du SVG déclaré aria-hidden par la vue. */
    if (!miroir) return;
    const conteneur = miroir.querySelector('.e036-liste');
    if (!conteneur || typeof conteneur.replaceChildren !== 'function') return;
    const items = liste.map((ligne, index) => {
      const item = ctx.el('li', 'e036-item', '');
      const type = ligne.getAttribute('data-e036-type') || (estLune(ligne) ? 'lune' : 'planete');
      const rang = ligne.getAttribute('data-e036-rang') || String(index + 1);
      const etat = estActive(ligne) ? 'active' : 'inactive';
      const nature = type === 'lune' ? 'rayon vers un point vérifié' : 'rayon vers un repère';
      const sig = ligne.getAttribute('data-e036-signature') || signature(ligne);
      item.textContent = `Arête ${index + 1} — ${nature} ${rang}, ${etat}, `
        + `de (${coordonnee(ligne, 'x1')};${coordonnee(ligne, 'y1')}) `
        + `à (${coordonnee(ligne, 'x2')};${coordonnee(ligne, 'y2')}), signature ${sig}.`;
      return item;
    });
    conteneur.replaceChildren.apply(conteneur, items);
    const resume = miroir.querySelector('summary');
    if (resume) resume.textContent = `État des arêtes (${liste.length})`;
  }

  function appliquerMode(annoncer) {
    svg.setAttribute('data-e036-mode', modeAffichage);
    svg.classList.remove('e036-mode-toutes', 'e036-mode-actives', 'e036-mode-compte');
    svg.classList.add(`e036-mode-${modeAffichage}`);
    if (toolbar) {
      const boutons = Array.prototype.slice.call(toolbar.querySelectorAll('button[data-e036-mode]'));
      boutons.forEach((bouton) => {
        const coche = bouton.getAttribute('data-e036-mode') === modeAffichage;
        bouton.setAttribute('aria-checked', coche ? 'true' : 'false');
        bouton.tabIndex = coche ? 0 : -1;
      });
    }
    if (annoncer) dire(`Affichage des arêtes : ${modeAffichage}.`);
  }

  function synchroniser() {
    const liste = lireLignes();
    if (!liste.length) return;
    const emp = appliquerSignature(liste);
    appliquerIdentite(liste);
    appliquerSnapshot(liste, emp);
    appliquerDerive(liste, emp);
    appliquerMiroir(liste);
  }

  const caption = layout.querySelector('.constellation-caption');
  const field = layout.querySelector('.constellation-field');
  const head = layout.querySelector('.constellation-head');

  /* E036-04 — Miroir live : les arêtes sont aria-hidden dans la vue ; un
     paragraphe de statut hors du SVG annonce l'état relevé lors d'un clic sur
     un nœud, via un unique écouteur délégué et capturé sur le champ. */
  live = placer(caption || layout, 'e036-live', 'p', 'e036-sr', '');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  if (field && zoneClicLiee !== field && typeof field.addEventListener === 'function') {
    zoneClicLiee = field;
    field.addEventListener('click', (event) => {
      const cible = event && event.target;
      const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('[data-const-key]') : null;
      if (!noeud || typeof field.contains !== 'function' || !field.contains(noeud)) return;
      const cle = noeud.getAttribute('data-const-key') || '';
      const liste = lireLignes();
      const actives = liste.filter(estActive).length;
      const libelle = noeud.getAttribute('data-label') || noeud.getAttribute('aria-label') || cle;
      noter(`clic:${cle}`);
      dire(`Nœud ${libelle} : ${liste.length} arêtes au total, ${actives} arêtes actives.`);
    }, true);
  }

  /* E036-05 — Barre de modes : un radiogroupe de trois affichages des arêtes,
     inséré dans l'en-tête, avec aria-checked et classe d'état sur le SVG. */
  toolbar = placer(head || caption || layout, 'e036-toolbar', 'div', 'e036-barre', '');
  toolbar.setAttribute('role', 'radiogroup');
  toolbar.setAttribute('aria-label', 'Mode d’affichage des arêtes du graphe');
  if (!toolbar.querySelector('button[data-e036-mode="toutes"]')) {
    const modes = [
      ['toutes', 'Toutes les arêtes'],
      ['actives', 'Actives seulement'],
      ['compte', 'Compte détaillé'],
    ];
    modes.forEach((pair) => {
      const bouton = ctx.el('button', 'e036-mode', pair[1]);
      bouton.type = 'button';
      bouton.id = `e036-mode-${pair[0]}`;
      bouton.setAttribute('role', 'radio');
      bouton.setAttribute('data-e036-mode', pair[0]);
      toolbar.appendChild(bouton);
    });
  }
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    toolbar.setAttribute('data-e036-mouvement', 'reduit');
  } else {
    toolbar.setAttribute('data-e036-mouvement', 'normal');
  }
  appliquerMode(false);
  if (barreLiee !== toolbar && typeof toolbar.addEventListener === 'function') {
    barreLiee = toolbar;
    toolbar.addEventListener('click', (event) => {
      const cible = event && event.target;
      const bouton = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('button[data-e036-mode]') : null;
      if (!bouton || !toolbar.contains(bouton)) return;
      const valeur = bouton.getAttribute('data-e036-mode');
      if (valeur !== 'toutes' && valeur !== 'actives' && valeur !== 'compte') return;
      modeAffichage = valeur;
      noter(`mode:${valeur}`);
      appliquerMode(true);
    });
  }

  /* E036-06 — Clavier du radiogroupe : flèches, Début et Fin déplacent le
     choix ; l'événement est capturé et arrêté pour ne pas atteindre le routeur
     global, et l'ancien écouteur est retiré avant d'être remplacé. */
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function'
      && typeof window.removeEventListener === 'function') {
    const CLE_NAV = '__e036_mode_nav';
    const precedent = window[CLE_NAV];
    if (typeof precedent === 'function') window.removeEventListener('keydown', precedent, true);
    const surNavigation = (event) => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const cible = event.target;
      if (!cible || cible.nodeType !== 1 || !toolbar || !toolbar.contains(cible)) return;
      if (typeof cible.matches !== 'function' || !cible.matches('button[data-e036-mode]')) return;
      const boutons = Array.prototype.slice.call(toolbar.querySelectorAll('button[data-e036-mode]'));
      const courant = boutons.indexOf(cible);
      if (courant < 0 || !boutons.length) return;
      let suivant = courant;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') suivant = (courant + 1) % boutons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') suivant = (courant - 1 + boutons.length) % boutons.length;
      else if (event.key === 'Home') suivant = 0;
      else if (event.key === 'End') suivant = boutons.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      const destination = boutons[suivant];
      try { destination.focus({ preventScroll: true }); }
      catch (_) { destination.focus(); }
      destination.click();
    };
    window[CLE_NAV] = surNavigation;
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, surNavigation);
  }

  /* E036-07 — Observateur ciblé : seul le SVG est surveillé, en childList,
     jamais la zone où la lentille écrit ses attributs. Un remplacement des
     <line> déclenche une resynchronisation sans boucle ni minuteur. */
  if (typeof MutationObserver === 'function') {
    if (observeur && typeof observeur.disconnect === 'function') {
      try { observeur.disconnect(); } catch (_) { observeur = null; }
    }
    try {
      observeur = new MutationObserver(() => { synchroniser(); });
      observeur.observe(svg, { childList: true, subtree: true });
    } catch (_) {
      observeur = null;
    }
  }

  /* Support texte du badge de dérive (calcul décrit au chantier E036-08). */
  badge = placer(caption || layout, 'e036-drift', 'p', 'e036-drift-message', '');

  /* E036-09 — Réinitialisation : un bouton natif remet le mode par défaut,
     efface le journal, réancre l'empreinte de référence et annonce l'action. */
  const reset = placer(toolbar, 'e036-reset', 'button', 'e036-reset',
    'Réinitialiser l’affichage des arêtes');
  reset.type = 'button';
  if (boutonResetLie !== reset && typeof reset.addEventListener === 'function') {
    boutonResetLie = reset;
    reset.addEventListener('click', () => {
      const liste = lireLignes();
      modeAffichage = 'toutes';
      journal = [];
      empreinteRef = svg.getAttribute('data-e036-empreinte') || '';
      noter('reset');
      appliquerMode(false);
      appliquerSnapshot(liste, empreinteRef);
      appliquerDerive(liste, empreinteRef);
      dire('Affichage des arêtes réinitialisé : toutes les arêtes sont affichées, journal vidé.');
    });
  }

  /* Conteneur du miroir textuel décrit au chantier E036-10. */
  miroir = placer(caption || layout, 'e036-snapshot', 'details', 'e036-snapshot-details', '');
  if (!miroir.querySelector('summary')) {
    miroir.appendChild(ctx.el('summary', 'e036-summary', 'État des arêtes'));
  }
  if (!miroir.querySelector('.e036-liste')) {
    miroir.appendChild(ctx.el('ol', 'e036-liste', ''));
  }

  /* Premier relevé : journal, identité, signature, snapshot, dérive et miroir. */
  noter(`init:${lireLignes().length}`);
  synchroniser();
});
