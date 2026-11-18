import { register } from './registry.js';

/* Lentille E084 — vue Récit : navigation clavier.
 *
 * Fichier possédé : src/views/recit/E084.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E084.md (E084-01 à E084-10).
 *
 * Dix chantiers complémentaires, tous non destructifs : sans ce module la vue
 * reste intégralement lisible et navigable. Aucune donnée n'est importée : les
 * libellés affichés sont dérivés du DOM rendu. Zéro réseau, zéro console, zéro
 * générateur aléatoire, zéro minuteur, zéro boucle rAF, zéro canvas.
 *
 * Coexistence avec le routeur clavier existant (platform/keyboard.js, capture
 * sur document) et le garde-fou de recit.js (capture sur window) :
 *   - les touches ← → Entrée Espace ? Échap et les lettres de vue restent au
 *     routeur : aucun écouteur E084 ne les intercepte ;
 *   - ↑ ↓ Début Fin dans le fil restent au garde-fou de recit.js ;
 *   - E084 n'ajoute que PageUp/PageDown (libres) et Début/Fin hors du fil
 *     (libres hors #c3a-thread), en phase boucle et avec preventDefault local.
 * Aucun stopPropagation, aucun écouteur global, aucun tabindex retiré aux
 * contrôles d'origine. */

const STYLE_ID = 'recit-e084';
const IDS = [
  'e084-skip-link',
  'e084-help',
  'e084-return-link',
  'e084-focus-live',
];

/* Une seule feuille, portée par .recit-layout.recit-e084-scope. Aucune règle
   ne modifie la grille, les dimensions ou les couleurs définies ailleurs. */
const CSS = `
.recit-layout.recit-e084-scope{position:relative}

/* E084-01 — lien d'évitement, masqué hors focus. */
.recit-layout.recit-e084-scope .recit-e084-skip{position:absolute;left:-9999px;top:6px;z-index:60;padding:8px 12px;border:2px solid var(--gold-bright);border-radius:8px;background:var(--bg-panel,rgba(12,12,16,.96));color:var(--gold-bright);font-size:12px;text-decoration:none}
.recit-layout.recit-e084-scope .recit-e084-skip:focus{left:8px;top:8px}
.recit-layout.recit-e084-scope .recit-e084-skip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E084-02 — anneau du titre ciblé par programme (focus(), pas seulement Tab). */
.recit-layout.recit-e084-scope .recit-title[tabindex]:focus{outline:2px solid var(--gold-bright);outline-offset:4px;border-radius:5px}

/* E084-03 / E084-04 — retour d'activation discret sur les commandes. */
.recit-layout.recit-e084-scope .recit-actions button.recit-e084-visite{box-shadow:inset 0 0 0 1px rgba(230,185,111,.55)}

/* E084-04 / E084-06 — pastilles de touche, décoratives et silencieuses. */
.recit-layout.recit-e084-scope .recit-e084-kbd{margin-left:6px;padding:1px 5px;border:1px solid var(--line-strong);border-radius:4px;color:var(--gold-bright);font-size:9px;line-height:1;white-space:nowrap;vertical-align:middle}

/* E084-05 — note d'annonce du point focalisé dans le fil. */
.recit-layout.recit-e084-scope .recit-e084-live{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E084-07 — renfort de l'anneau de focus sur tous les contrôles. */
.recit-layout.recit-e084-scope :is(button,a,summary,input,[tabindex]):focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px;box-shadow:0 0 0 1px rgba(0,0,0,.55)}
.recit-layout.recit-e084-scope .recit-thread-item:focus-visible{outline-offset:3px}

/* E084-09 — panneau local de raccourcis, repliable. */
.recit-layout.recit-e084-scope .recit-e084-help{margin-top:8px;padding:6px 0;color:var(--muted-2);font-size:9px}
.recit-layout.recit-e084-scope .recit-e084-help summary{min-height:30px;padding:4px 0;cursor:pointer;color:var(--gold-bright);font-size:9px}
.recit-layout.recit-e084-scope .recit-e084-help ul{margin:6px 0 0;padding-left:16px;line-height:1.7}
.recit-layout.recit-e084-scope .recit-e084-help li{margin:1px 0}

/* E084-10 — retour au fil. */
.recit-layout.recit-e084-scope button.recit-e084-return{margin-top:8px;min-height:36px;padding:4px 10px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(230,185,111,.06);color:var(--gold-bright);font-size:10px;cursor:pointer}
.recit-layout.recit-e084-scope button.recit-e084-return:hover{background:rgba(230,185,111,.14)}

/* Contrainte de couleur élevée : l'anneau reste perceptible sans couleur. */
@media (forced-colors:active){
  .recit-layout.recit-e084-scope :is(button,a,summary,input,[tabindex]):focus-visible,
  .recit-layout.recit-e084-scope .recit-title[tabindex]:focus{outline:3px solid Highlight;box-shadow:none}
  .recit-layout.recit-e084-scope .recit-e084-kbd{border-color:CanvasText;color:CanvasText}
}
@media (max-width:620px){
  .recit-layout.recit-e084-scope button.recit-e084-return{min-height:40px}
}
`;

