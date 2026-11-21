import { register } from './registry.js';

/* Lentille E054 — Navigation clavier (vue Récit).
   Dix chantiers indépendants et non destructifs : sans ce module, la vue reste
   intégralement lisible et navigable. Un seul register, une seule feuille CSS,
   aucun réseau, aucun aléa, aucune sortie de débogage, aucun fichier partagé
   modifié. Les sélecteurs sont préfixés recit-e054- et les identifiants insérés
   sont préfixés e054- et uniques. Les nœuds créés sont toujours placés dans un
   conteneur imbriqué (.recit-body, .recit-legend, .recit-actions) afin d'échapper
   au masquage du tiroir de diagnostics, qui ne marque que les enfants directs
   de body, stage et layout. */

const CSS = `
/* E054-01 — liens d'évitement, masqués jusqu'au focus. */
.recit-e054-skip{position:relative;z-index:60}
.recit-e054-skip a{position:absolute;left:0;top:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;z-index:61}
.recit-e054-skip a:focus{width:auto;height:auto;margin:0;padding:8px 12px;overflow:visible;clip:rect(auto,auto,auto,auto);white-space:normal;border:2px solid var(--gold-bright);border-radius:8px;background:#0c1018;color:#f5e9d0;font-size:12px;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.5)}
@media (max-width:620px){.recit-e054-skip a:focus{font-size:11px;padding:8px 10px}}

/* E054-03 — aide clavier repliable, clavier et lecteur d'écran. */
.recit-e054-aide{margin-top:8px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e054-aide summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:10px;cursor:pointer}
.recit-e054-aide-liste{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:10px;line-height:1.6}
.recit-e054-aide-liste li{margin:2px 0}

/* E054-04 — focus visible renforcé, anneau élargi en mode clavier. */
.recit-e054-cible:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px;border-radius:6px}
.recit-e054-clavier .recit-e054-cible:focus-visible{outline:3px solid #ffe0a3;outline-offset:4px;box-shadow:0 0 0 6px rgba(230,185,111,.22)}
.recit-layout[data-e054-motion="reduce"] .recit-e054-cible{transition:none}

/* E054-06 — barre d'actions annoncée comme barre d'outils. */
.recit-e054-toolbar{scroll-margin-top:8px}
`;

/* État survivant aux reconstructions du DOM opérées par la coque. */
let layoutCourant = null;
let clavierInstalle = false;
let echapInstalle = false;
let entreeInstalle = false;
let modeClavierActif = false;
let fkMemorise = null;
const prefs = { aideOuverte: false };

