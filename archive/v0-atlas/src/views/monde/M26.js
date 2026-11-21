import { register } from './registry.js';

/* Lentille M26 — Sélection courante du pays (domaine C : ergonomie & interaction).
 *
 * Les dix chantiers sont décrits dans UNIFIED_AUDIT/MONDE/views/M26.md.
 * La sélection n'est jamais possédée par le greffon : elle est résolue à chaque
 * appel depuis ctx.state.countryId et ctx.countries (M26-01, M26-02). Le badge
 * est visuel et silencieux (M26-04), la parole passe par ctx.say (M26-05), le
 * survol ne modifie jamais l'identité du pays choisi (M26-08).
 *
 * Un seul fichier modifié, zéro réseau, zéro aléa, zéro console, zéro timer,
 * zéro rAF, aucun sélecteur de test créé ou modifié. */

const CSS_ID = 'monde-m26';
const CHIP_ID = 'm26-current';

/* État de module : références DOM et identifiants déjà annoncés. Aucun pays
 * « courant » n'est mis en cache (M26-01) et aucun garde n'empêche de réarmer
 * les rappels : le registre les vide à chaque rendu (registry.js:46-50). */
const local = {
  ctx: null,
  chip: null,
  chipName: null,
  chipMeta: null,
  chipHint: null,
  announcedId: null,
  hoverCode: null,
  say: null,
};

const CSS = `
  #${CHIP_ID}{
    position:absolute;right:16px;top:72px;z-index:6;pointer-events:none;
    max-width:min(260px,42%);padding:8px 10px;border-radius:8px;
    border:1px solid var(--line,rgba(230,185,111,.35));
    background:rgba(8,11,16,.88);color:var(--ink,#f5e9d0);
    font:12px/1.4 system-ui,sans-serif;font-variant-numeric:tabular-nums;
  }
  #${CHIP_ID}[data-state="idle"]{opacity:.78}
  #${CHIP_ID} .m26-kicker{
    display:block;margin:0 0 3px;color:var(--gold,#e6b96f);
    font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${CHIP_ID} .m26-name{display:block;font-size:14px;font-weight:700;line-height:1.2}
  #${CHIP_ID} .m26-meta{display:block;margin-top:3px;color:var(--muted,#c9c9c9)}
  #${CHIP_ID} .m26-hint{display:block;margin-top:2px;color:var(--gold-bright,#f2d08c);font-size:11px}
  #${CHIP_ID} .m26-hint:empty{display:none}
  @media (max-width:900px){
    #${CHIP_ID}{right:8px;top:64px;max-width:min(220px,52%);font-size:11px}
  }
  @media (prefers-reduced-motion:reduce){
    #${CHIP_ID}{transition:none!important;animation:none!important}
  }
`;

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

/* French : 0 et 1 restent au singulier. */
function plural(value, one, many) {
  return value > 1 ? many : one;
}

/* M26-01/02 : résolution par identifiant, dans l'ordre d'origine du dataset.
 * Aucun repli sur un premier pays, aucune valeur inventée. */
function resolve(ctx) {
  const list = ctx && Array.isArray(ctx.countries) ? ctx.countries : [];
  const raw = ctx && ctx.state ? ctx.state.countryId : null;
  const requestedId = typeof raw === 'string' && raw ? raw : null;
  const index = requestedId
    ? list.findIndex((country) => !!country && country.id === requestedId)
    : -1;
  const country = index >= 0 ? list[index] : null;
  return {
    country,
    index,
    total: list.length,
    id: country ? country.id : null,
    requestedId,
  };
}

/* M26-04 : un seul badge visuel, marqué aria-hidden, retrouvé puis rattaché au
 * host réutilisé par ensure() (globe.js). La scène est recréée à chaque rendu,
 * le host ne l'est pas : c'est donc le parent stable. */
function ensureChip(ctx) {
  let chip = document.getElementById(CHIP_ID);
  if (!chip) {
    chip = typeof ctx.el === 'function'
      ? ctx.el('div', 'm26-current')
      : document.createElement('div');
    chip.id = CHIP_ID;
    chip.setAttribute('aria-hidden', 'true');
    const kicker = document.createElement('span');
    kicker.className = 'm26-kicker';
    kicker.textContent = 'Sélection courante';
    const name = document.createElement('strong');
    name.className = 'm26-name';
    const meta = document.createElement('span');
    meta.className = 'm26-meta';
    const hint = document.createElement('span');
    hint.className = 'm26-hint';
    chip.append(kicker, name, meta, hint);
  }
  const parent = ctx.host && ctx.host.isConnected
    ? ctx.host
    : (ctx.scene && ctx.scene.isConnected ? ctx.scene : null);
  if (parent && chip.parentNode !== parent) parent.appendChild(chip);

  local.chip = chip;
  local.chipName = chip.querySelector('.m26-name');
  local.chipMeta = chip.querySelector('.m26-meta');
  local.chipHint = chip.querySelector('.m26-hint');
  return !!(chip && local.chipName && local.chipMeta && local.chipHint);
}

