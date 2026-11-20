import { register } from './registry.js';

/* Lentille E082 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Dix chantiers concrets et distincts (E082-01 … E082-10), tous strictement
 * additifs : aucun texte existant n'est remplacé, aucun contrôle existant
 * n'est ré-attribué, aucun fichier partagé n'est modifié. Sans ce module, la
 * vue Récit reste intégralement lisible et utilisable.
 *
 * Une seule classe racine (recit-e082-root) et un seul bloc CSS injecté via
 * css('recit-e082', …) — cssOnce garantit l'idempotence. Toutes les classes
 * créées sont préfixées `recit-e082-` ; tous les identifiants de nœuds sont
 * préfixés `e082-` et uniques dans un rendu donné (la coque reconstruisant le
 * DOM à chaque étape, les nœuds anciens disparaissent avec lui). Zéro réseau,
 * zéro aléa, aucune journalisation, zéro animation JavaScript. Les transitions
 * sont neutralisées quand reducedMotion() le demande.
 *
 * Les dix chantiers sont détaillés dans UNIFIED_AUDIT/RECIT/views/E082.md.
 */

const CSS_ID = 'recit-e082';
const RACINE = 'recit-e082-root';

/* Feuille unique. Aucune ressource distante, aucune règle globale, aucune
   police téléchargée : seules les variables déjà déclarées par la vue. */
const CSS = `
.recit-e082-root{--e082-esp:8px}
/* E082-01 — échelle de progression chiffrée et segmentée. */
.recit-e082-progress-label{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 3px;color:var(--muted-2);font-size:9px;letter-spacing:.03em;font-variant-numeric:tabular-nums}
.recit-e082-progress-label strong{color:var(--gold-bright);font-weight:600}
.recit-e082-progress{position:relative}
.recit-e082-progress::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(10% - 1px),rgba(0,0,0,.6) calc(10% - 1px),rgba(0,0,0,.6) 10%);pointer-events:none}
/* E082-02 — badge de nature du point, au niveau de la meta. */
.recit-e082-kind{display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:1px 6px;border:1px dashed var(--line-strong);border-radius:4px;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.09em;white-space:nowrap;transition:border-color .18s linear}
.recit-e082-kind b{color:var(--gold-bright);font-weight:700}
/* E082-03 — fil d'Ariane informationnel. */
.recit-e082-breadcrumb{display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin:0 0 9px;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-e082-breadcrumb span{white-space:nowrap}
.recit-e082-breadcrumb .recit-e082-sep{margin:0 2px;opacity:.6}
.recit-e082-breadcrumb .recit-e082-crumb-current{color:var(--gold);font-weight:600}
/* E082-04 — hiérarchie des critères : recherche (niveau 1) / affinage (niveau 2). */
.recit-e082-tier{display:inline-flex;align-items:center;margin-right:6px;padding:1px 5px;border-left:2px solid var(--gold);color:var(--gold);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.recit-e082-root .c3a-group[data-e082-tier]{column-gap:6px}
.recit-e082-root .c3a-group[data-e082-tier]::before{content:attr(data-e082-tier);display:inline-flex;align-items:center;padding-left:5px;border-left:2px solid var(--line-strong);color:var(--muted-2);font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
/* E082-05 — codage parallèle du type dans le fil par style de bordure. */
.recit-e082-thread .c3a-thread-item{border-left-width:3px}
.recit-e082-thread .c3a-thread-item[data-kind="récit"]{border-left-style:solid}
.recit-e082-thread .c3a-thread-item[data-kind="figure"]{border-left-style:dashed}
.recit-e082-thread .c3a-thread-item[data-kind="lieu"]{border-left-style:double}
.recit-e082-thread .c3a-thread-item[data-kind="audit"]{border-left-style:dotted}
/* E082-06 — provenance des sources, explicitée en texte. */
.recit-e082-provenance{margin:6px 0 0;padding-left:9px;border-left:2px solid var(--line-strong);color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e082-provenance b{color:var(--gold);font-weight:600}
/* E082-07 — séparateur fonctionnel entre commandes de point et de vue. */
.recit-e082-action-divider{display:inline-flex;align-items:center;align-self:center;margin:0 2px;padding:0 6px;border-left:1px solid var(--line-strong);color:var(--muted-2);font-size:8px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
/* E082-08 — sommaire numéroté des sections du point. */
.recit-e082-sommaire{display:flex;flex-wrap:wrap;gap:3px 11px;margin:0 0 10px;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-e082-sommaire span{white-space:nowrap;font-variant-numeric:tabular-nums}
.recit-e082-sommaire b{color:var(--gold);font-weight:600}
/* E082-09 — interprétation du temps de lecture. */
.recit-e082-reading{margin-left:6px;padding:1px 6px;border:1px solid var(--line);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap}
/* E082-10 — barre de composition du fil par type de point. */
.recit-e082-composition{margin:0 0 10px}
.recit-e082-composition-text{margin:0 0 4px;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-e082-composition-text b{color:var(--gold);font-weight:600}
.recit-e082-composition-bar{display:flex;height:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid var(--line)}
.recit-e082-composition-part{min-width:2px;height:100%}
.recit-e082-composition-part[data-e082-kind="récit"]{background:var(--gold)}
.recit-e082-composition-part[data-e082-kind="figure"]{background:var(--gold-bright)}
.recit-e082-composition-part[data-e082-kind="lieu"]{background:var(--muted)}
.recit-e082-composition-part[data-e082-kind="audit"]{background:var(--ink-soft)}
.recit-e082-root.recit-e082-reduced .recit-e082-kind{transition:none}
@media (max-width:620px){
  .recit-e082-breadcrumb,.recit-e082-sommaire,.recit-e082-progress-label{font-size:8px}
  .recit-e082-tier{letter-spacing:.04em}
}
@media (prefers-reduced-motion:reduce){
  .recit-e082-root .recit-e082-kind{transition:none}
}
`;

