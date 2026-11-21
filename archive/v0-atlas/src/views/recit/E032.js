import { register } from './registry.js';

/*
 * Lentille E032 — « Hiérarchie visuelle et informationnelle » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E032-01 … E032-10) sont implémentés
 * dans CE seul module ; le détail figure dans
 * UNIFIED_AUDIT/RECIT/views/E032.md. Aucun fichier partagé n'est modifié.
 * La coque reconstruisant le DOM à chaque rendu, apply() ne fait qu'enrichir
 * le stage courant ; les deux seuls identifiants créés sont gardés contre le
 * doublon. Une seule feuille de style, un seul register.
 *
 * Toutes les classes créées sont préfixées `recit-e032-`, tous les identifiants
 * `e032-`, tous les attributs de pilotage `data-e032-`. Aucun texte existant
 * n'est remplacé, aucun écouteur, timer, observateur ou rAF n'est installé :
 * zéro console, zéro réseau, zéro aléa. Sans JavaScript, le récit reste lisible.
 */

const CSS_ID = 'recit-e032';
const FILIATION_ID = 'e032-filiation';
const PANNEAU_ID = 'e032-hierarchie';

/* Feuille unique, cadrée par la racine posée sur .recit-layout : aucune règle
   ne déborde sur une autre vue. Le panneau de mesures vit dans le tiroir
   diagnostic, comme les autres lentilles. */
