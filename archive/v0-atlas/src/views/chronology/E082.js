import { register } from './registry.js';

/* Lentille E082 — vue CHRONOLOGIE.
   Thème : formats de dates, localisation française et cohérence des millésimes.

   La vue possédée (src/views/chronology.js) grave ses millésimes avec
   formatYear() (chronology.js:26-28) dans les bandes d'ère (:288-296), les
   cartes (:380, :392), la fiche (:430), le statut (:252) et la progression
   (:266). Ce module ne réécrit aucune de ces lignes : il rend la convention
   française falsifiable en comparant le DOM réel à une référence calculée.

   Aucun appel réseau, aucun tirage aléatoire, aucune sortie en console,
   aucune boucle d'animation propre, aucun timer, aucun écouteur. Un seul
   ctx.css, un seul panneau à identifiant préfixé e082. */

const PANEL_ID = 'e082-date-panel';
const STYLE_ID = 'chronology-e082';

/* Espace fine insécable (U+202F) : séparateur de milliers recommandé en
   français, et espace typographique devant l'abréviation « av. J.-C. ». */
const NNBSP = '\u202F';

let applied = 0;

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function groupThousands(digits) {
  return String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/* Réplique exacte de formatYear (chronology.js:26-28) pour la comparaison. */
function formatVue(year) {
  const n = toNumber(year);
  if (n === null) return '';
  return n < 0 ? `${Math.abs(n)} av. J.-C.` : String(n);
}

/* Convention française de référence, affichée dans le panneau uniquement. */
function formatFrançais(year) {
  const n = toNumber(year);
  if (n === null) return 'millésime illisible';
  if (n === 0) return 'an 0 (à vérifier)';
  const abs = Math.abs(Math.trunc(n));
  return n < 0 ? `${groupThousands(abs)}${NNBSP}av. J.-C.` : groupThousands(abs);
}

function txt(node) {
  return node && node.textContent ? node.textContent.trim() : '';
}

function all(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

function sourceYearAtypique(title) {
  if (!title) return false;
  /* chronology.js:496 écrit [authors, year].join(' · ') sans formatYear :
     un millésime négatif ou à cinq chiffres reste brut dans le title. */
  return /-\d+/.test(title) || /\d{5,}/.test(title);
}

function collecter(layout) {
  const bands = all(layout, '.era-band');
  const cards = all(layout, 'li[data-year]');
  const yearSpans = all(layout, '.event-year');
  const ranges = all(layout, '.atlas-chrono-era-range');
  const asideYear = layout.querySelector('.aside-year');
  const sources = all(layout, '.point-sources li[data-source-id]');
  const status = layout.querySelector('#atlas-chrono-status');
  const progress = layout.querySelector('#nav-c2a-progress');
  const statusText = txt(status);
  const progressText = txt(progress);
  const textesAnnée = [
    ...yearSpans.map(txt),
    ...ranges.map(txt),
    ...(asideYear ? [txt(asideYear).split('·')[0].trim()] : []),
  ].filter(Boolean);
  return { bands, cards, yearSpans, ranges, asideYear, sources, statusText, progressText, textesAnnée };
}

function évaluer(ctx, layout, d) {
  const résultats = [];

  /* E082-01 — Un seul formateur de millésime. */
  let conformes = 0;
  d.cards.forEach((li) => {
    const span = li.querySelector('.event-year');
    if (span && txt(span) === formatVue(li.dataset.year)) conformes += 1;
  });
  résultats.push({
    id: 'E082-01',
    titre: 'Un seul formateur de millésime',
    valeur: `${conformes}/${d.cards.length} cartes conformes à formatYear (chronology.js:26-28)`,
    ok: d.cards.length === 0 || conformes === d.cards.length,
  });

  /* E082-02 — Groupement français des milliers (espace fine U+202F). */
  const nonGroupés = d.textesAnnée.filter((t) => /\d{5,}/.test(t));
  résultats.push({
    id: 'E082-02',
    titre: 'Milliers groupés à la française',
    valeur: nonGroupés.length
      ? `${nonGroupés.length} millésime(s) ≥ 10 000 non groupé(s) ; référence : ${formatFrançais(nonGroupés[0].match(/\d{5,}/)[0])}`
      : 'aucun millésime ≥ 10 000 dans les textes affichés',
    ok: nonGroupés.length === 0,
  });

  /* E082-03 — Espace fine devant « av. J.-C. ». */
  const avJc = d.textesAnnée.filter((t) => t.includes('av. J.-C.'));
  const avecFine = avJc.filter((t) => /\d\u202Fav\. J\.-C\./.test(t)).length;
  const avecOrdinaire = avJc.length - avecFine;
  résultats.push({
    id: 'E082-03',
    titre: 'Espace typographique avant « av. J.-C. »',
    valeur: avJc.length
      ? `${avecOrdinaire}/${avJc.length} avec espace ordinaire (espace fine U+202F recommandée)`
      : 'aucune année av. J.-C. affichée',
    ok: avecOrdinaire === 0,
  });

  /* E082-04 — An zéro et franchissement de l'ère. */
  const ansZéro = d.cards.filter((li) => toNumber(li.dataset.year) === 0).length;
  const franchissements = d.bands.filter((band) => {
    const s = toNumber(band.dataset.start);
    const e = toNumber(band.dataset.end);
    return s !== null && e !== null && s <= 0 && e >= 0;
  }).length;
  résultats.push({
    id: 'E082-04',
    titre: 'An zéro et transition av./ap. J.-C.',
    valeur: `an zéro : ${ansZéro} (le calendrier grégorien n'en comporte pas) · ères franchissant 0 : ${franchissements}`,
    ok: ansZéro === 0,
  });

  /* E082-05 — Bornes d'ère ordonnées et libellés conformes. */
  let inversions = 0;
  let libellésOk = 0;
  d.bands.forEach((band) => {
    const s = toNumber(band.dataset.start);
    const e = toNumber(band.dataset.end);
    if (s !== null && e !== null && s > e) inversions += 1;
    const range = band.querySelector('.atlas-chrono-era-range');
    if (range && txt(range) === `${formatVue(s)} → ${formatVue(e)}`) libellésOk += 1;
  });
  résultats.push({
    id: 'E082-05',
    titre: 'Bornes d’ère ordonnées (chronology.js:288-296)',
    valeur: `bandes ${d.bands.length} · inversions ${inversions} · libellés conformes ${libellésOk}/${d.bands.length}`,
    ok: inversions === 0 && libellésOk === d.bands.length,
  });

  /* E082-06 — Millésimes des sources, hors formatYear (chronology.js:496). */
  const atypiques = d.sources.filter((li) => sourceYearAtypique(li.getAttribute('title')));
  résultats.push({
    id: 'E082-06',
    titre: 'Millésimes des sources référencées',
    valeur: `sources ${d.sources.length} · millésimes non localisés ${atypiques.length}`,
    ok: atypiques.length === 0,
  });

  /* E082-07 — Séparateur de plage et lecture « de … à … ». */
  const tirets = d.ranges.filter((r) => / - /.test(txt(r)) && !txt(r).includes('→'));
  const exemple = d.ranges.length ? txt(d.ranges[0]).split('→').map((part) => part.trim()) : [];
  résultats.push({
    id: 'E082-07',
    titre: 'Plages : flèche plutôt que tiret',
    valeur: `plages ${d.ranges.length} · flèches ${d.ranges.length - tirets.length} · tirets ambigus ${tirets.length}`
      + (exemple.length === 2 ? ` · lecture : « de ${exemple[0]} à ${exemple[1]} »` : ''),
    ok: tirets.length === 0,
  });

  /* E082-08 — Millésimes indexables, jamais portés par la seule couleur. */
  const nœudsAnnée = [
    ...d.yearSpans,
    ...d.ranges,
    ...(d.asideYear ? [d.asideYear] : []),
  ];
  const masqués = nœudsAnnée.filter((n) => n.closest('[aria-hidden="true"], .sr-only, [hidden]'));
  résultats.push({
    id: 'E082-08',
    titre: 'Millésimes en texte visible et indexable',
    valeur: `nœuds d’année ${nœudsAnnée.length} · masqués de l’index ${masqués.length} · convention décrite en texte visible`,
    ok: masqués.length === 0,
  });

  /* E082-09 — Miroirs data-* ↔ statut / progression (chronology.js:252, :266). */
  const filtrage = /Recherche/.test(d.statusText);
  let dansStatut = 0;
  let dansProgression = 0;
  d.bands.forEach((band) => {
    const range = band.querySelector('.atlas-chrono-era-range');
    const value = txt(range);
    if (!value) return;
    if (d.statusText.includes(value)) dansStatut += 1;
    if (d.progressText.includes(value)) dansProgression += 1;
  });
  const statutOk = filtrage || d.bands.length === 0 || dansStatut === d.bands.length;
  résultats.push({
    id: 'E082-09',
    titre: 'Plages reprises dans le statut et la progression',
    valeur: `statut ${dansStatut}/${d.bands.length}${filtrage ? ' (filtrage actif)' : ''} · progression ${dansProgression}/${d.bands.length}`,
    ok: statutOk && (d.bands.length === 0 || dansProgression === d.bands.length),
  });

  /* E082-10 — Idempotence du greffon (registry.js:13-19, :39-42). */
  const panneaux = document.querySelectorAll(`#${PANEL_ID}`).length;
  const style = document.getElementById(STYLE_ID) ? 1 : 0;
  résultats.push({
    id: 'E082-10',
    titre: 'Idempotence multi-rendus du greffon',
    valeur: `applications ${applied} · panneaux ${panneaux} · style ${style} · écouteurs 0 · mouvement réduit ${ctx.reducedMotion() ? 'oui' : 'non'}`,
    ok: panneaux === 1 && style === 1,
  });

  return résultats;
}

function ensurePanel(stage, ctx) {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'e082-panel');
    panel.id = PANEL_ID;
  }
  if (panel.parentElement !== stage) stage.appendChild(panel);
  return panel;
}

