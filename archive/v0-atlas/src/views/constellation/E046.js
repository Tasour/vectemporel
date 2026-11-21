import { register } from './registry.js';

/* Lentille E046 — Gestion de l'état appliquée à la légende de la vue
 * Constellation. Dix chantiers : magasin central, réducteur pur, abonnés et
 * rendu dérivé, historique annuler/rétablir, sélection exclusive en
 * radiogroupe, bascule de détail, ordre dérivé, instantané sérialisé,
 * hydratation depuis l'hôte, statut et bilan. Module autonome et tolérant :
 * zéro réseau, zéro source d'aléa, zéro appel de débogage, aucun minuteur ni
 * boucle d'animation propre. Seul le contexte fourni est utilisé.
 */

const PANEL_ID = 'e046-panel';
const STATUS_ID = 'e046-status';
const BADGE_ID = 'e046-badge';
const SNAPSHOT_ID = 'e046-snapshot';
const HELP_ID = 'e046-help';

const ORDRES = ['origine', 'alphabetique', 'inverse'];
const LIMITE_HISTORIQUE = 16;

const COURTS = {
  'Ère': 'Ère',
  'Repère': 'Repère',
  'Point vérifié du repère': 'Point vérifié',
};
const GLYPHES = {
  'legend-sun': '☼',
  'legend-planet': '◆',
  'legend-moon': '○',
};

const CSS = `
/* E046-01 — point d'ancrage unique du magasin sur la légende existante. */
.constellation-legend.e046-legend{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:0;padding:2px 0}
/* E046-02 — le rendu dérivé n'écrit que des attributs, jamais de style en dur. */
.e046-item{display:inline-flex;align-items:center;gap:4px;padding:1px 3px;border:1px solid transparent;border-radius:6px;line-height:1.3;transition:background-color .18s linear,border-color .18s linear}
/* E046-03 — abonnement : l'entrée sélectionnée est peinte via data-e046-selected. */
.e046-item[data-e046-selected="1"]{border-color:#e6b96f;background:rgba(230,185,111,.12);color:#f5e6c4}
/* E046-04 — historique : les commandes restent désactivées quand leur pile est vide. */
.e046-cmd{min-width:36px;min-height:36px;padding:0 10px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
.e046-cmd:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.e046-cmd:disabled{opacity:.45;cursor:not-allowed}
/* E046-05 — radiogroupe : une seule entrée cochée, focus visible. */
.e046-item[role="radio"]{cursor:pointer}
.e046-item[role="radio"]:focus-visible{outline:2px solid #e6b96f;outline-offset:1px}
.e046-item::before{content:attr(data-e046-glyph);display:inline-grid;place-items:center;width:clamp(12px,1.6vw,16px);height:clamp(12px,1.6vw,16px);border:1px solid rgba(230,185,111,.55);border-radius:4px;background:rgba(230,185,111,.08);color:#e6b96f;font-size:9px;line-height:1}
/* E046-06 — détail : le libellé abrégé remplace le libellé complet sans altérer le nom accessible. */
.e046-item[data-e046-detail="0"]{font-size:0}
.e046-item[data-e046-detail="0"]::after{content:attr(data-e046-court);font-size:9px}
.e046-item[data-e046-detail="1"]::after{content:none}
/* E046-07 — ordre dérivé : classement par propriété order, sans déplacer les nœuds. */
.e046-item[data-e046-pos="1"]{order:1}
.e046-item[data-e046-pos="2"]{order:2}
.e046-item[data-e046-pos="3"]{order:3}
/* E046-08 — instantané sérialisé affiché en monocase lisible. */
#e046-snapshot{flex:1 1 100%;margin:0;color:var(--muted-2,#94a3b8);font:9px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
/* E046-09 — hydratation : la préférence de mouvement neutralise la transition. */
.e046-legend[data-e046-motion="reduit"] .e046-item{transition:none}
@media (prefers-reduced-motion: reduce){.e046-item{transition:none}}
/* E046-10 — panneau, statut annoncé et badge chiffré, tous préfixés e046-. */
#e046-panel{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:6px 0 2px;padding:6px 8px;border:1px solid rgba(230,185,111,.30);border-radius:8px;background:rgba(9,13,20,.80)}
#e046-status{flex:1 1 260px;margin:0;color:#cbd5e1;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
#e046-badge{padding:1px 5px;border:1px solid rgba(178,139,221,.45);border-radius:5px;color:#c3a6e6;font-size:8px;font-variant-numeric:tabular-nums;white-space:nowrap}
.e046-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){
  #e046-panel{padding:4px 6px}
  #e046-status{flex-basis:100%;font-size:9px}
}
`;