const RULES = `
/* E032-01 — rythme vertical modulaire : les blocs sont groupés par proximité. */
.recit-layout.recit-e032-racine{
  --e032-espace-1:6px;
  --e032-espace-2:10px;
  --e032-espace-3:16px;
  --e032-espace-4:24px;
  --e032-pas:100%;
  --e032-position:0%;
}
.recit-e032-racine [data-e032-zone="progression"]{margin-bottom:var(--e032-espace-1)}
.recit-e032-racine [data-e032-zone="surtitre"]{margin-bottom:var(--e032-espace-1)}
.recit-e032-racine [data-e032-zone="filiation"]{margin-bottom:var(--e032-espace-2)}
.recit-e032-racine [data-e032-zone="titre"]{margin-bottom:var(--e032-espace-2)}
.recit-e032-racine [data-e032-zone="meta"]{margin-bottom:var(--e032-espace-1)}
.recit-e032-racine [data-e032-zone="timing"]{margin-bottom:var(--e032-espace-3)}
.recit-e032-racine [data-e032-zone="outils"]{margin-top:var(--e032-espace-2);margin-bottom:var(--e032-espace-1)}
.recit-e032-racine [data-e032-zone="statut"]{margin-bottom:var(--e032-espace-3)}
.recit-e032-racine [data-e032-zone="chapeau"]{margin-bottom:var(--e032-espace-4)}
.recit-e032-racine [data-e032-zone="fil"]{margin-bottom:var(--e032-espace-3)}
.recit-e032-racine [data-e032-zone="sources"]{margin-bottom:var(--e032-espace-2)}
.recit-e032-racine [data-e032-zone="actions"]{margin-top:var(--e032-espace-3);margin-bottom:var(--e032-espace-2)}
.recit-e032-racine [data-e032-zone="legende"]{margin-top:var(--e032-espace-2)}

/* E032-02 — fil d'Ariane : étiquette de niveau + progression textuelle. */
.recit-e032-filiation{
  display:flex;flex-wrap:wrap;align-items:center;gap:7px;
  margin:0;color:var(--muted-2);font-size:9px;line-height:1.5;
}
.recit-e032-filiation-etiquette{
  padding:2px 7px;border:1px solid var(--line);border-radius:999px;
  color:var(--gold);font-size:8px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;
}
.recit-e032-filiation-texte{font-variant-numeric:tabular-nums}

/* E032-03 — progression segmentée : graduations + repère de segment courant. */
.recit-e032-racine .recit-progress{position:relative}
.recit-e032-racine .recit-progress::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:repeating-linear-gradient(90deg,
    transparent 0 calc(var(--e032-pas) - 1px),
    rgba(8,11,18,.82) calc(var(--e032-pas) - 1px) var(--e032-pas));
}
.recit-e032-racine .recit-progress::before{
  content:'';position:absolute;z-index:1;top:0;bottom:0;left:var(--e032-position);
  width:2px;background:var(--gold-bright);pointer-events:none;
}

/* E032-04 — certitude codée sur chaque item du fil, par la forme du glyphe. */
.recit-e032-racine .recit-thread-item{position:relative;padding-right:24px}
.recit-e032-racine .recit-thread-item::after{
  content:attr(data-e032-glyphe);
  position:absolute;right:7px;top:50%;transform:translateY(-50%);
  color:var(--gold);font-size:10px;font-weight:700;line-height:1;
}

/* E032-05 — étiquettes de type alignées, lisibles avant le texte du point. */
.recit-e032-racine .thread-kind{
  display:inline-block;min-width:44px;padding:1px 4px;
  border:1px solid var(--line);border-radius:4px;
  background:rgba(255,255,255,.03);color:var(--muted);
  font-size:8px;font-weight:700;letter-spacing:.06em;text-align:center;
}
.recit-e032-racine .recit-thread-item[data-e032-type="figure"] .thread-kind{
  border-color:rgba(230,185,111,.5);color:var(--gold-bright);
}
.recit-e032-racine .recit-thread-item[data-e032-type="lieu"] .thread-kind{
  border-color:rgba(150,200,215,.5);color:#a9d6e5;
}
.recit-e032-racine .recit-thread-item[data-e032-type="audit"] .thread-kind{
  border-style:dashed;color:var(--muted-2);
}

/* E032-06 — compteurs de volume ajoutés aux filtres existants. */
.recit-e032-racine .c3a-filter[data-e032-compte]::after{
  content:' ' attr(data-e032-compte);
  margin-left:4px;color:var(--muted-2);
  font-size:8px;font-variant-numeric:tabular-nums;
}

/* E032-07 — statut : distinguer « vue complète » et « filtrage actif ». */
.recit-e032-racine [data-e032-zone="statut"]{
  padding-left:8px;border-left:2px solid transparent;
  transition:border-color .18s ease,background-color .18s ease;
}
.recit-e032-racine [data-e032-zone="statut"]::before{
  content:attr(data-e032-filtre-libelle) ' · ';
  color:var(--muted-2);font-weight:700;
}
.recit-e032-racine #c3a-status[data-e032-filtre="actif"]{
  border-left-color:var(--gold);background:rgba(230,185,111,.07);
}
.recit-e032-racine #c3a-status[data-e032-filtre="actif"]::before{color:var(--gold)}

/* E032-08 — média : le visuel reste un appui, jamais le contenu principal. */
.recit-e032-racine .recit-media{position:relative}
.recit-e032-racine .recit-media[data-e032-media="vide"]{
  border:1px dashed var(--line-strong);
}
.recit-e032-racine .recit-media[data-e032-media="image"]::after{
  content:attr(data-e032-media-legende);
  position:absolute;left:16px;top:12px;padding:2px 7px;
  border-radius:4px;background:rgba(8,11,18,.6);
  color:rgba(255,255,255,.8);font-size:8px;
  letter-spacing:.1em;text-transform:uppercase;pointer-events:none;
}

/* E032-09 — traçabilité : badge textuel « source présente / absente ». */
.recit-e032-racine [data-e032-source]::before{
  content:attr(data-e032-badge);
  display:inline-block;margin-right:8px;padding:1px 7px;
  border:1px solid var(--line-strong);border-radius:999px;
  color:var(--muted);font-size:8px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;
}
.recit-e032-racine [data-e032-source="absente"]::before{border-style:dashed}

/* E032-10 — panneau de mesures, masqué hors du tiroir diagnostic. */
.recit-e032-mesures{display:none !important}
body.recit-diagnostics .recit-e032-mesures{
  display:block !important;margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.recit-e032-mesures h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-e032-mesures p{
  margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;
  font-variant-numeric:tabular-nums;overflow-wrap:anywhere;
}

/* Mouvement réduit : aucune transition ajoutée par E032 n'est conservée. */
@media (prefers-reduced-motion:reduce){
  .recit-e032-racine [data-e032-zone="statut"]{transition:none !important}
}
.recit-e032-racine.recit-e032-sans-mouvement [data-e032-zone="statut"]{transition:none !important}
@media (max-width:620px){
  .recit-e032-racine .recit-thread-item{padding-right:22px}
  .recit-e032-racine .recit-thread-item::after{right:5px}
  .recit-e032-racine .thread-kind{min-width:38px}
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires — toute recherche ou écriture DOM est gardée.
 * ------------------------------------------------------------------------- */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function marquer(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    try { node.classList.add(className); } catch { /* classe facultative */ }
  }
}

function poserAttribut(node, name, value) {
  if (node && typeof node.setAttribute === 'function') {
    try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
  }
}

/* Lit « Étape X / Y » sans toucher au texte du surtitre. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const trouve = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texte);
  if (!trouve) return { index: 1, total: 0 };
  return { index: Number(trouve[1]) || 1, total: Number(trouve[2]) || 0 };
}

/* Reprend le nom du repère et l'année dans le premier nœud texte de la meta,
   avant la pastille de certitude ajoutée par la vue. */
function lireMeta(meta) {
  let brut = '';
  if (meta && meta.firstChild && typeof meta.firstChild.textContent === 'string') {
    brut = meta.firstChild.textContent;
  } else {
    brut = String((meta && meta.textContent) || '');
  }
  const morceaux = brut.split('·').map((part) => part.trim()).filter(Boolean);
  return { titre: morceaux[0] || '', annee: morceaux[1] || '' };
}

/* Rang de certitude et glyphe associé : la forme distingue les niveaux,
   la couleur n'est jamais le seul signal. */
function rangConfiance(valeur) {
  const v = String(valeur || '').toLowerCase();
  if (v === 'vérifié' || v === 'verifie') return { rang: 4, glyphe: '✓' };
  if (v === 'certain') return { rang: 3, glyphe: '■' };
  if (v === 'probable') return { rang: 2, glyphe: '◐' };
  if (v === 'disputed' || v === 'contesté' || v === 'conteste') return { rang: 1, glyphe: '≈' };
  return { rang: 0, glyphe: '•' };
}

/* E032-01 — les douze repères reçoivent une zone de rythme. */
const ZONES = [
  ['.recit-progress', 'progression'],
  ['.view-kicker', 'surtitre'],
  ['#recit-point-title, .recit-title', 'titre'],
  ['.recit-meta', 'meta'],
  ['.recit-timing', 'timing'],
  ['.c3a-tools', 'outils'],
  ['#c3a-status', 'statut'],
  ['#recit-context, .recit-context', 'chapeau'],
  ['.recit-thread', 'fil'],
  ['.recit-trace, .recit-sources', 'sources'],
  ['.recit-actions', 'actions'],
  ['.recit-legend', 'legende'],
];

function marquerZones(racine) {
  let compte = 0;
  ZONES.forEach(([selecteur, zone]) => {
    const noeud = q(racine, selecteur);
    if (noeud) { poserAttribut(noeud, 'data-e032-zone', zone); compte += 1; }
  });
  return compte;
}

/* E032-02 — fil d'Ariane inséré avant le titre, sans le modifier. */
function ajouterFiliation(el, racine, position, meta) {
  if (typeof el !== 'function' || q(racine, `#${FILIATION_ID}`)) return null;
  const titre = q(racine, '#recit-point-title, .recit-title');
  const surtitre = q(racine, '.view-kicker');
  const parent = (titre && titre.parentNode) || (surtitre && surtitre.parentNode)
    || q(racine, '.recit-body');
  if (!parent || typeof parent.insertBefore !== 'function') return null;

  const nav = el('nav', 'recit-e032-filiation');
  nav.id = FILIATION_ID;
  poserAttribut(nav, 'aria-label', 'Fil d’Ariane du récit');
  const etiquette = el('span', 'recit-e032-filiation-etiquette', 'Fil d’Ariane');
  const repere = [meta.titre, meta.annee].filter(Boolean).join(' · ');
  const fil = ['Récit', repere || 'repère courant',
    `point ${position.index}/${position.total || '—'}`].join(' › ');
  nav.append(etiquette, el('span', 'recit-e032-filiation-texte', fil));

  if (titre && titre.parentNode === parent) parent.insertBefore(nav, titre);
  else if (surtitre && surtitre.nextSibling && surtitre.parentNode === parent) {
    parent.insertBefore(nav, surtitre.nextSibling);
  } else {
    parent.appendChild(nav);
  }
  poserAttribut(nav, 'data-e032-zone', 'filiation');
  return nav;
}