function renderPanel(panel, ctx, résultats) {
  const conformes = résultats.filter((r) => r.ok).length;
  panel.textContent = '';
  panel.appendChild(ctx.el('h2', 'e082-title', 'E082 — Millésimes : convention française'));
  panel.appendChild(ctx.el(
    'p',
    'e082-convention',
    'Convention de référence : « N av. J.-C. » avec espace fine insécable (U+202F) ; milliers groupés par la même espace ; aucun an zéro dans le calendrier grégorien. Les millésimes affichés sont lus dans le DOM, jamais estimés.'
  ));
  panel.appendChild(ctx.el('p', 'e082-summary', `${conformes}/${résultats.length} contrôles conformes — lentille non bavarde (aucune région live ajoutée).`));

  const list = ctx.el('ol', 'e082-list');
  résultats.forEach((r) => {
    const li = ctx.el('li', `e082-check ${r.ok ? 'is-ok' : 'is-warn'}`);
    li.append(
      ctx.el('strong', '', `${r.id} — ${r.titre}`),
      ctx.el('span', 'e082-value', `${r.ok ? '✓ ' : '⚠ '}${r.valeur}`)
    );
    list.appendChild(li);
  });
  panel.appendChild(list);

  panel.dataset.e082Applied = String(applied);
  panel.dataset.e082Reduced = ctx.reducedMotion() ? '1' : '0';
}

