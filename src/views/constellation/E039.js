import { register } from './registry.js';

/* Lentille E039 — Robustesse et garde-fous des arêtes du graphe (vue Constellation).
 *
 * Dix chantiers appliqués à chaque rendu par le registre `runEnhancements`.
 * Une arête est un <line> du SVG décoratif `.constellation-edges`, tracé par
 * `addLine()` dans `constellation.js`. Le but n'est pas de redessiner le graphe,
 * mais de vérifier ses arêtes, de signaler celles qui sont douteuses et de rendre
 * leur information lisible sans dépendre de la couleur seule.
 *
 * Contrat respecté : un seul register('E039', ctx), une seule feuille injectée
 * via ctx.css('constellation-e039', …), identifiants tous préfixés `e039-`,
 * aucun fichier partagé modifié, aucune trace de débogage, aucun appel réseau,
 * aucune source d'aléa, aucune boucle d'animation propre.
 *
 * Lectures : src/views/constellation.js, src/views/constellation/registry.js,
 * src/views/_diagnostics.js, UNIFIED_AUDIT/views/atlas-constellation.md.
 */

const FIELD_SCOPE = 'data-e039';
const EDGE_LIMIT = 160;
const EPSILON = 0.01;
const COORD_ATTRS = ['x1', 'y1', 'x2', 'y2'];

/* Persiste entre deux reconstructions du DOM opérées par la coque : aucun nœud
 * n'est mémorisé ici, seule l'intention de l'utilisateur est conservée. */
let revealOn = false;

function attr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function setAttr(node, name, value) {
  if (!node || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(name, value); } catch { /* nœud verrouillé : on passe outre */ }
}

function flag(node, name, on) {
  setAttr(node, name, on ? '1' : '0');
}

function number(node, name) {
  const raw = attr(node, name);
  if (raw === null || raw === '') return NaN;
  return Number(raw);
}