/* M26-06/07/08 : le nom, les chiffres et l'ordinal viennent toujours de la
 * sélection résolue ; le code survolé n'occupe qu'une ligne secondaire. */
function paint(result) {
  if (!local.chip || !local.chipName || !local.chipMeta || !local.chipHint) return;
  const country = result.country;
  local.chip.dataset.state = country ? 'active' : 'idle';

  if (!country) {
    local.chipName.textContent = 'Aucun pays sélectionné';
    local.chipMeta.textContent = 'Choisissez un pays dans la liste ou sur le globe.';
    local.chipHint.textContent = result.total
      ? `Aucun pays sur ${result.total}`
      : 'Liste des pays indisponible';
    return;
  }

  const eras = count(country.eras);
  const events = count(country.events);
  const points = count(country.points);
  local.chipName.textContent = country.name;
  local.chipMeta.textContent =
    `${eras} ${plural(eras, 'ère', 'ères')} · ` +
    `${events} ${plural(events, 'repère', 'repères')} · ` +
    `${points} ${plural(points, 'point', 'points')}`;

  const position = result.index >= 0
    ? `Pays ${result.index + 1} sur ${result.total}`
    : '';
  const code = country.code || '';
  const hovering = local.hoverCode && local.hoverCode !== code
    ? ` · survol : ${local.hoverCode}`
    : '';
  local.chipHint.textContent = position + hovering;
}

/* M26-03/10 : miroirs propres au greffon. Les attributs possédés par globe.js
 * (globeSelected, globeActive) ne sont que lus, jamais écrits. */
function audit(result, ctx) {
  const host = ctx.host;
  if (!host) return;
  const selected = ctx.selected && ctx.selected.id ? ctx.selected.id : null;
  const mirror = typeof host.dataset.globeSelected === 'string'
    ? host.dataset.globeSelected
    : '';
  const code = result.country && result.country.code ? result.country.code : '';
  const coherent = result.requestedId
    ? (!!result.country && selected === result.id && mirror === code)
    : (!selected && !mirror && !code);

  host.dataset.m26Selected = result.id || '';
  host.dataset.m26Position = result.index >= 0 ? String(result.index + 1) : '';
  host.dataset.m26Total = String(result.total);
  host.dataset.m26Coherent = coherent ? '1' : '0';
}

/* M26-05 : une seule annonce par changement réel d'identifiant, déléguée à la
 * région live unique de globe.js via ctx.say. */
function announce(result) {
  if (typeof local.say !== 'function') return;
  const id = result.country ? result.country.id : null;
  if (id === local.announcedId) return;
  local.announcedId = id;

  if (!result.country) {
    local.say('Aucun pays sélectionné. Choisissez un pays dans la liste ou sur le globe.');
    return;
  }
  const country = result.country;
  const eras = count(country.eras);
  const events = count(country.events);
  const points = count(country.points);
  local.say(
    `Pays sélectionné : ${country.name}. ` +
    `${eras} ${plural(eras, 'ère', 'ères')}, ` +
    `${events} ${plural(events, 'repère', 'repères')}, ` +
    `${points} ${plural(points, 'point', 'points')}.`,
  );
}

function render(ctx) {
  if (!ctx) return;
  local.ctx = ctx;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (!ensureChip(ctx)) return;
  const result = resolve(ctx);
  paint(result);
  audit(result, ctx);
  announce(result);
}

function isRevealing(ctx) {
  const reveal = ctx && ctx.reveal;
  return !!(reveal && typeof reveal.isRevealing === 'function' && reveal.isRevealing());
}

register('M26', (ctx) => {
  if (!ctx) return;
  local.say = typeof ctx.say === 'function' ? ctx.say : null;
  local.hoverCode = null;
  render(ctx);

  /* M26-08/09 : runMondeEnhancements() vide les trois tableaux de rappels à
   * chaque rendu (registry.js:46-50). Le greffon réarme donc exactement un
   * onHover, un onLeave et un onReady par appel, sans accumulation ni garde.
   * Le survol n'écrit que le suffixe du badge, jamais l'identité choisie. */
  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      const current = local.ctx;
      if (!current) return;
      const code = payload && typeof payload.code === 'string' ? payload.code : null;
      local.hoverCode = isRevealing(current) ? null : code;
      paint(resolve(current));
    });
  }

  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      local.hoverCode = null;
      if (local.ctx) paint(resolve(local.ctx));
    });
  }

  if (typeof ctx.onReady === 'function') {
    ctx.onReady(() => {
      /* Le host est retrouvé depuis le ctx frais par ensureChip() : aucune
       * référence de moteur n'est mise en cache ici. */
      if (local.ctx) render(local.ctx);
    });
  }
});
