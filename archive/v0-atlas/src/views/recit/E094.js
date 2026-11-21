import { register } from './registry.js';

/* Lentille E094 — Navigation clavier (vue Récit).
 *
 * Dix chantiers concrets et distincts, E094-01 … E094-10, tous implémentés
 * dans CE seul module. Rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E094.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js.
 *
 * Greffon strictement additif : aucun nœud retiré, aucun texte existant
 * modifié, aucun gestionnaire existant ré-attribué, aucun fichier partagé
 * touché. Une seule classe racine `recit-e094-layout` sur `layout`, une seule
 * feuille CSS posée via `css('recit-e094', …)` (cssOnce garantit l'idempotence).
 * Toute classe créée est préfixée `recit-e094-`, tout identifiant créé est
 * préfixé `e094-` et unique (`e094-legend-note`). Zéro journalisation, zéro
 * appel réseau, zéro aléa, zéro injection de balisage. Chaque chantier est enveloppé dans
 * une garde : une défaillance locale est neutralisée sans casser le rendu.
 * Sans JavaScript, la vue Récit reste intégralement lisible et navigable.
 */

const CSS_ID = 'recit-e094';
const RACINE = 'recit-e094-layout';
const NOTE_ID = 'e094-legend-note';

/* Feuille unique, cadrée par la classe racine. Aucune ressource distante,
   aucune police téléchargée, aucune information portée par la seule couleur :
   l'indicateur de focus allie contour et halo, et la progression est décrite
   par des attributs ARIA textuels (E094-03). */
const CSS = `
.recit-e094-layout .recit-e094-progress[role="progressbar"]{
  position:relative;
}
.recit-e094-layout .recit-e094-cible:focus-visible,
.recit-e094-layout .recit-e094-legend:focus-visible{
  outline:2px solid var(--gold-bright,#f5e9d0);
  outline-offset:3px;
  box-shadow:0 0 0 4px rgba(230,185,111,.18);
}
.recit-e094-layout .recit-e094-legend-note{
  margin:8px 0 0;padding-left:10px;
  border-left:2px solid var(--gold,#e6b96f);
  color:var(--muted,#a9a9a9);font-size:9px;line-height:1.6;
}
.recit-e094-layout[data-e094-motion="reduce"] .recit-e094-cible,
.recit-e094-layout[data-e094-motion="reduce"] .recit-e094-legend{
  transition:none;
}
@media (max-width:620px){
  .recit-e094-layout .recit-e094-legend-note{font-size:8px}
}
@media (prefers-reduced-motion:reduce){
  .recit-e094-layout .recit-e094-cible,
  .recit-e094-layout .recit-e094-legend{transition:none!important}
}
`;

/* ---------- Utilitaires défensifs ---------- */

function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* une lentille défaillante ne doit jamais casser le rendu */ }
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

function attributSiAbsent(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && typeof noeud.hasAttribute === 'function'
      && !noeud.hasAttribute(nom)) {
    noeud.setAttribute(nom, valeur);
  }
}

function estEditable(noeud) {
  if (!noeud || noeud.nodeType !== 1 || typeof noeud.closest !== 'function') return false;
  return Boolean(noeud.closest('input, textarea, select, [contenteditable="true"]'));
}

function poseFocus(noeud) {
  if (!noeud || typeof noeud.focus !== 'function') return false;
  try { noeud.focus({ preventScroll: true }); return true; }
  catch {
    try { noeud.focus(); return true; }
    catch { return false; }
  }
}

function itemsDuFil(root) {
  const liste = q(root, '#c3a-thread') || q(root, '.recit-thread-list');
  if (!liste || typeof liste.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(liste.querySelectorAll('.recit-thread-item'));
}

function itemCourant(root) {
  const items = itemsDuFil(root);
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.getAttribute('aria-current') === 'step'
        || (item.classList && item.classList.contains('is-current'))) return item;
  }
  return null;
}

/* Régions ordonnées du récit, dans l'ordre de lecture. Le fil est représenté
   par son item courant : le saut clavier atterrit toujours sur du pertinent. */
function regions(root) {
  const sortie = [];
  const titre = typeof document !== 'undefined' ? document.getElementById('recit-point-title') : null;
  if (titre && titre.isConnected) sortie.push({ noeud: titre, libelle: 'titre du point' });
  const recherche = typeof document !== 'undefined' ? document.getElementById('c3a-search') : null;
  if (recherche && recherche.isConnected) sortie.push({ noeud: recherche, libelle: 'recherche' });
  const courant = itemCourant(root);
  if (courant) sortie.push({ noeud: courant, libelle: 'fil du repère' });
  const commande = q(root, '.recit-actions button:not([disabled])');
  if (commande) sortie.push({ noeud: commande, libelle: 'commandes' });
  const legende = q(root, '.recit-legend');
  if (legende) sortie.push({ noeud: legende, libelle: 'légende' });
  return sortie;
}

