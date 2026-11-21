import { register } from './registry.js';

/* Lentille E074 — légende des ères, codes couleur et clé de lecture.
   Vague « Chronologie ». Dix chantiers E074-01 … E074-10, tous implémentés ci-dessous.
   Aucun fichier partagé n'est modifié : le style est injecté une seule fois via
   ctx.css('chronology-e074', …), les nœuds sont ajoutés au layout reconstruit et
   protégés par garde d'existence. Zéro réseau, zéro Math.random, zéro console.*,
   zéro boucle rAF propre. Tout le texte est en français. */

/* Formes fixes, déterministes : aucune graine aléatoire n'est nécessaire,
   l'index de l'ère dans la liste sert de clé (E074-02). */
const ERA_SHAPES = ['◆', '■', '▲', '●', '✚', '⬟'];

/* Formes associées aux types de point et aux niveaux de confiance déjà rendus
   en texte par chronology.js:483-484 (E074-05 et E074-06). */
const KIND_SHAPES = { audit: '◈', figure: '▣', lieu: '▽' };
const CONF_SHAPES = {
  certain: '●', certitude: '●', élevée: '●', haute: '●',
  probable: '◐', vraisemblable: '◐', moyenne: '◐',
  incertain: '○', incertaine: '○', douteux: '○', faible: '○',
};
const FALLBACK_KIND = '◇';
const FALLBACK_CONF = '◌';

