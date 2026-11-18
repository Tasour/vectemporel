import { register } from './registry.js';

/* Lentille E059 — robustesse et garde-fous du focus et de la tabulation
   dans la vue Constellation. Dix chantiers locaux et déterministes : aucun
   appel réseau, aucune source aléatoire, aucun minuteur, aucune boucle
   d'animation propre et aucun fichier partagé modifié. Le contexte fourni
   par le registre est le seul point d'accès au DOM et à la feuille de style. */

const SELECTEUR_FOCUS = '.const-sun[data-const-key], .const-planet[data-const-key], .const-moon[data-const-key]';
const COUCHES = [
  ['soleils', '.const-layer-suns'],
  ['repères', '.const-layer-planets'],
  ['points', '.const-layer-moons'],
];

/* Dernière clé de focus mémorisée entre deux rendus complets du shell. */
let derniereCleFocus = null;

function estElement(node) {
  return Boolean(node) && node.nodeType === 1;
}

/* Utilitaire tolérant : disponibilité réelle d'une cible de focus. */
function estDisponible(node) {
  if (!estElement(node) || !node.isConnected) return false;
  if (typeof node.hasAttribute !== 'function' || node.hasAttribute('hidden')) return false;
  if (typeof node.getAttribute === 'function' && node.getAttribute('aria-hidden') === 'true') return false;
  if (typeof node.closest === 'function' && node.closest('[inert]')) return false;
  if (typeof node.getBoundingClientRect !== 'function') return false;
  const rect = node.getBoundingClientRect();
  return Boolean(rect) && rect.width >= 1 && rect.height >= 1;
}

function poserFocus(node) {
  if (!estDisponible(node)) return null;
  try {
    node.focus({ preventScroll: true });
    return node;
  } catch (erreur) {
    try {
      node.focus();
      return node;
    } catch (autre) {
      return null;
    }
  }
}

const CSS = `
/* E059-01 / E059-02 — liens d'évitement : cachés hors champ, visibles au focus. */
.e059-skip{
  position:absolute;left:12px;top:-72px;z-index:9;
  min-width:36px;min-height:36px;padding:6px 12px;
  border:1px solid var(--gold, #e6b96f);border-radius:8px;
  background:var(--surface-2, #141a24);color:var(--gold-bright, #f4d69e);
  font:600 10px/1.2 inherit;cursor:pointer;
  transition:top .15s ease;
}
.e059-skip:focus-visible{top:10px;outline:2px solid var(--gold-bright, #f4d69e);outline-offset:2px}
.e059-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* E059-04 / E059-06 — anneau de focus robuste, conservé en contraste forcé. */
.constellation-field .const-sun:focus-visible,
.constellation-field .const-planet:focus-visible,
.constellation-field .const-moon:focus-visible,
.constellation-field [data-e059-focused="true"]{
  outline:3px solid var(--gold-bright, #f4d69e);
  outline-offset:3px;
  box-shadow:0 0 0 6px rgba(244,214,158,.18);
}
/* E059-08 — une cible différée n'affiche aucun anneau trompeur. */
.constellation-field [data-e059-defer="1"]{outline:none!important;box-shadow:none!important}
@media (forced-colors: active){
  .constellation-field .const-sun:focus-visible,
  .constellation-field .const-planet:focus-visible,
  .constellation-field .const-moon:focus-visible{
    outline:3px solid Highlight;outline-offset:3px;box-shadow:none;
  }
}
.constellation-field[data-e059-motion="0"] .e059-skip{transition:none}
@media (prefers-reduced-motion:reduce){.e059-skip{transition:none!important}}
`;