function deplaceVersRegion(root, sens) {
  const liste = regions(root);
  if (!liste.length) return null;
  const actif = typeof document !== 'undefined' ? document.activeElement : null;
  let pos = -1;
  for (let i = 0; i < liste.length; i += 1) {
    const noeud = liste[i].noeud;
    if (actif === noeud || (actif && noeud.contains && noeud.contains(actif))) { pos = i; break; }
  }
  const cible = pos < 0
    ? (sens > 0 ? liste[0] : liste[liste.length - 1])
    : liste[(pos + sens + liste.length) % liste.length];
  poseFocus(cible.noeud);
  root.setAttribute('data-e094-navigation', `region:${cible.libelle}`);
  return cible;
}

/* ---------- E094-01 — Saut entre régions avec [ et ] ---------- */

function chantier01(root) {
  securise(() => {
    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      const cle = evenement.key;
      if (cle !== '[' && cle !== ']') return;
      if (estEditable(evenement.target)) return;
      if (deplaceVersRegion(root, cle === ']' ? 1 : -1)) evenement.preventDefault();
    });
  });
}

/* ---------- E094-02 — Pagination du fil avec PageUp / PageDown ---------- */

function chantier02(root) {
  securise(() => {
    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      const cle = evenement.key;
      if (cle !== 'PageDown' && cle !== 'PageUp') return;
      if (estEditable(evenement.target)) return;
      const items = itemsDuFil(root);
      if (!items.length) return;
      evenement.preventDefault();
      const actif = typeof document !== 'undefined' ? document.activeElement : null;
      let pos = items.indexOf(actif);
      if (pos < 0) {
        const courant = itemCourant(root);
        pos = courant ? items.indexOf(courant) : -1;
      }
      const pas = cle === 'PageDown' ? 1 : -1;
      const suite = pos < 0
        ? (pas > 0 ? 0 : items.length - 1)
        : Math.min(Math.max(pos + pas, 0), items.length - 1);
      items.forEach((item) => { item.tabIndex = item === items[suite] ? 0 : -1; });
      poseFocus(items[suite]);
      root.setAttribute('data-e094-navigation', `fil:${suite + 1}/${items.length}`);
    });
  });
}

/* ---------- E094-03 — Progression annoncée (barre ARIA) ---------- */

function chantier03(root) {
  const barre = q(root, '.recit-progress');
  const kicker = q(root, '.view-kicker');
  if (!barre || !kicker) return;
  const motif = /Etape\s+(\d+)\s*\/\s*(\d+)/i.exec(String(kicker.textContent || ''));
  if (!motif) return;
  const position = Number(motif[1]);
  const total = Number(motif[2]);
  if (!Number.isFinite(position) || !Number.isFinite(total) || total <= 0) return;
  const borne = Math.min(Math.max(position, 0), total);
  ajouteClasse(barre, 'recit-e094-progress');
  attributSiAbsent(barre, 'role', 'progressbar');
  attributSiAbsent(barre, 'aria-label', 'Progression du récit');
  barre.setAttribute('aria-valuemin', '0');
  barre.setAttribute('aria-valuemax', String(total));
  barre.setAttribute('aria-valuenow', String(borne));
  barre.setAttribute('aria-valuetext', `Point ${borne} sur ${total}`);
}

/* ---------- E094-04 — Échap dans la recherche : effacer et rendre le focus ---------- */

function chantier04(root) {
  const champ = typeof document !== 'undefined' ? document.getElementById('c3a-search') : null;
  if (!champ || champ.dataset.e094Escape === '1') return;
  champ.dataset.e094Escape = '1';
  securise(() => {
    champ.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.key !== 'Escape') return;
      evenement.preventDefault();
      evenement.stopPropagation();
      securise(() => {
        if (champ.value) {
          champ.value = '';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      const fil = document.getElementById('c3a-thread');
      const cible = q(fil, '.recit-thread-item.is-current') || q(fil, '.recit-thread-item');
      poseFocus(cible);
      root.setAttribute('data-e094-navigation', 'recherche-effacee');
    });
  });
}

