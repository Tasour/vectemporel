import { register } from './registry.js';

/* V2 lentille E054 — Navigation clavier (complément de la passe 1).
   La passe 1 a installé les interactions (liens d'évitement, raccourcis Alt,
   aide repliable, focus renforcé, tabulation mobile du fil, barre d'outils,
   reprise du focus, traçabilité, Échap et Entrée). Cette passe V2 ajoute dix
   chantiers neufs et distincts, tous dérivés du DOM réellement rendu :
   recensement des contrôles, inventaire des raccourcis, évitement vers la
   recherche, Alt+S, région d'annonce dédiée, annonce du point, numérotation
   de l'ordre de tabulation, état clavier affiché, distance jusqu'au point
   courant, annonce des commandes activées au clavier.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e054-, ids DOM v2-e054- (jamais e054- de la
   passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. */

const CSS = `
/* E054-01 — Recensement des contrôles atteignables au clavier. */
.recit-v2-e054-recensement{margin:3px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E054-02 — Inventaire des raccourcis réellement déclarés dans le DOM. */
.recit-v2-e054-raccourcis{margin:3px 0;color:var(--ink-soft);font-size:9px;line-height:1.5}

/* E054-03 — Liens d'évitement V2 vers la recherche et le statut du fil. */
.recit-v2-e054-skip{position:relative;z-index:59}
.recit-v2-e054-skip a{position:absolute;left:0;top:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;z-index:62}
.recit-v2-e054-skip a:focus{width:auto;height:auto;margin:0;padding:8px 12px;overflow:visible;clip:rect(auto,auto,auto,auto);white-space:normal;border:2px solid var(--gold-bright);border-radius:8px;background:#0c1018;color:#f5e9d0;font-size:12px;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.5)}
@media (max-width:620px){.recit-v2-e054-skip a:focus{font-size:11px;padding:8px 10px}}

/* E054-04 — Ancre de la recherche atteinte par Alt+S. */
.recit-layout .recit-v2-e054-search{scroll-margin-top:8px}

/* E054-05 — Région d'annonce V2 dédiée, distincte de #atlas-recit-live. */
.recit-v2-e054-live{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E054-07 — Numéro d'ordre de tabulation révélé au focus. */
.recit-layout .recit-v2-e054-ordre{position:relative}
.recit-layout .recit-v2-e054-ordre:focus-visible::after{content:attr(data-v2-e054-ordre);position:absolute;right:-4px;top:-9px;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--gold);color:#0c1018;font-size:9px;font-weight:700;line-height:14px;text-align:center;pointer-events:none}

/* E054-08 — État de navigation affiché en toutes circonstances. */
.recit-v2-e054-mode{margin:4px 0 0;display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}
.recit-v2-e054-mode[data-mode="clavier"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}

/* E054-09 — Distance de tabulation jusqu'au point courant. */
.recit-v2-e054-distance{margin:3px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* Confort : mouvement réduit aligné sur la préférence système. */
.recit-v2-e054-readout,.recit-v2-e054-mode{transition:color .2s linear,border-color .2s linear,background-color .2s linear}
.recit-layout[data-v2-e054-motion="reduce"] .recit-v2-e054-readout,
.recit-layout[data-v2-e054-motion="reduce"] .recit-v2-e054-mode{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e054-readout,.recit-v2-e054-mode{transition:none}}
`;

/* Sélecteur des contrôles réellement focalisables, dédupliqué plus bas. */
const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), '
  + 'select:not([disabled]), textarea:not([disabled]), summary, '
  + '[tabindex]:not([tabindex="-1"])';

/* État survivant aux reconstructions complètes du DOM par la coque. */
let layoutCourant = null;
let fabrique = null;
let raccourciInstalle = false;
let modeInstalle = false;
let actionInstalle = false;
let modeClavier = false;
let dernierTitre = null;

function safe(fn) {
  try { fn(); } catch { /* neutralisation silencieuse, rendu intact. */ }
}