function frInt(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function query(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function collect(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* Une seule feuille, portée par l'attribut `data-e039` posé sur le champ :
 * aucune règle ne fuite hors de la vue Constellation. */
const CSS = `
[data-e039="1"] .constellation-edges line{stroke-linecap:round}
/* E039-01 — arête non finie : pointillé d'alerte, jamais un trait fantôme. */
[data-e039="1"] line[data-e039-invalid="1"]{stroke-dasharray:1 2;opacity:.35}
/* E039-02 — arête dégénérée : marqueur court et distinct. */
[data-e039="1"] line[data-e039-degenerate="1"]{stroke-dasharray:.5 2;opacity:.6}
/* E039-03 — arête recadrée : trait signalé mais lisible. */
[data-e039="1"] line[data-e039-clamped="1"]{stroke-dasharray:3 2}
/* E039-04 — motifs par type : le type ne repose plus sur la couleur seule. */
[data-e039-pattern="1"] line.is-moon:not(.is-path){stroke-dasharray:5 2}
[data-e039-pattern="1"] line.is-path{stroke-dasharray:none}
[data-e039-pattern="1"] line:not(.is-path):not(.is-moon){stroke-dasharray:2 3}
/* E039-05 — au-delà du plafond, les traits s'allègent. */
[data-e039="1"][data-e039-saturated="1"] .constellation-edges line{stroke-width:.7}
/* E039-07 — gel : aucune animation ni transition sur un trait. */
[data-e039-frozen="1"] line{animation:none;transition:none}
[data-e039-frozen="1"][data-e039-reduced="1"] line{opacity:.85}
/* E039-08 — épaisseur bornée, trait non mis à l'échelle. */
[data-e039-stroke="1"] line{vector-effect:non-scaling-stroke;stroke-width:1.4}
/* E039-10 — révélation à la demande des arêtes signalées. */
[data-e039="1"][data-e039-reveal="1"] line[data-e039-invalid="1"]{stroke:var(--violet);stroke-width:2.4;opacity:1}
[data-e039="1"][data-e039-reveal="1"] line[data-e039-degenerate="1"]{stroke:var(--gold-bright);stroke-width:2.4;opacity:1}
[data-e039="1"][data-e039-reveal="1"] line[data-e039-clamped="1"]{stroke:var(--gold);stroke-width:2.2;opacity:1}
#e039-edge-audit{
  flex:1 1 100%;margin:0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
#e039-edge-audit[data-e039-alert="1"]{color:var(--gold-bright)}
#e039-reveal{
  min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer;
}
#e039-reveal:hover{border-color:var(--gold)}
#e039-reveal:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#e039-reveal[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
@media (max-width:620px){#e039-edge-audit{flex-basis:100%}}
@media (prefers-reduced-motion:reduce){#e039-reveal{transition:none}}
`;

register('E039', (ctx) => {
  /* Tolérance : contexte incomplet, vue absente ou champ introuvable → on sort
   * sans toucher au DOM et sans jamais lever d'exception. */
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  const layout = ctx.layout || query(ctx.stage, '.constellation-layout');
  if (!layout || typeof layout.querySelector !== 'function') return;
  const field = query(layout, '.constellation-field');
  if (!field) return; /* la vue Constellation n'est pas rendue : greffon inactif */
  const edges = query(field, '.constellation-edges');
  if (!edges) return; /* aucun SVG d'arêtes : rien à protéger */

  const lines = collect(edges, 'line');

  /* Une seule feuille injectée une fois par cssOnce, puis on pose le périmètre. */
  ctx.css('constellation-e039', CSS);
  setAttr(field, FIELD_SCOPE, '1');

  /* E039-01 — Extrémités non finies : chaque coordonnée est contrôlée ; une arête
     dont un x1/y1/x2/y2 n'est pas un nombre fini est marquée et comptée, jamais
     laissée à l'interprétation du moteur SVG. */
  let invalid = 0;
  lines.forEach((line) => {
    if (COORD_ATTRS.some((name) => !Number.isFinite(number(line, name)))) {
      invalid += 1;
      flag(line, 'data-e039-invalid', true);
    }
  });
  setAttr(field, 'data-e039-invalid', String(invalid));

  /* E039-02 — Arêtes dégénérées : une longueur nulle (extrémités confondues) est
     signalée au lieu de se fondre en un point invisible dans le.field. */
  let degenerate = 0;
  lines.forEach((line) => {
    if (attr(line, 'data-e039-invalid') === '1') return;
    const length = Math.hypot(
      number(line, 'x2') - number(line, 'x1'),
      number(line, 'y2') - number(line, 'y1')
    );
    if (Number.isFinite(length) && length < EPSILON) {
      degenerate += 1;
      flag(line, 'data-e039-degenerate', true);
    }
  });
  setAttr(field, 'data-e039-degenerate', String(degenerate));

  /* E039-03 — Recadrage secondaire : garde-fou indépendant du polar() de la vue,
     au cas où une autre lentille déplacerait une extrémité hors du viewBox. */
  let clamped = 0;
  lines.forEach((line) => {
    COORD_ATTRS.forEach((name) => {
      const value = number(line, name);
      if (!Number.isFinite(value)) return;
      const bounded = Math.min(100, Math.max(0, value));
      if (bounded !== value) {
        setAttr(line, name, bounded.toFixed(2));
        clamped += 1;
        flag(line, 'data-e039-clamped', true);
      }
    });
  });
  setAttr(field, 'data-e039-clamped', String(clamped));

  /* E039-04 — Motifs distinctifs : ordinaire, chemin actif et liaison lunaire
     reçoivent des pointillés différents, donc un canal hors couleur. */
  flag(edges, 'data-e039-pattern', true);

  /* E039-05 — Plafond de densité : au-delà de 160 arêtes, le trait est aminci.
     Le seuil est déclaré ici (EDGE_LIMIT), donc modifiable et falsifiable. */
  setAttr(field, 'data-e039-saturated', lines.length > EDGE_LIMIT ? '1' : '0');
  setAttr(field, 'data-e039-edge-count', String(lines.length));

  /* E039-06 — Conformité de l'SVG décoratif : les arêtes ne doivent jamais entrer
     dans l'arbre d'accessibilité ni dans l'ordre de tabulation ; on répare si absent. */
  if (!attr(edges, 'aria-hidden')) setAttr(edges, 'aria-hidden', 'true');
  if (!attr(edges, 'focusable')) setAttr(edges, 'focusable', 'false');
  if (attr(edges, 'aria-hidden') === 'true' && attr(edges, 'focusable') === 'false') {
    flag(edges, 'data-e039-decorative', true);
  }

  /* E039-07 — Gel des arêtes : aucune animation ni transition, y compris si une
     autre feuille tente d'animer un trait ; le mouvement réduit est consigné. */
  flag(edges, 'data-e039-frozen', true);
  flag(edges, 'data-e039-reduced', typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());

  /* E039-08 — Garde-fou d'épaisseur : non-scaling-stroke maintenu sous
     preserveAspectRatio="none", avec une largeur bornée à 1,4 px. */
  flag(edges, 'data-e039-stroke', true);

  /* E039-09 — Bilan textuel : ce que le trait porte est aussi énoncé en texte,
     dans une région live discrète du caption, sans couleur ni forme. */
  let pathOnly = 0;
  let moonOnly = 0;
  let both = 0;
  let plain = 0;
  lines.forEach((line) => {
    const classes = line && line.classList && typeof line.classList.contains === 'function'
      ? line.classList : null;
    const isPath = !!classes && classes.contains('is-path');
    const isMoon = !!classes && classes.contains('is-moon');
    if (isPath && isMoon) both += 1;
    else if (isPath) pathOnly += 1;
    else if (isMoon) moonOnly += 1;
    else plain += 1;
  });
  const caption = query(layout, '.constellation-caption');
  let audit = query(layout, '#e039-edge-audit');
  if (!audit && caption) {
    audit = ctx.el('p', 'e039-audit');
    audit.id = 'e039-edge-audit';
    audit.setAttribute('role', 'status');
    caption.insertBefore(audit, caption.firstChild);
  }
  if (audit) {
    const anomalies = invalid + degenerate + clamped;
    const parts = [
      `Arêtes : ${frInt(lines.length)} au total`,
      `${frInt(plain)} simple(s)`,
      `${frInt(pathOnly + both)} de chemin`,
      `${frInt(moonOnly + both)} lunaire(s)`,
      anomalies
        ? `${frInt(invalid)} non finie(s), ${frInt(degenerate)} dégénérée(s), ${frInt(clamped)} recadrée(s)`
        : 'aucune anomalie',
    ];
    setText(audit, `${parts.join(' — ')}.`);
    flag(audit, 'data-e039-alert', anomalies > 0);
  }

  /* E039-10 — Soupape de diagnostic : un bouton révèle à la demande les arêtes
     signalées. Bascule indépendante, donc aria-pressed est légitime ici. */
  let reveal = query(layout, '#e039-reveal');
  if (!reveal && caption) {
    reveal = ctx.el('button', 'e039-reveal', 'Relever les arêtes signalées');
    reveal.type = 'button';
    reveal.id = 'e039-reveal';
    reveal.setAttribute('aria-controls', 'e039-edge-audit');
    reveal.addEventListener('click', () => {
      revealOn = !revealOn;
      setAttr(reveal, 'aria-pressed', revealOn ? 'true' : 'false');
      setAttr(field, 'data-e039-reveal', revealOn ? '1' : '0');
    });
    caption.appendChild(reveal);
  }
  if (reveal) setAttr(reveal, 'aria-pressed', revealOn ? 'true' : 'false');
  setAttr(field, 'data-e039-reveal', revealOn ? '1' : '0');
});