/* ---------- Utilitaires purs : gardes d'existence, aucune donnée inventée ---------- */

function present(node) {
  return Boolean(node && typeof node.querySelector === 'function');
}

function marquer(node, classe) {
  if (node && node.classList && typeof node.classList.add === 'function') node.classList.add(classe);
}

function texte(node) {
  return String((node && node.textContent) || '');
}

/* Lit « Étape X / Y » dans le surtitre sans toucher à son texte. */
function lireEtape(kicker) {
  const trouvé = texte(kicker).match(/(\d+)\s*\/\s*(\d+)/);
  return trouvé ? { etape: Number(trouvé[1]), total: Number(trouvé[2]) } : null;
}

/* Nature du point : d'abord l'item courant du fil, puis le surtitre. */
function lireNature(thread, kicker) {
  let nature = '';
  try {
    const courant = present(thread) ? thread.querySelector('.recit-thread-item.is-current') : null;
    if (courant && courant.dataset) nature = courant.dataset.kind || '';
  } catch { /* repli sur le surtitre */ }
  if (!nature) {
    const morceaux = texte(kicker).split('·');
    if (morceaux.length > 1) nature = morceaux[morceaux.length - 1].trim();
  }
  return nature;
}

/* Titre du repère : premier segment de la meta (« Titre · année · … »). */
function lireRepere(meta, thread) {
  const premier = texte(meta).split('·')[0].trim();
  if (premier) return premier;
  const titreFil = present(thread) ? texte(thread.querySelector('.recit-thread-title')) : '';
  return titreFil.replace(/^Fil du repère\s*·\s*/, '').trim();
}

function creer(el, tag, classe, contenu, id) {
  const noeud = el(tag, classe, contenu);
  if (id) noeud.id = id;
  return noeud;
}

/* ---------- E082-01 — progression chiffrée ---------- */