/* Mémoire de focus entre deux reconstructions du DOM par la coque. */
const stagesCables = new WeakSet();
const fkParStage = new WeakMap();
let euFocus = false;
let apiEl = null;

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
    if (typeof apiEl === 'function') {
      const noeudEl = apiEl(balise, classe, texte);
      if (noeudEl) return noeudEl;
    }
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

/* Un seul nœud par identifiant maison : un doublon laissé par une
   reconstruction interrompue est retiré, jamais un nœud étranger. */
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
  try { tâche(); } catch { /* un chantier défaillant n'en bloque aucun autre */ }
}

function metFocus(noeud) {
  if (!noeud) return;
  try { noeud.focus({ preventScroll: true }); return; } catch { /* repli */ }
  try { noeud.focus(); } catch { /* garde */ }
}

function titreDe(layout) {
  return parId('recit-point-title') || q(layout, '.recit-title') || q(layout, 'h1');
}

function actionsDe(layout) {
  return q(layout, '.recit-actions');
}

function boutonsActifs(actions) {
  return qa(actions, 'button').filter((b) => !b.disabled && b.getAttribute('aria-hidden') !== 'true');
}

function filDe(layout) {
  return parId('c3a-thread') || q(layout, '.recit-thread-list');
}

function itemsDuFil(liste) {
  return qa(liste, '.recit-thread-item').filter((b) => !b.disabled);
}

function mêmeNoeud(noeud, parent) {
  return Boolean(noeud && parent && typeof parent.contains === 'function' && parent.contains(noeud));
}

function lie(noeud, cle, type, gestionnaire) {
  if (!noeud || !noeud.dataset) return;
  try {
    if (noeud.dataset[cle] === '1') return;
    noeud.dataset[cle] = '1';
    noeud.addEventListener(type, gestionnaire);
  } catch { /* garde */ }
}

function annonceFocus(note, item, liste) {
  if (!note || !item) return;
  try {
    const items = itemsDuFil(liste);
    const position = items.indexOf(item) + 1;
    const total = items.length;
    const type = item.dataset && item.dataset.kind ? item.dataset.kind : 'point';
    const certitude = item.dataset && item.dataset.confidence ? item.dataset.confidence : '';
    const morceaux = [`Point ${position} sur ${total}, type ${type}`];
    if (certitude) morceaux.push(`certitude : ${certitude}`);
    morceaux.push('Atteint au clavier.');
    note.textContent = `${morceaux.join(' · ')}.`;
  } catch { /* garde */ }
}

