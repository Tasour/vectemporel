import { register } from './registry.js';

/* Lentille M41 — ARIA et rôles (domaine E : qualité & validation).
 * Greffon strictement additif : aucun rôle existant n'est modifié, aucun
 * sélecteur de test n'est touché, aucun nœud vivant n'est supprimé. Toutes les
 * écritures sont des attributs idempotents recalculés à chaque rendu, car la
 * coque reconstruit #app (shell.js:533). Zéro réseau, zéro aléa, zéro timer,
 * zéro observateur, zéro appel à la console — voir UNIFIED_AUDIT/MONDE/views/M41.md. */

const CSS_ID = 'monde-m41';
const HELP_ID = 'm41-choices-help'; /* distinct de 'globe-help' (globe.js:30,275) */
const SHORTCUTS = 'ArrowRight ArrowLeft ArrowUp ArrowDown Home End Enter';

/* M41-01/-05 : CSS défensif, aucun sélecteur de test modifié. */
const CSS = `
  .globe-list .globe-choices[role="list"]{list-style:none}
  .globe-list[role="region"]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

function domainCount(country) {
  const points = Array.isArray(country && country.points) ? country.points : [];
  return new Set(points.map((point) => point && point.domain)).size;
}

function resolveIndex(countries, country) {
  if (!country) return -1;
  return countries.findIndex((item) => item
    && (item.id === country.id || (item.code && item.code === country.code)));
}

/* M41-06 : nom accessible explicite, entièrement dérivé du pays reçu. */
function applyCountryNames(stage, countries) {
  qa(stage, '.globe-country').forEach((button) => {
    if (button.hasAttribute('aria-label')) return;
    const index = Number(button.getAttribute('data-index'));
    const country = Number.isInteger(index) ? countries[index] : null;
    if (!country || !country.name) return;
    const label = `${country.name}, pays ${index + 1} sur ${countries.length}, `
      + `${count(country.eras)} ères, ${count(country.events)} repères, `
      + `${count(country.points)} points, ${domainCount(country)}/14 domaines`;
    button.setAttribute('aria-label', label);
  });
}

/* M41-08 : unicité de aria-current="true", valeur exigée par globe.js:43. */
function applyCurrent(stage, countries, selected) {
  const target = resolveIndex(countries, selected);
  qa(stage, '.globe-country').forEach((button) => {
    const index = Number(button.getAttribute('data-index'));
    const want = target >= 0 && index === target;
    const value = button.getAttribute('aria-current');
    if (want) {
      if (value !== 'true') button.setAttribute('aria-current', 'true');
    } else if (value !== null) {
      button.removeAttribute('aria-current');
    }
  });
}

/* M41-07 : la bascule de rotation reste une bascule indépendante. */
function applyRotationPressed(stage) {
  const controls = q(stage, '.globe-controls');
  if (!controls) return;
  const buttons = qa(controls, 'button');
  const pause = buttons.find((button) => {
    const label = (button.getAttribute('aria-label') || '').trim();
    const text = (button.textContent || '').trim();
    return /^(Activer la rotation|Mettre la rotation en pause)$/.test(label)
      || /^Rotation (active|inactive)$/.test(text);
  });
  if (!pause || pause.hasAttribute('aria-pressed')) return;
  const label = `${pause.getAttribute('aria-label') || ''} ${pause.textContent || ''}`;
  const active = /Rotation active|Mettre la rotation en pause/i.test(label);
  pause.setAttribute('aria-pressed', active ? 'true' : 'false');
}

/* M41-09 : recensement des régions live, sans en ajouter une. */
function applyLiveBudget(host) {
  const found = qa(document, '[role="status"], [role="alert"], [aria-live]');
  const unique = new Set(found);
  if (host) {
    host.dataset.m41LiveCount = String(unique.size);
    host.dataset.m41LiveAdded = '0';
  }
  return unique.size;
}

function apply(ctx) {
  if (!ctx) return;
  const stage = ctx.stage || null;
  const host = ctx.host || null;
  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  const selected = ctx.selected || null;

  /* M41-01 : list-style:none (styles.css:175) + aria-label retirent la
     sémantique de liste sous Safari/VoiceOver ; role="list" la restaure. */
  const choices = document.getElementById('globe-choices') || q(stage, '.globe-choices');
  if (choices && choices.getAttribute('role') !== 'list') {
    choices.setAttribute('role', 'list');
  }

  /* M41-02 / M41-03 : enrichissement de l'hôte SANS toucher à role="group"
     (globe.js:269) ni à aria-label/aria-describedby (globe.js:270,278). */
  if (host) {
    if (!host.hasAttribute('aria-keyshortcuts')) {
      host.setAttribute('aria-keyshortcuts', SHORTCUTS);
    }
    if (!host.hasAttribute('aria-roledescription')) {
      host.setAttribute('aria-roledescription', 'globe interactif des pays documentés');
    }
  }

  /* M41-04 : l'aide clavier visible (globe.js:425) n'a pas d'id ; on lui en
     donne un distinct du sr-only 'globe-help' et on le relie à la liste.
     L'aria-label existant de la liste reste inchangé. */
  const help = q(stage, '.globe-help');
  if (help) {
    if (!help.id) help.id = HELP_ID;
    if (choices && !choices.hasAttribute('aria-describedby')) {
      choices.setAttribute('aria-describedby', help.id || HELP_ID);
    }
  }

  /* M41-05 : landmark nommé par le h1 existant (globe.js:369-371). */
  const list = q(stage, '.globe-list');
  const title = document.getElementById('globe-title') || q(stage, '.globe-title');
  if (list) {
    if (list.getAttribute('role') !== 'region') list.setAttribute('role', 'region');
    if (title && title.id && !list.hasAttribute('aria-labelledby')) {
      list.setAttribute('aria-labelledby', title.id);
    }
  }

  applyCountryNames(stage, countries);      /* M41-06 */
  applyRotationPressed(stage);              /* M41-07 */
  applyCurrent(stage, countries, selected); /* M41-08 */
  const liveCount = applyLiveBudget(host);  /* M41-09 */

  /* M41-10 : miroir d'audit lisible par un test, sans recourir à la console — */
  if (host) {
    host.dataset.m41Aria = [
      `list:${choices && choices.getAttribute('role') === 'list' ? 1 : 0}`,
      `keys:${host.hasAttribute('aria-keyshortcuts') ? 1 : 0}`,
      `roleDesc:${host.hasAttribute('aria-roledescription') ? 1 : 0}`,
      `region:${list && list.getAttribute('role') === 'region' ? 1 : 0}`,
      `described:${choices && choices.hasAttribute('aria-describedby') ? 1 : 0}`,
      `named:${qa(stage, '.globe-country[aria-label]').length}`,
      `current:${qa(stage, '.globe-country[aria-current="true"]').length}`,
      `pressed:${qa(stage, '.globe-controls button[aria-pressed]').length}`,
      `live:${liveCount}`,
    ].join(' ');
  }
}

register('M41', (ctx) => {
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  apply(ctx);
});
