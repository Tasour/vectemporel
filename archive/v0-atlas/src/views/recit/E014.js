import { register } from './registry.js';

/*
 * Lentille E014 — « Navigation clavier » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E014-01 … E014-10) sont réunis dans CE
 * seul module. Aucun fichier partagé n'est modifié. La coque reconstruisant le
 * DOM à chaque rendu (shell.js:533), apply() recrée ses nœuds à chaque appel ;
 * les écouteurs, eux, sont posés une seule fois et lisent toujours le dernier
 * contexte mémorisé. Un seul register, une seule feuille CSS, zéro console,
 * zéro réseau, zéro aléa, zéro innerHTML. Enrichissement non destructif : sans
 * JS, le récit reste lisible et le fil reste parcourable.
 */

const SAUT_FIL = 10;
const DUREE_ECHO = 1100;

const VUES_CHIFFRES = {
  '1': 'Monde', '2': 'Chronologie', '3': 'Récit',
  '4': 'Géographie', '5': 'Constellation', '6': 'Points',
};
const VUES_LETTRES = {
  m: 'Monde', c: 'Chronologie', r: 'Récit',
  g: 'Géographie', s: 'Constellation', p: 'Points',
};

/* État de module : survit aux reconstructions du DOM, jamais écrit ailleurs. */
let contexte = null;        // dernier contexte enrichi
let ecouteursPoses = false; // garde d'installation des trois écouteurs
let minuteurEcho = 0;       // au plus un timer d'effacement de l'écho
let dernierEcho = '';       // écho courant, restitué après reconstruction
let derniereAnnonce = '';   // déduplication de la région d'annonce
let focusRenforce = false;  // E014-10 : bascule persistante
let ancrageAttendu = false; // E014-07 : une flèche vient de changer de point
let frameAncrage = 0;       // au plus une frame de replacement du focus

/* Feuille unique, cadrée par [data-e014="on"] posé sur .recit-layout. Toutes
   les classes créées sont préfixées recit-e014-, tous les ids e014-. */
