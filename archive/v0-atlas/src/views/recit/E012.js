import { register } from './registry.js';

/* Lentille E012 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Dix chantiers présentationnels appliqués à chaque rendu par `runEnhancements`.
 * Aucune donnée inventée, aucun appel réseau, aucune source d'aléa, aucune
 * écriture dans la console, aucun fichier partagé modifié. Les enrichissements sont non
 * destructifs : sans ce module, la vue reste intégralement lisible (le CSS et
 * les nœuds ajoutés ne font qu'ordonner l'information déjà présente).
 *
 * Périmètre de lecture : src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, styles.css, UNIFIED_AUDIT/views/atlas-recit.md.
 */

const CSS_ID = 'recit-e012';
const SCOPE = 'recit-e012-scope';
const REDUCED_ATTR = 'data-e012-reduced';

/* Toutes les règles sont préfixées `recit-e012-` et cantonnées à `.recit-e012-scope`,
 * classe posée sur `.recit-layout` : aucune fuite hors de la vue Récit, aucun
 * sélecteur de test du récit renommé. */
const CSS = `
.recit-e012-scope .recit-title{max-width:30ch;text-wrap:balance;letter-spacing:-.02em;line-height:1.1}
.recit-e012-scope .recit-title::after{content:"";display:block;width:44px;height:2px;margin-top:14px;background:var(--gold)}
.recit-e012-scope .view-kicker{display:inline-block;margin:0 0 12px;padding-left:10px;border-left:2px solid var(--gold);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e012-scope .recit-meta{margin:2px 0 4px;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}
.recit-e012-scope .recit-timing{margin:0 0 16px;color:var(--muted);font-variant-numeric:tabular-nums}
.recit-e012-scope .recit-conf{font-weight:600;transition:border-color .18s linear,color .18s linear}
.recit-e012-conf-label{font-weight:400;color:var(--muted-2);letter-spacing:.06em}
.recit-e012-scope .recit-conf.recit-e012-conf-fort{border-color:var(--gold);color:var(--gold-bright)}
.recit-e012-scope .recit-conf.recit-e012-conf-moyen{border-style:dashed}
.recit-e012-scope .recit-conf.recit-e012-conf-faible{border-style:dotted;color:var(--muted)}
.recit-e012-scope .recit-thread-title{color:var(--muted);font-weight:600}
.recit-e012-scope .recit-thread-item{transition:opacity .18s linear}
.recit-e012-scope .recit-thread-item.recit-e012-past{opacity:.55}
.recit-e012-scope .recit-thread-item.recit-e012-future{opacity:.9}
.recit-e012-scope .recit-thread-item.is-current{font-weight:600}
.recit-e012-legend-title{margin:0 0 6px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.recit-e012-legend-sem{color:var(--muted)}
.recit-e012-legend-help{color:var(--muted-2);font-style:italic}
.recit-e012-scope .recit-actions button[data-fk="c3a-prev"],
.recit-e012-scope .recit-actions button[data-fk="c3a-next"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1);font-weight:600}
.recit-e012-scope .recit-actions button[data-fk="c3a-play"],
.recit-e012-scope .recit-actions button[data-fk="c3a-restart"],
.recit-e012-scope .recit-actions button[data-fk="c3a-next-event"]{color:var(--muted);font-size:8px}
.recit-e012-scope .recit-actions button[data-fk="c3a-chrono"]{color:var(--muted-2);text-decoration:underline;text-underline-offset:2px}
.recit-e012-scope .recit-trace,
.recit-e012-scope .recit-sources{margin-top:14px;padding-left:10px;border-left:2px solid var(--line);color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.recit-e012-scope .recit-trace summary{color:var(--muted)}
.recit-e012-scope[data-e012-reduced="1"] .recit-thread-item,
.recit-e012-scope[data-e012-reduced="1"] .recit-conf{transition:none}
@media (max-width:620px){
  .recit-e012-scope .recit-title{max-width:none}
  .recit-e012-scope .view-kicker{font-size:8px}
  .recit-e012-scope .recit-thread-item.recit-e012-past{opacity:.7}
}
@media (prefers-reduced-motion:reduce){
  .recit-e012-scope .recit-thread-item,
  .recit-e012-scope .recit-conf{transition:none}
}`;

register('E012', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function') return;

  /* Injection unique + ancrage de portée (E012-01 à E012-09). */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E012-10 : couplage explicite à la préférence de mouvement réduit, en plus
     de la media query CSS, pour les environnements sans matchMedia fiable. */
  try {
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute(REDUCED_ATTR, '1');
    } else {
      layout.removeAttribute(REDUCED_ATTR);
    }
  } catch (_) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E012-04 : le chip de certitude reçoit un libellé explicite (« Certitude : »)
     et un poids visuel gradué selon la mention d'audit déjà affichée. Garde
     anti-doublon sur le libellé ; lecture du texte, aucune donnée inventée. */
  const confChip = layout.querySelector('.recit-conf');
  if (confChip) {
    if (!confChip.querySelector('.recit-e012-conf-label')) {
      confChip.insertBefore(el('span', 'recit-e012-conf-label', 'Certitude : '), confChip.firstChild);
    }
    const text = confChip.textContent || '';
    let level = '';
    if (/vérifié|certain/i.test(text)) level = 'fort';
    else if (/probable/i.test(text)) level = 'moyen';
    else if (/contesté|disputed/i.test(text)) level = 'faible';
    confChip.classList.remove('recit-e012-conf-fort', 'recit-e012-conf-moyen', 'recit-e012-conf-faible');
    if (level) confChip.classList.add(`recit-e012-conf-${level}`);
  }

  /* E012-06 : hiérarchie temporelle du fil (déjà lu / ici / à venir). L'élément
     courant est repéré par `.is-current` / `aria-current="step"` ; les classes
     ajoutées sont purement descriptives et retirées puis reposées à chaque rendu. */
  const items = Array.prototype.slice.call(
    layout.querySelectorAll('.recit-thread-list .recit-thread-item')
  );
  const current = layout.querySelector(
    '.recit-thread-list .recit-thread-item.is-current, .recit-thread-list .recit-thread-item[aria-current="step"]'
  );
  const currentPos = current ? items.indexOf(current) : -1;
  items.forEach((item, i) => {
    item.classList.remove('recit-e012-past', 'recit-e012-future');
    if (currentPos >= 0) {
      if (i < currentPos) item.classList.add('recit-e012-past');
      else if (i > currentPos) item.classList.add('recit-e012-future');
    }
  });

  /* E012-07 : la légende dense est structurée — un intitulé, puis les lignes
     sémantiques (certitudes / types) distinguées des lignes d'aide clavier. */
  const legend = layout.querySelector('.recit-legend');
  if (legend) {
    if (!legend.querySelector('.recit-e012-legend-title')) {
      legend.insertBefore(el('p', 'recit-e012-legend-title', 'Repères de lecture'), legend.firstChild);
    }
    Array.prototype.slice.call(legend.querySelectorAll('p')).forEach((line) => {
      if (line.classList.contains('recit-e012-legend-title')) return;
      const text = line.textContent || '';
      const semantic = /degrés de certitude|types de points/i.test(text);
      line.classList.toggle('recit-e012-legend-sem', semantic);
      line.classList.toggle('recit-e012-legend-help', !semantic);
    });
  }
});
