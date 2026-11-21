import { register } from './registry.js';

/* Lentille E034 — structure sémantique appliquée aux arêtes du graphe de la vue
   Constellation. Dix chantiers locaux et déterministes : typage des relations,
   rôles d'extrémité, titres SVG, appariement des nœuds, description du graphe,
   glossaire défini à la première occurrence, statut textuel au focus, légende
   des relations, récapitulatif agrégé et activation atomique. Zéro réseau,
   zéro aléa, zéro horloge, zéro journalisation. Greffon tolérant. */

const CSS_ID = 'constellation-e034';
const SELECT_FIELD = '.constellation-field';
const SELECT_HEAD = '.constellation-head';
const SELECT_SVG = '.constellation-edges';
const SELECT_EDGES = '.constellation-edges line';
const SELECT_SUNS = '.const-layer-suns';
const SELECT_PLANETS = '.const-layer-planets';
const SELECT_MOONS = '.const-layer-moons';
const TOL = 0.6; /* tolérance d'appariement, en points de pourcentage. */

/* Vocabulaire contrôlé : un seul jeu de libellés pour toute la lentille. */
const VOCAB = {
  sun: { role: 'ère', pluriel: 'ères' },
  planet: { role: 'repère', pluriel: 'repères' },
  moon: { role: 'point vérifié', pluriel: 'points vérifiés' },
};

/* Lecture d'une coordonnée en pourcentage déposée par la vue. */
function pourcent(valeur) {
  const nombre = parseFloat(valeur == null ? '' : String(valeur));
  return Number.isFinite(nombre) ? Math.round(nombre * 100) / 100 : 0;
}