/* Exécute chaque chantier en isolement : une panne n'en entraîne aucune autre. */
function safe(fn) {
  try { fn(); } catch { /* neutralisation silencieuse, rendu intact. */ }
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function setOnce(noeud, attr, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  if (!noeud.hasAttribute(attr)) noeud.setAttribute(attr, valeur);
}

function addToken(noeud, attr, jeton) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return;
  const tokens = (noeud.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
  if (!tokens.includes(jeton)) {
    tokens.push(jeton);
    noeud.setAttribute(attr, tokens.join(' '));
  }
}

function estChamp(noeud) {
  if (!noeud) return false;
  return noeud.tagName === 'INPUT' || noeud.tagName === 'TEXTAREA' || noeud.isContentEditable === true;
}

function focalise(noeud) {
  if (!noeud || typeof noeud.focus !== 'function') return;
  try { noeud.focus({ preventScroll: true }); } catch { noeud.focus(); }
}

function dit(texte) {
  safe(() => {
    const live = document.getElementById('atlas-recit-live');
    if (live) live.textContent = texte;
  });
}

function marqueCibles(layout) {
  const selecteurs = [
    '.recit-actions button', '.c3a-filter', '.c3a-search', '.c3a-reset',
    '.recit-thread-item', '.recit-trace summary', '.recit-e054-skip a',
    '.recit-e054-aide summary',
  ];
  selecteurs.forEach((selecteur) => {
    const nodes = layout.querySelectorAll(selecteur);
    for (let i = 0; i < nodes.length; i += 1) ajouteClasse(nodes[i], 'recit-e054-cible');
  });
}

/* E054-01 — entrée directe dans les quatre zones qui comptent au clavier. */
function chantier01(body, el) {
  let nav = body.querySelector('.recit-e054-skip');
  if (!nav) {
    nav = el('div', 'recit-e054-skip');
    nav.id = 'e054-evitement';
    nav.setAttribute('aria-label', "Liens d'évitement du récit");
    body.insertBefore(nav, body.firstChild);
  }

  const cibles = [
    ['e054-aller-point', "Aller au point courant", () => document.getElementById('recit-point-title')],
    ['e054-aller-fil', "Aller au fil du repère", () => body.querySelector('.recit-thread')],
    ['e054-aller-commandes', "Aller aux commandes", () => body.querySelector('.recit-actions')],
    ['e054-aller-trace', "Aller à la traçabilité", () => body.querySelector('.recit-trace') || body.querySelector('.recit-sources')],
  ];

  cibles.forEach(([id, libelle, cherche]) => {
    const cible = cherche();
    if (!cible) return;
    if (!cible.id) cible.id = id.replace('aller-', 'cible-');
    setOnce(cible, 'tabindex', '-1');

    let lien = nav.querySelector(`#${id}`);
    if (!lien) {
      lien = el('a', 'recit-e054-evitement', libelle);
      lien.id = id;
      setOnce(lien, 'href', `#${cible.id}`);
      lien.addEventListener('click', (event) => {
        event.preventDefault();
        focalise(cherche());
      });
      nav.appendChild(lien);
    }
  });
}

/* E054-02 — raccourcis Alt documentés sur les commandes existantes. */
function chantier02(layout) {
  const paires = [
    ['c3a-prev', 'Alt+ArrowLeft'],
    ['c3a-next', 'Alt+ArrowRight'],
    ['c3a-play', 'Alt+P'],
    ['c3a-restart', 'Alt+R'],
  ];
  paires.forEach(([fk, raccourci]) => {
    const bouton = layout.querySelector(`[data-fk="${fk}"]`);
    if (bouton) addToken(bouton, 'aria-keyshortcuts', raccourci);
  });
}

/* E054-03 — panneau d'aide clavier, repliable et annoncé. */
function chantier03(layout, el) {
  const legend = layout.querySelector('.recit-legend');
  if (!legend) return;

  let details = legend.querySelector('#e054-aide-clavier');
  if (!details) {
    details = el('details', 'recit-e054-aide');
    details.id = 'e054-aide-clavier';
    const resume = el('summary', 'recit-e054-aide-resume', 'Aide clavier (Alt+A)');
    resume.id = 'e054-aide-resume';
    resume.setAttribute('aria-label', "Aide clavier : afficher ou masquer la liste des raccourcis");
    details.appendChild(resume);

    const liste = el('ul', 'recit-e054-aide-liste');
    const entrees = [
      "Alt + ← / → : point précédent / point suivant.",
      "Alt + Début / Fin : premier / dernier point affiché.",
      "Alt + P : lecture automatique ; Alt + R : recommencer.",
      "Alt + A : aide clavier ; Alt + T : traçabilité.",
      "Tab : liens d'évitement, recherche, filtres, fil puis commandes.",
      "Entrée dans la recherche : premier résultat ; Échap : quitter la zone.",
      "Dans le fil : ↑ ↓ Début Fin parcourent les points ; Page↑ Page↓ avancent de cinq points.",
      "Dans les commandes : Début / Fin atteignent la première / dernière commande.",
    ];
    entrees.forEach((texte) => liste.appendChild(el('li', '', texte)));
    details.appendChild(liste);
    legend.appendChild(details);
  }

  const resume = details.querySelector('summary');
  setOnce(details, 'aria-label', "Aide à la navigation clavier du récit");
  if (resume) addToken(resume, 'aria-keyshortcuts', 'Alt+A');
  details.open = prefs.aideOuverte;
  if (!details.dataset.e054Aide) {
    details.dataset.e054Aide = '1';
    details.addEventListener('toggle', () => { prefs.aideOuverte = details.open; });
  }
}

/* E054-04 — marquage des cibles : le mode clavier est piloté plus bas. */
function chantier04(layout) {
  marqueCibles(layout);
  if (modeClavierActif) ajouteClasse(layout, 'recit-e054-clavier');
}

/* E054-05 — une seule tabulation dans le fil, même après filtrage. */
function chantier05(layout) {
  const liste = layout.querySelector('#c3a-thread');
  if (!liste) return;
  const items = Array.from(liste.querySelectorAll('.recit-thread-item'));
  if (!items.length) return;
  const actifs = items.filter((noeud) => !noeud.disabled);
  if (!actifs.length) return;
  const courant = actifs.find((noeud) => noeud.getAttribute('aria-current') === 'step');
  const cible = courant || actifs[0];
  items.forEach((noeud) => { noeud.tabIndex = -1; });
  cible.tabIndex = 0;
}

/* E054-06 — la barre d'actions devient une barre d'outils nommée. */
function chantier06(layout) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions) return;
  setOnce(actions, 'role', 'toolbar');
  setOnce(actions, 'aria-label', "Commandes de lecture du récit");
  setOnce(actions, 'aria-orientation', 'horizontal');
  ajouteClasse(actions, 'recit-e054-toolbar');
}

