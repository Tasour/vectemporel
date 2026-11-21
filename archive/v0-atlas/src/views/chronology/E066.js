import { register } from './registry.js';

/* Lentille E066 — vue Chronologie.
   Thème : couleurs, variables CSS de thème et cohérence des ères.
   Les dix chantiers E066-01 à E066-10 sont implémentés dans ce seul module.
   Contrat : un register, un ctx.css('chronology-e066', …), des IDs préfixés
   e066 protégés par garde d'existence, zéro journalisation, zéro appel réseau,
   zéro tirage aléatoire, aucune boucle d'animation propre, français partout.

   E066-01  or codé en dur → jetons --gold / --gold-bright
   E066-02  priorité du style injecté dans #atlas-stage → sélecteurs préfixés
   E066-03  --era des bandes propagé aux cartes (data-era-id)
   E066-04  repli --era + validation de la couleur déclarée
   E066-05  pastille d'ère toujours accompagnée du nom écrit en toutes lettres
   E066-06  mode forced-colors : repères par forme/bordure, état auditable
   E066-07  contraste des paires de jetons recalculé (formule WCAG)
   E066-08  mouvement réduit lu à chaque passe, aucune transition propre
   E066-09  idempotence multi-rendus : un style, un panneau, un écouteur
   E066-10  panneau de synthèse non live, valeurs dérivées du DOM courant */

const STYLE_ID = 'chronology-e066';
const PANEL_ID = 'e066-palette';
const READOUT_ID = 'e066-readout';
const LEGEND_ID = 'e066-legend';
const REFRESH_ID = 'e066-refresh';

/* Règles uniques. Les sélecteurs sont préfixés par #atlas-stage afin de
   l'emporter sur le style de la vue injecté dans stage (chronology.js:32-93),
   lui-même postérieur au <head> où ctx.css dépose ce bloc (registry.js:13-19). */
const CSS_RULES = `
/* E066-01 / E066-02 : états actifs dérivés des jetons de thème, pas de rgba figé. */
#atlas-stage .atlas-chrono-tag[aria-pressed="true"] {
  border-color: var(--gold);
  color: var(--gold-bright);
  background: color-mix(in srgb, var(--gold) 10%, transparent);
}
#atlas-stage .event-card[aria-current="true"] {
  border-color: var(--gold);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 20%, transparent);
}
/* E066-04 : --era sans valeur n'invalide plus le filet de l'ère courante. */
#atlas-stage .era-band[aria-current="true"] {
  border-color: var(--gold);
  color: var(--ink);
  box-shadow: inset 0 -2px var(--era, var(--muted));
}
/* E066-03 / E066-05 : pastille de couleur ET nom de l'ère en texte réel. */
#atlas-stage .e066-era-chip {
  align-self: flex-start;
  margin: 2px 10px 0;
  padding: 2px 6px;
  border-left: 2px solid var(--era, var(--muted));
  border-radius: 3px;
  background: color-mix(in srgb, var(--era, var(--muted)) 10%, var(--surface-2));
  color: var(--ink-soft);
  font-size: 8px;
  line-height: 1.3;
}
#atlas-stage .atlas-chrono-card-era[data-e066-era-chip="1"] {
  border-left: 2px solid var(--era, var(--muted));
  padding-left: 5px;
  color: var(--ink-soft);
}

/* E066-10 : panneau compact, inséré avant la navigation d'ères. */
#e066-palette {
  margin: 0 0 12px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.02);
}
#e066-palette .e066-title { margin: 0 0 4px; color: var(--gold); font-family: var(--serif); font-size: 11px; font-weight: 500; }
#e066-palette .e066-lede,
#e066-palette .e066-note { margin: 0 0 6px; color: var(--muted-2); font-size: 9px; line-height: 1.45; }
#e066-palette .e066-readout { margin: 0 0 6px; color: var(--ink-soft); font-size: 9px; line-height: 1.5; font-variant-numeric: tabular-nums; }
#e066-palette .e066-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 6px; padding: 0; list-style: none; }
#e066-palette .e066-legend-item { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; }
#e066-palette .e066-swatch { display: inline-block; width: 9px; height: 9px; border: 1px solid var(--line); border-radius: 2px; background: var(--era, var(--muted)); }
#e066-palette .e066-swatch[data-e066-fallback="1"] { background: var(--muted); border-style: dashed; }
#e066-palette .e066-refresh { min-height: 36px; padding: 0 10px; border: 1px solid var(--line); border-radius: 7px; background: transparent; color: var(--gold-bright); font-size: 9px; cursor: pointer; }
#e066-palette .e066-refresh:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }

/* E066-06 : sous couleurs forcées, la couleur ne porte plus rien seule. */
@media (forced-colors: active) {
  #e066-palette { border-color: CanvasText; }
  #e066-palette .e066-swatch { background: Canvas; border: 1px solid CanvasText; }
  #atlas-stage .era-band[aria-current="true"],
  #atlas-stage .event-card[aria-current="true"],
  #atlas-stage .atlas-chrono-tag[aria-pressed="true"],
  #atlas-stage .atlas-chrono-card-era[data-e066-era-chip="1"],
  #atlas-stage .e066-era-chip { border-color: CanvasText; box-shadow: none; color: CanvasText; }
}
/* E066-08 : aucune transition à l'intérieur du panneau ou des pastilles. */
@media (prefers-reduced-motion: reduce) {
  #e066-palette *, #atlas-stage .e066-era-chip { transition: none !important; }
}`;