function chantierProgression(corps, progress, etape, el) {
  if (!present(progress) || !progress.parentNode) return;
  marquer(progress, 'recit-e082-progress');
  const pourcent = etape && etape.total > 0
    ? Math.round((etape.etape / etape.total) * 100)
    : 0;
  try { progress.setAttribute('data-e082-pourcent', String(pourcent)); } catch { /* attribut facultatif */ }
  if (corps.querySelector('#e082-progress-label')) return;
  const label = creer(el, 'p', 'recit-e082-progress-label', '', 'e082-progress-label');
  label.appendChild(creer(el, 'span', '', 'Progression du repère'));
  const valeur = creer(el, 'strong', '', etape
    ? `${etape.etape} / ${etape.total} · ${pourcent} %`
    : ' position indisponible');
  label.appendChild(valeur);
  progress.parentNode.insertBefore(label, progress);
}

/* ---------- E082-02 — badge de nature ---------- */

function chantierNature(meta, nature, el) {
  if (!present(meta) || meta.querySelector('#e082-kind-badge')) return;
  const badge = creer(el, 'span', 'recit-e082-kind', '', 'e082-kind-badge');
  badge.appendChild(creer(el, 'span', '', 'Nature : '));
  badge.appendChild(creer(el, 'b', '', nature || 'non précisée'));
  try { badge.setAttribute('data-e082-kind', nature); } catch { /* attribut facultatif */ }
  meta.appendChild(badge);
}

/* ---------- E082-03 — fil d'Ariane ---------- */

function chantierFilAriane(corps, repere, etape, el) {
  if (!corps || corps.querySelector('#e082-breadcrumb')) return;
  const nav = creer(el, 'nav', 'recit-e082-breadcrumb', '', 'e082-breadcrumb');
  nav.setAttribute('aria-label', 'Fil d’Ariane informationnel du récit');
  const chaine = [
    ['Atlas', ''],
    ['Récit', ''],
    [repere || 'Repère', ''],
    [etape ? `Étape ${etape.etape} / ${etape.total}` : 'Étape courante', 'recit-e082-crumb-current'],
  ];
  chaine.forEach(([libelle, classe], i) => {
    if (i > 0) nav.appendChild(creer(el, 'span', 'recit-e082-sep', '›'));
    nav.appendChild(creer(el, 'span', classe, libelle));
  });
  try { nav.setAttribute('data-e082-niveau', String(chaine.length)); } catch { /* attribut facultatif */ }
  corps.insertBefore(nav, corps.firstChild);
}

/* ---------- E082-04 — hiérarchie des filtres ---------- */

function chantierFiltres(tools, el) {
  if (!present(tools)) return;
  const recherche = tools.querySelector('.c3a-search');
  if (recherche && !tools.querySelector('#e082-tier-search')) {
    const label = creer(el, 'span', 'recit-e082-tier', '1 · Recherche', 'e082-tier-search');
    try { label.setAttribute('aria-hidden', 'true'); } catch { /* décoratif */ }
    tools.insertBefore(label, recherche);
  }
  const groupes = tools.querySelectorAll('.c3a-group');
  if (groupes && typeof groupes.forEach === 'function') {
    groupes.forEach((groupe) => {
      try {
        if (!groupe.hasAttribute('data-e082-tier')) {
          groupe.setAttribute('data-e082-tier', '2 · Affinage');
        }
      } catch { /* attribut facultatif */ }
    });
  }
}

/* ---------- E082-05 — codage parallèle du type dans le fil ---------- */

function chantierCodageFil(thread) {
  if (!present(thread)) return;
  marquer(thread, 'recit-e082-thread');
  const items = thread.querySelectorAll('.c3a-thread-item');
  if (!items || typeof items.forEach !== 'function') return;
  items.forEach((item) => {
    marquer(item, 'recit-e082-thread-kind');
    const nature = (item.dataset && item.dataset.kind) || '';
    try {
      if (!item.hasAttribute('title')) {
        item.setAttribute('title', nature
          ? `Type de point : ${nature} (code de bordure complémentaire à l’étiquette textuelle)`
          : 'Type de point non précisé');
      }
    } catch { /* titre facultatif */ }
  });
}

/* ---------- E082-06 — provenance des sources ---------- */

