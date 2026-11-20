import { register } from './registry.js';

/* V2 lentille E084 — vue Récit : navigation clavier, repérage et orientation.
   Complément de la passe 1 (qui traite déjà lien d'évitement, anneau du titre,
   Début/Fin et PageUp/PageDown des commandes et du fil, pastilles de touche,
   renfort de focus, mémoire du focus, panneau d'aide et retour au fil).
   Les dix chantiers ci-dessous sont neufs et distincts : inventaire des arrêts
   clavier, sauts entre zones, fil d'Ariane du focus, raccourcis déduits du DOM,
   info-bulles manquantes, surlignage des zones par :focus-within, anneau des
   liens de saut, défilement et mouvement réduit, compte des commandes
   indisponibles, témoin auditable. Tout chiffre affiché est dérivé du DOM réel.
   Non destructif : sans ce module la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e084-, ids DOM v2-e084- (jamais les ids e084- de
   la passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. */

const STYLE_ID = 'recit-v2-e084';

/* Ids maison garantis (créés dans la légende quand elle existe). Les ids de
   cible de zone sont, eux, conditionnels : on ne remplace jamais un id déjà
   porté par un élément de la coque. */
const IDS = [
  'v2-e084-tabstops',
  'v2-e084-zonenav',
  'v2-e084-zonelive',
  'v2-e084-shortcuts',
  'v2-e084-disabled',
];

const CSS = `
/* E084-01 — Inventaire des points d'arrêt clavier (lecture chiffrée). */
.recit-v2-e084-readout{margin:2px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e084-tabstops{margin-top:8px}

/* E084-02 — Barre de saut entre zones, cibles tactiles ≥ 36 px. */
.recit-v2-e084-zonenav{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px;padding:0}
.recit-v2-e084-saut{display:inline-flex;align-items:center;min-height:36px;padding:4px 10px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(230,185,111,.05);color:var(--gold-bright);font-size:9px;text-decoration:none;white-space:nowrap}
.recit-v2-e084-saut:hover{background:rgba(230,185,111,.13)}

/* E084-03 — Fil d'Ariane du focus, visible et non redondant avec les annonces. */
.recit-v2-e084-zonelive{margin:2px 0 6px}

/* E084-04 — Raccourcis exposés par les commandes, déduits de aria-keyshortcuts. */
.recit-v2-e084-shortcuts{margin:8px 0 0;padding:6px 0;color:var(--muted-2);font-size:9px;line-height:1.6}
.recit-v2-e084-shortcuts p{margin:0 0 4px}
.recit-v2-e084-shortcuts ul{margin:0;padding-left:16px}
.recit-v2-e084-shortcuts li{margin:1px 0}

/* E084-05 — Info-bulles de raccourci : comportement natif de title, aucune règle. */
/* E084-05 — (aucune règle CSS : l'attribut title est géré par le navigateur). */

/* E084-06 — Mise en évidence des zones atteintes, par :focus-within. */
.recit-v2-e084-scope :is(.recit-actions,.c3a-tools,.recit-thread,.recit-legend):focus-within{box-shadow:inset 0 0 0 1px var(--line-strong)}

/* E084-07 — Anneau de focus renforcé sur les seuls liens de saut de cette lentille. */
.recit-v2-e084-scope a.recit-v2-e084-saut:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px;text-decoration:underline}

/* E084-08 — Défilement des sauts : doux par défaut, immédiat si mouvement réduit. */
.recit-v2-e084-scope,.recit-v2-e084-scope .recit-body{scroll-behavior:smooth}
.recit-v2-e084-scope[data-v2-e084-motion="reduce"],
.recit-v2-e084-scope[data-v2-e084-motion="reduce"] .recit-body{scroll-behavior:auto}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e084-scope,
  .recit-v2-e084-scope .recit-body{scroll-behavior:auto}
}

/* E084-09 — Compte des commandes indisponibles (même style de lecture). */
.recit-v2-e084-disabled{margin:2px 0 0}

/* E084-10 — Témoin auditable : aucun style, uniquement des attributs data-v2-e084-*. */

/* Contrainte de couleur élevée : le repère de zone ne dépend pas de la couleur. */
@media (forced-colors:active){
  .recit-v2-e084-scope a.recit-v2-e084-saut:focus-visible{outline:3px solid Highlight}
  .recit-v2-e084-scope :is(.recit-actions,.c3a-tools,.recit-thread,.recit-legend):focus-within{box-shadow:inset 0 0 0 1px CanvasText}
}
@media (max-width:620px){
  .recit-v2-e084-saut{min-height:40px}
}
`;