/* E054-07 — le focus clavier est mémorisé puis rendu après reconstruction. */
function chantier07(layout) {
  if (!layoutCourant || !layoutCourant.isConnected) return;
  const micro = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => Promise.resolve().then(fn);
  micro(() => {
    safe(() => {
      if (!layoutCourant || !layoutCourant.isConnected) return;
      const actif = document.activeElement;
      if (actif && actif !== document.body && actif !== document.documentElement) return;
      if (!fkMemorise) return;
      const cible = layoutCourant.querySelector(`[data-fk="${fkMemorise}"]`);
      if (!cible || cible.disabled) return;
      focalise(cible);
    });
  });
}

/* E054-08 — la traçabilité s'ouvre et se referme aussi au clavier. */
function chantier08(layout) {
  const details = layout.querySelector('.recit-trace');
  if (!details) return;
  setOnce(details, 'aria-label', "Traçabilité du point courant");
  const resume = details.querySelector('summary');
  if (!resume) return;
  resume.setAttribute('aria-expanded', details.open ? 'true' : 'false');
  setOnce(resume, 'aria-label', "Traçabilité : afficher ou masquer les références locales");
  addToken(resume, 'aria-keyshortcuts', 'Alt+T');
  ajouteClasse(resume, 'recit-e054-cible');
  if (!resume.dataset.e054Trace) {
    resume.dataset.e054Trace = '1';
    details.addEventListener('toggle', () => {
      resume.setAttribute('aria-expanded', details.open ? 'true' : 'false');
    });
  }
}

/* E054-09 — Échap vide la recherche ou ramène le focus au point. */
function chantier09() {
  if (echapInstalle || typeof window === 'undefined' || typeof document === 'undefined') return;
  echapInstalle = true;
  window.addEventListener('keydown', (event) => {
    safe(() => {
      if (!layoutCourant || !layoutCourant.isConnected) return;
      gereEchap(event);
    });
  }, true);
}

/* E054-10 — Entrée dans la recherche mène au premier résultat. */
function chantier10() {
  if (entreeInstalle || typeof window === 'undefined' || typeof document === 'undefined') return;
  entreeInstalle = true;
  window.addEventListener('keydown', (event) => {
    safe(() => {
      if (!layoutCourant || !layoutCourant.isConnected) return;
      gereRecherche(event);
    });
  }, true);
}

function gereModeClavier(event) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  modeClavierActif = true;
  ajouteClasse(layoutCourant, 'recit-e054-clavier');
}

function basculeAide() {
  const details = layoutCourant && layoutCourant.querySelector('#e054-aide-clavier');
  if (!details) return;
  details.open = !details.open;
  prefs.aideOuverte = details.open;
  const resume = details.querySelector('summary');
  if (resume) focalise(resume);
  dit(details.open ? "Aide clavier ouverte." : "Aide clavier fermée.");
}

function basculeTrace() {
  const details = layoutCourant && layoutCourant.querySelector('.recit-trace');
  if (!details) return;
  details.open = !details.open;
  const resume = details.querySelector('summary');
  if (resume) {
    resume.setAttribute('aria-expanded', details.open ? 'true' : 'false');
    focalise(resume);
  }
  dit(details.open ? "Traçabilité ouverte." : "Traçabilité fermée.");
}

function gereRaccourcis(event) {
  if (!event.altKey || event.ctrlKey || event.metaKey || estChamp(event.target)) return;
  const cle = event.key;
  let fk = null;
  if (cle === 'ArrowLeft') fk = 'c3a-prev';
  else if (cle === 'ArrowRight') fk = 'c3a-next';
  else if (cle === 'Home') fk = 'premier';
  else if (cle === 'End') fk = 'dernier';
  else if (cle === 'p' || cle === 'P' || event.code === 'KeyP') fk = 'c3a-play';
  else if (cle === 'r' || cle === 'R' || event.code === 'KeyR') fk = 'c3a-restart';
  else if (cle === 'a' || cle === 'A' || event.code === 'KeyA') { event.preventDefault(); event.stopPropagation(); basculeAide(); return; }
  else if (cle === 't' || cle === 'T' || event.code === 'KeyT') { event.preventDefault(); event.stopPropagation(); basculeTrace(); return; }
  else return;

  event.preventDefault();
  event.stopPropagation();
  let bouton = null;
  if (fk === 'premier' || fk === 'dernier') {
    const items = layoutCourant.querySelectorAll('#c3a-thread .c3a-thread-item:not([disabled])');
    if (!items.length) return;
    bouton = fk === 'premier' ? items[0] : items[items.length - 1];
  } else {
    bouton = layoutCourant.querySelector(`[data-fk="${fk}"]`);
  }
  if (bouton && typeof bouton.click === 'function') bouton.click();
}

