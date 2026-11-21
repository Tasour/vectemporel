import { register } from './registry.js';

/* V2 lentille E075 — Accessibilité ARIA avancée et navigation lecteur d'écran
   (complément de la passe 1). Celle-ci traite déjà : fil d'Ariane, nom du fil,
   position/taille des items, certitude par point, annonce de la lecture auto,
   traçabilité étiquetée, langue fr, aria-controls des commandes, points
   restants et structuration à la demande. La V2 propose dix chantiers neufs et
   distincts : région landmark des outils, barre d'outils de lecture, aide du
   champ de recherche, pastille de certitude, lien d'évitement, statut atomique,
   en-tête du fil, roledescription du fil, description du repère courant et
   légende structurée en liste. Tous non destructifs : sans ce module la vue
   reste intégralement lisible. Préfixes : classes recit-v2-e075-, ids DOM
   v2-e075- (jamais les ids e075- de la passe 1, qui tourne sur le même DOM).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E075-01 — Région landmark des outils (attributs ARIA, voir JS). */
.recit-layout .recit-v2-e075-tools > .c3a-group-label{letter-spacing:.04em}

/* E075-02 — Barre d'outils : cibles tactiles préservées. */
.recit-layout .recit-v2-e075-toolbar > button{min-height:36px}

/* E075-03 — Aide du champ de recherche : texte masqué, non porteur de style. */
.recit-v2-e075-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E075-04 — Pastille de certitude étiquetée (attribut ARIA, voir JS). */