/* Noyau sérialisable de l'état : seules ces cinq valeurs caractérisent la
 * légende, l'historique étant conservé à part. */
function noyau(etat) {
  return {
    selection: etat.selection,
    detail: etat.detail,
    ordreIndex: etat.ordreIndex,
    mouvement: etat.mouvement,
    version: etat.version,
  };
}

/* E046-02 — réducteur pur : aucune mutation de l'état reçu, aucune lecture du
 * DOM, aucun effet de bord. Chaque transition renvoie un nouvel objet. */
function reduire(etat, action) {
  const type = action && action.type;

  if (type === 'UNDO') {
    if (!etat.passes.length) return etat;
    const passes = etat.passes.slice(0, -1);
    const precedent = etat.passes[etat.passes.length - 1];
    return Object.assign({}, etat, precedent, {
      passes: passes,
      futurs: [noyau(etat)].concat(etat.futurs).slice(0, LIMITE_HISTORIQUE),
    });
  }
  if (type === 'REDO') {
    if (!etat.futurs.length) return etat;
    const futurs = etat.futurs.slice(1);
    const suivant = etat.futurs[0];
    return Object.assign({}, etat, suivant, {
      passes: etat.passes.concat([noyau(etat)]).slice(-LIMITE_HISTORIQUE),
      futurs: futurs,
    });
  }
  if (type === 'SYNC') {
    const total = action.total;
    if (!Number.isInteger(total) || total < 0 || total === etat.total) return etat;
    return Object.assign({}, etat, {
      total: total,
      selection: Math.min(etat.selection, Math.max(0, total - 1)),
    });
  }
  if (type === 'SET_MOUVEMENT') {
    if (action.valeur !== 'reduit' && action.valeur !== 'complet') return etat;
    if (action.valeur === etat.mouvement) return etat;
    return Object.assign({}, etat, { mouvement: action.valeur });
  }

  const changements = {};
  if (type === 'SELECT') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= etat.total) return etat;
    if (action.index === etat.selection) return etat;
    changements.selection = action.index;
  } else if (type === 'TOGGLE_DETAIL') {
    changements.detail = !etat.detail;
  } else if (type === 'CYCLE_ORDRE') {
    changements.ordreIndex = (etat.ordreIndex + 1) % ORDRES.length;
  } else {
    return etat;
  }

  const base = noyau(etat);
  const apres = Object.assign({}, base, changements, { version: etat.version + 1 });
  return Object.assign({}, etat, apres, {
    passes: etat.passes.concat([base]).slice(-LIMITE_HISTORIQUE),
    futurs: [],
  });
}

/* E046-01 — magasin central : une seule source de vérité, exposée par lire()
 * et modifiable seulement par dispatcher(). Un abonné unique et remplaçable
 * garantit que le rendu cible toujours les nœuds du rendu courant. */
function creerMagasin(etat) {
  let courant = etat;
  let abonnes = [];
  return {
    lire: () => courant,
    reinitialiserAbonnes: () => { abonnes = []; },
    abonner: (fn) => {
      if (typeof fn === 'function' && abonnes.indexOf(fn) < 0) abonnes.push(fn);
    },
    dispatcher: (action) => {
      const suivant = reduire(courant, action);
      if (suivant === courant) return courant;
      courant = suivant;
      abonnes.slice().forEach((fn) => {
        try { fn(courant, action); } catch (erreur) { /* tolérance locale */ }
      });
      return courant;
    },
  };
}

