import { register } from './registry.js';

/*
 * Lentille E093 — « Repères de durée, règnes et périodes relatives ».
 *
 * Dix chantiers (E093-01 … E093-10) implémentés dans CE seul module :
 * aucune donnée historique n'est inventée, tout est dérivé des attributs
 * `data-start`, `data-end`, `data-year` et `data-era-id` déjà posés par
 * `src/views/chronology.js` (lignes 288-289 et 378-381). Aucun fichier
 * partagé n'est modifié.
 *
 * La coque reconstruisant le DOM à chaque rendu (chronology.js:207-214),
 * chaque nœud est recréé avec un ID préfixé `e093-` et une garde
 * d'existence (`ensure`). La feuille de style est injectée une seule fois
 * via `ctx.css('chronology-e093', …)`.
 *
 * Zéro `console.*`, zéro réseau, zéro `Math.random`, zéro `innerHTML`,
 * aucune boucle `requestAnimationFrame`, aucun timer. Français partout.
 */

const CSS_ID = 'chronology-e093';

/* Préférence de largeur, conservée entre deux rendus comme le filtre local
   de chronology.js:16 (`local`). Un seul booléen, jamais dupliqué dans le DOM. */
let preferProportional = true;

/* Feuille unique, cadrée par [data-e093="on"] posé sur .chronology-layout.
   La spécificité des sélecteurs dépasse celle du style inliné injecté par
   chronology.js:32-93 dans le stage (source plus tardive mais moins précise). */
const RULES = `
.e093-panel { display: none !important; }
body.chronology-diagnostics .e093-panel {
  display: block !important; margin: 0 0 12px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.e093-panel h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; font-weight: 600; }
.e093-panel p {
  margin: 0 0 4px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}

.chronology-layout[data-e093="on"] .e093-era-duration {
  display: block; margin-top: 1px; color: var(--gold);
  font-size: 9px; font-variant-numeric: tabular-nums;
}
.chronology-layout[data-e093="on"] .e093-gap {
  display: block; margin-top: 2px; color: var(--muted-2);
  font-size: 9px; font-variant-numeric: tabular-nums;
}
.chronology-layout[data-e093="on"] .e093-relative {
  margin: -4px 0 12px; padding: 6px 8px;
  border-left: 2px solid var(--gold); border-radius: 0 6px 6px 0;
  background: rgba(230,185,111,.05); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
}
.chronology-layout[data-e093="on"] .e093-summary {
  margin: 0 0 12px; padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.chronology-layout[data-e093="on"] .e093-summary-title {
  margin: 0 0 5px; color: var(--gold); font-family: var(--serif);
  font-size: 13px; font-weight: 600;
}
.chronology-layout[data-e093="on"] .e093-line {
  margin: 0 0 3px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}
.chronology-layout[data-e093="on"][data-e093-proportional="on"] .atlas-chrono-era-list > li {
  flex-grow: var(--e093-share, 1); min-width: 78px;
}
.chronology-layout[data-e093="on"] .e093-proportional {
  min-height: 36px; margin-top: 7px; padding: 5px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright);
  font: inherit; font-size: 11px; cursor: pointer;
}
.chronology-layout[data-e093="on"] .e093-proportional[aria-pressed="true"] {
  border-color: var(--gold); background: rgba(230,185,111,.1);
}
.chronology-layout[data-e093="on"] .e093-proportional:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
@media (max-width: 620px) {
  .chronology-layout[data-e093="on"] .e093-summary { padding: 8px; }
  .chronology-layout[data-e093="on"] .e093-proportional { min-height: 44px; width: 100%; }
  .chronology-layout[data-e093="on"][data-e093-proportional="on"] .atlas-chrono-era-list > li { min-width: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .chronology-layout[data-e093="on"] .e093-proportional { transition: none !important; }
}
`;

/* E093-04 : durée entre deux millésimes. Le jeu de données utilisant les
   négatifs pour l'avant J.-C. (chronology.js:26-28), il n'existe pas d'année
   zéro : traverser le franchissement av./apr. J.-C. retranche une unité. */
function spanYears(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const brut = b - a;
  if (brut <= 0) return 0;
  return a < 0 && b > 0 ? brut - 1 : brut;
}