/* E075-05 — Lien d'évitement : masqué au repos, visible et cliquable au focus. */
.recit-v2-e075-skip{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.recit-v2-e075-skip:focus{position:static;width:auto;height:auto;margin:0 0 8px;padding:8px 12px;overflow:visible;clip:auto;display:inline-block;min-height:36px;border:1px solid var(--gold-bright,#f5e9d0);border-radius:8px;background:var(--panel,#151922);color:var(--gold-bright,#f5e9d0);font:inherit;font-size:11px;line-height:1.3;text-decoration:none}
.recit-v2-e075-skip:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
@media (max-width:620px){.recit-v2-e075-skip:focus{min-height:40px}}

/* E075-06 — Statut de filtrage atomique (attribut ARIA, voir JS). */

/* E075-07 — Titre du fil promu en en-tête (attributs ARIA, voir JS). */

/* E075-08 — Rôledescription du fil (attribut ARIA, voir JS). */

/* E075-09 — Description du repère courant : texte masqué, voir E075-03. */

/* E075-10 — Légende en liste : sémantique restituée par les rôles, voir JS. */
.recit-layout .recit-v2-e075-legend[role="list"] p[role="listitem"]{margin:3px 0}
`;

let EL = null;

/* Fabrique un nœud via l'outil fourni par le registre, avec repli local. */
function make(tag, className, text) {
  if (EL && typeof EL === 'function') return EL(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function one(root, selector) {
  try {
    return (root && typeof root.querySelector === 'function') ? root.querySelector(selector) : null;
  } catch { return null; }
}

function all(root, selector) {
  try {
    return (root && typeof root.querySelectorAll === 'function') ? Array.from(root.querySelectorAll(selector)) : [];
  } catch { return []; }
}

/* Pose un attribut une seule fois, sans jamais écraser une valeur existante. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && typeof node.setAttribute === 'function' && !node.hasAttribute(name)) {
    node.setAttribute(name, value);
  }
}

/* Ajoute un jeton à une liste ARIA sans effacer les références voisines. */
function addToken(node, name, token) {
  if (!node || !token || typeof node.getAttribute !== 'function') return;
  const valeurs = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (valeurs.indexOf(token) >= 0) return;
  valeurs.push(token);
  node.setAttribute(name, valeurs.join(' '));
}

function textOf(node) {
  return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
}

/* Dépose (ou réutilise) un paragraphe masqué, toujours au même endroit. */
function hiddenPar(id, parent, texte) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = make('p', 'recit-v2-e075-sr-only', texte);
    noeud.id = id;
  } else {
    noeud.textContent = texte;
  }
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

register('E075', (ctx) => {
  const { layout, css, el } = ctx;
  EL = (el && typeof el === 'function') ? el : null;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e075', CSS); /* un seul appel, toutes les règles du module. */

    const corps = one(layout, '.recit-body');
    if (!corps) return;

    /* E075-01 — Région landmark nommée pour la recherche et les filtres. */
    const outils = one(corps, '#c3a-tools') || one(corps, '.c3a-tools');
    if (outils) {
      setOnce(outils, 'role', 'region');
      setOnce(outils, 'aria-label', 'Outils de recherche et de filtrage du fil');
      if (outils.classList && !outils.classList.contains('recit-v2-e075-tools')) {
        outils.classList.add('recit-v2-e075-tools');
      }
    }

    /* E075-02 — Les commandes forment une barre d'outils horizontale nommée. */
    const actions = one(corps, '.recit-actions');
    if (actions) {
      setOnce(actions, 'role', 'toolbar');
      setOnce(actions, 'aria-label', 'Commandes de lecture du point');
      setOnce(actions, 'aria-orientation', 'horizontal');
      if (actions.classList && !actions.classList.contains('recit-v2-e075-toolbar')) {
        actions.classList.add('recit-v2-e075-toolbar');
      }
    }

    /* E075-03 — Le champ de recherche est décrit par la dernière règle de la
       légende réelle, jamais par un texte inventé. */
    const recherche = one(corps, '#c3a-search') || one(corps, '.c3a-search');
    const legendes = all(corps, '.recit-legend p');
    if (recherche && legendes.length) {
      const aide = textOf(legendes[legendes.length - 1]);
      if (aide) {
        const noeud = hiddenPar('v2-e075-search-help', corps, `Aide au fil : ${aide}`);
        if (noeud) addToken(recherche, 'aria-describedby', noeud.id);
      }
    }

    /* E075-04 — La pastille de certitude porte un nom accessible explicite,
       construit depuis son propre texte visible. */
    const conf = one(corps, '.recit-conf');
    if (conf) {
      const libelle = textOf(conf);
      if (libelle) setOnce(conf, 'aria-label', `Certitude du point courant : ${libelle}.`);
    }

    /* E075-05 — Lien d'évitement clavier vers le titre réel du point. */
    const titre = document.getElementById('recit-point-title') || one(corps, '#recit-point-title');
    let saut = one(corps, '#v2-e075-skip');
    if (!saut) {
      saut = make('a', 'recit-v2-e075-skip', 'Aller au point courant');
      saut.id = 'v2-e075-skip';
      corps.insertBefore(saut, corps.firstChild);
    }
    if (titre && titre.id) setOnce(saut, 'href', `#${titre.id}`);

    /* E075-06 — Le compte du statut est énoncé en une seule fois à chaque filtrage. */
    const statut = one(corps, '#c3a-status') || one(corps, '.c3a-status');
    if (statut) setOnce(statut, 'aria-atomic', 'true');

    /* E075-07 — Le libellé du fil devient un en-tête navigable de niveau 2. */
    const titreFil = one(corps, '.recit-thread-title');
    if (titreFil) {
      setOnce(titreFil, 'role', 'heading');
      setOnce(titreFil, 'aria-level', '2');
    }

    /* E075-08 — Le fil garde son libellé mais précise sa nature au lecteur. */
    const fil = one(corps, '#c3a-thread') || one(corps, '.recit-thread-list');
    if (fil) setOnce(fil, 'aria-roledescription', 'fil de points du repère');

    /* E075-09 — Le repère courant est lu sur le titre, y compris aux points
       où le résumé #recit-context n'est pas affiché. */
    const meta = one(corps, '.recit-meta');
    if (titre && meta) {
      const repere = textOf(meta);
      if (repere) {
        const noeud = hiddenPar('v2-e075-repere', corps, `Repère courant : ${repere}.`);
        if (noeud) addToken(titre, 'aria-describedby', noeud.id);
      }
    }

    /* E075-10 — Les quatre paragraphes de légende deviennent une liste, pour
       une navigation par éléments sans modifier une seule lettre du texte. */
    const legend = one(corps, '.recit-legend');
    if (legend) {
      setOnce(legend, 'role', 'list');
      if (legend.classList && !legend.classList.contains('recit-v2-e075-legend')) {
        legend.classList.add('recit-v2-e075-legend');
      }
      all(legend, 'p').forEach((p) => setOnce(p, 'role', 'listitem'));
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