let currentCtx = null;
let applications = 0;
let forcedQuery = null;

/* Réutilise un nœud déjà attaché, le déplace sinon, sans jamais dupliquer
   d'identifiant e066. `before` place le panneau avant la nav d'ères. */
function ensureNode(id, tag, className, parent, before, make) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tag, className);
    node.id = id;
  }
  if (className) node.className = className;
  if (before && before.parentNode === parent) parent.insertBefore(node, before);
  else parent.appendChild(node);
  return node;
}

function token(name, rootStyle) {
  try {
    const value = rootStyle.getPropertyValue(name).trim();
    return value || null;
  } catch {
    return null;
  }
}

/* Luminance relative WCAG ; seules les hexadécimales du design system local
   sont acceptées (styles.css:3-16). Toute autre forme est « indisponible ». */
function luminance(value) {
  if (!value) return null;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) return null;
  let raw = match[1];
  if (raw.length === 3) raw = raw.split('').map((ch) => ch + ch).join('');
  const channels = [0, 2, 4].map((offset) => parseInt(raw.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const light = luminance(foreground);
  const dark = luminance(background);
  if (light === null || dark === null) return null;
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

function ratioText(value) {
  if (value === null) return 'indisponible';
  return `${(Math.round(value * 10) / 10).toFixed(1).replace('.', ',')}:1`;
}

function isColor(value) {
  if (!value) return false;
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') return CSS.supports('color', value);
  return /^(#|rgb\(|hsl\(|color-mix\()/i.test(value);
}

/* Les couleurs d'ère viennent uniquement des bandes construites à
   chronology.js:282-305 (`:293` pose --era). Aucune donnée n'est réinventée. */
function collectEras() {
  const eras = new Map();
  document.querySelectorAll('.era-band[data-era-id]').forEach((band) => {
    const id = band.dataset.eraId;
    const raw = band.style.getPropertyValue('--era').trim();
    const firstSpan = band.querySelector('span');
    const name = (firstSpan && firstSpan.textContent.trim()) || band.textContent.trim() || id;
    eras.set(id, { id, name, raw, valid: isColor(raw), count: 0, band });
  });
  document.querySelectorAll('#atlas-chrono-events > li[data-era-id]').forEach((li) => {
    const era = eras.get(li.dataset.eraId);
    if (era) era.count += 1;
  });
  return eras;
}

/* E066-03 / E066-04 / E066-05 : propagation du --era de la bande vers la
   carte qui porte le même data-era-id (chronology.js:378-381), avec repli
   et pastille textuelle quand la vue n'affiche pas déjà le nom de l'ère. */
function syncCards(eras, make) {
  let chips = 0;
  document.querySelectorAll('#atlas-chrono-events > li[data-event-id]').forEach((li) => {
    const card = li.querySelector('.event-card');
    const era = eras.get(li.dataset.eraId);
    if (!card || !era) return;
    card.style.setProperty('--era', era.valid && era.raw ? era.raw : 'var(--muted)');
    card.dataset.e066Era = era.valid ? 'valide' : era.raw ? 'invalide' : 'absente';
    const existing = card.querySelector('.atlas-chrono-card-era');
    if (existing) {
      existing.dataset.e066EraChip = '1';
      chips += 1;
      return;
    }
    const chipId = `e066-era-${li.dataset.eventId}`;
    let chip = document.getElementById(chipId);
    if (!chip) chip = make('span', 'e066-era-chip');
    chip.id = chipId;
    chip.textContent = `Ère · ${era.name}`;
    chip.setAttribute('title', `Ère : ${era.name}`);
    card.appendChild(chip);
    chips += 1;
  });
  return chips;
}

function forcedActive() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(forced-colors: active)').matches);
  } catch {
    return false;
  }
}

/* Un seul écouteur module pour toute la session ; il n'ajoute ni boucle
   d'animation ni minuteur. */
function bindForcedListener() {
  if (forcedQuery || typeof window.matchMedia !== 'function') return;
  try {
    forcedQuery = window.matchMedia('(forced-colors: active)');
    const onChange = () => {
      if (currentCtx && currentCtx.stage && currentCtx.stage.isConnected) apply(currentCtx);
    };
    if (typeof forcedQuery.addEventListener === 'function') forcedQuery.addEventListener('change', onChange);
    else if (typeof forcedQuery.addListener === 'function') forcedQuery.addListener(onChange);
  } catch {
    forcedQuery = null;
  }
}

function apply(ctx) {
  currentCtx = ctx;
  applications += 1;

  /* E066-09 : ctx.css déjà protégé par cssOnce (registry.js:13-19) ; la garde
     DOM évite toute seconde injection si la feuille a été retirée. */
  if (!document.getElementById(STYLE_ID)) ctx.css(STYLE_ID, CSS_RULES);
  if (!ctx.stage) return;

  bindForcedListener();
  const make = (tag, className) => ctx.el(tag, className);
  const main = ctx.layout && ctx.layout.querySelector('.chronology-main');
  const host = main || ctx.stage;
  const anchor = host.querySelector('.atlas-chrono-era-nav');

  const panel = ensureNode(PANEL_ID, 'section', 'e066-panel', host, anchor, make);
  panel.setAttribute('aria-label', 'Palette de thème et cohérence des ères');

  const title = ensureNode(`${PANEL_ID}-title`, 'h2', 'e066-title', panel, null, make);
  title.textContent = 'Couleurs et ères — contrôle de thème';
  title.id = `${PANEL_ID}-title`;

  const lede = ensureNode(`${PANEL_ID}-lede`, 'p', 'e066-lede', panel, null, make);
  lede.id = `${PANEL_ID}-lede`;
  lede.textContent = 'Chaque ère garde sa couleur de la bande jusqu’aux repères ; son nom reste écrit en toutes lettres.';

  const readout = ensureNode(READOUT_ID, 'p', 'e066-readout', panel, null, make);
  readout.id = READOUT_ID;

  const legend = ensureNode(LEGEND_ID, 'ul', 'e066-legend', panel, null, make);
  legend.id = LEGEND_ID;

  const note = ensureNode(`${PANEL_ID}-note`, 'p', 'e066-note', panel, null, make);
  note.id = `${PANEL_ID}-note`;
  note.textContent = 'Aucune information n’est portée par la seule couleur : pastilles, noms d’ères et attributs sont redondants.';

  const refresh = ensureNode(REFRESH_ID, 'button', 'e066-refresh', panel, null, make);
  refresh.id = REFRESH_ID;
  refresh.type = 'button';
  refresh.textContent = 'Revérifier la palette';
  refresh.setAttribute('aria-controls', READOUT_ID);
  /* Un seul gestionnaire par bouton réutilisé : la garde évite d'empiler des
     écouteurs à chaque rendu, et le contexte courant reste le dernier reçu. */
  if (refresh.dataset.e066Bound !== '1') {
    refresh.dataset.e066Bound = '1';
    refresh.addEventListener('click', () => {
      if (currentCtx) apply(currentCtx);
    });
  }

  const eras = collectEras();
  const chips = syncCards(eras, make);
  const valid = [...eras.values()].filter((era) => era.valid && era.raw).length;
  const missing = eras.size - valid;

  /* E066-05 / E066-10 : légende reconstruite à chaque passe, une pastille
     colorée (décorative) et le nom + l'état + le compte en texte réel. */
  legend.replaceChildren();
  eras.forEach((era) => {
    const item = make('li', 'e066-legend-item');
    const swatch = make('span', 'e066-swatch');
    swatch.setAttribute('aria-hidden', 'true');
    if (era.valid && era.raw) swatch.style.setProperty('--era', era.raw);
    else swatch.dataset.e066Fallback = '1';
    const verdict = era.valid && era.raw ? 'couleur valide' : era.raw ? 'couleur invalide' : 'couleur absente';
    item.append(swatch, make('span', 'e066-legend-text', `${era.name} — ${verdict} — ${era.count} repère(s)`));
    legend.appendChild(item);
  });
  if (!eras.size) legend.appendChild(make('li', 'e066-legend-item', 'Aucune ère déclarée dans la vue.'));

  /* E066-07 : jetons lus dans la feuille réellement calculée, ratios
     recalculés depuis leur formule, jamais codés en dur. */
  const rootStyle = getComputedStyle(document.documentElement);
  const gold = token('--gold', rootStyle);
  const background = token('--bg', rootStyle);
  const ink = token('--ink', rootStyle);
  const surface = token('--surface', rootStyle);
  const muted = token('--muted-2', rootStyle);
  const ratioGold = ratioText(contrast(gold, background));
  const ratioInk = ratioText(contrast(ink, surface));
  const ratioMuted = ratioText(contrast(muted, background));

  const reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion());
  const forced = forcedActive();

  readout.textContent = `Ères : ${eras.size} · couleurs valides : ${valid} · manquantes ou invalides : ${missing} · pastilles synchronisées : ${chips} · contraste or/fond ${ratioGold}, encre/surface ${ratioInk}, atténué/fond ${ratioMuted} · mouvement réduit : ${reduced ? 'oui' : 'non'} · couleurs forcées : ${forced ? 'oui' : 'non'} · contrôles : ${applications}.`;

  /* Miroirs d'état pour un test E2E : aucune info n'est donnée à la couleur seule. */
  panel.dataset.e066Eras = String(eras.size);
  panel.dataset.e066Valid = String(valid);
  panel.dataset.e066Chips = String(chips);
  panel.dataset.e066ContrastGold = ratioGold;
  panel.dataset.e066Motion = reduced ? '1' : '0';
  panel.dataset.e066Forced = forced ? '1' : '0';
  panel.dataset.e066Applications = String(applications);
  ctx.stage.dataset.e066Motion = reduced ? '1' : '0';
  ctx.stage.dataset.e066Forced = forced ? '1' : '0';
}

register('E066', apply);
