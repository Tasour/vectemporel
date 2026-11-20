import { register } from './registry.js';

/* V2 lentille E012 — Hiérarchie visuelle et informationnelle (second regard).
 *
 * Complète la passe 1 sans la remplacer. Là où E012 (passe 1) travaillait le
 * titre focal, le kicker, le filet titre/corps, le chip de certitude, les
 * métadonnées, le fil passé/présent/futur, la légende en registres, le poids
 * des commandes, la provenance et le responsive, cette passe V2 porte sur des
 * repères hiérarchiques encore absents : échelle ordinale chiffrée de la
 * progression, chapeau de contexte au niveau 2, marqueur « vous êtes ici »
 * dans le fil, niveaux de titre sémantiques, commandes nommées, comptage de la
 * légende, illustration subordonnée, bande de synthèse du statut, outils
 * étiquetés et hiérarchie à l'impression / en contraste forcé.
 *
 * Dix chantiers E012-01 … E012-10, tous non destructifs : sans ce module la
 * vue reste intégralement lisible. Un seul bloc CSS injecté une fois par le
 * registre, sous l'identifiant de feuille `recit-v2-e012`. Toutes les classes sont préfixées
 * `recit-v2-e012-` et tous les ids DOM créés sont préfixés `v2-e012-` (jamais
 * les ids `e012-…` de la passe 1). Aucun attribut existant n'est écrasé, aucun
 * texte de fait n'est inventé : chaque chiffre affiché est dérivé du DOM réel.
 * Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié.
 *
 * Détail factuel : UNIFIED_AUDIT/RECIT/V2/views/E012.md.
 */

const CSS = `
/* E012-01 — Échelle ordinale chiffrée de la progression. */
.recit-v2-e012-root .recit-v2-e012-ordinal{
  margin:4px 0 6px;color:var(--muted);font-size:9px;line-height:1.5;
  letter-spacing:.04em;font-variant-numeric:tabular-nums;
}
.recit-v2-e012-root .recit-progress{position:relative;min-height:6px}

/* E012-02 — Chapeau de contexte au niveau 2. */
.recit-v2-e012-root .recit-v2-e012-chapeau{
  margin:0 0 4px;padding-left:10px;border-left:2px solid var(--line-strong);
  color:var(--gold);font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
}
.recit-v2-e012-root .recit-context{
  max-width:66ch;padding-left:12px;border-left:2px solid var(--gold);color:var(--ink-soft);
}

/* E012-03 — Repère « vous êtes ici » dans le fil. */
.recit-v2-e012-root .recit-v2-e012-ici{
  display:inline-block;margin-left:6px;padding:1px 6px;
  border:1px solid var(--gold);border-radius:999px;
  color:var(--gold-bright);font-size:8px;font-weight:700;
  letter-spacing:.04em;white-space:nowrap;
}

/* E012-04 — Niveaux de titre sémantiques. */
.recit-v2-e012-root .recit-thread-title[role="heading"]{color:var(--ink);font-weight:700}
.recit-v2-e012-root .c3a-group-label[role="heading"]{display:block;line-height:1.6}

/* E012-05 — Commandes regroupées et nommées. */
.recit-v2-e012-root .recit-v2-e012-label{
  margin:10px 0 4px;color:var(--gold);font-size:8px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;
}
.recit-v2-e012-root .recit-actions{padding-top:4px;border-top:1px solid var(--line)}

/* E012-06 — Comptage des repères de lecture. */
.recit-v2-e012-root .recit-v2-e012-legende-count{
  margin-top:4px;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;
}

/* E012-07 — Illustration subordonnée au récit. */
.recit-v2-e012-root .recit-media .recit-v2-e012-media-label{
  display:block;margin:0 0 4px;color:var(--gold);font-size:8px;
  font-weight:700;letter-spacing:.14em;text-transform:uppercase;
}
.recit-v2-e012-root .recit-media .recit-media-credit{font-size:8px;opacity:.7}

/* E012-08 — Bande de synthèse pour le statut de comptage. */
.recit-v2-e012-root .c3a-status{
  padding:5px 9px;border-left:2px solid var(--gold);
  background:rgba(230,185,111,.06);font-variant-numeric:tabular-nums;
}

/* E012-09 — Outils de filtre étiquetés comme section tertiaire. */
.recit-v2-e012-root .c3a-tools{padding-top:6px;border-top:1px solid var(--line)}
.recit-v2-e012-root .c3a-group-label{color:var(--muted);font-size:8px;letter-spacing:.12em;text-transform:uppercase}
.recit-v2-e012-root .c3a-filter[aria-pressed="true"]{font-weight:700;color:var(--gold-bright)}

/* E012-10 — Hiérarchie à l'impression et en contraste forcé. */
@media print{
  .recit-v2-e012-root .recit-media,
  .recit-v2-e012-root .recit-v2-e012-label,
  .recit-v2-e012-root .recit-v2-e012-ordinal,
  .recit-v2-e012-root .recit-progress,
  .recit-v2-e012-root .c3a-tools,
  .recit-v2-e012-root .c3a-status,
  .recit-v2-e012-root .recit-actions,
  .recit-v2-e012-root .recit-legend{display:none}
  .recit-v2-e012-root .recit-title{font-size:18pt;line-height:1.15}
  .recit-v2-e012-root .recit-context{font-size:10pt}
  .recit-v2-e012-root .recit-thread{break-inside:avoid}
}
@media (forced-colors:active){
  .recit-v2-e012-root .recit-v2-e012-chapeau,
  .recit-v2-e012-root .c3a-status,
  .recit-v2-e012-root .recit-v2-e012-ici{border:1px solid CanvasText}
  .recit-v2-e012-root .recit-v2-e012-label{color:CanvasText}
}
`;