register('E082', (ctx) => {
  applied += 1;
  ctx.css(STYLE_ID, `
.e082-panel{margin:14px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.5}
.e082-title{margin:0 0 4px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
.e082-convention{margin:0 0 8px;color:var(--muted-2);font-size:9px;line-height:1.5}
.e082-summary{margin:0 0 6px;color:var(--ink-soft);font-size:9px;font-variant-numeric:tabular-nums}
.e082-list{margin:0;padding:0;list-style:none}
.e082-check{display:flex;flex-wrap:wrap;gap:2px 8px;padding:3px 0;border-top:1px solid rgba(255,255,255,.05);font-variant-numeric:tabular-nums}
.e082-check strong{color:var(--ink-soft);font-size:9px;font-weight:600}
.e082-value{color:var(--muted);font-size:9px}
.e082-check.is-warn .e082-value{color:var(--gold-bright)}
@media (max-width:620px){.e082-panel{padding:8px}.e082-check strong{flex:1 1 100%}}
@media (prefers-reduced-motion:reduce){.e082-panel *{transition:none!important}}`);

  const layout = ctx.layout;
  if (!layout) return;
  const données = collecter(layout);
  const résultats = évaluer(ctx, layout, données);
  layout.dataset.e082Years = String(données.cards.length);
  layout.dataset.e082Sources = String(données.sources.length);
  layout.dataset.e082Reduced = ctx.reducedMotion() ? '1' : '0';

  const panel = ensurePanel(ctx.stage, ctx);
  renderPanel(panel, ctx, résultats);
});
