import { register } from './registry.js';

/* Lentille V2 E034 — lecture sémantique et mesurée des arêtes du graphe.
   Seconde passe : dix chantiers inédits, tous implémentés, déterministes,
   sans réseau, sans aléa, sans minuteur ni journalisation. Greffon tolérant. */

/* Identifiant de l'unique feuille et sélecteurs de la vue. */
const CSS_ID = 'constellation-v2-e034';
const SELECT_FIELD = '.constellation-field';
const SELECT_HEAD = '.constellation-head';
const SELECT_SVG = '.constellation-edges';
const SELECT_EDGES = '.constellation-edges line';
const SELECT_SUNS = '.const-layer-suns';
const SELECT_PLANETS = '.const-layer-planets';
const SELECT_MOONS = '.const-layer-moons';

/* Vocabulaire contrôlé, en français, source unique des libellés. */
const VOCAB = {
  sun: { role: 'ère', pluriel: 'ères' },
  planet: { role: 'repère', pluriel: 'repères' },
  moon: { role: 'point vérifié', pluriel: 'points vérifiés' },
};

/* Huit secteurs, de 0° (Nord) à 315° (Nord-Ouest), par pas de 45°. */
const SECTEURS = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
const PORTEE_COURTE = 8;   /* unités du viewBox 0–100. */
const PORTEE_MOYENNE = 16; /* unités du viewBox 0–100. */
const TOL = 0.6;           /* tolérance d'appariement, en points de pourcentage. */

/* Arrondi déterministe à n décimales, avec repli à zéro. */
function arrondi(valeur, decimales) {
  const nombre = parseFloat(valeur == null ? '' : String(valeur));
  if (!Number.isFinite(nombre)) return 0;
  const facteur = Math.pow(10, decimales);
  return Math.round(nombre * facteur) / facteur;
}