const magasins = new WeakMap();
function magasinPour(legend, creerInitial) {
  let magasin = null;
  try { magasin = magasins.get(legend); } catch (erreur) { magasin = null; }
  if (!magasin) {
    magasin = creerMagasin(creerInitial());
    try { magasins.set(legend, magasin); } catch (erreur) { /* ma mémoire */ }
  }
  return magasin;
}

/* E046-09 — état initial reconstruit depuis le DOM et l'hôte, sans donnée
 * inventée : le nombre d'entrées est lu, la préférence de mouvement est
 * transmise par ctx. */
function creerEtatInitial(termes, reduit) {
  return {
    total: termes.length,
    selection: 0,
    detail: true,
    ordreIndex: 0,
    mouvement: reduit ? 'reduit' : 'complet',
    version: 0,
    passes: [],
    futurs: [],
  };
}

/* E046-08 — instantané à clé stable : l'ordre d'écriture est fixe, donc deux
 * états identiques produisent toujours la même chaîne. */
function instantane(etat) {
  return 'selection=' + etat.selection
    + ';detail=' + (etat.detail ? 1 : 0)
    + ';ordre=' + (ORDRES[etat.ordreIndex] || ORDRES[0])
    + ';mouvement=' + etat.mouvement
    + ';version=' + etat.version;
}