register('E059', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function' || typeof ctx.css !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  const noeuds = Array.prototype.slice.call(field.querySelectorAll(SELECTEUR_FOCUS));
  if (!noeuds.length) return;

  const fabriquer = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, classe, texte) => {
        const node = document.createElement(tag);
        if (classe) node.className = classe;
        if (texte !== undefined) node.textContent = texte;
        return node;
      };

  /* Feuille unique de la lentille : un seul appel, sans ressource distante. */
  ctx.css('constellation-e059', CSS);

  const idChamp = field.id || (field.id = 'e059-field');
  const groupes = COUCHES.map(([nom, selecteur]) => ({
    nom,
    membres: noeuds.filter(node => typeof node.closest === 'function' && node.closest(selecteur)),
  })).filter(groupe => groupe.membres.length);

  /* E059-05 — Garde-fou de cible invisible : seuls les nœuds dont l'empreinte
     dépasse 1 px et qui ne sont pas inertes alimentent la navigation ; le
     calcul est refait à chaque sollicitation, jamais mis en cache. */
  const ciblesVisibles = () => noeuds.filter(estDisponible);

  /* E059-08 — Garde-fou d'inertie : la coque rend le stage inert en modale ;
     toute cible inert est marquée data-e059-defer et n'est pas focalisée. */
  const viser = (node) => {
    if (estElement(node) && typeof node.closest === 'function' && node.closest('[inert]')) {
      if (node.dataset) node.dataset.e059Defer = '1';
      return null;
    }
    if (estElement(node) && node.dataset) delete node.dataset.e059Defer;
    return poserFocus(node);
  };

  let vivant = layout.querySelector('#e059-live');

  /* Annonce dédupliquée, réutilisée par le chantier E059-04. */
  function annoncer(texte) {
    if (!vivant || !texte || vivant.textContent === texte) return;
    vivant.textContent = texte;
  }

  /* E059-01 — Lien d'évitement d'entrée : premier focus du layout, il saute
     directement à l'élément actif du champ, ou au premier nœud disponible. */
  let entree = layout.querySelector('#e059-skip-in');
  if (!entree) {
    entree = fabriquer('button', 'e059-skip', 'Aller à la constellation active');
    entree.id = 'e059-skip-in';
    entree.type = 'button';
    entree.setAttribute('aria-controls', idChamp);
    layout.insertBefore(entree, layout.firstChild);
  }
  if (entree.dataset.e059Bound !== '1') {
    entree.dataset.e059Bound = '1';
    entree.addEventListener('click', () => {
      const actif = field.querySelector('[data-const-key][aria-current="true"]');
      viser(actif && estDisponible(actif) ? actif : ciblesVisibles()[0]);
    });
  }

  /* E059-02 — Lien d'évitement de sortie : permet de quitter le champ en un
     seul Tab vers le bouton « Chronologie » sans traverser tous les nœuds. */
  const basDePage = layout.querySelector('.constellation-caption');
  const retour = basDePage ? basDePage.querySelector('.constellation-back') : null;
  let sortie = layout.querySelector('#e059-skip-out');
  if (!sortie && basDePage && retour) {
    sortie = fabriquer('button', 'e059-skip', 'Quitter le champ — suite de la page');
    sortie.id = 'e059-skip-out';
    sortie.type = 'button';
    sortie.setAttribute('aria-controls', idChamp);
    basDePage.insertBefore(sortie, retour);
  }
  if (sortie && sortie.dataset.e059Bound !== '1') {
    sortie.dataset.e059Bound = '1';
    sortie.addEventListener('click', () => { viser(retour); });
  }

  /* E059-03 — Normalisation des tabindex : un seul arrêt de tabulation par
     couche (le représentant actif), aucun tabindex positif ne subsiste. */
  groupes.forEach(groupe => {
    const representant = groupe.membres.find(node => node.classList.contains('is-active')) || groupe.membres[0];
    groupe.membres.forEach(node => {
      const estEntree = node === representant;
      node.tabIndex = estEntree ? 0 : -1;
      node.dataset.e059Roving = estEntree ? 'entree' : 'interne';
      const brut = node.getAttribute('tabindex');
      if (brut !== null && Number(brut) > 0) node.tabIndex = estEntree ? 0 : -1;
    });
  });

  /* E059-04 — Synchronisation focus ↔ représentant : le nœud focalisé
     devient l'arrêt de tabulation de sa couche, sans toucher à aria-current
     qui reste l'affaire de la sélection. E059-07 annonce le changement. */
  if (field.dataset.e059FocusBound !== '1') {
    field.dataset.e059FocusBound = '1';
    field.addEventListener('focusin', evenement => {
      const cible = evenement && evenement.target;
      if (!estElement(cible) || typeof cible.closest !== 'function') return;
      const noeud = cible.closest(SELECTEUR_FOCUS);
      if (!noeud || !field.contains(noeud)) return;

      noeuds.forEach(node => {
        if (node === noeud) node.setAttribute('data-e059-focused', 'true');
        else node.removeAttribute('data-e059-focused');
      });
      groupes.forEach(groupe => {
        if (groupe.membres.indexOf(noeud) < 0) return;
        groupe.membres.forEach(membre => {
          const estEntree = membre === noeud;
          membre.tabIndex = estEntree ? 0 : -1;
          membre.dataset.e059Roving = estEntree ? 'entree' : 'interne';
        });
      });
      field.dataset.e059FocusKey = noeud.dataset.constKey || '';
      derniereCleFocus = noeud.dataset.constKey || derniereCleFocus;

      /* E059-07 — annonce vocale dédupliquée du changement de focus. */
      annoncer(`Focus : ${noeud.getAttribute('aria-label') || noeud.dataset.label || noeud.textContent || 'élément'}`);
    });
  }

  /* E059-06 — Correctif pointeur : sur les navigateurs qui ne focalisent pas
     un bouton au clic, on aligne le focus DOM sur la cible activée. */
  if (field.dataset.e059ClickBound !== '1') {
    field.dataset.e059ClickBound = '1';
    field.addEventListener('click', evenement => {
      const cible = evenement && evenement.target;
      if (!estElement(cible) || typeof cible.closest !== 'function') return;
      const noeud = cible.closest(SELECTEUR_FOCUS);
      if (!noeud || !field.contains(noeud) || document.activeElement === noeud) return;
      viser(noeud);
    }, true);
  }

  /* E059-07 — Région live sr-only : le focus est annoncé sans déplacer le
     curseur de lecture, avec aria-live poli et contenu atomique. */
  if (!vivant) {
    vivant = fabriquer('p', 'e059-sr', '');
    vivant.id = 'e059-live';
    vivant.setAttribute('role', 'status');
    vivant.setAttribute('aria-live', 'polite');
    vivant.setAttribute('aria-atomic', 'true');
    layout.appendChild(vivant);
  }

  /* E059-09 — Garde-fou de navigation clavier : Début/Fin vont au premier/
     dernier nœud disponible, Page précédente/suivante sautent de couche.
     Les flèches, Entrée et Espace restent au routeur global. */
  if (field.dataset.e059KeysBound !== '1') {
    field.dataset.e059KeysBound = '1';
    field.addEventListener('keydown', evenement => {
      if (!evenement || evenement.defaultPrevented
          || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      const cible = evenement.target;
      if (!estElement(cible) || typeof cible.closest !== 'function') return;
      const noeud = cible.closest(SELECTEUR_FOCUS);
      if (!noeud || !field.contains(noeud)) return;
      const disponibles = ciblesVisibles();
      if (!disponibles.length) return;

      let destination = null;
      if (evenement.key === 'Home') {
        destination = disponibles[0];
      } else if (evenement.key === 'End') {
        destination = disponibles[disponibles.length - 1];
      } else if (evenement.key === 'PageUp' || evenement.key === 'PageDown') {
        const courant = groupes.findIndex(groupe => groupe.membres.indexOf(noeud) >= 0);
        if (courant < 0) return;
        const sens = evenement.key === 'PageDown' ? 1 : -1;
        for (let pas = 1; pas <= groupes.length; pas += 1) {
          const index = (courant + sens * pas + groupes.length * 2) % groupes.length;
          const candidat = groupes[index].membres.find(estDisponible);
          if (candidat) {
            destination = candidat;
            break;
          }
        }
      } else {
        return;
      }

      if (!destination || destination === noeud) return;
      evenement.preventDefault();
      evenement.stopPropagation();
      viser(destination);
    });
  }

  /* E059-10 — Filet de restauration : après un re-rendu complet, le focus
     orphelin retombe sur <body> ; on le renvoie vers le dernier nœud connu. */
  if (derniereCleFocus) {
    const actif = document.activeElement;
    const orphelin = !actif || actif === document.body || actif === document.documentElement;
    if (orphelin) {
      const cible = noeuds.find(node => node.dataset.constKey === derniereCleFocus && estDisponible(node));
      if (cible && viser(cible)) cible.dataset.e059Restored = '1';
    }
  }

  /* Mode sobre : état lu une fois et consommé par la feuille unique. */
  field.dataset.e059Motion = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '0' : '1';
});