function cree(tag, classe, texte) {
  if (typeof fabrique === 'function') return fabrique(tag, classe, texte);
  const noeud = document.createElement(tag);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
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

function focalise(noeud) {
  if (!noeud || typeof noeud.focus !== 'function') return;
  try { noeud.focus({ preventScroll: true }); } catch { noeud.focus(); }
}

function estChamp(noeud) {
  if (!noeud) return false;
  return noeud.tagName === 'INPUT' || noeud.tagName === 'TEXTAREA' || noeud.isContentEditable === true;
}

function tronquer(texte, max) {
  const valeur = String(texte || '').replace(/\s+/g, ' ').trim();
  return valeur.length > max ? `${valeur.slice(0, max - 1).trimEnd()}…` : valeur;
}

function focusables(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return [];
  return Array.from(new Set(Array.from(layout.querySelectorAll(FOCUSABLES))));
}

/* Dépose (ou réutilise) un paragraphe visible de synthèse, à un emplacement stable. */
function placeParagraphe(id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = cree('p', `recit-v2-e054-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Écrit dans la région d'annonce V2, jamais dans celle de la passe 1. */
function ditV2(texte) {
  safe(() => {
    const live = document.getElementById('v2-e054-live');
    if (live) live.textContent = texte;
  });
}

/* E054-01 — recense les contrôles focalisables réellement présents. */
function chantier01(layout, legend) {
  if (!legend) return;
  const total = focusables(layout).length;
  placeParagraphe('v2-e054-recensement', 'recit-v2-e054-recensement', legend,
    legend.querySelector('p'), `Contrôles atteignables au clavier dans cette vue : ${total}.`);
}

/* E054-02 — inventaire des jetons aria-keyshortcuts effectivement portés. */
function chantier02(layout, legend) {
  if (!legend) return;
  const jetons = new Set();
  const porteurs = layout.querySelectorAll('[aria-keyshortcuts]');
  for (let i = 0; i < porteurs.length; i += 1) {
    (porteurs[i].getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean)
      .forEach((jeton) => jetons.add(jeton));
  }
  const tokens = Array.from(jetons).sort();
  if (!tokens.length) return;
  placeParagraphe('v2-e054-raccourcis', 'recit-v2-e054-raccourcis', legend,
    document.getElementById('v2-e054-recensement') || legend.querySelector('p'),
    `Raccourcis déclarés dans cette vue (${tokens.length}) : ${tokens.join(' · ')}.`);
}

/* E054-03 — entrée directe vers la recherche et le statut du fil. */
function chantier03(corps, layout) {
  let nav = document.getElementById('v2-e054-evitement');
  if (!nav) {
    nav = cree('div', 'recit-v2-e054-skip');
    nav.id = 'v2-e054-evitement';
    nav.setAttribute('aria-label', "Liens d'évitement V2 du récit");
  }
  if (nav.parentNode !== corps) corps.insertBefore(nav, corps.firstChild);

  const cibles = [
    ['v2-e054-aller-recherche', 'Aller à la recherche', '#c3a-search'],
    ['v2-e054-aller-statut', 'Aller au statut du fil', '#c3a-status'],
  ];
  cibles.forEach(([id, libelle, selecteur]) => {
    const cible = layout.querySelector(selecteur);
    if (!cible) return;
    setOnce(cible, 'tabindex', '-1');
    let lien = document.getElementById(id);
    if (!lien) {
      lien = cree('a', 'recit-v2-e054-evitement', libelle);
      lien.id = id;
      setOnce(lien, 'href', selecteur);
      lien.addEventListener('click', (event) => {
        event.preventDefault();
        focalise(layout.querySelector(selecteur));
      });
      nav.appendChild(lien);
    }
  });
}

/* E054-04 — Alt+S place le focus dans la recherche, sans écraser les jetons. */
function chantier04(layout) {
  const recherche = layout.querySelector('#c3a-search');
  if (recherche) {
    ajouteClasse(recherche, 'recit-v2-e054-search');
    addToken(recherche, 'aria-keyshortcuts', 'Alt+S');
  }
  if (raccourciInstalle || typeof window === 'undefined') return;
  raccourciInstalle = true;
  window.addEventListener('keydown', (event) => {
    safe(() => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (!(event.key === 's' || event.key === 'S' || event.code === 'KeyS')) return;
      if (estChamp(event.target)) return;
      if (!layoutCourant || !layoutCourant.isConnected) return;
      const champ = layoutCourant.querySelector('#c3a-search');
      if (!champ) return;
      event.preventDefault();
      event.stopPropagation();
      focalise(champ);
      ditV2('Recherche activée au clavier.');
    });
  }, true);
}

/* E054-05 — région d'annonce V2 autonome, distincte de #atlas-recit-live. */
function chantier05(corps) {
  let live = document.getElementById('v2-e054-live');
  if (!live) {
    live = cree('p', 'recit-v2-e054-live');
    live.id = 'v2-e054-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
  }
  if (live.parentNode !== corps) corps.appendChild(live);
}

/* E054-06 — annonce le nouveau titre quand le rendu change de point. */
function chantier06(layout) {
  const titre = document.getElementById('recit-point-title') || layout.querySelector('.recit-title');
  if (!titre) return;
  const texte = (titre.textContent || '').trim();
  if (!texte) return;
  if (dernierTitre !== null && dernierTitre !== texte) {
    ditV2(`Point courant : ${tronquer(texte, 90)}.`);
  }
  dernierTitre = texte;
}

/* E054-07 — numérote l'ordre de tabulation réel, révélé au :focus-visible. */
function chantier07(layout) {
  focusables(layout).forEach((noeud, index) => {
    ajouteClasse(noeud, 'recit-v2-e054-ordre');
    setOnce(noeud, 'data-v2-e054-ordre', String(index + 1));
  });
}

/* E054-08 — état clavier/souris affiché, distinct du simple anneau de focus. */
function changeMode(actif) {
  if (modeClavier === actif) return;
  modeClavier = actif;
  const noeud = document.getElementById('v2-e054-mode');
  if (!noeud) return;
  noeud.textContent = actif ? 'Navigation clavier : active.' : 'Navigation clavier : inactive.';
  noeud.setAttribute('data-mode', actif ? 'clavier' : 'souris');
}

function installeMode() {
  if (modeInstalle || typeof window === 'undefined') return;
  modeInstalle = true;
  window.addEventListener('keydown', (event) => {
    safe(() => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      changeMode(true);
    });
  }, true);
  const sortieSouris = () => safe(() => changeMode(false));
  window.addEventListener('pointerdown', sortieSouris, true);
  window.addEventListener('mousedown', sortieSouris, true);
}

function chantier08(legend, layout) {
  installeMode();
  if (!legend) return;
  const noeud = placeParagraphe('v2-e054-mode', 'recit-v2-e054-mode', legend,
    layout.querySelector('p'), modeClavier
      ? 'Navigation clavier : active.'
      : 'Navigation clavier : inactive.');
  if (noeud) noeud.setAttribute('data-mode', modeClavier ? 'clavier' : 'souris');
}

/* E054-09 — distance de tabulation entre le début de la vue et le point courant. */
function chantier09(layout, legend) {
  if (!legend) return;
  const courant = layout.querySelector('#c3a-thread .recit-thread-item.is-current');
  if (!courant) return;
  const position = focusables(layout).indexOf(courant);
  if (position < 0) return;
  placeParagraphe('v2-e054-distance', 'recit-v2-e054-distance', legend,
    document.getElementById('v2-e054-raccourcis') || document.getElementById('v2-e054-recensement') || legend.querySelector('p'),
    `Tabulations avant le point courant : ${position}.`);
}

/* E054-10 — annonce la commande activée au clavier (clic synthétique detail=0). */
function chantier10() {
  if (actionInstalle || typeof document === 'undefined') return;
  actionInstalle = true;
  document.addEventListener('click', (event) => {
    safe(() => {
      if (event.detail !== 0) return;
      if (!layoutCourant || !layoutCourant.isConnected) return;
      const cible = event.target;
      const bouton = cible && typeof cible.closest === 'function'
        ? cible.closest('.recit-actions button') : null;
      if (!bouton || bouton.closest('.recit-layout') !== layoutCourant) return;
      const libelle = tronquer(bouton.getAttribute('aria-label') || bouton.textContent, 60);
      if (!libelle) return;
      ditV2(`Commande activée au clavier : ${libelle}.`);
    });
  }, true);
}

register('E054', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    fabrique = typeof el === 'function' ? el : null;
    css('recit-v2-e054', CSS); /* un seul appel, toutes les règles du module. */
    layoutCourant = layout;

    const motion = reducedMotion && typeof reducedMotion === 'function' && reducedMotion();
    layout.setAttribute('data-v2-e054-motion', motion ? 'reduce' : 'normal');

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    const legend = layout.querySelector('.recit-legend');

    safe(() => chantier01(layout, legend));
    safe(() => chantier02(layout, legend));
    safe(() => chantier03(corps, layout));
    safe(() => chantier04(layout));
    safe(() => chantier05(corps));
    safe(() => chantier06(layout));
    safe(() => chantier07(layout));
    safe(() => chantier08(legend, layout));
    safe(() => chantier09(layout, legend));
    safe(() => chantier10());
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