const SELECTEUR_ARRETS = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';

const ZONES = [
  { label: 'Titre du point', selecteur: '#recit-point-title', id: 'v2-e084-zone-titre' },
  { label: 'Outils et filtres', selecteur: '.c3a-tools', id: 'v2-e084-zone-outils' },
  { label: 'Statut des filtres', selecteur: '#c3a-status', id: 'v2-e084-zone-statut' },
  { label: 'Fil des points', selecteur: '#c3a-thread', id: 'v2-e084-zone-fil' },
  { label: 'Commandes du point', selecteur: '.recit-actions', id: 'v2-e084-zone-actions' },
  { label: 'Légende', selecteur: '.recit-legend', id: 'v2-e084-zone-legende' },
];

const TOUCHES = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: 'Espace', Enter: 'Entrée', Home: 'Début', End: 'Fin',
  PageUp: 'Page précédente', PageDown: 'Page suivante',
  Digit4: '4', Escape: 'Échap',
};

/* apiEl est renseigné à chaque rendu : les utilitaires partagés ne dépendent
   donc jamais d'une variable locale de register(). */
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
      const noeud = apiEl(balise, classe, texte);
      if (noeud) return noeud;
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

/* Un seul nœud par identifiant maison : un doublon issu d'un rendu interrompu
   est retiré, jamais un nœud étranger. */
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

function écrire(noeud, texte) {
  try { if (noeud) noeud.textContent = texte; } catch { /* garde */ }
}

function ajouteClasse(noeud, classe) {
  try { if (noeud && noeud.classList && !noeud.classList.contains(classe)) noeud.classList.add(classe); }
  catch { /* garde */ }
}

function protège(nom, tâche) {
  try { tâche(); } catch { /* un chantier défaillant n'en bloque aucun autre */ }
}

function lie(noeud, cle, type, gestionnaire) {
  if (!noeud || !noeud.dataset) return;
  try {
    if (noeud.dataset[cle] === '1') return;
    noeud.dataset[cle] = '1';
    noeud.addEventListener(type, gestionnaire);
  } catch { /* garde */ }
}

function metFocus(noeud, préventif) {
  if (!noeud) return;
  try { noeud.focus(préventif ? { preventScroll: true } : { preventScroll: false }); return; } catch { /* repli */ }
  try { noeud.focus(); } catch { /* garde */ }
}

/* Arrêts réels de Tab : on exclut les nœuds désactivés, masqués et ceux dont
   le tabindex explicite vaut -1 (cas des pastilles du fil en tabulation roulante). */
function pointsArret(racine) {
  return qa(racine, SELECTEUR_ARRETS).filter((noeud) => {
    try {
      if (noeud.disabled || noeud.getAttribute('aria-disabled') === 'true') return false;
      if (noeud.getAttribute('aria-hidden') === 'true') return false;
      if (noeud.getAttribute('tabindex') === '-1') return false;
      return true;
    } catch { return false; }
  });
}

/* Libellé lisible sans les pastilles décoratives aria-hidden ajoutées par la
   passe 1 : on clones et on retire ces nœuds avant de lire textContent. */
function libelléDe(noeud) {
  try {
    const label = noeud.getAttribute('aria-label');
    if (label) return label.replace(/\s+/g, ' ').trim().slice(0, 80);
    const copie = noeud.cloneNode(true);
    qa(copie, '[aria-hidden="true"]').forEach((caché) => {
      try { caché.remove(); } catch { /* garde */ }
    });
    const texte = (copie.textContent || '').replace(/\s+/g, ' ').trim();
    if (texte) return texte.slice(0, 80);
    return noeud.tagName ? noeud.tagName.toLowerCase() : 'élément';
  } catch { return 'élément'; }
}