function chantierProvenance(cible, el) {
  if (!present(cible) || !cible.parentNode || cible.parentNode.querySelector('#e082-provenance')) return;
  const avecSource = Boolean(cible.classList && cible.classList.contains('recit-trace'));
  const note = creer(el, 'p', 'recit-e082-provenance', '', 'e082-provenance');
  note.setAttribute('role', 'note');
  note.appendChild(creer(el, 'b', '', 'Provenance : '));
  note.appendChild(creer(el, 'span', '', avecSource
    ? 'référence(s) locale(s) consultable(s) dans la traçabilité ci-dessus.'
    : 'aucun identifiant de source pour ce point dans le jeu de données (587 points sur 901 sont dans ce cas).'));
  try { note.setAttribute('data-e082-source', avecSource ? 'oui' : 'non'); } catch { /* attribut facultatif */ }
  cible.parentNode.insertBefore(note, cible.nextSibling);
}

/* ---------- E082-07 — séparateur fonctionnel des commandes ---------- */

function chantierCommandes(actions, el) {
  if (!present(actions) || actions.querySelector('#e082-action-divider')) return;
  const cible = actions.querySelector('[data-fk="c3a-next-event"]')
    || actions.querySelector('[data-fk="c3a-chrono"]');
  const separateur = creer(el, 'span', 'recit-e082-action-divider', 'Changer de vue', 'e082-action-divider');
  try {
    separateur.setAttribute('role', 'separator');
    separateur.setAttribute('aria-label', 'Fin des commandes sur le point, début des commandes de vue');
    separateur.setAttribute('data-e082-groupe', 'vue');
  } catch { /* attributs facultatifs */ }
  if (cible && cible.parentNode === actions) actions.insertBefore(separateur, cible);
  else actions.appendChild(separateur);
}

/* ---------- E082-08 — sommaire numéroté ---------- */

function chantierSommaire(corps, breadcrumb, el) {
  if (!corps || !breadcrumb || corps.querySelector('#e082-sommaire')) return;
  const sections = [
    ['01', 'Progression'],
    ['02', 'Énoncé'],
    ['03', 'Filtres'],
    ['04', 'Fil du repère'],
    ['05', 'Traçabilité'],
    ['06', 'Commandes'],
    ['07', 'Légende'],
  ];
  const sommaire = creer(el, 'p', 'recit-e082-sommaire', '', 'e082-sommaire');
  sommaire.appendChild(creer(el, 'span', '', 'Sommaire : '));
  sections.forEach(([numero, libelle], i) => {
    const entree = creer(el, 'span', '', '');
    entree.appendChild(creer(el, 'b', '', numero));
    entree.appendChild(document.createTextNode(' ' + libelle));
    if (i < sections.length - 1) entree.appendChild(document.createTextNode(' ·'));
    sommaire.appendChild(entree);
  });
  breadcrumb.parentNode.insertBefore(sommaire, breadcrumb.nextSibling);
}

/* ---------- E082-09 — interprétation du temps de lecture ---------- */

function chantierLecture(timing, el) {
  if (!present(timing) || timing.querySelector('#e082-reading-tier')) return;
  const secondes = Number((texte(timing).match(/≈\s*(\d+)\s*s/) || [])[1] || 0);
  let palier = 'non évalué';
  let jauge = '';
  if (secondes > 0) {
    if (secondes <= 5) { palier = 'lecture brève'; jauge = '▮▯▯'; }
    else if (secondes <= 8) { palier = 'lecture moyenne'; jauge = '▮▮▯'; }
    else { palier = 'lecture longue'; jauge = '▮▮▮'; }
  }
  const badge = creer(el, 'span', 'recit-e082-reading', '', 'e082-reading-tier');
  badge.appendChild(creer(el, 'span', '', `${palier} ${jauge}`.trim()));
  try { badge.setAttribute('data-e082-seconds', String(secondes)); } catch { /* attribut facultatif */ }
  timing.appendChild(badge);
}

/* ---------- E082-10 — barre de composition du fil ---------- */

