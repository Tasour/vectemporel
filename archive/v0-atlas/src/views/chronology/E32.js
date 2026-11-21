import { register } from './registry.js';

/* Lentille E32 — Sémantique des données (domaine : données, schéma & indexation).
 *
 * Elle audite le contrat sémantique réellement exposé par la vue Chronologie :
 * vocabulaire des attributs `data-*`, unicité des identifiants, cohérence
 * année → ère, graphie des millésimes, vocabulaire de confiance, résolution
 * des sources et absence de relations inventées. Tout est dérivé du DOM rendu
 * par `chronology.js` : aucune donnée historique créée, aucune mutation des
 * nœuds de la vue, aucun réseau, aucun aléa, aucune sortie de débogage.
 *
 * Contrat : register('E32', ctx => { … }) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }.
 */

const CSS_ID = 'chronology-e32';
const PANEL_ID = 'chronology-e32-panel';
const TITLE_ID = 'chronology-e32-title';
const READOUT_ID = 'chronology-e32-readout';

/* Attributs qu'aucune lentille ne doit produire : le jeu de données ne porte
 * aucune arête explicite (`related` est vide pour les 229 repères). Leur
 * présence signalerait une relation inventée — donc une donnée inventée. */
const RELATION_ATTRS = [
  'data-influence',
  'data-breaks-with',
  'data-caused-by',
  'data-related',
  'data-relation',
];

const CSS = `
#${PANEL_ID}{
  margin:16px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:9px;line-height:1.55;
}
#${PANEL_ID} .e32-title{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
#${PANEL_ID} .e32-readout{margin:0 0 8px;color:var(--ink-soft);font-size:9px;}
#${PANEL_ID} .e32-facts{
  display:grid;grid-template-columns:minmax(104px,auto) minmax(0,1fr);
  gap:3px 12px;margin:0;
}
#${PANEL_ID} .e32-facts dt{color:var(--muted-2);}
#${PANEL_ID} .e32-facts dd{
  margin:0;color:var(--ink-soft);overflow-wrap:anywhere;
  font-variant-numeric:tabular-nums;
}
@media (max-width:620px){
  #${PANEL_ID} .e32-facts{grid-template-columns:1fr;gap:1px;}
  #${PANEL_ID} .e32-facts dd{margin:0 0 4px;}
}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID},#${PANEL_ID} *{transition:none!important;animation:none!important;}
}`;

function tous(racine, selector) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selector))
    : [];
}

function texte(node) {
  return node && node.textContent ? node.textContent.trim() : '';
}

function compareFr(a, b) {
  return String(a).localeCompare(String(b), 'fr');
}

/* Miroir de formatYear (chronology.js:26-28) : c'est la graphie de référence
 * que la vue applique à ses propres millésimes. */
function formatYear(year) {
  const an = Number(year);
  if (!Number.isFinite(an)) return '—';
  return an < 0 ? `${Math.abs(an)} av. J.-C.` : String(an);
}

/* Le panneau est un nœud de la lentille : il ne doit pas contaminer ses
 * propres mesures (unicité des ids, vocabulaire data-*) lors d'un second
 * passage sur le même stage. */
function estInterne(node, panneau) {
  return Boolean(panneau && (panneau === node || panneau.contains(node)));
}

/* E32-02 à E32-09 : une seule lecture du DOM, sans écriture. */
function analyser(stage) {
  const panneau = stage.querySelector(`#${PANEL_ID}`);
  const bandes = tous(stage, 'button.era-band[data-era-id]');
  const repères = tous(stage, 'li[data-event-id][data-year]');
  const points = tous(stage, 'li[data-point-id]');
  const sources = tous(stage, '.point-sources li[data-source-id]');
  const boutonsTag = tous(stage, 'button[data-tag]');
  const porteursId = tous(stage, '[id]').filter((node) => !estInterne(node, panneau));

  /* E32-03 — vocabulaire des attributs data-* réellement présents. */
  const vocabulaire = new Set();
  tous(stage, '*').forEach((node) => {
    if (estInterne(node, panneau)) return;
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i += 1) {
      const nom = attrs[i].name;
      if (nom.indexOf('data-') === 0) vocabulaire.add(nom);
    }
  });

  /* E32-04 — unicité des identifiants. */
  const occurrences = new Map();
  porteursId.forEach((node) => {
    occurrences.set(node.id, (occurrences.get(node.id) || 0) + 1);
  });
  const doublons = Array.from(occurrences)
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort(compareFr);

  /* E32-05 — cohérence année → ère. Règle demi-ouverte [start, end) de
   * `eraIndexForYear` (build-dataset.mjs:74-80), dernière ère incluse. */
  const ères = bandes.map((bande) => ({
    id: bande.dataset.eraId,
    start: Number(bande.dataset.start),
    end: Number(bande.dataset.end),
  }));
  let incohérences = 0;
  repères.forEach((li) => {
    const année = Number(li.dataset.year);
    let index = ères.findIndex((ère, i) => (
      année >= ère.start && (année < ère.end || (i === ères.length - 1 && année <= ère.end))
    ));
    if (index < 0) index = 0;
    const attendue = ères[index] ? ères[index].id : null;
    if (attendue && attendue !== li.dataset.eraId) incohérences += 1;
  });

  /* E32-06 — graphie des millésimes : le texte visible doit être exactement
   * celui que formatYear produirait depuis data-year. */
  let écartsGraphie = 0;
  repères.forEach((li) => {
    const millésime = li.querySelector('.event-year');
    if (!millésime) return;
    if (texte(millésime) !== formatYear(li.dataset.year)) écartsGraphie += 1;
  });

  /* E32-07 — vocabulaire de confiance observé, jamais énuméré en dur ni
   * harmonisé (disputé et disputed restent deux valeurs distinctes). */
  const confiance = Array.from(new Set(
    points.map((point) => point.dataset.confidence).filter(Boolean)
  )).sort(compareFr);

  /* E32-08 — provenance : une source est résolue dès que le texte rendu
   * contient le séparateur « — » inséré par chronology.js:493. */
  const idsSources = new Set(sources.map((li) => li.dataset.sourceId));
  const résolues = sources.filter((li) => li.textContent.indexOf(' — ') !== -1).length;

  /* E32-09 — aucune relation synthétique, seulement des thèmes factuels. */
  let relations = 0;
  tous(stage, '*').forEach((node) => {
    if (estInterne(node, panneau)) return;
    RELATION_ATTRS.forEach((attr) => {
      if (node.hasAttribute(attr)) relations += 1;
    });
  });
  const thèmes = new Set(boutonsTag.map((bouton) => bouton.dataset.tag));
  repères.forEach((li) => {
    String(li.dataset.tags || '').split(/\s+/).filter(Boolean).forEach((tag) => thèmes.add(tag));
  });

  return {
    vocabulaire: Array.from(vocabulaire).sort(compareFr),
    idTotal: porteursId.length,
    idUniques: occurrences.size,
    doublons,
    ères: ères.length,
    repères: repères.length,
    incohérences,
    écartsGraphie,
    confiance,
    points: points.length,
    sources: sources.length,
    idsSources: idsSources.size,
    résolues,
    relations,
    thèmes: Array.from(thèmes).sort(compareFr),
  };
}