function nomZone(noeud) {
  try {
    if (noeud.closest('.recit-actions')) return 'commandes du point';
    if (noeud.closest('.c3a-tools')) return 'outils et filtres';
    if (noeud.closest('#c3a-thread, .recit-thread-list')) return 'fil des points';
    if (noeud.closest('.recit-legend')) return 'légende';
    if (noeud.closest('.recit-trace')) return 'traçabilité';
    if (noeud.closest('.recit-title')) return 'titre du point';
    return 'vue Récit';
  } catch { return 'vue Récit'; }
}

function libelléTouche(code) {
  try { return TOUCHES[code] || code; } catch { return code; }
}

function clésDe(noeud) {
  try {
    return (noeud.getAttribute('aria-keyshortcuts') || '').trim().split(/\s+/).filter(Boolean).map(libelléTouche).join(' + ');
  } catch { return ''; }
}

function vide(noeud) {
  try { while (noeud && noeud.firstChild) noeud.removeChild(noeud.firstChild); } catch { /* garde */ }
}

register('E084', (contexte) => {
  const ctx = contexte || {};
  const { layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined') return;
  if (!layout || typeof layout.querySelector !== 'function') return;

  apiEl = typeof el === 'function' ? el : null;

  try { if (typeof css === 'function') css(STYLE_ID, CSS); } catch { /* repli silencieux */ }
  ajouteClasse(layout, 'recit-v2-e084-scope');

  /* E084-06 / E084-07 / E084-08 — portée CSS et préférence de mouvement. */
  protège('E084-06', () => { try { layout.dataset.v2E084Zones = '1'; } catch { /* garde */ } });
  protège('E084-07', () => { try { layout.dataset.v2E084FocusLinks = '1'; } catch { /* garde */ } });
  protège('E084-08', () => {
    let réduit = false;
    try { réduit = typeof reducedMotion === 'function' && Boolean(reducedMotion()); } catch { réduit = false; }
    try { layout.setAttribute('data-v2-e084-motion', réduit ? 'reduce' : 'normal'); } catch { /* garde */ }
  });

  const corps = q(layout, '.recit-body') || layout;
  const légende = q(corps, '.recit-legend');
  const actions = q(corps, '.recit-actions');
  const outils = parId('c3a-tools') || q(corps, '.c3a-tools');
  const fil = parId('c3a-thread') || q(corps, '.recit-thread-list');

  /* ---------- E084-01 — Inventaire des points d'arrêt clavier ---------- */
  protège('E084-01', () => {
    if (!légende) return;
    const arrêts = pointsArret(layout);
    if (!arrêts.length) return; /* aucun chiffre n'est inventé */
    const nOutils = pointsArret(outils).length;
    const nFil = pointsArret(fil).length;
    const nActions = pointsArret(actions).length;
    const texte = `Points d'arrêt clavier : ${arrêts.length} au total · ${nOutils} dans les outils, ${nFil} dans le fil, ${nActions} dans les commandes.`;
    const note = dépose(légende, 'v2-e084-tabstops', 'p', 'recit-v2-e084-readout recit-v2-e084-tabstops');
    écrire(note, texte);
  });

  /* ---------- E084-02 — Barre de saut entre zones ---------- */
  protège('E084-02', () => {
    if (!légende) return;
    const nav = dépose(légende, 'v2-e084-zonenav', 'nav', 'recit-v2-e084-zonenav');
    if (!nav) return;
    try { nav.setAttribute('aria-label', 'Sauts de navigation clavier'); } catch { /* garde */ }
    const présents = [];
    const cibles = [];
    ZONES.forEach((zone) => {
      const noeud = q(corps, zone.selecteur) || parId(zone.selecteur.replace('#', ''));
      if (!noeud) return;
      let id = noeud.id;
      if (!id) {
        id = zone.id;
        try { noeud.id = id; } catch { return; }
      }
      présents.push(id);
      cibles.push({ id, label: zone.label, noeud });
    });
    const signature = présents.join('|');
    try { if (nav.dataset.v2E084ZonesSignature === signature) return; } catch { /* garde */ }
    vide(nav);
    cibles.forEach(({ id, label, noeud }) => {
      const lien = fabrique('a', 'recit-v2-e084-saut', label);
      if (!lien) return;
      try {
        lien.href = `#${id}`;
        lien.setAttribute('aria-label', `Aller à : ${label}`);
      } catch { /* garde */ }
      lie(lien, 'v2e084Saut', 'click', (événement) => {
        try { événement.preventDefault(); } catch { /* garde */ }
        const cible = parId(id);
        if (!cible) return;
        try { if (!cible.hasAttribute('tabindex')) cible.tabIndex = -1; } catch { /* garde */ }
        metFocus(cible, false);
      });
      nav.appendChild(lien);
    });
    try { nav.dataset.v2E084ZonesSignature = signature; } catch { /* garde */ }
  });

  /* ---------- E084-03 — Fil d'Ariane du focus ---------- */
  protège('E084-03', () => {
    if (!légende) return;
    const note = dépose(légende, 'v2-e084-zonelive', 'p', 'recit-v2-e084-readout recit-v2-e084-zonelive');
    écrire(note, "Orientation clavier : en attente d'un déplacement.");
    lie(layout, 'v2e084FilAriane', 'focusin', (événement) => {
      const cible = événement.target;
      if (!cible || typeof cible.closest !== 'function') return;
      try { if (typeof layout.contains === 'function' && !layout.contains(cible)) return; } catch { return; }
      const arrêts = pointsArret(layout);
      const position = arrêts.indexOf(cible) + 1;
      const zone = nomZone(cible);
      const libellé = libelléDe(cible);
      const texte = position > 0
        ? `Orientation clavier : arrêt ${position} sur ${arrêts.length} · ${zone} · « ${libellé} ».`
        : `Orientation clavier : ${zone} · « ${libellé} ».`;
      écrire(note, texte);
    });
  });

  /* ---------- E084-04 — Raccourcis déduits de aria-keyshortcuts ---------- */
  protège('E084-04', () => {
    if (!légende) return;
    const panneau = dépose(légende, 'v2-e084-shortcuts', 'div', 'recit-v2-e084-shortcuts');
    if (!panneau) return;
    vide(panneau);
    const introdu = fabrique('p', '', 'Raccourcis exposés par les commandes de ce point :');
    if (introdu) panneau.appendChild(introdu);
    const liste = fabrique('ul');
    if (!liste) return;
    const porteurs = qa(layout, '[aria-keyshortcuts]').filter((noeud) => (noeud.getAttribute('aria-keyshortcuts') || '').trim());
    if (!porteurs.length) {
      const videNote = fabrique('li', '', 'Aucun raccourci déclaré par les commandes affichées.');
      if (videNote) liste.appendChild(videNote);
    } else {
      porteurs.forEach((noeud) => {
        const clés = clésDe(noeud);
        if (!clés) return;
        const item = fabrique('li', '', `${libelléDe(noeud)} : ${clés}`);
        if (item) liste.appendChild(item);
      });
    }
    panneau.appendChild(liste);
  });

  /* ---------- E084-05 — Info-bulles de raccourci manquantes ---------- */
  protège('E084-05', () => {
    qa(layout, '[aria-keyshortcuts]').forEach((noeud) => {
      try {
        if (noeud.hasAttribute('title')) return; /* jamais écrasé */
        const clés = clésDe(noeud);
        if (!clés) return;
        noeud.setAttribute('title', `Raccourci clavier : ${clés}`);
      } catch { /* garde */ }
    });
  });

  /* ---------- E084-09 — Commandes indisponibles ---------- */
  protège('E084-09', () => {
    if (!légende || !actions) return;
    const boutons = qa(actions, 'button');
    const indisponibles = boutons.filter((bouton) => bouton.disabled || bouton.getAttribute('aria-disabled') === 'true');
    const texte = `Commandes indisponibles à ce point : ${indisponibles.length} sur ${boutons.length}.`;
    const note = dépose(légende, 'v2-e084-disabled', 'p', 'recit-v2-e084-readout recit-v2-e084-disabled');
    écrire(note, texte);
  });

  /* ---------- E084-10 — Témoin auditable ---------- */
  protège('E084-10', () => {
    try {
      layout.dataset.v2E084Chantiers = '10';
      layout.dataset.v2E084Ids = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length === 1) ? '1' : '0';
    } catch { /* garde */ }
  });
});