/* ---------- E094-05 — Barre oblique : focus sur la recherche ---------- */

function chantier05(root) {
  securise(() => {
    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      if (evenement.key !== '/' && evenement.key !== 'Slash') return;
      if (estEditable(evenement.target)) return;
      const champ = document.getElementById('c3a-search');
      if (!champ) return;
      evenement.preventDefault();
      poseFocus(champ);
      securise(() => { if (typeof champ.select === 'function') champ.select(); });
      root.setAttribute('data-e094-navigation', 'recherche');
    });
  });
}

/* ---------- E094-06 — n / p : point suivant ou précédent ---------- */

function chantier06(root) {
  securise(() => {
    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      const cle = String(evenement.key || '').toLowerCase();
      if (cle !== 'n' && cle !== 'p') return;
      if (estEditable(evenement.target)) return;
      const bouton = q(root, cle === 'n' ? '[data-fk="c3a-next"]' : '[data-fk="c3a-prev"]');
      if (!bouton || bouton.disabled === true) return;
      evenement.preventDefault();
      root.setAttribute('data-e094-navigation', cle === 'n' ? 'point-suivant' : 'point-precedent');
      securise(() => bouton.click());
    });
  });
}

/* ---------- E094-07 — Consigne clavier dans la légende ---------- */

function chantier07(root, el) {
  if (typeof el !== 'function') return;
  const legende = q(root, '.recit-legend');
  if (!legende || document.getElementById(NOTE_ID)) return;
  const note = el('p', 'recit-e094-legend-note',
    'Navigation clavier (E094) : [ et ] sautent entre les régions ; Page précédente et Page suivante parcourent le fil ; « / » place le focus sur la recherche ; n et p changent de point ; Échap dans la recherche l’efface et ramène le focus au fil.');
  note.id = NOTE_ID;
  legende.appendChild(note);
}

/* ---------- E094-08 — Focus visible ciblé et mouvement réduit ---------- */

function chantier08(root, reducedMotion) {
  const cibles = [];
  const titre = document.getElementById('recit-point-title');
  const recherche = document.getElementById('c3a-search');
  const courant = itemCourant(root);
  const commandes = q(root, '.recit-actions');
  const resume = q(root, '.recit-trace summary');
  if (titre) cibles.push(titre);
  if (recherche) cibles.push(recherche);
  if (courant) cibles.push(courant);
  if (commandes && typeof commandes.querySelectorAll === 'function') {
    Array.prototype.forEach.call(commandes.querySelectorAll('button'), (b) => cibles.push(b));
  }
  if (resume) cibles.push(resume);
  cibles.forEach((noeud) => ajouteClasse(noeud, 'recit-e094-cible'));
  let reduit = false;
  securise(() => { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); });
  root.setAttribute('data-e094-motion', reduit ? 'reduce' : 'normal');
}

/* ---------- E094-09 — Légende atteignable au clavier ---------- */

function chantier09(root) {
  const legende = q(root, '.recit-legend');
  if (!legende) return;
  ajouteClasse(legende, 'recit-e094-legend');
  attributSiAbsent(legende, 'tabindex', '0');
  legende.setAttribute('role', 'group');
  attributSiAbsent(legende, 'aria-label', 'Légende et consignes de navigation clavier du récit');
}

/* ---------- E094-10 — Échap global : arrêter la lecture automatique ---------- */

function chantier10(root) {
  securise(() => {
    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented || evenement.key !== 'Escape') return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      if (estEditable(evenement.target)) return;
      const lecture = q(root, '[data-fk="c3a-play"]');
      if (!lecture || lecture.getAttribute('aria-pressed') !== 'true') return;
      evenement.preventDefault();
      root.setAttribute('data-e094-navigation', 'lecture-arretee');
      securise(() => lecture.click());
    });
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E094', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el, reducedMotion } = ctx;

  /* Structure d'abord, gestionnaires ensuite : les régions et cibles existent
     avant que les raccourcis ne puissent être actionnés. */
  securise(() => { if (typeof css === 'function') css(CSS_ID, CSS); });
  securise(() => ajouteClasse(layout, RACINE));
  securise(() => chantier03(layout));
  securise(() => chantier08(layout, reducedMotion));
  securise(() => chantier09(layout));
  securise(() => chantier07(layout, el));
  securise(() => chantier01(layout));
  securise(() => chantier02(layout));
  securise(() => chantier04(layout));
  securise(() => chantier05(layout));
  securise(() => chantier06(layout));
  securise(() => chantier10(layout));
});