const REGLES = `
.recit-layout[data-e014="on"] .recit-body{position:relative}

/* E014-01 — liens d'évitement : hors flux, visibles dès qu'ils prennent le focus. */
.recit-e014-skipbar{position:absolute;left:8px;top:-240px;z-index:9;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100% - 16px);padding:6px;border:1px solid var(--gold);border-radius:8px;background:rgba(12,16,24,.97)}
.recit-e014-skipbar:focus-within{top:6px}
.recit-e014-skip{min-height:36px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:6px;background:#0c1018;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e014-skip:focus-visible,.recit-e014-focus-toggle:focus-visible,.recit-e014-aide summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E014-02 / E014-08 — position du focus dans le fil, lisible sans couleur seule. */
.recit-e014-fil-pos{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e014-fil-pos[data-e014-actif="1"]{color:var(--gold-bright)}

/* E014-03 — écho visuel de la touche, sans concurrencer les régives live. */
.recit-e014-echo{position:absolute;right:10px;bottom:10px;z-index:8;max-width:70%;margin:0;padding:5px 9px;border:1px solid var(--gold);border-radius:999px;background:rgba(12,16,24,.97);color:var(--gold-bright);font-size:9px;line-height:1.3;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity 160ms ease,transform 160ms ease}
.recit-e014-echo.recit-e014-echo-actif{opacity:1;transform:none}

/* E014-04 — aide clavier locale, contrôle natif <details>/<summary>. */
.recit-e014-aide{margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e014-aide summary{min-height:36px;display:flex;align-items:center;padding:6px 10px;color:var(--gold-bright);font-size:10px;cursor:pointer}
.recit-e014-aide-liste{margin:0 0 8px;padding:0 10px 4px 28px;color:var(--muted);font-size:9px;line-height:1.7}
.recit-e014-aide-liste li{margin:2px 0}
.recit-e014-kbd{display:inline-block;min-width:18px;padding:1px 5px;border:1px solid var(--line-strong);border-radius:4px;color:var(--gold-bright);font:inherit;font-size:9px;text-align:center}
.recit-e014-cmd .recit-e014-kbd{margin-left:5px}
.recit-layout[data-e014="on"] .recit-e014-cmd{white-space:nowrap}

/* E014-05 — fil d'Ariane du focus, texte permanent non live. */
.recit-e014-zone{margin:0 0 9px;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}

/* E014-09 — annonce dédiée, invisible mais indexable par les lecteurs d'écran. */
.recit-e014-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E014-10 — bascule de focus renforcé et cible de focus élargie. */
.recit-e014-focus-toggle{min-height:36px;padding:5px 10px;border:1px solid var(--line-strong);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e014-focus-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12)}
.recit-e014-focus-etat{align-self:center;color:var(--muted-2);font-size:9px}
.recit-layout[data-e014="on"].recit-e014-focus-fort .recit-e014-focusable:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px;box-shadow:0 0 0 6px rgba(230,185,111,.18)}

/* Mouvement réduit : aucune transition, y compris pour l'écho clavier. */
.recit-layout[data-e014="on"].recit-e014-calme .recit-e014-echo{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e014-echo{transition:none}
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires silencieux : aucun greffon ne doit faire tomber le rendu.
 * ------------------------------------------------------------------------- */
function sansEchec(fonction) {
  return (...parametres) => {
    try { return fonction(...parametres); }
    catch { return undefined; } // défaillance neutralisée, sans trace console
  };
}

function vueActive() {
  return Boolean(contexte && contexte.layout && contexte.layout.isConnected
    && document.getElementById('e014-skipbar'));
}

function editable(cible) {
  return cible instanceof HTMLElement
    && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName));
}

function dansLeFil(cible) {
  return cible instanceof Element && Boolean(cible.closest('#c3a-thread'));
}

function calme() {
  return Boolean(contexte && typeof contexte.reducedMotion === 'function' && contexte.reducedMotion());
}

function focusSur(noeud, silence) {
  if (!noeud) return;
  try { noeud.focus({ preventScroll: silence }); }
  catch { try { noeud.focus(); } catch { /* cible non focusable */ } }
}

function annoncer(texte) {
  if (!texte || texte === derniereAnnonce) return;
  const noeud = document.getElementById('e014-annonce');
  if (!noeud) return;
  derniereAnnonce = texte;
  noeud.textContent = texte;
}

/* E014-03 — un seul timer réarmable, jamais empilé. */
function echoClavier(texte) {
  dernierEcho = texte || '';
  const noeud = document.getElementById('e014-echo');
  if (noeud) {
    noeud.textContent = texte ? `Dernière touche : ${texte}` : '';
    noeud.classList.toggle('recit-e014-echo-actif', Boolean(texte));
  }
  if (minuteurEcho) { window.clearTimeout(minuteurEcho); minuteurEcho = 0; }
  if (!texte) return;
  minuteurEcho = window.setTimeout(sansEchec(() => {
    minuteurEcho = 0;
    dernierEcho = '';
    const courant = document.getElementById('e014-echo');
    if (courant) {
      courant.textContent = '';
      courant.classList.remove('recit-e014-echo-actif');
    }
  }), DUREE_ECHO);
}

function zoneDe(cible) {
  if (cible.closest('.recit-e014-skip')) return "liens d'évitement";
  if (cible.closest('#recit-point-title')) return 'titre du point';
  if (cible.closest('#c3a-search')) return 'recherche du fil';
  if (cible.closest('.c3a-group')) return 'filtres du fil';
  if (cible.closest('#c3a-thread') || cible.closest('.recit-thread-item')) return 'fil du repère';
  if (cible.closest('.recit-e014-aide')) return 'aide clavier locale';
  if (cible.closest('#e014-focus-toggle')) return 'bascule de focus renforcé';
  if (cible.closest('.recit-actions')) return 'commandes du récit';
  if (cible.closest('.recit-trace, .recit-sources')) return 'traçabilité';
  if (cible.closest('.recit-legend')) return 'légende';
  return null;
}

function libelleTouche(evenement, dansFil) {
  const touche = evenement.key;
  if (dansFil && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(touche)) {
    if (touche === 'ArrowDown') return '↓ point suivant du fil';
    if (touche === 'ArrowUp') return '↑ point précédent du fil';
    if (touche === 'Home') return 'Début : premier point du fil';
    return 'Fin : dernier point du fil';
  }
  if (touche === 'ArrowLeft') return '← point précédent';
  if (touche === 'ArrowRight') return '→ point suivant';
  if (touche === 'ArrowUp') return '↑ point précédent';
  if (touche === 'ArrowDown') return '↓ point suivant';
  if (touche === 'Home') return 'Début du fil';
  if (touche === 'End') return 'Fin du fil';
  if (touche === 'PageDown') return `Page suivante : saut de ${SAUT_FIL} points`;
  if (touche === 'PageUp') return `Page précédente : retour de ${SAUT_FIL} points`;
  if (touche === 'Enter') {
    return evenement.target && evenement.target.closest && evenement.target.closest('button, summary, a[href]')
      ? '↵ activation' : '↵ détail du repère';
  }
  if (touche === ' ') {
    return evenement.target && evenement.target.closest && evenement.target.closest('button, summary, a[href]')
      ? 'Espace activation' : 'Espace lecture du récit';
  }
  if (touche === '?') return '? aide clavier';
  if (touche === 'Escape') return 'Échap fermeture ou retour';
  if (VUES_CHIFFRES[touche]) return `${touche} : vue ${VUES_CHIFFRES[touche]}`;
  const lettre = String(touche || '').toLowerCase();
  if (VUES_LETTRES[lettre]) return `${touche} : vue ${VUES_LETTRES[lettre]}`;
  return '';
}

/* ------------------------------------------------------------------------- *
 * E014-01 — liens d'évitement vers les quatre zones du récit.
 * ------------------------------------------------------------------------- */
function ajouterEvitement(el, corps) {
  const barre = el('div', 'recit-e014-skipbar');
  barre.id = 'e014-skipbar';
  barre.setAttribute('role', 'group');
  barre.setAttribute('aria-label', "Liens d'évitement du récit");
  const cibles = [
    ['e014-skip-titre', 'Titre du point', '#recit-point-title'],
    ['e014-skip-fil', 'Fil du repère', '#c3a-thread'],
    ['e014-skip-commandes', 'Commandes', '.recit-actions'],
    ['e014-skip-trace', 'Traçabilité', ''],
  ];
  cibles.forEach(([id, libelle, selecteur]) => {
    const bouton = el('button', 'recit-e014-skip', libelle);
    bouton.id = id;
    bouton.type = 'button';
    bouton.dataset.fk = id;
    bouton.addEventListener('click', sansEchec(() => {
      let cible = selecteur ? document.querySelector(selecteur) : null;
      if (!selecteur) {
        cible = document.querySelector('.recit-trace summary') || document.querySelector('.recit-sources');
      }
      if (!cible) return;
      if (cible instanceof HTMLElement && !cible.hasAttribute('tabindex')) cible.tabIndex = -1;
      focusSur(cible, false); // le lien d'évitement doit aussi amener la cible à l'écran
      const zone = document.getElementById('e014-zone');
      if (zone) zone.textContent = `Zone active : ${libelle.toLowerCase()}.`;
      annoncer(`Focus déplacé vers : ${libelle.toLowerCase()}.`);
      echoClavier(`lien « ${libelle} »`);
    }));
    barre.appendChild(bouton);
  });
  corps.insertBefore(barre, corps.firstChild);
}

/* E014-09 — région d'annonce distincte de #atlas-recit-live et nav-t2-live. */
function ajouterAnnonce(el, corps) {
  const noeud = el('p', 'recit-e014-sr');
  noeud.id = 'e014-annonce';
  noeud.setAttribute('role', 'status');
  noeud.setAttribute('aria-live', 'polite');
  noeud.setAttribute('aria-atomic', 'true');
  corps.appendChild(noeud);
}

/* E014-05 — fil d'Ariane du focus, texte visible non live. */
function ajouterZone(el, corps) {
  const zone = el('p', 'recit-e014-zone', 'Zone active : titre du point.');
  zone.id = 'e014-zone';
  const progression = corps.querySelector('.recit-progress');
  if (progression && progression.parentNode === corps) corps.insertBefore(zone, progression.nextSibling);
  else corps.insertBefore(zone, corps.firstChild);
}

/* E014-03 — témoin visuel de la dernière touche. */
function ajouterEcho(el, corps) {
  const noeud = el('p', 'recit-e014-echo', dernierEcho ? `Dernière touche : ${dernierEcho}` : '');
  noeud.id = 'e014-echo';
  noeud.setAttribute('aria-hidden', 'true');
  if (dernierEcho) noeud.classList.add('recit-e014-echo-actif');
  corps.appendChild(noeud);
}

/* E014-02 / E014-08 — ligne de position du fil et de ses sauts rapides. */
function ajouterFilPos(el, layout) {
  const fil = layout.querySelector('.recit-thread');
  if (!fil) return;
  const liste = fil.querySelector('#c3a-thread');
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  const courant = items.findIndex((noeud) =>
    noeud.getAttribute('aria-current') === 'step' || noeud.classList.contains('is-current'));
  const position = courant < 0 ? 1 : courant + 1;
  const ligne = el('p', 'recit-e014-fil-pos',
    `Fil : point ${position} sur ${items.length} · un seul point accessible par Tab, `
      + `↑ ↓ parcourent le fil, Page suivante saute ${SAUT_FIL} points.`);
  ligne.id = 'e014-fil-pos';
  ligne.setAttribute('data-e014-actif', '0');
  if (liste && liste.parentNode === fil) fil.insertBefore(ligne, liste);
  else fil.appendChild(ligne);
}

/* E014-04 — aide clavier locale, sémantique et pliable au clavier. */
function ajouterAide(el, corps) {
  const outils = corps.querySelector('#c3a-tools') || corps.querySelector('.c3a-tools');
  const parent = outils || corps;
  const details = el('details', 'recit-e014-aide');
  details.id = 'e014-aide';
  details.appendChild(el('summary', '', '⌨ Raccourcis du récit · aide clavier locale'));
  const liste = el('ul', 'recit-e014-aide-liste');
  const entrees = [
    ['← →', 'point précédent / suivant'],
    ['↑ ↓', 'parcourir les points du fil'],
    ['Début Fin', 'premier / dernier point du fil'],
    ['Page préc. suiv.', `saut de ${SAUT_FIL} points dans le fil`],
    ['Entrée', 'ouvrir le détail du repère'],
    ['Espace', 'lancer / arrêter la lecture'],
    ['1–6 · M C R G S P', 'changer de vue'],
    ['?', 'ouvrir l’aide générale'],
    ['Échap', 'fermer une fenêtre ou revenir au monde'],
    ['Tab', 'atteindre les liens d’évitement puis les commandes'],
  ];
  entrees.forEach(([touche, description]) => {
    const ligne = el('li');
    ligne.append(el('kbd', 'recit-e014-kbd', touche), document.createTextNode(` : ${description}`));
    liste.appendChild(ligne);
  });
  details.appendChild(liste);
  parent.appendChild(details);
}

/* E014-10 — bascule indépendante (aria-pressed), état conservé entre rendus. */
function ajouterBasculeFocus(el, corps) {
  const outils = corps.querySelector('#c3a-tools') || corps.querySelector('.c3a-tools');
  const parent = outils || corps;
  const bouton = el('button', 'recit-e014-focus-toggle', 'Focus renforcé');
  bouton.id = 'e014-focus-toggle';
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(focusRenforce));
  bouton.addEventListener('click', sansEchec(() => {
    focusRenforce = !focusRenforce;
    const courant = document.getElementById('e014-focus-toggle');
    if (courant) courant.setAttribute('aria-pressed', String(focusRenforce));
    const etatCourant = document.getElementById('e014-focus-etat');
    if (etatCourant) etatCourant.textContent = focusRenforce ? 'actif' : 'inactif';
    if (contexte && contexte.layout) contexte.layout.classList.toggle('recit-e014-focus-fort', focusRenforce);
    annoncer(focusRenforce ? 'Focus renforcé activé.' : 'Focus renforcé désactivé.');
    echoClavier(`bascule « focus renforcé » ${focusRenforce ? 'activée' : 'désactivée'}`);
  }));
  const etat = el('span', 'recit-e014-focus-etat', focusRenforce ? 'actif' : 'inactif');
  etat.id = 'e014-focus-etat';
  parent.appendChild(bouton);
  parent.appendChild(etat);
}

/* E014-06 — visible sur les commandes, aria-keyshortcuts complété si absent. */
function annoterCommandes(el, layout) {
  const paires = [
    ['c3a-prev', '←', 'ArrowLeft'],
    ['c3a-next', '→', 'ArrowRight'],
    ['c3a-play', 'Espace', 'Space'],
    ['c3a-chrono', '4', 'Digit4'],
  ];
  paires.forEach(([cle, touche, raccourci]) => {
    const bouton = layout.querySelector(`[data-fk="${cle}"]`);
    if (!bouton) return;
    bouton.classList.add('recit-e014-cmd');
    if (!bouton.getAttribute('aria-keyshortcuts')) bouton.setAttribute('aria-keyshortcuts', raccourci);
    if (!bouton.querySelector('.recit-e014-kbd')) {
      const badge = el('kbd', 'recit-e014-kbd', touche);
      badge.setAttribute('aria-hidden', 'true');
      bouton.appendChild(badge);
    }
  });
}

/* E014-02 — un seul point du fil accessible par Tab après chaque rendu. */
function initialiserFil(layout) {
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  if (!items.length) return;
  const courant = items.find((noeud) =>
    noeud.getAttribute('aria-current') === 'step' || noeud.classList.contains('is-current'));
  const tabulable = items.find((noeud) => noeud.tabIndex === 0) || courant || items[0];
  items.forEach((noeud) => { noeud.tabIndex = noeud === tabulable ? 0 : -1; });
  const ligne = document.getElementById('e014-fil-pos');
  if (ligne && !ligne.textContent.includes('saut de')) {
    const position = courant ? items.indexOf(courant) + 1 : 1;
    ligne.textContent = `Fil : point ${position} sur ${items.length} · un seul point accessible par Tab, ↑ ↓ parcourent le fil.`;
  }
}

/* E014-10 — seules les cibles réellement focusables reçoivent la classe. */
function marquerFocusables(layout) {
  const noeuds = layout.querySelectorAll('button:not([disabled]), summary, input, a[href], [tabindex="0"]');
  noeuds.forEach((noeud) => { noeud.classList.add('recit-e014-focusable'); });
}

/* ------------------------------------------------------------------------- *
 * Écouteurs uniques. Le clavier est installé sur window en CAPTURE : il voit
 * la touche avant le routeur global (keyboard.js, document en capture), ce qui
 * permet de poser l'intention E014-07 avant la reconstruction du DOM.
 * ------------------------------------------------------------------------- */
const surFocus = sansEchec((evenement) => {
  const cible = evenement.target;
  if (!(cible instanceof Element) || !vueActive()) return;
  const zone = zoneDe(cible);
  const zoneNoeud = document.getElementById('e014-zone');
  if (zoneNoeud && zone) zoneNoeud.textContent = `Zone active : ${zone}.`;

  if (cible.classList && cible.classList.contains('recit-thread-item')) {
    const liste = cible.parentElement && cible.parentElement.parentElement;
    const items = liste ? Array.from(liste.querySelectorAll('.recit-thread-item')) : [cible];
    items.forEach((noeud) => { noeud.tabIndex = noeud === cible ? 0 : -1; });
    cible.setAttribute('data-e014-roving', '1');
    const position = items.indexOf(cible) + 1;
    const ligne = document.getElementById('e014-fil-pos');
    if (ligne) {
      ligne.textContent = `Fil : point ${position} sur ${items.length} · focus sur ce point.`;
      ligne.setAttribute('data-e014-actif', '1');
    }
    annoncer(`Fil du repère : point ${position} sur ${items.length}.`);
  } else {
    const ligne = document.getElementById('e014-fil-pos');
    if (ligne) ligne.setAttribute('data-e014-actif', '0');
  }
});

const surTouche = sansEchec((evenement) => {
  if (evenement.defaultPrevented || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
  if (!vueActive()) return;
  const cible = evenement.target;
  if (!(cible instanceof Element) || editable(cible)) return;
  const dansFil = dansLeFil(cible);

  /* E014-08 — sauts de dix points dans le fil, sans toucher aux flèches déjà
     gérées par recit.js et sans concurrencer le routeur global. */
  if (evenement.key === 'PageDown' || evenement.key === 'PageUp') {
    if (!dansFil) return;
    const liste = cible.closest('#c3a-thread');
    const items = liste
      ? Array.from(liste.querySelectorAll('.recit-thread-item:not([disabled])')) : [];
    if (!items.length) return;
    let position = items.indexOf(document.activeElement);
    if (position < 0) position = items.findIndex((noeud) => noeud.tabIndex === 0);
    if (position < 0) position = 0;
    const suit = evenement.key === 'PageDown' ? SAUT_FIL : -SAUT_FIL;
    const cibleSuivante = items[Math.max(0, Math.min(items.length - 1, position + suit))];
    if (!cibleSuivante || cibleSuivante === document.activeElement) return;
    evenement.preventDefault();
    items.forEach((noeud) => { noeud.tabIndex = noeud === cibleSuivante ? 0 : -1; });
    focusSur(cibleSuivante, calme());
    const index = items.indexOf(cibleSuivante) + 1;
    const ligne = document.getElementById('e014-fil-pos');
    if (ligne) {
      ligne.textContent = `Fil : saut de ${SAUT_FIL} points · point ${index} sur ${items.length}.`;
      ligne.setAttribute('data-e014-actif', '1');
    }
    annoncer(`Fil : point ${index} sur ${items.length} après un saut de ${SAUT_FIL} points.`);
    echoClavier(evenement.key === 'PageDown'
      ? `↓ saut de ${SAUT_FIL} points` : `↑ retour de ${SAUT_FIL} points`);
    return;
  }

  /* E014-07 — les flèches hors du fil vont provoquer un rendu : on mémorise
     l'intention avant que le routeur ne reconstruise le DOM. */
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evenement.key) && !dansFil) {
    ancrageAttendu = true;
  }
});

const surRelache = sansEchec((evenement) => {
  if (!vueActive() || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
  const cible = evenement.target;
  if (!(cible instanceof Element) || editable(cible)) return;
  const libelle = libelleTouche(evenement, dansLeFil(cible));
  if (libelle) echoClavier(libelle);
});

function installer() {
  if (ecouteursPoses || typeof window === 'undefined' || typeof document === 'undefined') return;
  ecouteursPoses = true;
  document.addEventListener('focusin', surFocus, true);
  window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, surTouche);
  document.addEventListener('keyup', surRelache, true);
}

/* ------------------------------------------------------------------------- *
 * E014-07 — après le rendu, si le focus n'a nulle part où aller, on le place
 * sur le titre du point courant. Jamais pendant la lecture automatique :
 * aucun keydown, donc aucune intention d'ancrage.
 * ------------------------------------------------------------------------- */
function ancrerApresRendu() {
  if (!ancrageAttendu) return;
  ancrageAttendu = false;
  if (frameAncrage) return;
  const repositionner = sansEchec(() => {
    frameAncrage = 0;
    if (!vueActive()) return;
    const actif = document.activeElement;
    if (actif && actif !== document.body && actif.isConnected) return;
    if (document.querySelector('.help-overlay, .detail-overlay')) return;
    const titre = document.getElementById('recit-point-title');
    if (!titre) return;
    focusSur(titre, true);
    annoncer('Focus replacé sur le titre du point courant.');
  });
  if (typeof requestAnimationFrame === 'function') frameAncrage = requestAnimationFrame(repositionner);
  else repositionner();
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E014', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el } = ctx;
  css('recit-e014', REGLES);
  const corps = layout.querySelector('.recit-body');
  if (!corps) return;

  contexte = { stage, layout, corps, el, reducedMotion: ctx.reducedMotion };
  derniereAnnonce = ''; // la région d'annonce vient d'être recréée, vide
  layout.dataset.e014 = 'on';
  layout.classList.toggle('recit-e014-focus-fort', focusRenforce);
  layout.classList.toggle('recit-e014-calme', calme());

  ajouterEvitement(el, corps);   // E014-01
  ajouterAnnonce(el, corps);     // E014-09
  ajouterZone(el, corps);        // E014-05
  ajouterEcho(el, corps);        // E014-03
  ajouterFilPos(el, corps);      // E014-02 / E014-08
  ajouterAide(el, corps);        // E014-04
  ajouterBasculeFocus(el, corps);// E014-10
  annoterCommandes(el, layout);  // E014-06
  initialiserFil(layout);        // E014-02
  marquerFocusables(layout);     // E014-10

  installer();
  ancrerApresRendu();            // E014-07
});