register('E084', (contexte) => {
  const ctx = contexte || {};
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined') return;
  if (!layout || typeof layout.querySelector !== 'function') return;

  apiEl = typeof el === 'function' ? el : null;

  try { if (typeof css === 'function') css(STYLE_ID, CSS); } catch { /* repli silencieux */ }
  let réduit = false;
  try { réduit = typeof reducedMotion === 'function' && Boolean(reducedMotion()); }
  catch { réduit = false; }
  try { layout.dataset.e084Motion = réduit ? 'reduced' : 'full'; } catch { /* garde */ }

  /* Portée unique. */
  ajouteClasse(layout, 'recit-e084-scope');

  /* ---------- E084-01 — lien d'évitement « Aller au point » ---------- */
  protège('E084-01', () => {
    const titre = titreDe(layout);
    if (!titre) return;
    let lien = dépose(layout, 'e084-skip-link', 'a', 'recit-e084-skip', 'Aller au point courant');
    if (!lien) return;
    /* Premier enfant : le lien doit précéder tout le contenu dans l'ordre Tab. */
    try {
      if (lien.parentNode === layout && layout.firstChild !== lien) layout.insertBefore(lien, layout.firstChild);
    } catch { /* garde */ }
    try {
      lien.href = `#${titre.id || 'recit-point-title'}`;
      lien.setAttribute('aria-label', 'Aller directement au point courant');
    } catch { /* garde */ }
    lie(lien, 'e084Bound', 'click', (événement) => {
      try { événement.preventDefault(); } catch { /* garde */ }
      metFocus(titreDe(layout) || titre);
    });
  });

  /* ---------- E084-02 — titre cible de focus, anneau visible ---------- */
  protège('E084-02', () => {
    const titre = titreDe(layout);
    if (!titre) return;
    /* On ne touche pas au nom accessible : le texte du point fait foi. */
    try { if (!titre.hasAttribute('tabindex')) titre.tabIndex = -1; } catch { /* garde */ }
    ajouteClasse(titre, 'recit-e084-cible');
  });

  /* ---------- E084-03 — Début/Fin : extrémités de la barre d'actions ---------- */
  protège('E084-03', () => {
    const actions = actionsDe(layout);
    if (!actions) return;
    lie(actions, 'e084Ends', 'keydown', (événement) => {
      if (événement.key !== 'Home' && événement.key !== 'End') return;
      if (événement.ctrlKey || evtAlt(événement)) return;
      const cible = événement.target;
      if (!cible || typeof cible.closest !== 'function' || !cible.closest('button')) return;
      const boutons = boutonsActifs(actions);
      if (!boutons.length) return;
      try { événement.preventDefault(); } catch { /* garde */ }
      const bouton = événement.key === 'Home' ? boutons[0] : boutons[boutons.length - 1];
      visite(boutons, bouton);
      metFocus(bouton);
    });
  });

  /* ---------- E084-04 — PageUp/PageDown : parcours des commandes ---------- */
  protège('E084-04', () => {
    const actions = actionsDe(layout);
    if (!actions) return;
    lie(actions, 'e084Pages', 'keydown', (événement) => {
      if (événement.key !== 'PageUp' && événement.key !== 'PageDown') return;
      if (événement.ctrlKey || evtAlt(événement)) return;
      const cible = événement.target;
      if (!cible || typeof cible.closest !== 'function' || !cible.closest('button')) return;
      const boutons = boutonsActifs(actions);
      if (!boutons.length) return;
      try { événement.preventDefault(); } catch { /* garde */ }
      const pos = boutons.indexOf(cible.closest('button'));
      const nouveau = événement.key === 'PageDown'
        ? boutons[Math.min(pos < 0 ? 0 : pos + 1, boutons.length - 1)]
        : boutons[Math.max(pos < 0 ? boutons.length - 1 : pos - 1, 0)];
      visite(boutons, nouveau);
      metFocus(nouveau);
    });
  });

  /* ---------- E084-05 — PageUp/PageDown : extrémités du fil + annonce ---------- */
  protège('E084-05', () => {
    const liste = filDe(layout);
    if (!liste) return;
    const légende = q(layout, '.recit-legend');
    const note = dépose(légende, 'e084-focus-live', 'p', 'recit-e084-live');
    if (note) {
      try {
        note.setAttribute('role', 'status');
        note.setAttribute('aria-live', 'polite');
        note.setAttribute('aria-atomic', 'true');
      } catch { /* garde */ }
    }
    lie(liste, 'e084ThreadPages', 'keydown', (événement) => {
      if (événement.key !== 'PageUp' && événement.key !== 'PageDown') return;
      if (événement.ctrlKey || evtAlt(événement)) return;
      const cible = événement.target;
      if (!cible || typeof cible.closest !== 'function' || !cible.closest('.recit-thread-item')) return;
      const items = itemsDuFil(liste);
      if (!items.length) return;
      try { événement.preventDefault(); } catch { /* garde */ }
      const item = événement.key === 'PageUp' ? items[0] : items[items.length - 1];
      roule(items, item);
      metFocus(item);
      annonceFocus(note, item, liste);
    });
  });

  /* ---------- E084-06 — pastilles de touche sur les commandes ---------- */
  protège('E084-06', () => {
    const actions = actionsDe(layout);
    if (!actions) return;
    qa(actions, 'button').forEach((bouton) => {
      try {
        if (q(bouton, '.recit-e084-kbd')) return;
        const libellé = String(bouton.textContent || '');
        let touche = '';
        if (/repère suivant/i.test(libellé)) touche = '↗';
        else if (/précédent/i.test(libellé)) touche = '←';
        else if (/suivant/i.test(libellé)) touche = '→';
        else if (/automatique|pause/i.test(libellé)) touche = 'ESPACE';
        else if (/recommencer/i.test(libellé)) touche = '↺';
        else if (/chronologie/i.test(libellé)) touche = '4';
        if (!touche) return;
        const pastille = fabrique('kbd', 'recit-e084-kbd', touche);
        if (!pastille) return;
        pastille.setAttribute('aria-hidden', 'true');
        bouton.appendChild(pastille);
      } catch { /* garde */ }
    });
  });

  /* ---------- E084-07 — renfort de l'anneau de focus (CSS + audit) ---------- */
  protège('E084-07', () => {
    const portée = q(layout, '.recit-body') || layout;
    ajouteClasse(portée, 'recit-e084-renfort');
    try { layout.dataset.e084Focus = 'renforce'; } catch { /* garde */ }
  });

  /* ---------- E084-08 — mémoire et restauration du focus ---------- */
  protège('E084-08', () => {
    if (!stage || typeof stage.addEventListener !== 'function') return;
    try {
      if (!stagesCables.has(stage)) {
        stagesCables.add(stage);
        stage.addEventListener('focusin', (événement) => {
          try {
            const cible = événement.target;
            if (!cible || typeof cible.closest !== 'function') return;
            if (!cible.closest('.recit-layout')) return;
            const cle = cible.dataset && cible.dataset.fk
              ? cible.dataset.fk
              : (cible.id || (typeof cible.getAttribute === 'function' ? cible.getAttribute('aria-label') : ''));
            if (!cle) return;
            fkParStage.set(stage, cle);
            euFocus = true;
          } catch { /* garde */ }
        });
      }
    } catch { /* garde */ }
    const cle = fkParStage.get(stage);
    if (!euFocus || !cle) return;
    const actif = document.activeElement;
    if (actif && actif !== document.body && actif !== document.documentElement) return;
    let cibles = qa(layout, '[data-fk]').filter((n) => n.dataset && n.dataset.fk === cle);
    if (!cibles.length) {
      const parIdentifiant = parId(cle);
      if (mêmeNoeud(parIdentifiant, layout)) cibles = [parIdentifiant];
    }
    if (!cibles.length) return;
    const cible = cibles[0];
    if (cible.disabled || cible.getAttribute('aria-hidden') === 'true') return;
    metFocus(cible);
  });

  /* ---------- E084-09 — panneau local « Raccourcis clavier » ---------- */
  protège('E084-09', () => {
    const légende = q(layout, '.recit-legend');
    if (!légende) return;
    let panneau = dépose(légende, 'e084-help', 'details', 'recit-e084-help');
    if (!panneau) return;
    try {
      if (!q(panneau, 'summary')) {
        panneau.appendChild(fabrique('summary', '', 'Raccourcis clavier de ce repère'));
      }
      let liste = q(panneau, 'ul');
      if (!liste) {
        liste = fabrique('ul');
        if (!liste) return;
        panneau.appendChild(liste);
      }
      const lignes = [
        '← / → : point précédent / point suivant.',
        'Espace : lancer ou arrêter la lecture automatique.',
        'Entrée : ouvrir le détail du point.',
        '↑ / ↓, Début, Fin : parcourir les points du fil.',
        'PageUp / PageDown : première / dernière pastille du fil.',
        'Début / Fin, PageUp / PageDown dans les commandes : premier / dernier bouton et parcours.',
        'Tab : navigation standard ; ? : aide générale ; Échap : retour au monde.',
      ];
      if (!qa(liste, 'li').length) {
        lignes.forEach((texte) => {
          const item = fabrique('li', '', texte);
          if (item) liste.appendChild(item);
        });
      }
    } catch { /* garde */ }
  });

  /* ---------- E084-10 — lien « Retour au fil du repère » ---------- */
  protège('E084-10', () => {
    const légende = q(layout, '.recit-legend');
    const liste = filDe(layout);
    if (!légende) return;
    let bouton = dépose(légende, 'e084-return-link', 'button', 'recit-e084-return', '↑ Retour au fil du repère');
    if (!bouton) return;
    try { bouton.type = 'button'; } catch { /* garde */ }
    try { bouton.setAttribute('aria-label', 'Placer le focus sur le point courant du fil'); } catch { /* garde */ }
    lie(bouton, 'e084Bound', 'click', () => {
      const items = itemsDuFil(liste);
      if (!items.length) return;
      const courant = items.find((item) => {
        try {
          return item.classList && (item.classList.contains('is-current') || item.getAttribute('aria-current') === 'step');
        } catch { return false; }
      });
      const cible = courant || items[0];
      roule(items, cible);
      metFocus(cible);
    });
  });

  /* ---------- témoin auditable ---------- */
  protège('E084-audit', () => {
    try {
      layout.dataset.e084Chantiers = '10';
      layout.dataset.e084Ids = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length === 1) ? '1' : '0';
    } catch { /* garde */ }
  });
});

/* Utilitaires partagés, déclarés après register() (hisse de fonction). */

/* Modificateurs : seuls les raccourcis sans combinaison sont traités. */
function evtAlt(événement) {
  try { return Boolean(événement.altKey || événement.metaKey || événement.shiftKey); }
  catch { return false; }
}

/* Marque brièvement le bouton visité, sans toucher à son contenu textuel. */
function visite(boutons, bouton) {
  boutons.forEach((b) => { try { b.classList.remove('recit-e084-visite'); } catch { /* garde */ } });
  ajouteClasse(bouton, 'recit-e084-visite');
}

/* Alignement avec le modèle de tabulation du garde-fou du fil : un seul
   item à tabIndex 0, les autres à -1, sans retirer la fonctionnalité. */
function roule(items, cible) {
  items.forEach((item) => {
    try { item.tabIndex = item === cible ? 0 : -1; } catch { /* garde */ }
  });
}