function chantierComposition(thread, el) {
  if (!present(thread) || thread.querySelector('#e082-composition')) return;
  const items = thread.querySelectorAll('.c3a-thread-item');
  if (!items || !items.length) return;
  const comptes = Object.create(null);
  let total = 0;
  items.forEach((item) => {
    const nature = (item.dataset && item.dataset.kind) || 'point';
    comptes[nature] = (comptes[nature] || 0) + 1;
    total += 1;
  });
  const ordre = ['récit', 'figure', 'lieu', 'audit'];
  const natures = ordre.filter((n) => comptes[n] > 0)
    .concat(Object.keys(comptes).filter((n) => ordre.indexOf(n) < 0));

  const bloc = creer(el, 'div', 'recit-e082-composition', '', 'e082-composition');
  const resume = creer(el, 'p', 'recit-e082-composition-text', '');
  resume.appendChild(creer(el, 'b', '', 'Composition du fil : '));
  resume.appendChild(document.createTextNode(
    `${total} point(s) · ` + natures.map((n) => `${n} ${comptes[n]}`).join(' · ') + '.'
  ));
  const barre = creer(el, 'div', 'recit-e082-composition-bar', '', 'e082-composition-bar');
  barre.setAttribute('role', 'img');
  barre.setAttribute('aria-label', `Répartition des ${total} points du fil par type : `
    + natures.map((n) => `${comptes[n]} ${n}`).join(', ') + '.');
  natures.forEach((nature) => {
    const part = creer(el, 'span', 'recit-e082-composition-part');
    part.setAttribute('data-e082-kind', nature);
    part.style.width = ((comptes[nature] / total) * 100).toFixed(2) + '%';
    part.title = `${nature} : ${comptes[nature]} point(s) sur ${total}`;
    barre.appendChild(part);
  });
  bloc.append(resume, barre);
  try { bloc.setAttribute('data-e082-total', String(total)); } catch { /* attribut facultatif */ }

  const titre = thread.querySelector('.recit-thread-title');
  const reference = titre && titre.parentNode === thread ? titre : thread.firstChild;
  if (reference && reference.parentNode === thread) thread.insertBefore(bloc, reference.nextSibling);
  else thread.appendChild(bloc);
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E082', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el, reducedMotion } = ctx;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  /* Un seul bloc CSS, posé avant toute manipulation du DOM. */
  try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }

  try {
    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    marquer(layout, RACINE);
    if (typeof reducedMotion === 'function' && reducedMotion()) marquer(layout, 'recit-e082-reduced');

    const kicker = layout.querySelector('.view-kicker');
    const meta = layout.querySelector('.recit-meta');
    const timing = layout.querySelector('.recit-timing');
    const progress = layout.querySelector('.recit-progress');
    const tools = layout.querySelector('.c3a-tools');
    const thread = layout.querySelector('.recit-thread');
    const actions = layout.querySelector('.recit-actions');
    const source = layout.querySelector('.recit-trace, .recit-sources');

    const etape = lireEtape(kicker);
    const nature = lireNature(thread, kicker);
    const repere = lireRepere(meta, thread);

    /* Chaque chantier est isolé : une défaillance locale n'empêche pas les suivants. */
    const sansRisque = (fn) => { try { fn(); } catch { /* silence */ } };
    sansRisque(() => chantierProgression(corps, progress, etape, el));      // E082-01
    sansRisque(() => chantierNature(meta, nature, el));                     // E082-02
    sansRisque(() => chantierFilAriane(corps, repere, etape, el));           // E082-03
    const breadcrumb = corps.querySelector('#e082-breadcrumb');
    sansRisque(() => chantierFiltres(tools, el));                           // E082-04
    sansRisque(() => chantierCodageFil(thread));                            // E082-05
    sansRisque(() => chantierProvenance(source, el));                       // E082-06
    sansRisque(() => chantierCommandes(actions, el));                       // E082-07
    sansRisque(() => chantierSommaire(corps, breadcrumb, el));               // E082-08
    sansRisque(() => chantierLecture(timing, el));                          // E082-09
    sansRisque(() => chantierComposition(thread, el));                      // E082-10
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