/* Coordonnée en pourcentage normalisée sur deux décimales. */
function pourcent(valeur) {
  return arrondi(valeur, 2);
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

/* Appariement d'une extrémité à un nœud, avec tolérance bornée. */
function apparier(enregistrements, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (const enregistrement of enregistrements) {
    if (Math.abs(enregistrement.x - x) <= TOL && Math.abs(enregistrement.y - y) <= TOL) {
      return enregistrement;
    }
  }
  return null;
}

/* Cap orienté : 0° = Nord, 90° = Est, dans le repère écran (y vers le bas). */
function cap(relation) {
  const radians = Math.atan2(relation.x2 - relation.x1, -(relation.y2 - relation.y1));
  let degres = radians * 180 / Math.PI;
  if (degres < 0) degres += 360;
  return {
    degres: arrondi(degres, 0),
    secteur: SECTEURS[Math.round(degres / 45) % 8],
  };
}

/* Longueur euclidienne entre deux extrémités, en unités du viewBox. */
function mesurer(relation) {
  const dx = relation.x2 - relation.x1;
  const dy = relation.y2 - relation.y1;
  return arrondi(Math.sqrt(dx * dx + dy * dy), 1);
}

/* Classe de portée déduite de la longueur mesurée. */
function portee(valeur) {
  if (valeur <= PORTEE_COURTE) return 'courte';
  if (valeur <= PORTEE_MOYENNE) return 'moyenne';
  return 'longue';
}

register('E034', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

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

  /* Une seule description par arête, calculée une fois, sans horloge ni aléa. */
  const soleils = collectionner(champ, SELECT_SUNS, VOCAB.sun.role);
  const planetes = collectionner(champ, SELECT_PLANETS, VOCAB.planet.role);
  const lunes = collectionner(champ, SELECT_MOONS, VOCAB.moon.role);
  const noeuds = soleils.concat(planetes, lunes);

  const relations = edges.map((ligne, index) => {
    const classes = ligne.classList;
    const nature = classes && classes.contains('is-moon') ? 'moon' : 'path';
    const relation = {
      index,
      ligne,
      nature,
      id: 'v2e034-rel-' + (index + 1),
      x1: pourcent(ligne.getAttribute('x1')),
      y1: pourcent(ligne.getAttribute('y1')),
      x2: pourcent(ligne.getAttribute('x2')),
      y2: pourcent(ligne.getAttribute('y2')),
      saillante: !!(classes && classes.contains('is-path')),
      fromRole: nature === 'moon' ? VOCAB.planet.role : VOCAB.sun.role,
      toRole: nature === 'moon' ? VOCAB.moon.role : VOCAB.planet.role,
      niveau: nature === 'moon' ? 2 : 1,
      source: null,
      cible: null,
      ancrage: 'aucun',
      longueur: 0,
      portee: 'courte',
      angle: 0,
      orientation: SECTEURS[0],
    };
    relation.source = apparier(noeuds, relation.x1, relation.y1);
    relation.cible = apparier(noeuds, relation.x2, relation.y2);
    relation.ancrage = relation.source && relation.cible ? 'complet'
      : (relation.source || relation.cible ? 'partiel' : 'aucun');
    relation.longueur = mesurer(relation);
    relation.portee = portee(relation.longueur);
    const direction = cap(relation);
    relation.angle = direction.degres;
    relation.orientation = direction.secteur;
    return relation;
  });
  const total = relations.length;
  const nbPath = relations.filter((relation) => relation.nature === 'path').length;
  const nbMoon = relations.filter((relation) => relation.nature === 'moon').length;

  /* Feuille unique, neutralisée jusqu'à la pose finale de data-v2e034-ui. */
  try {
    css(CSS_ID, `
/* Feuille V2 — aucune règle ne s'applique avant l'attribut data-v2e034-ui="1". */
.v2e034-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire{width:100%;margin:8px 0 0;border-collapse:collapse;font-size:9px;color:var(--muted-2);font-variant-numeric:tabular-nums}
.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire caption{margin:0 0 4px;text-align:left;color:var(--ink-soft);font-size:9px}
.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire th,.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire td{padding:2px 6px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire thead th{color:var(--gold);font-weight:600;border-bottom-color:var(--gold)}
.constellation-layout[data-v2e034-ui="1"] #v2e034-inventaire tbody th{color:var(--ink-soft);font-weight:600}
.constellation-layout[data-v2e034-ui="1"] .v2e034-rose{margin:5px 0 0;font-size:9px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.constellation-layout[data-v2e034-ui="1"] .v2e034-lecture{margin:8px 0 0;padding:6px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.constellation-layout[data-v2e034-ui="1"] .v2e034-lecture h3{margin:0 0 4px;font-family:var(--serif);font-size:11px;font-weight:600;color:var(--gold-bright)}
.constellation-layout[data-v2e034-ui="1"] .v2e034-lecture p{margin:0 0 3px;font-size:9px;line-height:1.5;color:var(--muted-2)}
`);
  } catch {
    return;
  }

  /* E034-01 — Identifiant stable et déterministe porté par chaque arête. */
  relations.forEach((relation) => {
    relation.ligne.id = relation.id;
    relation.ligne.setAttribute('data-v2e034-id', relation.id);
  });
  if (svg) svg.setAttribute('data-v2e034-total', String(total));

  /* E034-02 — Inventaire tabulaire indexable, relié aux arêtes par aria-describedby. */
  try {
    if (entete && !layout.querySelector('#v2e034-inventaire')) {
      const table = fabriquer(ctx, 'table', 'v2e034-inventaire', '');
      table.id = 'v2e034-inventaire';
      const caption = fabriquer(ctx, 'caption', '', 'Inventaire des ' + total + ' relations du graphe.');
      table.appendChild(caption);
      const thead = fabriquer(ctx, 'thead', '', '');
      const headRow = fabriquer(ctx, 'tr', '', '');
      ['Rang', 'Nature', 'Origine', 'Cible', 'Longueur', 'Orientation'].forEach((intitule) => {
        headRow.appendChild(fabriquer(ctx, 'th', '', intitule));
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = fabriquer(ctx, 'tbody', '', '');
      relations.forEach((relation) => {
        const ligneId = 'v2e034-ligne-' + (relation.index + 1);
        const row = fabriquer(ctx, 'tr', '', '');
        row.id = ligneId;
        row.setAttribute('data-v2e034-rel', relation.id);
        row.appendChild(fabriquer(ctx, 'th', '', String(relation.index + 1)));
        row.appendChild(fabriquer(ctx, 'td', '', relation.niveau === 2 ? VOCAB.moon.role : VOCAB.planet.role));
        row.appendChild(fabriquer(ctx, 'td', '', relation.fromRole + (relation.source ? ' · ' + relation.source.cle : ' · inconnu')));
        row.appendChild(fabriquer(ctx, 'td', '', relation.toRole + (relation.cible ? ' · ' + relation.cible.cle : ' · inconnu')));
        row.appendChild(fabriquer(ctx, 'td', '', relation.longueur + ' u. · ' + relation.portee));
        row.appendChild(fabriquer(ctx, 'td', '', relation.orientation + ' (' + relation.angle + '°)'));
        tbody.appendChild(row);
        relation.ligne.setAttribute('aria-describedby', ligneId);
      });
      table.appendChild(tbody);
      entete.appendChild(table);
    }
  } catch {
    /* L'inventaire est facultatif : les attributs des arêtes restent lisibles. */
  }

  /* E034-03 — Niveau hiérarchique et chaîne de relation explicités. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-v2e034-niveau', String(relation.niveau));
    relation.ligne.setAttribute('data-v2e034-chaine', relation.fromRole + ' → ' + relation.toRole);
  });

  /* E034-04 — Longueur mesurée et classe de portée calculées depuis le viewBox. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-v2e034-longueur', String(relation.longueur));
    relation.ligne.setAttribute('data-v2e034-portee', relation.portee);
  });

  /* E034-05 — Cap orienté en degrés et en secteur cardinal. */
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-v2e034-angle', String(relation.angle));
    relation.ligne.setAttribute('data-v2e034-orientation', relation.orientation);
  });

  /* E034-06 — Relations saillantes déduites de la classe is-path de la vue. */
  let saillantes = 0;
  relations.forEach((relation) => {
    if (relation.saillante) saillantes += 1;
    relation.ligne.setAttribute('data-v2e034-saillante', relation.saillante ? '1' : '0');
  });
  if (svg) svg.setAttribute('data-v2e034-saillantes', String(saillantes));
  if (champ) champ.setAttribute('data-v2e034-saillantes', String(saillantes));

  /* E034-07 — Qualité d'ancrage des extrémités et taux d'appariement. */
  let completes = 0;
  let partielles = 0;
  relations.forEach((relation) => {
    relation.ligne.setAttribute('data-v2e034-ancrage', relation.ancrage);
    if (relation.ancrage === 'complet') completes += 1;
    else if (relation.ancrage === 'partiel') partielles += 1;
  });
  const taux = total ? Math.round(completes * 100 / total) : 0;
  if (svg) {
    svg.setAttribute('data-v2e034-ancrage-complet', String(completes));
    svg.setAttribute('data-v2e034-ancrage-partiel', String(partielles));
    svg.setAttribute('data-v2e034-taux-ancrage', taux + ' %');
  }

  /* E034-08 — Rose des vents textuelle, agrégée par secteur. */
  try {
    const comptage = SECTEURS.map((secteur) => ({
      secteur,
      nombre: relations.filter((relation) => relation.orientation === secteur).length,
    }));
    const roseTexte = 'Répartition directionnelle des ' + total + ' relations : ' +
      comptage.map((entree) => entree.secteur + ' ' + entree.nombre).join(' · ') + '.';
    if (entete && !layout.querySelector('#v2e034-rose')) {
      const rose = fabriquer(ctx, 'p', 'v2e034-rose', roseTexte);
      rose.id = 'v2e034-rose';
      rose.setAttribute('aria-label', 'Répartition directionnelle des relations du graphe.');
      entete.appendChild(rose);
    }
    if (svg) svg.setAttribute('data-v2e034-rose', comptage.map((entree) => entree.nombre).join('/'));
  } catch {
    /* La rose est facultative : les caps restent portés par chaque arête. */
  }

  /* E034-09 — Index croisé nœud vers arêtes incidentes, et degré. */
  try {
    const incidents = new Map();
    relations.forEach((relation) => {
      [relation.source, relation.cible].forEach((noeud) => {
        if (!noeud || !noeud.cle) return;
        if (!incidents.has(noeud.cle)) incidents.set(noeud.cle, []);
        const liste = incidents.get(noeud.cle);
        if (liste.indexOf(relation.id) < 0) liste.push(relation.id);
      });
    });
    noeuds.filter((noeud) => !!noeud.cle).forEach((noeud, rang) => {
      const liste = incidents.get(noeud.cle) || [];
      noeud.noeud.setAttribute('data-v2e034-degre', String(liste.length));
      noeud.noeud.setAttribute('data-v2e034-incidents', liste.join(' '));
      const descriptionId = 'v2e034-inc-' + (rang + 1);
      if (!layout.querySelector('#' + descriptionId)) {
        const description = fabriquer(ctx, 'span', 'v2e034-sr',
          noeud.role + ' ' + noeud.cle + ' : ' + liste.length + ' relation' +
          (liste.length > 1 ? 's' : '') + ' incidente' + (liste.length > 1 ? 's' : '') + '.');
        description.id = descriptionId;
        (entete || layout).appendChild(description);
      }
      const deja = noeud.noeud.getAttribute('aria-describedby') || '';
      noeud.noeud.setAttribute('aria-describedby', (deja ? deja + ' ' : '') + descriptionId);
    });
  } catch {
    /* L'index croisé est facultatif : l'inventaire sens unique reste disponible. */
  }

  /* E034-10 — Récit indexable de lecture du graphe, avec chiffres recalculés. */
  try {
    if (entete && !layout.querySelector('#v2e034-lecture')) {
      const longueurs = relations.map((relation) => relation.longueur);
      const minimum = longueurs.length ? Math.min.apply(null, longueurs) : 0;
      const maximum = longueurs.length ? Math.max.apply(null, longueurs) : 0;
      const moyenne = total ? arrondi(longueurs.reduce((somme, valeur) => somme + valeur, 0) / total, 1) : 0;
      const section = fabriquer(ctx, 'section', 'v2e034-lecture', '');
      section.id = 'v2e034-lecture';
      section.setAttribute('aria-labelledby', 'v2e034-lecture-titre');
      const titre = fabriquer(ctx, 'h3', '', 'Lecture du graphe.');
      titre.id = 'v2e034-lecture-titre';
      section.appendChild(titre);
      section.appendChild(fabriquer(ctx, 'p', '',
        'La constellation compte ' + total + ' relations : ' + nbPath + ' relient une ère à un repère et ' +
        nbMoon + ' relient un repère à un point vérifié. Chaque arête porte un identifiant, un niveau, ' +
        'une chaîne de rôles, une longueur et un cap ; tous ces chiffres sont recalculés à chaque rendu.'));
      section.appendChild(fabriquer(ctx, 'p', '',
        'Parmi ces relations, ' + saillantes + ' sont saillantes, c’est-à-dire attachées au repère ou au point ' +
        'sélectionné. ' + completes + ' ont leurs deux extrémités appariées à un nœud, ' + partielles +
        ' n’en ont qu’une, soit un taux d’ancrage de ' + taux + ' %.'));
      section.appendChild(fabriquer(ctx, 'p', '',
        'Les portées vont de ' + minimum + ' à ' + maximum + ' unités du viewBox, pour une moyenne de ' +
        moyenne + ' unités ; le cap dominant est indiqué par la rose des vents.'));
      entete.appendChild(section);
    }
  } catch {
    /* Le récit est facultatif : les données chiffrées restent dans les attributs. */
  }

  /* Activation atomique : dernière écriture, après tous les ajouts au DOM. */
  if (champ) champ.setAttribute('data-v2e034-ready', '1');
  layout.setAttribute('data-v2e034-ui', '1');
});