/* Création de nœud par le contrat ctx.el, avec repli silencieux. */
function fabriquer(ctx, balise, classe, texte) {
  if (typeof ctx.el === 'function') return ctx.el(balise, classe, texte);
  const noeud = ctx.layout.ownerDocument.createElement(balise);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

/* Collecte des boutons d'un calque, appariés à un rôle sémantique. */
function collectionner(champ, selecteur, role) {
  const calque = champ.querySelector(selecteur);
  if (!calque || typeof calque.querySelectorAll !== 'function') return [];
  return Array.from(calque.querySelectorAll('button')).map((noeud) => ({
    role,
    noeud,
    cle: (noeud.dataset && noeud.dataset.constKey) || '',
    libelle: (noeud.dataset && noeud.dataset.label) || '',
    x: pourcent(noeud.style.getPropertyValue('--x')),
    y: pourcent(noeud.style.getPropertyValue('--y')),
  }));
}

/* Appariement d'un point à un nœud, avec tolérance bornée. */
function apparier(enregistrements, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (const enregistrement of enregistrements) {
    if (Math.abs(enregistrement.x - x) <= TOL && Math.abs(enregistrement.y - y) <= TOL) {
      return enregistrement;
    }
  }
  return null;
}

/* Rôles d'extrémité déduits de la nature de l'arête. */
function rolesPour(nature) {
  return nature === 'moon'
    ? [VOCAB.planet.role, VOCAB.moon.role]
    : [VOCAB.sun.role, VOCAB.planet.role];
}

/* Phrase de relation, construite une seule fois par arête. */
function phraseRelation(relation) {
  return 'Arête ' + (relation.index + 1) + ' : relation ' + relation.fromRole +
    ' vers ' + relation.toRole +
    (relation.cible && relation.cible.libelle ? ' · ' + relation.cible.libelle : '') + '.';
}

register('E034', (ctx) => {
  /* Contrat : sans layout exploitable, aucun ajout DOM n'est tenté. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;

  let champ;
  let entete;
  let svg;
  let edges;
  try {
    champ = layout.querySelector(SELECT_FIELD);
    entete = layout.querySelector(SELECT_HEAD);
    svg = champ ? champ.querySelector(SELECT_SVG) : null;
    edges = svg ? Array.from(svg.querySelectorAll(SELECT_EDGES)) : [];
  } catch {
    return;
  }
  if (!champ) return;

  const soleils = collectionner(champ, SELECT_SUNS, VOCAB.sun.role);
  const planetes = collectionner(champ, SELECT_PLANETS, VOCAB.planet.role);
  const lunes = collectionner(champ, SELECT_MOONS, VOCAB.moon.role);
  const noeuds = soleils.concat(planetes, lunes);

  /* Chaque arête est décrite une fois : nature, rôles et nœuds appariés. */
  const relations = edges.map((ligne, index) => {
    const nature = ligne.classList.contains('is-moon') ? 'moon' : 'path';
    const roles = rolesPour(nature);
    const source = apparier(noeuds, pourcent(ligne.getAttribute('x1')), pourcent(ligne.getAttribute('y1')));
    const cible = apparier(noeuds, pourcent(ligne.getAttribute('x2')), pourcent(ligne.getAttribute('y2')));
    return {
      index,
      ligne,
      nature,
      fromRole: roles[0],
      toRole: roles[1],
      source,
      cible,
      texte: '',
    };
  });
  relations.forEach((relation) => { relation.texte = phraseRelation(relation); });

  const compte = {
    path: relations.filter((relation) => relation.nature === 'path').length,
    moon: relations.filter((relation) => relation.nature === 'moon').length,
  };
  const resume = relations.length + ' arête' + (relations.length > 1 ? 's' : '') +
    ' · ' + compte.path + ' ' + VOCAB.planet.pluriel + ' reliés à une ' + VOCAB.sun.role +
    ' · ' + compte.moon + ' ' + VOCAB.moon.pluriel + ' reliés à un ' + VOCAB.planet.role + '.';

  /* Une seule feuille partagée par les dix chantiers ; tout est neutralisé
     tant que l'attribut final data-e034-ready n'a pas été posé. */
  try {
    if (typeof ctx.css === 'function') {
      ctx.css(CSS_ID, `
/* E034-06 — glossaire sémantique des types de nœuds et de relations. */
.constellation-layout[data-e034-ui="1"] #e034-glossaire {
  margin: 6px 0 0; padding: 6px 9px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255, 255, 255, .02); font-size: 8px; color: var(--muted-2);
}
.constellation-layout[data-e034-ui="1"] #e034-glossaire dt {
  display: inline; margin: 0 4px 0 0; color: var(--ink-soft);
}
.constellation-layout[data-e034-ui="1"] #e034-glossaire dt::after { content: ' : '; }
.constellation-layout[data-e034-ui="1"] #e034-glossaire dd {
  display: inline; margin: 0 10px 0 0;
}
.constellation-layout[data-e034-ui="1"] #e034-glossaire dfn {
  font-style: normal; font-weight: 600; color: var(--gold-bright);
}
/* E034-07 — statut textuel de la relation focalisée. */
.constellation-layout[data-e034-ui="1"] #e034-statut {
  margin: 5px 0 0; min-height: 1.3em;
  font-size: 9px; color: var(--ink-soft); font-variant-numeric: tabular-nums;
}
.constellation-layout[data-e034-ui="1"] #e034-statut[data-e034-motion="on"] {
  transition: opacity .18s ease;
}
/* E034-08 — légende des relations, complément textuel du graphe. */
.constellation-layout[data-e034-ui="1"] #e034-legend {
  display: flex; flex-wrap: wrap; gap: 2px 14px;
  margin: 4px 0 0; padding: 0; list-style: none;
  font-size: 8px; color: var(--muted-2);
}
.constellation-layout[data-e034-ui="1"] #e034-legend li { white-space: nowrap; }
.constellation-layout[data-e034-ui="1"] #e034-legend strong {
  color: var(--ink-soft); font-weight: 600;
}
/* E034-09 — récapitulatif agrégé. */
.constellation-layout[data-e034-ui="1"] #e034-resume {
  margin: 5px 0 0; font-size: 8px; color: var(--muted-2);
}
`);
    }
  } catch {
    return;
  }

  /* E034-01 — typage sémantique de chaque arête. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-e034-kind', relation.nature);
  });

  /* E034-02 — rôles d'extrémité portés directement par l'arête. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-e034-from', relation.fromRole);
    relation.ligne.setAttribute('data-e034-to', relation.toRole);
  });

  /* E034-03 — titre SVG décrivant la relation en texte, une seule fois. */
  try {
    relations.forEach((relation) => {
      const ligne = relation.ligne;
      const ns = ligne.namespaceURI;
      if (!ns || typeof ctx.layout.ownerDocument.createElementNS !== 'function') return;
      if (ligne.querySelector('title')) return;
      const titre = ctx.layout.ownerDocument.createElementNS(ns, 'title');
      titre.id = 'e034-titre-' + (relation.index + 1);
      titre.textContent = relation.texte;
      ligne.appendChild(titre);
    });
  } catch {
    /* Le titre est structurel : son échec n'annule aucun autre chantier. */
  }

  /* E034-04 — appariement des nœuds source et cible, exposé en attributs. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-e034-source', relation.source ? relation.source.cle : 'inconnu');
    relation.ligne.setAttribute('data-e034-target', relation.cible ? relation.cible.cle : 'inconnu');
    relation.ligne.setAttribute('data-e034-target-role', relation.cible ? relation.cible.role : 'inconnu');
  });

  /* E034-05 — description textuelle de la topologie portée par le SVG. */
  try {
    if (svg) {
      svg.removeAttribute('aria-hidden');
      svg.setAttribute('role', 'group');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('aria-label',
        'Graphe de ' + soleils.length + ' ' + VOCAB.sun.pluriel + ', ' +
        planetes.length + ' ' + VOCAB.planet.pluriel + ' et ' +
        lunes.length + ' ' + VOCAB.moon.pluriel + '. ' + resume);
      svg.setAttribute('data-e034-nodes', String(noeuds.length));
    }
  } catch {
    /* La description est facultative ; le champ garde son aria-label d'origine. */
  }

  /* E034-06 — glossaire : chaque terme est défini à sa première occurrence. */
  try {
    if (entete && !layout.querySelector('#e034-glossaire')) {
      const glossaire = fabriquer(ctx, 'dl', 'e034-glossaire', '');
      glossaire.id = 'e034-glossaire';
      glossaire.setAttribute('aria-label', 'Vocabulaire des relations du graphe.');
      [
        [VOCAB.sun.role, 'ère sélectionnée, origine des arêtes de repère'],
        [VOCAB.planet.role, 'repère de l’ère, origine des arêtes de point'],
        [VOCAB.moon.role, 'point vérifié, extrémité des arêtes lunaires'],
        ['arête', 'relation orientée entre deux types de nœuds'],
      ].forEach((entree) => {
        const terme = fabriquer(ctx, 'dt', '', '');
        const definition = fabriquer(ctx, 'dfn', '', entree[0]);
        terme.appendChild(definition);
        glossaire.appendChild(terme);
        glossaire.appendChild(fabriquer(ctx, 'dd', '', entree[1]));
      });
      entete.appendChild(glossaire);
    }
  } catch {
    /* Le glossaire est facultatif : le récit de la vue reste lisible. */
  }

  /* E034-07 — statut textuel mis à jour au focus, par délégation. */
  try {
    if (entete && !layout.querySelector('#e034-statut')) {
      const statut = fabriquer(ctx, 'p', 'e034-statut',
        'Focalisez un repère ou un point vérifié pour lire la relation de son arête.');
      statut.id = 'e034-statut';
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      const motionOff = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
      statut.setAttribute('data-e034-motion', motionOff ? 'off' : 'on');
      statut.dataset.e034Repos = statut.textContent;
      entete.appendChild(statut);

      const calques = [champ.querySelector(SELECT_PLANETS), champ.querySelector(SELECT_MOONS)]
        .filter(Boolean);
      calques.forEach((calque) => {
        if (calque.hasAttribute('data-e034-relation-delegated')) return;
        calque.setAttribute('data-e034-relation-delegated', '1');
        const decrire = (evenement, actif) => {
          const cible = evenement.target;
          if (!cible || typeof cible.closest !== 'function') return;
          const noeud = cible.closest('button');
          if (!noeud || !calque.contains(noeud)) return;
          const x = pourcent(noeud.style.getPropertyValue('--x'));
          const y = pourcent(noeud.style.getPropertyValue('--y'));
          if (!actif) {
            statut.textContent = statut.dataset.e034Repos;
            return;
          }
          const relation = relations.find((element) =>
            element.cible && Math.abs(element.cible.x - x) <= TOL && Math.abs(element.cible.y - y) <= TOL);
          statut.textContent = relation ? relation.texte : statut.dataset.e034Repos;
        };
        calque.addEventListener('focusin', (evenement) => decrire(evenement, true));
        calque.addEventListener('focusout', (evenement) => decrire(evenement, false));
      });
    }
  } catch {
    /* Le statut est facultatif : aucun écouteur orphelin n'est laissé derrière. */
  }

  /* E034-08 — légende textuelle des deux types de relation. */
  try {
    if (entete && !layout.querySelector('#e034-legend')) {
      const legend = fabriquer(ctx, 'ul', 'e034-legend', '');
      legend.id = 'e034-legend';
      legend.setAttribute('aria-label', 'Légende des relations du graphe.');
      [
        [VOCAB.sun.role + ' → ' + VOCAB.planet.role, ' Repère de l’ère active'],
        [VOCAB.planet.role + ' → ' + VOCAB.moon.role, ' Point vérifié du repère'],
      ].forEach((entree) => {
        const item = fabriquer(ctx, 'li', '', '');
        item.appendChild(fabriquer(ctx, 'strong', '', entree[0]));
        item.appendChild(ctx.layout.ownerDocument.createTextNode(entree[1]));
        legend.appendChild(item);
      });
      entete.appendChild(legend);
    }
  } catch {
    /* La légende est facultative : les titres SVG décrivent déjà les arêtes. */
  }

  /* E034-09 — récapitulatif agrégé, calculé depuis les relations. */
  try {
    if (entete && !layout.querySelector('#e034-resume')) {
      const synthese = fabriquer(ctx, 'p', 'e034-resume', resume);
      synthese.id = 'e034-resume';
      entete.appendChild(synthese);
    }
  } catch {
    /* Le récapitulatif est facultatif : les attributs agrégés restent lisibles. */
  }
  if (svg) svg.setAttribute('data-e034-summary', compte.path + '/' + compte.moon);

  /* E034-10 — activation atomique : dernière écriture, après tous les ajouts. */
  champ.setAttribute('data-e034-count', String(relations.length));
  layout.setAttribute('data-e034-ui', '1');
  champ.setAttribute('data-e034-ready', '1');
});