function joint(valeurs, repli) {
  return valeurs.length ? valeurs.join(', ') : repli;
}

function construirePanneau(donnees, pays) {
  const panneau = document.createElement('section');
  panneau.className = 'chronology-e32-panel';
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', TITLE_ID);

  const titre = document.createElement('h2');
  titre.className = 'e32-title';
  titre.id = TITLE_ID;
  titre.textContent = 'Sémantique des données · E32';
  panneau.appendChild(titre);

  /* Une seule région live : elle résume les mesures recalculées à chaque
   * rendu, sans dupliquer les annonces de navigation de la coque. */
  const readout = document.createElement('p');
  readout.className = 'e32-readout';
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readout.textContent = `Sémantique · ${pays} · ${donnees.vocabulaire.length} vocables data-* · `
    + `${donnees.idUniques}/${donnees.idTotal} ids uniques · `
    + `${donnees.incohérences} incohérence(s) ère/année · `
    + `${donnees.écartsGraphie} écart(s) de graphie · `
    + `${donnees.confiance.length} niveau(x) de confiance · `
    + `${donnees.idsSources} source(s) · `
    + `${donnees.relations} relation(s) synthétique(s).`;
  panneau.appendChild(readout);

  const faits = document.createElement('dl');
  faits.className = 'e32-facts';
  const lignes = [
    ['Pays observé', pays],
    ['Schéma exposé', `${donnees.vocabulaire.length} attributs : ${joint(donnees.vocabulaire, 'aucun')}`],
    ['Identifiants', `${donnees.idUniques}/${donnees.idTotal} uniques${donnees.doublons.length ? ` · doublons : ${joint(donnees.doublons, 'aucun')}` : ''}`],
    ['Corpus rendu', `${donnees.repères} repère(s) · ${donnees.ères} ère(s) · ${donnees.points} point(s)`],
    ['Année → ère', `${donnees.incohérences} incohérence(s) sur ${donnees.repères} repère(s)`],
    ['Graphie des années', `${donnees.écartsGraphie} écart(s) · référence : -600 → 600 av. J.-C.`],
    ['Confiance observée', `${donnees.confiance.length} valeur(s) : ${joint(donnees.confiance, 'aucune')}`],
    ['Provenance', `${donnees.résolues}/${donnees.sources} source(s) titrée(s) · ${donnees.idsSources} id(s) distinct(s)`],
    ['Relations', `${donnees.relations} attribut(s) de relation synthétique · ${donnees.thèmes.length} thème(s)`],
    ['Contrôle', 'lecture seule · 0 réseau · 0 aléa · 0 sortie de débogage'],
  ];
  lignes.forEach(([libellé, valeur]) => {
    const dt = document.createElement('dt');
    dt.textContent = libellé;
    const dd = document.createElement('dd');
    dd.textContent = valeur;
    faits.append(dt, dd);
  });
  panneau.appendChild(faits);
  return panneau;
}

register('E32', (ctx) => {
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'chronology') return;

  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const donnees = analyser(stage);
  const pays = (ctx.layout && ctx.layout.dataset && ctx.layout.dataset.countryId) || 'pays inconnu';
  const panneau = construirePanneau(donnees, pays);
  const precedent = document.getElementById(PANEL_ID);

  if (precedent && precedent.parentElement === stage) {
    precedent.replaceWith(panneau);
  } else {
    if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
    stage.appendChild(panneau);
  }
});