/* E032-03 — graduations pilotées par deux variables CSS calculées ici. */
function segmenterProgression(racine, position) {
  const barre = q(racine, '.recit-progress');
  if (!barre) return null;
  const total = position.total > 0 ? position.total : 0;
  const pas = total > 0 ? 100 / total : 100;
  const curseur = total > 0 ? ((Math.min(position.index, total) - 1) / total) * 100 : 0;
  poserAttribut(barre, 'data-e032-total', total);
  poserAttribut(barre, 'data-e032-index', position.index);
  poserAttribut(barre, 'data-e032-segments', total);
  if (barre.style && typeof barre.style.setProperty === 'function') {
    try {
      barre.style.setProperty('--e032-pas', `${pas}%`);
      barre.style.setProperty('--e032-position', `${curseur}%`);
    } catch { /* variables CSS facultatives */ }
  }
  return barre;
}

/* E032-04 — glyphe de certitude sur chaque item du fil. */
function coderCertitudeFil(racine) {
  const items = qa(racine, '.recit-thread-item');
  let renseignes = 0;
  items.forEach((item) => {
    const conf = rangConfiance(item.getAttribute('data-confidence'));
    poserAttribut(item, 'data-e032-conf', conf.rang);
    poserAttribut(item, 'data-e032-glyphe', conf.glyphe);
    if (conf.rang > 0) renseignes += 1;
  });
  return { total: items.length, confiance: renseignes };
}