register('E012', (ctx) => {
  try {
    const { layout, css, el } = ctx || {};
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e012', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    /* --- Helpers locaux (aucune écrasure d'attribut existant) -------------- */
    function present(node) { return !!(node && node.nodeType === 1); }

    function marquer(node, name) {
      if (present(node) && node.classList && typeof node.classList.add === 'function'
          && !node.classList.contains(name)) node.classList.add(name);
    }

    function attrSiAbsent(node, name, value) {
      if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
      try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
    }

    function data(node, name, value) {
      if (!present(node)) return;
      try { node.setAttribute(`data-v2-e012-${name}`, String(value)); } catch { /* facultatif */ }
    }

    function fabrique(classe, texte) {
      const node = typeof el === 'function' ? el('p', classe, texte) : document.createElement('p');
      if (typeof el !== 'function') { node.className = classe; node.textContent = texte; }
      return node;
    }

    /* Dépose ou réutilise un paragraphe visible, inséré avant `ancre`
       (ou en fin de parent si `ancre` est absent). */
    function paragraphe(id, classe, parent, ancre, texte) {
      if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
      let node = document.getElementById(id);
      if (!node) { node = fabrique(classe, texte); node.id = id; }
      node.textContent = texte;
      const cible = present(ancre) && ancre.parentNode === parent ? ancre : null;
      if (node.parentNode !== parent || (cible && node.nextSibling !== cible)) {
        parent.insertBefore(node, cible);
      }
      return node;
    }

    marquer(layout, 'recit-v2-e012-root');
    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;

    /* --- E012-01 : échelle ordinale chiffrée de la progression ------------ */
    const progression = layout.querySelector('.recit-progress');
    const kicker = layout.querySelector('.view-kicker');
    const remplissage = progression && progression.querySelector('span');
    const etapeKicker = kicker && String(kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
    let pourcent = null;
    if (remplissage && remplissage.style && remplissage.style.width) {
      const largeur = String(remplissage.style.width).match(/(\d+(?:\.\d+)?)\s*%/);
      if (largeur) pourcent = Math.round(parseFloat(largeur[1]));
    }
    if (etapeKicker) {
      const etape = etapeKicker[1];
      const total = etapeKicker[2];
      const texte = pourcent === null
        ? `Étape ${etape} sur ${total} du repère.`
        : `Étape ${etape} sur ${total} · ${pourcent} % du repère parcouru.`;
      paragraphe('v2-e012-ordinal', 'recit-v2-e012-readout recit-v2-e012-ordinal',
        corps, progression && progression.nextSibling, texte);
      if (present(progression)) {
        attrSiAbsent(progression, 'role', 'progressbar');
        attrSiAbsent(progression, 'aria-valuemin', '0');
        attrSiAbsent(progression, 'aria-valuemax', total);
        attrSiAbsent(progression, 'aria-valuenow', etape);
        attrSiAbsent(progression, 'aria-label', `Progression du récit : étape ${etape} sur ${total}`);
        data(progression, 'pct', pourcent === null ? etape : pourcent);
      }
    }

    /* --- E012-02 : chapeau de contexte au niveau 2 ------------------------ */
    const contexte = layout.querySelector('#recit-context, .recit-context');
    if (present(contexte)) {
      marquer(contexte, 'recit-v2-e012-context');
      paragraphe('v2-e012-chapeau', 'recit-v2-e012-chapeau',
        corps, contexte, 'En contexte');
    }

    /* --- E012-03 : repère « vous êtes ici » dans le fil ------------------- */
    const courant = layout.querySelector(
      '.recit-thread-list .recit-thread-item.is-current, '
      + '.recit-thread-list .recit-thread-item[aria-current="step"]'
    );
    if (present(courant)) {
      let badge = document.getElementById('v2-e012-ici');
      if (!badge) {
        badge = typeof el === 'function'
          ? el('span', 'recit-v2-e012-ici', 'vous êtes ici')
          : document.createElement('span');
        if (typeof el !== 'function') { badge.className = 'recit-v2-e012-ici'; }
        badge.id = 'v2-e012-ici';
      }
      badge.textContent = 'vous êtes ici';
      if (badge.parentNode !== courant) courant.appendChild(badge);
    } else {
      const residu = document.getElementById('v2-e012-ici');
      if (residu && residu.parentNode) residu.parentNode.removeChild(residu);
    }

    /* --- E012-04 : niveaux de titre sémantiques --------------------------- */
    const titreFil = layout.querySelector('.recit-thread-title');
    if (present(titreFil)) {
      attrSiAbsent(titreFil, 'role', 'heading');
      attrSiAbsent(titreFil, 'aria-level', '2');
      marquer(titreFil, 'recit-v2-e012-h2');
    }
    const libellesGroupes = layout.querySelectorAll('.c3a-group .c3a-group-label');
    Array.prototype.forEach.call(libellesGroupes, (libelle) => {
      attrSiAbsent(libelle, 'role', 'heading');
      attrSiAbsent(libelle, 'aria-level', '3');
    });

    /* --- E012-05 : commandes regroupées et nommées ------------------------ */
    const actions = layout.querySelector('.recit-actions');
    if (present(actions)) {
      attrSiAbsent(actions, 'role', 'group');
      attrSiAbsent(actions, 'aria-label', 'Commandes du récit');
      paragraphe('v2-e012-commandes-label', 'recit-v2-e012-label',
        corps, actions, 'Commandes');
      data(actions, 'groupe', '1');
    }

    /* --- E012-06 : comptage des repères de lecture ------------------------ */
    const legende = layout.querySelector('.recit-legend');
    if (present(legende)) {
      const lignes = Array.prototype.slice.call(legende.querySelectorAll('p'))
        .filter((ligne) => !ligne.classList || !ligne.classList.contains('recit-v2-e012-readout'));
      if (lignes.length) {
        paragraphe('v2-e012-legende-count',
          'recit-v2-e012-readout recit-v2-e012-legende-count',
          corps, legende.nextSibling, `Légende : ${lignes.length} repères de lecture.`);
      }
    }

    /* --- E012-07 : illustration subordonnée au récit ---------------------- */
    const media = layout.querySelector('.recit-media');
    if (present(media)) {
      data(media, 'media', '1');
      let etiquette = document.getElementById('v2-e012-media-label');
      if (!etiquette) {
        etiquette = typeof el === 'function'
          ? el('p', 'recit-v2-e012-media-label', 'Illustration du repère')
          : document.createElement('p');
        if (typeof el !== 'function') { etiquette.className = 'recit-v2-e012-media-label'; }
        etiquette.id = 'v2-e012-media-label';
      }
      etiquette.textContent = 'Illustration du repère';
      if (etiquette.parentNode !== media || etiquette !== media.firstChild) {
        media.insertBefore(etiquette, media.firstChild);
      }
    }

    /* --- E012-08 : bande de synthèse pour le statut de comptage ----------- */
    const statut = layout.querySelector('#c3a-status, .c3a-status');
    if (present(statut)) {
      marquer(statut, 'recit-v2-e012-synthese');
      const comptage = String(statut.textContent || '')
        .match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
      if (comptage) data(statut, 'count', `${comptage[1]} / ${comptage[2]}`);
    }

    /* --- E012-09 : outils de filtre étiquetés comme section tertiaire ----- */
    const outils = layout.querySelector('.c3a-tools');
    if (present(outils)) {
      data(outils, 'filtres', '1');
      paragraphe('v2-e012-filtres-label', 'recit-v2-e012-label',
        corps, outils, 'Filtres du repère');
    }

    /* --- E012-10 : hiérarchie à l'impression et en contraste forcé --------- */
    /* Portée par la classe racine `recit-v2-e012-root` : les règles `@media
       print` et `@media (forced-colors:active)` du bloc CSS s'appliquent sans
       JS supplémentaire ni nouvel attribut. Aucune transition n'est ajoutée,
       donc aucun couplage à `prefers-reduced-motion` n'est nécessaire. */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