/* Séparateur de milliers français (espace fine insécable), déterministe. */
function nombre(value) {
  const n = Math.round(value);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function millesime(value) {
  if (!Number.isFinite(value)) return '—';
  return value < 0 ? `${nombre(Math.abs(value))} av. J.-C.` : nombre(value);
}

register('E093', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;

  ctx.css(CSS_ID, RULES);

  const el = ctx.el;
  const layout = ctx.layout;
  layout.dataset.e093 = 'on';
  layout.dataset.e093Proportional = preferProportional ? 'on' : 'off';

  /* E093-10 : un seul nœud par ID, réutilisé s'il est encore connecté,
     déplacé vers le parent courant sinon. Aucun état n'est conservé hors DOM. */
  function ensure(id, tag, className, parent, text) {
    let node = document.getElementById(id);
    if (!node) {
      node = el(tag, className || '');
      node.id = id;
    }
    if (text !== undefined) node.textContent = text;
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  }

  /* ---------- E093-01 / E093-02 : ères, durées et largeurs relatives ---------- */
  const bandes = Array.from(layout.querySelectorAll('.atlas-chrono-era-list .era-band'));
  const eres = bandes.map((bande) => {
    const debut = Number(bande.dataset.start);
    const fin = Number(bande.dataset.end);
    return {
      bande,
      id: bande.dataset.eraId || '',
      debut,
      fin,
      nom: ((bande.querySelector('span') || {}).textContent || '').trim(),
      duree: spanYears(debut, fin),
    };
  }).filter((ere) => Number.isFinite(ere.debut) && Number.isFinite(ere.fin));

  const dureeMax = Math.max(1, ...eres.map((ere) => ere.duree));
  eres.forEach((ere) => {
    /* E093-02 : part de largeur dérivée de la durée réelle. */
    const item = ere.bande.parentElement;
    if (item) item.style.setProperty('--e093-share', (ere.duree / dureeMax).toFixed(3));
    /* E093-01 : la durée devient un texte visible dans la bande. */
    ensure(`e093-era-dur-${ere.id}`, 'span', 'e093-era-duration', ere.bande,
      `${nombre(ere.duree)} ans`);
    ere.bande.title = `${millesime(ere.debut)} → ${millesime(ere.fin)} · ${nombre(ere.duree)} ans`;
  });

  /* ---------- E093-03 : écarts entre repères ---------- */
  const items = Array.from(layout.querySelectorAll('#atlas-chrono-events > li[data-year]'));
  const repères = items.map((li) => ({ li, annee: Number(li.dataset.year) }))
    .filter((repere) => Number.isFinite(repere.annee));

  repères.forEach((repere, index) => {
    const avant = index > 0
      ? `${nombre(spanYears(repères[index - 1].annee, repere.annee))} ans après le repère précédent`
      : 'Premier repère affiché';
    const apres = index < repères.length - 1
      ? ` · ${nombre(spanYears(repere.annee, repères[index + 1].annee))} ans avant le repère suivant`
      : ' · dernier repère affiché';
    const carte = repere.li.querySelector('.event-card');
    if (carte) {
      ensure(`e093-gap-${repere.li.dataset.eventId || index}`, 'span', 'e093-gap', carte, avant + apres);
    }
  });

  /* ---------- Ère et repère courants ---------- */
  const bandeActive = eres.find((ere) => ere.bande.getAttribute('aria-current') === 'true') || eres[0];
  const carteActive = layout.querySelector('.event-card[aria-current="true"]');
  const itemActif = carteActive ? carteActive.closest('li[data-year]') : null;
  const anneeActive = itemActif ? Number(itemActif.dataset.year) : Number.NaN;
  const ereActive = (itemActif && eres.find((ere) => ere.id === itemActif.dataset.eraId)) || bandeActive;

  /* ---------- E093-05 / E093-07 / E093-08 : statistiques de période ---------- */
  const couverture = eres.length
    ? spanYears(Math.min(...eres.map((ere) => ere.debut)), Math.max(...eres.map((ere) => ere.fin)))
    : 0;
  const plusLongue = eres.reduce((meilleur, ere) => (!meilleur || ere.duree > meilleur.duree ? ere : meilleur), null);
  const plusCourte = eres.reduce((meilleur, ere) => (!meilleur || ere.duree < meilleur.duree ? ere : meilleur), null);
  const rapport = plusLongue && plusCourte && plusCourte.duree > 0
    ? (plusLongue.duree / plusCourte.duree).toFixed(1).replace('.', ',')
    : '—';

  const anneesEre = repères
    .filter((repere) => ereActive && repere.li.dataset.eraId === ereActive.id)
    .map((repere) => repere.annee)
    .sort((a, b) => a - b);
  const dureeEre = ereActive ? spanYears(ereActive.debut, ereActive.fin) : 0;
  const densite = anneesEre.length && dureeEre > 0 ? dureeEre / anneesEre.length : null;

  let plusLongTrou = 0;
  if (ereActive && anneesEre.length) {
    const bornes = [ereActive.debut, ...anneesEre, ereActive.fin];
    for (let i = 1; i < bornes.length; i += 1) {
      plusLongTrou = Math.max(plusLongTrou, spanYears(bornes[i - 1], bornes[i]));
    }
  }

  /* ---------- E093-06 : position relative dans l'ère ---------- */
  let relative = null;
  if (ereActive && Number.isFinite(anneeActive) && ereActive.fin > ereActive.debut) {
    const brut = ((anneeActive - ereActive.debut) / (ereActive.fin - ereActive.debut)) * 100;
    relative = Math.max(0, Math.min(100, Math.round(brut)));
  }
  const aside = layout.querySelector('.chronology-aside');
  if (aside && relative !== null) {
    const noeud = ensure('e093-relative', 'p', 'e093-relative', aside,
      `Position relative : à ${relative} % du temps écoulé de l’ère « ${ereActive.nom} » `
      + `(${millesime(ereActive.debut)} → ${millesime(ereActive.fin)}).`);
    const ancre = aside.querySelector('.aside-year');
    if (ancre && ancre.nextSibling !== noeud) aside.insertBefore(noeud, ancre.nextSibling);
  }

  /* ---------- E093-09 : région live unique, texte réel ---------- */
  const main = layout.querySelector('.chronology-main');
  const lignes = [];
  if (eres.length) {
    lignes.push(['e093-summary-range',
      `${eres.length} ère(s) documentée(s), de ${millesime(Math.min(...eres.map((e) => e.debut)))} `
      + `à ${millesime(Math.max(...eres.map((e) => e.fin)))} : ${nombre(couverture)} ans couverts.`]);
  }
  if (plusLongue && plusCourte) {
    lignes.push(['e093-summary-rank',
      `Règne le plus long : « ${plusLongue.nom} » (${nombre(plusLongue.duree)} ans) ; `
      + `le plus court : « ${plusCourte.nom} » (${nombre(plusCourte.duree)} ans) ; rapport ${rapport} à 1.`]);
  }
  if (ereActive) {
    lignes.push(['e093-summary-density',
      `Dans l’ère « ${ereActive.nom} » : ${anneesEre.length} repère(s) affiché(s) sur ${nombre(dureeEre)} ans, `
      + (densite !== null ? `soit 1 repère tous les ${nombre(densite)} ans.` : 'densité non calculable.')]);
    lignes.push(['e093-summary-gap',
      `Plus longue période sans repère dans cette ère : ${nombre(plusLongTrou)} ans.`]);
  }
  lignes.push(['e093-summary-method',
    'Durées calculées sans année zéro : le franchissement av. J.-C. / apr. J.-C. est corrigé d’une unité.']);
  lignes.push(['e093-summary-toggle',
    layout.dataset.e093Proportional === 'on'
      ? 'Largeur des bandes proportionnelle à la durée des ères.'
      : 'Largeur des bandes uniforme (réglage d’origine).']);

  if (main) {
    const resume = ensure('e093-duration-summary', 'section', 'e093-summary', main);
    resume.setAttribute('aria-labelledby', 'e093-summary-title');
    resume.setAttribute('role', 'status');
    resume.setAttribute('aria-live', 'polite');
    resume.setAttribute('aria-atomic', 'false');
    const titre = ensure('e093-summary-title', 'h2', 'e093-summary-title', resume, 'Repères de durée');
    if (resume.firstChild !== titre) resume.insertBefore(titre, resume.firstChild);
    lignes.forEach(([id, texte]) => {
      ensure(id, 'p', 'e093-line', resume, texte);
    });

    /* E093-02 : bascule indépendante (aria-pressed), sans reconstruction
       de la vue : le focus et le filtre local restent intacts. */
    const bascule = ensure('e093-proportional-btn', 'button', 'e093-proportional', resume,
      layout.dataset.e093Proportional === 'on'
        ? 'Largeur proportionnelle aux durées : activée'
        : 'Largeur proportionnelle aux durées : désactivée');
    bascule.type = 'button';
    bascule.setAttribute('aria-pressed', layout.dataset.e093Proportional === 'on' ? 'true' : 'false');
    bascule.setAttribute('aria-controls', 'atlas-chrono-eras');
    if (!bascule.dataset.e093Bound) {
      bascule.dataset.e093Bound = '1';
      bascule.addEventListener('click', () => {
        const actif = layout.dataset.e093Proportional !== 'on';
        preferProportional = actif;
        layout.dataset.e093Proportional = actif ? 'on' : 'off';
        bascule.setAttribute('aria-pressed', actif ? 'true' : 'false');
        bascule.textContent = actif
          ? 'Largeur proportionnelle aux durées : activée'
          : 'Largeur proportionnelle aux durées : désactivée';
        const note = document.getElementById('e093-summary-toggle');
        if (note) {
          note.textContent = actif
            ? 'Largeur des bandes proportionnelle à la durée des ères.'
            : 'Largeur des bandes uniforme (réglage d’origine).';
        }
      });
    }
  }

  /* E093-10 : panneau de mesures, masqué hors tiroir de diagnostics. */
  const panneau = ensure('e093-duration-audit', 'section', 'e093-panel', ctx.stage);
  panneau.setAttribute('aria-label', 'Mesures des repères de durée de la vue chronologie');
  const titreAudit = ensure('e093-audit-title', 'h2', '', panneau, 'Repères de durée — mesures');
  if (panneau.firstChild !== titreAudit) panneau.insertBefore(titreAudit, panneau.firstChild);
  lignes.forEach(([id, texte]) => {
    ensure(`e093-audit-${id}`, 'p', '', panneau, texte);
  });
  ensure('e093-audit-state', 'p', '', panneau,
    `État : mouvement ${ctx.reducedMotion && ctx.reducedMotion() ? 'réduit' : 'complet'} `
    + `· ${repères.length} repère(s) mesuré(s) · largeur ${layout.dataset.e093Proportional}.`);
});