register('E074', (ctx) => {
  if (!ctx || !ctx.layout) return;
  const { layout, stage, el } = ctx;

  /* E074-07 + E074-10 — bloc CSS unique. Les états actifs reçoivent un motif
     (repeating-linear-gradient) et un bordure en pointillés, jamais une simple
     couleur. @media (forced-colors: active) conserve les formes et le texte
     quand le système remplace les couleurs. */
  ctx.css('chronology-e074', `
.e074-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e074-era-shape{display:inline-block;min-width:14px;margin-right:5px;font-size:11px;line-height:1;color:var(--gold-bright)}
.e074-flag{display:inline-block;margin-top:4px;padding:1px 5px;border:1px dashed var(--gold);border-radius:4px;background-image:repeating-linear-gradient(135deg,rgba(230,185,111,.12) 0 3px,transparent 3px 6px);color:var(--gold-bright);font-size:8px;font-weight:600;letter-spacing:.02em;line-height:1.3}
.e074-flag-era::before{content:'▶ ';}
.e074-flag-era{white-space:nowrap}
.e074-flag-card{white-space:nowrap}
.e074-press-mark{display:inline-block;margin-right:4px;font-size:10px;font-weight:700;line-height:1}
.e074-kind-mark,.e074-confidence-mark{display:inline-block;margin-right:3px;font-size:9px;line-height:1}
.e074-legend{margin:18px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
.e074-legend-title{margin:0 0 4px;color:var(--ink);font-family:var(--serif);font-size:13px;font-weight:450}
.e074-legend-intro{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5}
.e074-legend-list{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;font-size:9px;line-height:1.5}
.e074-legend-list dt{color:var(--gold-bright);font-variant-numeric:tabular-nums;white-space:nowrap}
.e074-legend-list dd{margin:0;color:var(--ink-soft)}
.e074-readout{min-height:13px;margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e074-flag,.e074-press-mark,.e074-kind-mark,.e074-confidence-mark{transition:none}
@media (max-width:620px){
  .e074-legend{padding:8px 9px}
  .e074-legend-list{grid-template-columns:minmax(0,1fr);gap:2px}
  .e074-legend-list dd{margin-bottom:5px}
  .e074-flag{font-size:7px;padding:1px 3px}
}
@media (prefers-reduced-motion:reduce){
  .e074-flag,.e074-press-mark,.e074-kind-mark,.e074-confidence-mark{transition:none!important}
}
@media (forced-colors:active){
  .e074-era-shape,.e074-flag,.e074-press-mark,.e074-kind-mark,.e074-confidence-mark,
  .e074-legend-list dt{color:CanvasText}
  .e074-flag{border-style:dashed;border-color:CanvasText;background-image:none;forced-color-adjust:none}
}`);

  /* Garde d'existence générique : réutilise un nœud déjà posé dans le layout
     courant, sinon le crée. Le layout étant reconstruit à chaque rendu, cette
     garde protège surtout d'un double appel à apply() sur le même rendu. */
  function ensureNode(parent, id, tagName, className, text) {
    if (!parent) return null;
    let node = parent.querySelector(`#${id}`);
    if (node) return node;
    node = el(tagName, className, text);
    node.id = id;
    parent.appendChild(node);
    return node;
  }

  const main = layout.querySelector('.chronology-main') || stage;

  /* E074-01 et E074-02 — bandes d'ères : une forme fixe par ère et un
     drapeau textuel « Ère active » sur la bande aria-current (chronology.js:284-290,
     chronology.js:45 / styles.css:204 portant l'état actif par la couleur seule). */
  const bands = Array.from(layout.querySelectorAll('.era-band'));
  const eraNames = bands.map((band) => (band.querySelector('span')?.textContent || '').trim());
  let activeEraName = '';
  let activeEraShape = '';
  bands.forEach((band, index) => {
    if (band.dataset.e074Marked !== '1') {
      band.dataset.e074Marked = '1';
      const shape = ERA_SHAPES[index % ERA_SHAPES.length];
      band.dataset.e074Shape = shape;
      const glyph = el('span', 'e074-era-shape', shape);
      glyph.setAttribute('aria-hidden', 'true');
      band.insertBefore(glyph, band.firstChild);
    }
    if (band.getAttribute('aria-current') === 'true') {
      activeEraName = eraNames[index] || '';
      activeEraShape = band.dataset.e074Shape || '';
      if (!band.querySelector('.e074-flag-era')) {
        const flag = el('span', 'e074-flag e074-flag-era', 'Ère active');
        band.appendChild(flag);
      }
    }
  });

  /* E074-03 — carte de repère active (chronology.js:385-390, chronology.js:62 /
     styles.css:213) : coche « Repère sélectionné » en forme + texte réel. */
  let activeEventTitle = '';
  const activeCard = layout.querySelector('.event-card[aria-current="true"]');
  if (activeCard) {
    activeEventTitle = (activeCard.querySelector('strong')?.textContent || '').trim();
    if (!activeCard.querySelector('.e074-flag-card')) {
      activeCard.appendChild(el('span', 'e074-flag e074-flag-card', 'Repère sélectionné'));
    }
  }

  /* E074-04 — puces de filtre / thèmes activés (chronology.js:334,449 et :57) :
     une coche visuelle s'ajoute à l'état aria-pressed déjà porté par le bouton. */
  const pressedTags = Array.from(layout.querySelectorAll('.atlas-chrono-tag[aria-pressed="true"]'));
  pressedTags.forEach((button) => {
    if (button.querySelector('.e074-press-mark')) return;
    const mark = el('span', 'e074-press-mark', '✓');
    mark.setAttribute('aria-hidden', 'true');
    button.insertBefore(mark, button.firstChild);
  });

  /* E074-05 — types de point (styles.css:231-233) : une forme distincte par
     kind, le mot restant lisible dans la pastille. Aucune donnée inventée. */
  layout.querySelectorAll('.point-kind').forEach((badge) => {
    if (badge.dataset.e074Marked === '1') return;
    badge.dataset.e074Marked = '1';
    const kind = (badge.textContent || '').trim().toLowerCase();
    const shape = KIND_SHAPES[kind] || FALLBACK_KIND;
    badge.dataset.e074Kind = kind;
    badge.insertBefore(el('span', 'e074-kind-mark', shape), badge.firstChild);
  });

  /* E074-06 — niveaux de confiance (styles.css:234) : marqueur de forme,
     repli neutre pour toute valeur non cartographiée. */
  layout.querySelectorAll('.confidence').forEach((badge) => {
    if (badge.dataset.e074Marked === '1') return;
    badge.dataset.e074Marked = '1';
    const level = (badge.textContent || '').trim().toLowerCase();
    const shape = CONF_SHAPES[level] || FALLBACK_CONF;
    badge.dataset.e074Confidence = level;
    badge.insertBefore(el('span', 'e074-confidence-mark', shape), badge.firstChild);
  });

  /* E074-08 — légende indexable : six codes en texte réel, dans un <dl>. */
  const legend = ensureNode(main, 'e074-legend', 'section', 'e074-legend');
  if (legend && !legend.querySelector('#e074-legend-list')) {
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-labelledby', 'e074-legend-title');
    const heading = el('h2', 'e074-legend-title', 'Légende des signaux — formes, motifs et texte');
    heading.id = 'e074-legend-title';
    legend.appendChild(heading);
    legend.appendChild(el('p', 'e074-legend-intro',
      'Aucune information n’est portée par la seule couleur : chaque état associe une forme, un motif ou un mot.'));
    const list = el('dl', 'e074-legend-list');
    list.id = 'e074-legend-list';
    const rows = [
      ['▶ Ère active', 'Bandeau portant la mention « Ère active » : ère consultée.'],
      ['◆ ■ ▲ ● ✚ ⬟', 'Une forme fixe identifie chaque ère, indépendamment de sa couleur.'],
      ['✔ Repère sélectionné', 'Carte dont le contenu est affiché dans la fiche à droite.'],
      ['✓', 'Puce de thème ou de filtre activée ; l’état est aussi annoncé par aria-pressed.'],
      ['◈ ▣ ▽ ◇', 'Types de point : audit, figure, lieu ; le type est aussi écrit sur la pastille.'],
      ['● ◐ ○ ◌', 'Confiance : certaine, probable, incertaine ; le niveau est aussi écrit sur la pastille.'],
    ];
    rows.forEach(([term, definition]) => {
      list.appendChild(el('dt', '', term));
      list.appendChild(el('dd', '', definition));
    });
    legend.appendChild(list);
  }

  /* E074-09 — readout textuel récapitulatif : une seule phrase, dérivée du DOM
     rendu, dédupliquée par comparaison stricte avant écriture. */
  const readout = ensureNode(main, 'e074-readout', 'p', 'e074-readout');
  if (readout) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    const summary = `Signaux actifs — ère : ${activeEraName ? `${activeEraShape} ${activeEraName}` : 'aucune'}`
      + ` ; repère : ${activeEventTitle || 'aucun'}`
      + ` ; filtres actifs : ${pressedTags.length}`
      + ` ; codes de forme légendés : 6.`;
    if (readout.textContent !== summary) readout.textContent = summary;
  }

  /* E074-10 — état auditable sans coloration : attributs miroirs sur le layout,
     sans toucher aux attributs existants ni au store. */
  layout.dataset.e074Signals = String(bands.length + pressedTags.length
    + layout.querySelectorAll('.point-kind, .confidence').length);
  layout.dataset.e074Legend = legend ? '1' : '0';
});