/* E032-05 — chaque item porte son type pour l'étiquette normalisée. */
function normaliserTypes(racine) {
  const items = qa(racine, '.recit-thread-item');
  const types = Object.create(null);
  items.forEach((item) => {
    const type = item.getAttribute('data-kind') || 'point';
    poserAttribut(item, 'data-e032-type', type);
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

/* E032-06 — compteurs calculés depuis les seules données du fil. */
function compterFiltres(racine) {
  const items = qa(racine, '.c3a-thread-item');
  const parType = Object.create(null);
  const parConf = Object.create(null);
  items.forEach((item) => {
    const type = item.getAttribute('data-kind') || 'point';
    const conf = item.getAttribute('data-confidence') || '';
    parType[type] = (parType[type] || 0) + 1;
    if (conf) parConf[conf] = (parConf[conf] || 0) + 1;
  });
  let comptes = 0;
  qa(racine, '.c3a-filter').forEach((bouton) => {
    const fk = String(bouton.getAttribute('data-fk') || '');
    let compte = null;
    let trouve = /^c3a-kind-(.+)$/.exec(fk);
    if (trouve) compte = trouve[1] === 'all' ? items.length : (parType[trouve[1]] || 0);
    trouve = /^c3a-conf-(.+)$/.exec(fk);
    if (trouve) compte = trouve[1] === 'all' ? items.length : (parConf[trouve[1]] || 0);
    if (compte !== null) {
      poserAttribut(bouton, 'data-e032-compte', compte);
      comptes += 1;
    }
  });
  return comptes;
}

/* E032-07 — l'état de filtrage est déduit du DOM réel, sans lire l'état global. */
function hierarchiserStatut(racine) {
  const statut = q(racine, '#c3a-status');
  if (!statut) return { actif: false, libelle: 'Statut absent' };
  const recherche = q(racine, '#c3a-search');
  const saisi = Boolean(recherche && String(recherche.value || '').trim());
  const presse = qa(racine, '.c3a-filter[aria-pressed="true"]').some((bouton) =>
    !/-all$/.test(String(bouton.getAttribute('data-fk') || '')));
  const actif = saisi || presse;
  const libelle = actif ? 'Filtres actifs' : 'Vue complète';
  poserAttribut(statut, 'data-e032-filtre', actif ? 'actif' : 'inactif');
  poserAttribut(statut, 'data-e032-filtre-libelle', libelle);
  return { actif, libelle };
}

/* E032-08 — distinguer visuellement média renseigné et média absent. */
function hierarchiserMedia(racine) {
  const media = q(racine, '.recit-media');
  if (!media) return 'absent';
  const image = q(media, 'img') ? 'image' : 'vide';
  poserAttribut(media, 'data-e032-media', image);
  poserAttribut(media, 'data-e032-media-legende',
    image === 'image' ? 'Visuel du repère' : 'Sans visuel vérifié');
  return image;
}

/* E032-09 — badge de présence de source (587 points sans source sur 901). */
function hierarchiserSources(racine) {
  const trace = q(racine, '.recit-trace');
  const sansSource = q(racine, '.recit-sources');
  if (trace) {
    poserAttribut(trace, 'data-e032-source', 'presente');
    poserAttribut(trace, 'data-e032-badge', 'Sources locales');
    return 'presente';
  }
  if (sansSource) {
    poserAttribut(sansSource, 'data-e032-source', 'absente');
    poserAttribut(sansSource, 'data-e032-badge', 'Sans source');
    return 'absente';
  }
  return 'absent';
}

/* E032-10 — miroir textuel et falsifiable, visible dans le tiroir diagnostic. */
function ajouterMesures(el, stage, mesures) {
  if (typeof el !== 'function' || !stage || typeof stage.appendChild !== 'function') return null;
  if (typeof document !== 'undefined') {
    const ancien = document.getElementById(PANNEAU_ID);
    if (ancien && typeof ancien.remove === 'function') {
      try { ancien.remove(); } catch { /* panneau déjà détaché */ }
    }
  }
  const panneau = el('section', 'recit-e032-mesures');
  panneau.id = PANNEAU_ID;
  poserAttribut(panneau, 'data-recit-diagnostic', '');
  poserAttribut(panneau, 'aria-label', 'Mesures de la hiérarchie visuelle du récit');
  panneau.appendChild(el('h2', '', 'E032 — Hiérarchie visuelle et informationnelle · mesures'));
  const lignes = [
    `Zones de rythme : ${mesures.zones} sur ${ZONES.length} prévues.`,
    `Fil d’Ariane : ${mesures.filiation}.`,
    `Progression : étape ${mesures.position.index} sur ${mesures.position.total || '—'} `
      + `· ${mesures.position.total} segment(s) · pas ${mesures.pas} %.`,
    `Fil : ${mesures.fil.total} point(s) · ${mesures.fil.confiance} avec certitude renseignée.`,
    `Types rencontrés : ${mesures.typesTexte}.`,
    `Filtres comptés : ${mesures.filtres} bouton(s).`,
    `Statut : ${mesures.statut.libelle} `
      + `(${mesures.statut.actif ? 'filtrage actif' : 'aucun filtre'}).`,
    `Média : ${mesures.media} · traçabilité : ${mesures.source}.`,
    `Feuille de style : une seule (${CSS_ID}) · mouvement ${mesures.mouvement}.`,
  ];
  lignes.forEach((ligne) => panneau.appendChild(el('p', '', ligne)));
  stage.appendChild(panneau);
  return panneau;
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * ------------------------------------------------------------------------- */
register('E032', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css === 'function') {
    try { css(CSS_ID, RULES); } catch { /* rendu préservé coûte que coûte */ }
  }

  const racine = layout;
  marquer(racine, 'recit-e032-racine');
  let mouvementReduit = false;
  try {
    mouvementReduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  } catch { mouvementReduit = false; }
  if (mouvementReduit) marquer(racine, 'recit-e032-sans-mouvement');

  const position = lireEtape(q(racine, '.view-kicker'));
  const meta = lireMeta(q(racine, '.recit-meta'));

  const zones = marquerZones(racine);
  const filiation = ajouterFiliation(el, racine, position, meta);
  segmenterProgression(racine, position);
  const fil = coderCertitudeFil(racine);
  const types = normaliserTypes(racine);
  const filtres = compterFiltres(racine);
  const statut = hierarchiserStatut(racine);
  const media = hierarchiserMedia(racine);
  const source = hierarchiserSources(racine);

  const typesTexte = Object.keys(types)
    .map((cle) => `${types[cle]} ${cle}`).join(' · ') || 'aucun';
  ajouterMesures(el, stage || racine, {
    zones,
    filiation: filiation ? 'inséré avant le titre' : 'non inséré',
    position,
    pas: position.total > 0 ? Math.round((100 / position.total) * 10) / 10 : 100,
    fil,
    typesTexte,
    filtres,
    statut,
    media,
    source,
    mouvement: mouvementReduit ? 'réduit' : 'complet',
  });
});
