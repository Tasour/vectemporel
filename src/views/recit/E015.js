import { register } from './registry.js';

/* Lentille E015 — « Accessibilité ARIA et lecteurs d'écran » de la vue Récit.
 *
 * Dix chantiers (E015-01 … E015-10) appliqués APRÈS renderRecit(stage), qui
 * appelle runEnhancements({ viewId:'recit', stage, layout }) en fin de fonction
 * (recit.js:451). La lentille travaille donc sur un DOM déjà assemblé : elle ne
 * modifie ni recit.js, ni le dataset, ni l'état partagé. Elle n'ajoute que des
 * rôles ARIA, des étiquettes et des aides textuelles ; elle ne retire aucun
 * contenu, si bien que sans JS la vue reste parfaitement lisible.
 *
 * Contrat respecté : un seul enregistrement de lentille, une seule feuille de
 * styles, classes préfixées recit-e015-, identifiants créés préfixés e015- et
 * uniques, français partout, aucun appel à la console, aucune requête réseau,
 * aucun recours au hasard.
 *
 * Les nœuds porteurs d'un id e015- sont déposés dans .recit-body (jamais en
 * enfant direct de stage, layout ou body) : le mode diagnostic masque par
 * défaut les éléments dont l'id suit /^(e\d{2,3}[-_ ]|.*-e\d{2,3})/ et dont le
 * parent est l'un de ces trois conteneurs. Ici le parent est .recit-body, donc
 * les aides restent présentes et annonçables même diagnostic ouvert.
 */

const CSS_ID = 'recit-e015';
const API = { el: null };

const CSS = `
.recit-e015-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.recit-e015-help{margin:12px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;color:var(--muted);font-size:10px;line-height:1.5}
.recit-e015-help summary{min-height:32px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright)}
.recit-e015-help summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e015-help p{margin:6px 0 0}
@media (prefers-reduced-motion:reduce){.recit-e015-help summary{transition:none!important}}
`;

/* Aucun chantier ne peut faire échouer un autre chantier ni le rendu. */
function guard(fn) {
  try { return fn(); } catch { return null; }
}

function make(tag, className, text) {
  if (API.el && typeof API.el === 'function') return API.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mark(node, kind) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute('data-e015', kind);
}

function one(root, selector) {
  return guard(() => (root && root.querySelector) ? root.querySelector(selector) : null);
}