function lireTexte(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function positionsPour(etat, termes) {
  const indices = termes.map((item, index) => index);
  const ordre = ORDRES[etat.ordreIndex] || ORDRES[0];
  if (ordre === 'alphabetique') {
    indices.sort((a, b) => {
      const gauche = lireTexte(termes[a]).toLowerCase();
      const droite = lireTexte(termes[b]).toLowerCase();
      return gauche < droite ? -1 : (gauche > droite ? 1 : 0);
    });
  } else if (ordre === 'inverse') {
    indices.reverse();
  }
  const positions = new Array(termes.length);
  indices.forEach((index, rang) => { positions[index] = rang + 1; });
  return positions;
}

function assureNode(id, tag, className, parent, factory) {
  let node = null;
  try { node = document.getElementById(id); } catch (erreur) { node = null; }
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

register('E046', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM sans layout valide. */
  if (!ctx || !ctx.layout || typeof ctx.css !== 'function') return;

  try {
    const layout = ctx.layout;
    const legend = layout.querySelector ? layout.querySelector('.constellation-legend') : null;
    if (!legend) return;
    const factory = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, className, text) => {
          const node = document.createElement(tag);
          if (className) node.className = className;
          if (text !== undefined) node.textContent = text;
          return node;
        };
    const reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
    const termes = Array.from(legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon'));

    /* Feuille de style unique de la lentille, identifiant réservé. */
    ctx.css('constellation-e046', CSS);

    /* E046-01 — la légende devient le point d'ancrage du magasin. */
    legend.classList.add('e046-legend');
    if (!legend.hasAttribute('role')) legend.setAttribute('role', 'radiogroup');
    if (!legend.hasAttribute('aria-label')) {
      legend.setAttribute('aria-label', 'Légende de la constellation, état contrôlable');
    }
    legend.dataset.e046Store = 'actif';
    const magasin = magasinPour(legend, () => creerEtatInitial(termes, reduit));

    /* E046-05 — chaque entrée porte son nom complet, sa forme courte et son
     * glyphe, tous déterminés depuis la classe d'origine et le texte réel. */
    termes.forEach((item, index) => {
      const plein = lireTexte(item) || 'Élément de légende';
      let glyphe = '•';
      Object.keys(GLYPHES).forEach((key) => {
        if (item.classList.contains(key)) glyphe = GLYPHES[key];
      });
      item.dataset.e046Plein = plein;
      item.dataset.e046Court = COURTS[plein] || (plein.split(/\s+/)[0] || 'Élément');
      item.dataset.e046Glyphe = glyphe;
      item.dataset.e046Index = String(index + 1);
      item.classList.add('e046-item');
      if (!item.hasAttribute('role')) item.setAttribute('role', 'radio');
      item.setAttribute('aria-label', plein);
    });
    legend.dataset.e046Items = String(termes.length);

    /* E046-03 — rendu dérivé : l'état est traduit en attributs et en textes,
     * jamais en déplacement de nœuds ni en style direct. */
    function rendre(etat) {
      const positions = positionsPour(etat, termes);
      const ordre = ORDRES[etat.ordreIndex] || ORDRES[0];
      legend.dataset.e046Selection = String(etat.selection);
      legend.dataset.e046Detail = etat.detail ? '1' : '0';
      legend.dataset.e046Ordre = ordre;
      legend.dataset.e046Snapshot = instantane(etat);
      legend.dataset.e046Motion = etat.mouvement;

      termes.forEach((item, index) => {
        const selectionne = index === etat.selection;
        item.dataset.e046Selected = selectionne ? '1' : '0';
        item.dataset.e046Detail = etat.detail ? '1' : '0';
        item.dataset.e046Pos = String(positions[index]);
        item.setAttribute('aria-checked', selectionne ? 'true' : 'false');
        item.tabIndex = selectionne ? 0 : -1;
      });

      annuler.disabled = etat.passes.length === 0;
      retablir.disabled = etat.futurs.length === 0;
      detail.setAttribute('aria-pressed', etat.detail ? 'false' : 'true');
      detail.textContent = etat.detail ? 'Abréger le détail' : 'Afficher le détail';
      ordreBouton.textContent = 'Ordre : ' + ordre;
      badge.textContent = termes.length + ' entrées · ' + ordre + ' · v' + etat.version;
      statut.textContent = 'État : entrée ' + (etat.selection + 1) + '/' + termes.length
        + ' sélectionnée, détail ' + (etat.detail ? 'complet' : 'abrégé')
        + ', ordre ' + ordre + ', version ' + etat.version
        + ', annulations ' + etat.passes.length
        + ', rétablissements ' + etat.futurs.length + '.';
      empreinte.textContent = 'Instantané : ' + instantane(etat);
    }

    /* E046-10 — panneau de commandes, statut annoncé, badge et description
     * vocale : l'état devient audible et vérifiable, pas seulement visuel. */
    const aide = assureNode(HELP_ID, 'p', 'e046-sr', layout, factory);
    aide.textContent = 'Légende à état contrôlé : une seule entrée sélectionnée à la fois, détail condensable, trois ordres d’affichage, annulation et rétablissement. Flèches gauche et droite pour changer la sélection, Entrée pour basculer le détail, A pour changer l’ordre, U pour annuler, R pour rétablir.';
    const decrits = (legend.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (decrits.indexOf(HELP_ID) < 0) {
      decrits.push(HELP_ID);
      legend.setAttribute('aria-describedby', decrits.join(' '));
    }

    const panneau = assureNode(PANEL_ID, 'div', null, layout, factory);
    panneau.setAttribute('role', 'group');
    panneau.setAttribute('aria-label', 'Commandes d’état de la légende');
    const annuler = assureNode('e046-undo', 'button', 'e046-cmd', panneau, factory);
    annuler.type = 'button';
    annuler.textContent = 'Annuler';
    const retablir = assureNode('e046-redo', 'button', 'e046-cmd', panneau, factory);
    retablir.type = 'button';
    retablir.textContent = 'Rétablir';
    const detail = assureNode('e046-detail-toggle', 'button', 'e046-cmd', panneau, factory);
    detail.type = 'button';
    detail.setAttribute('aria-pressed', 'false');
    detail.textContent = 'Abréger le détail';
    const ordreBouton = assureNode('e046-ordre', 'button', 'e046-cmd', panneau, factory);
    ordreBouton.type = 'button';
    ordreBouton.textContent = 'Ordre : origine';
    const statut = assureNode(STATUS_ID, 'p', null, panneau, factory);
    statut.setAttribute('role', 'status');
    statut.setAttribute('aria-live', 'polite');
    const badge = assureNode(BADGE_ID, 'span', null, panneau, factory);
    badge.setAttribute('aria-hidden', 'true');
    const empreinte = assureNode(SNAPSHOT_ID, 'p', null, panneau, factory);

    /* Un seul abonné actif, remplacé à chaque rendu : le magasin survit aux
     * re-rendus mais pointe toujours sur les nœuds courants. */
    magasin.reinitialiserAbonnes();
    magasin.abonner(rendre);

    /* E046-09 — hydratation : resynchronisation du nombre d'entrées et de la
     * préférence de mouvement fournie par l'hôte. */
    magasin.dispatcher({ type: 'SYNC', total: termes.length });
    if (reduit) magasin.dispatcher({ type: 'SET_MOUVEMENT', valeur: 'reduit' });

    /* E046-04 — les deux piles d'historique pilotent directement l'état des
     * boutons via le rendu dérivé. */
    [[annuler, 'UNDO'], [retablir, 'REDO'],
      [detail, 'TOGGLE_DETAIL'], [ordreBouton, 'CYCLE_ORDRE']].forEach((paire) => {
      const bouton = paire[0];
      const type = paire[1];
      if (bouton.dataset.e046Bound === '1') return;
      bouton.dataset.e046Bound = '1';
      bouton.addEventListener('click', () => { magasin.dispatcher({ type: type }); });
    });

    /* E046-05 — sélection exclusive : clic et flèches envoient la même action
     * SELECT, avec un équivalent clavier complet et un focus déplacé. */
    if (legend.dataset.e046BoundClicks !== '1') {
      legend.dataset.e046BoundClicks = '1';
      termes.forEach((item, index) => {
        item.addEventListener('click', () => { magasin.dispatcher({ type: 'SELECT', index: index }); });
      });
    }
    if (legend.dataset.e046BoundKeys !== '1') {
      legend.dataset.e046BoundKeys = '1';
      legend.addEventListener('keydown', (event) => {
        const cle = event && event.key;
        const etat = magasin.lire();
        const total = Math.max(1, termes.length);
        if (cle === 'ArrowRight' || cle === 'ArrowDown') {
          event.preventDefault();
          magasin.dispatcher({ type: 'SELECT', index: (etat.selection + 1) % total });
        } else if (cle === 'ArrowLeft' || cle === 'ArrowUp') {
          event.preventDefault();
          magasin.dispatcher({ type: 'SELECT', index: (etat.selection + total - 1) % total });
        } else if (cle === 'Enter' || cle === ' ') {
          event.preventDefault();
          magasin.dispatcher({ type: 'TOGGLE_DETAIL' });
        } else if (cle === 'a' || cle === 'A') {
          magasin.dispatcher({ type: 'CYCLE_ORDRE' });
        } else if (cle === 'u' || cle === 'U') {
          magasin.dispatcher({ type: 'UNDO' });
        } else if (cle === 'r' || cle === 'R') {
          magasin.dispatcher({ type: 'REDO' });
        }
        const courant = magasin.lire();
        const cible = termes[courant.selection];
        if (cible && typeof cible.focus === 'function') {
          try { cible.focus(); } catch (erreur) { /* tolérance locale */ }
        }
      });
    }

    /* E046-06 — la bascule de détail est une commande indépendante :
     * aria-pressed est ici légitime, la sélection exclusive restant un
     * radiogroupe et non une bascule. */
    /* E046-07 — l'ordre est une valeur d'état dérivée : CYCLE_ORDRE parcourt
     * origine, alphabetique, inverse ; rendre() écrit data-e046-pos. */
    /* E046-08 — l'instantané est recalculé à chaque mutation et exposé à la
     * fois sur la légende et dans le paragraphe de mesure. */

    rendre(magasin.lire());
  } catch (erreur) {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