function gereFil(event) {
  if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
  const cible = event.target;
  const liste = cible && typeof cible.closest === 'function' ? cible.closest('#c3a-thread') : null;
  if (!liste || liste.closest('.recit-layout') !== layoutCourant) return;
  const items = Array.from(liste.querySelectorAll('.recit-thread-item:not([disabled])'));
  if (!items.length) return;
  event.preventDefault();
  event.stopPropagation();
  const pos = items.indexOf(document.activeElement);
  const pas = 5;
  const suivant = event.key === 'PageDown'
    ? (pos < 0 ? 0 : Math.min(pos + pas, items.length - 1))
    : (pos < 0 ? items.length - 1 : Math.max(pos - pas, 0));
  items.forEach((noeud) => { noeud.tabIndex = -1; });
  items[suivant].tabIndex = 0;
  focalise(items[suivant]);
}

function gereToolbar(event) {
  if (event.key !== 'Home' && event.key !== 'End') return;
  const cible = event.target;
  const actions = cible && typeof cible.closest === 'function' ? cible.closest('.recit-actions') : null;
  if (!actions || actions.closest('.recit-layout') !== layoutCourant) return;
  const boutons = Array.from(actions.querySelectorAll('button:not([disabled])'));
  if (!boutons.length) return;
  event.preventDefault();
  event.stopPropagation();
  focalise(event.key === 'Home' ? boutons[0] : boutons[boutons.length - 1]);
}

function gereRecherche(event) {
  if (event.key !== 'Enter') return;
  const champ = event.target;
  if (!champ || champ.id !== 'c3a-search' || !layoutCourant) return;
  const premier = layoutCourant.querySelector('#c3a-thread .c3a-thread-item:not([disabled])');
  if (!premier) return;
  event.preventDefault();
  event.stopPropagation();
  focalise(premier);
}

function gereEchap(event) {
  if (event.key !== 'Escape') return;
  const cible = event.target;
  if (!cible) return;
  if (cible.id === 'c3a-search' && layoutCourant) {
    if (!cible.value) return;
    event.preventDefault();
    event.stopPropagation();
    cible.value = '';
    if (typeof Event === 'function') cible.dispatchEvent(new Event('input', { bubbles: true }));
    focalise(cible);
    return;
  }
  if (typeof cible.closest === 'function' && cible.closest('#c3a-thread')) {
    const titre = document.getElementById('recit-point-title');
    if (!titre) return;
    event.preventDefault();
    event.stopPropagation();
    focalise(titre);
  }
}

function memoriseFocus(event) {
  if (!modeClavierActif) return;
  const cible = event.target;
  if (!cible || typeof cible.getAttribute !== 'function') return;
  const fk = cible.getAttribute('data-fk');
  if (!fk || !layoutCourant) return;
  if (typeof cible.closest === 'function' && cible.closest('.recit-layout') === layoutCourant) fkMemorise = fk;
}

/* Un écouteur clavier partagé, deux écouteurs dédiés (Échap, Entrée) et un
   seul écouteur de focus, installés une fois pour toute la vie de la page. */
function installeClavier() {
  if (clavierInstalle || typeof window === 'undefined' || typeof document === 'undefined') return;
  clavierInstalle = true;

  window.addEventListener('keydown', (event) => {
    safe(() => {
      if (!layoutCourant || !layoutCourant.isConnected) return;
      gereModeClavier(event);
      gereRaccourcis(event);
      gereFil(event);
      gereToolbar(event);
    });
  }, true);

  document.addEventListener('focusin', memoriseFocus, true);

  const sortieSouris = () => {
    if (!modeClavierActif) return;
    modeClavierActif = false;
    if (layoutCourant && layoutCourant.classList) layoutCourant.classList.remove('recit-e054-clavier');
    fkMemorise = null;
  };
  window.addEventListener('pointerdown', sortieSouris, true);
  window.addEventListener('mousedown', sortieSouris, true);
}

register('E054', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  safe(() => {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e054', CSS); /* un seul appel, toutes les règles du module. */
    layoutCourant = layout;

    const motion = reducedMotion && typeof reducedMotion === 'function' && reducedMotion();
    layout.setAttribute('data-e054-motion', motion ? 'reduce' : 'normal');

    const body = layout.querySelector('.recit-body');
    if (!body) return;

    safe(() => chantier01(body, el));
    safe(() => chantier02(layout));
    safe(() => chantier03(layout, el));
    safe(() => chantier04(layout));
    safe(() => chantier05(layout));
    safe(() => chantier06(layout));
    safe(() => chantier07(layout));
    safe(() => chantier08(layout));
    safe(() => chantier09());
    safe(() => chantier10());
    installeClavier();
  });
});