function all(root, selector) {
  return guard(() => (root && root.querySelectorAll) ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function clip(text, max) {
  const value = String(text || '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/* Conteneur discret unique pour toutes les aides invisibles. */
function ensureAides(stage) {
  let aides = one(stage, '#e015-aides');
  if (aides) return aides;
  const body = one(stage, '.recit-body');
  if (!body) return null;
  aides = make('div', 'recit-e015-sr-only');
  aides.id = 'e015-aides';
  mark(aides, 'aides');
  body.appendChild(aides);
  return aides;
}

/* E015-01 — Repère de lecture : la zone narrative est une div sans sémantique.
   Un role=region étiqueté donne aux lecteurs d'écran un repère navigable. */
function landmarkRegion(stage) {
  const body = one(stage, '.recit-body');
  if (!body || body.hasAttribute('data-e015-landmark')) return '';
  if (!body.hasAttribute('role')) body.setAttribute('role', 'region');
  if (!body.hasAttribute('aria-label')) {
    const title = (one(stage, '#recit-point-title')?.textContent || '').trim();
    body.setAttribute('aria-label', `Récit guidé — ${clip(title || 'point courant', 60)}`);
  }
  mark(body, 'landmark');
  return 'repère de lecture ajouté';
}

/* E015-02 — Description du titre stable : recit.js ne pose aria-describedby
   qu'au premier point (vers #recit-context). Un paragraphe masqué résume, à
   chaque point, étape, type, certitude et durée de lecture. */
function titleDescription(stage) {
  const title = one(stage, '#recit-point-title');
  if (!title) return '';
  const kicker = (one(stage, '.recit-body .view-kicker')?.textContent || '').trim();
  const conf = (one(stage, '.recit-conf')?.textContent || '').trim();
  const timing = (one(stage, '.recit-timing')?.textContent || '').trim();
  let node = one(stage, '#e015-title-desc');
  if (!node) {
    const aides = ensureAides(stage);
    if (!aides) return '';
    node = make('p', 'recit-e015-sr-only');
    node.id = 'e015-title-desc';
    node.setAttribute('role', 'note');
    mark(node, 'desc');
    aides.appendChild(node);
  }
  const confLabel = conf.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  node.textContent = [kicker, confLabel && `Certitude : ${confLabel}`, timing]
    .filter(Boolean).join('. ') + '.';
  const refs = (title.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (refs.indexOf('e015-title-desc') < 0) refs.push('e015-title-desc');
  title.setAttribute('aria-describedby', refs.join(' '));
  return 'description du point stabilisée';
}

/* E015-03 — Progression : le trait coloré est muet pour un lecteur d'écran.
   On le convertit en progressbar avec valeurs et texte de progression. */
function progressbar(stage) {
  const bar = one(stage, '.recit-progress');
  if (!bar || bar.hasAttribute('data-e015-progress')) return '';
  const kicker = (one(stage, '.recit-body .view-kicker')?.textContent || '');
  const match = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker);
  const step = match ? Number(match[1]) : 0;
  const total = match ? Number(match[2]) : 0;
  let now = 0;
  const fill = one(bar, 'span');
  if (fill && fill.style && fill.style.width) {
    const width = parseFloat(fill.style.width);
    if (!Number.isNaN(width)) now = Math.max(0, Math.min(100, Math.round(width)));
  }
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Progression de la lecture');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(now));
  bar.setAttribute('aria-valuetext', total ? `Point ${step} sur ${total}` : 'Progression indisponible');
  mark(bar, 'progress');
  return 'progression annoncée';
}

/* E015-04 — Fil : avec list-style:none, WebKit retire la sémantique de liste.
   On la rétablit explicitement, on compte les points et on garantit un seul
   aria-current="step" sur l'élément visuellement marqué is-current. */
function threadList(stage) {
  const list = one(stage, '#c3a-thread');
  if (!list) return '';
  let changed = false;
  if (!list.hasAttribute('data-e015-thread')) {
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', `Points du fil — ${all(list, '.recit-thread-item').length} point(s)`);
    mark(list, 'thread');
    changed = true;
  }
  const items = all(list, '.recit-thread-item');
  const currents = items.filter((button) => button.getAttribute('aria-current') === 'step');
  if (currents.length !== 1) {
    items.forEach((button) => button.removeAttribute('aria-current'));
    const marked = items.findIndex((button) => button.classList.contains('is-current'));
    const target = marked >= 0 ? items[marked] : items[0];
    if (target) target.setAttribute('aria-current', 'step');
    changed = true;
  }
  return changed ? 'fil et position courante clarifiés' : '';
}

/* E015-05 — Commandes : on garantit un nom accessible, on expose l'état
   désactivé (au-delà du seul attribut HTML disabled) et le raccourci Espace
   de la lecture automatique, sans écraser les libellés déjà présents. */
function actionButtons(stage) {
  const buttons = all(stage, '.recit-actions button');
  if (!buttons.length) return '';
  let changed = 0;
  buttons.forEach((button) => {
    if (button.hasAttribute('data-e015-action')) return;
    const existing = (button.getAttribute('aria-label') || '').trim();
    const visible = (button.textContent || '').replace(/[▶❚❚←→↺↗\s]+/g, ' ').trim();
    if (!existing && !visible) {
      button.setAttribute('aria-label', 'Commande de lecture');
      changed += 1;
    }
    if (button.disabled && button.getAttribute('aria-disabled') !== 'true') {
      button.setAttribute('aria-disabled', 'true');
      changed += 1;
    }
    if (!button.getAttribute('aria-keyshortcuts') && /lecture automatique/i.test(button.textContent || '')) {
      button.setAttribute('aria-keyshortcuts', 'Space');
      changed += 1;
    }
    mark(button, 'action');
  });
  return changed ? `${changed}commandes d'action explicitée(s)` : '';
}

/* E015-06 — Certitude et type : le symbole (✓ ■ ◐ ≈) est purement décoratif
   et le tag de type est déjà contenu dans l'aria-label du bouton du fil. On
   masque le symbole, on préfixe « Certitude : » en texte pour lecteur d'écran,
   et on rend le tag redondant aria-hidden. Le texte visible reste inchangé. */
function textualConfidence(stage) {
  let changed = 0;
  const conf = one(stage, '.recit-conf');
  if (conf && !conf.hasAttribute('data-e015-conf')) {
    const raw = (conf.textContent || '').trim();
    if (raw) {
      const symbol = raw.charAt(0);
      const label = raw.slice(1).trim() || raw;
      conf.textContent = '';
      const decorative = make('span', '', symbol);
      decorative.setAttribute('aria-hidden', 'true');
      conf.appendChild(decorative);
      conf.appendChild(document.createTextNode(' '));
      conf.appendChild(make('span', 'recit-e015-sr-only', 'Certitude : '));
      conf.appendChild(make('span', '', label));
      mark(conf, 'conf');
      changed += 1;
    }
  }
  all(stage, '.thread-kind').forEach((tag) => {
    if (tag.hasAttribute('data-e015-kind')) return;
    tag.setAttribute('aria-hidden', 'true');
    mark(tag, 'kind');
    changed += 1;
  });
  return changed ? `${changed}indicateur(s) de certitude ou de type rendu(s) textuels` : '';
}

/* E015-07 — Aide clavier : un panneau replié, réellement visible, donne aux
   utilisateurs de lecteur d'écran la liste des raccourcis et précise que les
   certitudes sont annoncées en toutes lettres. Respecte le mouvement réduit. */
function keyboardHelp(stage, reduced) {
  if (one(stage, '#e015-help')) return '';
  const body = one(stage, '.recit-body');
  if (!body) return '';
  const details = make('details', 'recit-e015-help' + (reduced ? ' recit-e015-no-motion' : ''));
  details.id = 'e015-help';
  details.setAttribute('role', 'note');
  mark(details, 'help');
  const summary = make('summary', '', 'Aide clavier et lecteur d’écran');
  summary.setAttribute('title', 'Raccourcis et navigation accessibles');
  details.appendChild(summary);
  details.appendChild(make('p', '',
    '← et → changent de point ; Entrée ouvre un point depuis le fil ; ↑ et ↓ parcourent le fil ; Début et Fin vont aux extrémités ; Espace met la lecture automatique en pause ou la reprend. Les niveaux de certitude et les types de points sont annoncés en toutes lettres, jamais par la seule couleur.'
  ));
  body.appendChild(details);
  return 'aide clavier accessible ajoutée';
}

/* E015-08 — Légende : la transformer en note étiquetée permet d'y accéder
   comme à une information structurée plutôt qu'à un simple amas de paragraphes. */
function accessibleLegend(stage) {
  const legend = one(stage, '.recit-legend');
  if (!legend || legend.hasAttribute('data-e015-legend')) return '';
  legend.setAttribute('role', 'note');
  legend.setAttribute('aria-label', 'Légende des certitudes, des types de points et des commandes');
  mark(legend, 'legend');
  return 'légende identifiée comme note';
}

/* E015-09 — Média : on étiquette le bloc image et on garantit un alt non vide
   ainsi que des légendes/crédits non masqués, même si une passe ultérieure les
   avait rendus aria-hidden. */
function accessibleMedia(stage) {
  const media = one(stage, '.recit-media');
  if (!media) return '';
  let changed = 0;
  if (!media.hasAttribute('data-e015-media')) {
    media.setAttribute('role', 'group');
    media.setAttribute('aria-label', 'Illustration du repère');
    mark(media, 'media');
    changed += 1;
  }
  const image = one(media, 'img');
  if (image) {
    if (!(image.getAttribute('alt') || '').trim()) {
      image.setAttribute('alt', 'Illustration du repère, sans description vérifiée');
      changed += 1;
    }
    ['.media-caption', '.recit-media-credit'].forEach((selector) => {
      const node = one(media, selector);
      if (node && node.hasAttribute('aria-hidden')) {
        node.removeAttribute('aria-hidden');
        changed += 1;
      }
    });
  }
  return changed ? `${changed}élément(s) du média décrit(s)` : '';
}

/* E015-10 — Préambule : un résumé de navigation masqué, actualisé à chaque
   rendu, situe la vue, le point courant et le nombre de points du fil. Il ne
   vole jamais le focus et ne double pas la région d'annonce #atlas-recit-live. */
function navigationOverview(stage) {
  let node = one(stage, '#e015-overview');
  if (!node) {
    const aides = ensureAides(stage);
    if (!aides) return '';
    node = make('p', 'recit-e015-sr-only');
    node.id = 'e015-overview';
    node.setAttribute('role', 'note');
    mark(node, 'overview');
    aides.insertBefore(node, aides.firstChild);
  }
  const kicker = (one(stage, '.recit-body .view-kicker')?.textContent || '').trim();
  const count = all(stage, '.recit-thread-item').length;
  node.textContent = `Vue Récit guidé. ${kicker}. Le fil contient ${count} point(s). Utilisez le repère « Récit guidé » pour lire le texte, le fil pour choisir un point, et l’aide clavier pour les raccourcis.`;
  return 'préambule de navigation ajouté';
}

register('E015', (ctx) => {
  API.el = (ctx && typeof ctx.el === 'function') ? ctx.el : null;
  if (ctx && typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return;
  const reduced = (ctx && typeof ctx.reducedMotion === 'function') ? !!ctx.reducedMotion() : false;

  const jobs = [
    () => landmarkRegion(stage),
    () => titleDescription(stage),
    () => progressbar(stage),
    () => threadList(stage),
    () => actionButtons(stage),
    () => textualConfidence(stage),
    () => keyboardHelp(stage, reduced),
    () => accessibleLegend(stage),
    () => accessibleMedia(stage),
    () => navigationOverview(stage),
  ];
  jobs.forEach((job) => { guard(job); });
});
