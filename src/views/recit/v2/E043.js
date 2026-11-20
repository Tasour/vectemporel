import { register } from './registry.js';

/* V2 — lentille E043 : recherche et filtrage, vague V2.
 *
 * Dix chantiers neufs, distincts de ceux de la passe 1 (src/views/recit/E043.js) :
 * la passe 1 avait construit la barre de recherche, les deux listes de filtres,
 * la réinitialisation, l'annonce live et le repli responsive. La V2 ne touche à
 * aucun de ces contrôles : elle ajoute des aides à la découverte et à
 * l'indexation du fil — répertoire, facettes chiffrées, synthèse de couverture,
 * badges de nature, signalement des doublons, registre des clés, légende,
 * marqueur du point courant dans le répertoire et accessibilité renforcée.
 *
 * Contrat : un seul register, un seul bloc CSS regroupant toutes les règles,
 * ids préfixés « v2-e043- », classes préfixées « recit-v2-e043- ». La passe 1 et
 * la V2 tournent sur le même DOM : aucun id ni attribut de la passe 1 n'est
 * réutilisé ni écrasé (setOnce). Zéro réseau, zéro console, zéro aléa, zéro
 * minuteur. Tout chiffre affiché est recalculé depuis le DOM réellement rendu.
 */

const CSS = `
/* E043-01 — Répertoire indexé : panneau, sections et liste ordonnée des libellés. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-panneau{margin:12px 0 4px;padding:10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-section{margin:0 0 10px}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-section:last-child{margin-bottom:0}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-titre{margin:0 0 5px;color:var(--gold-bright);font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-index{margin:0;padding-left:18px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-entree{margin:1px 0;overflow-wrap:anywhere}

/* E043-02 — Facettes de nature : compteurs par data-kind. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-fait{margin:0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}

/* E043-03 — Facettes de certitude : compteurs par data-confidence. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-section .recit-v2-e043-fait + .recit-v2-e043-fait{margin-top:3px}

/* E043-04 — Synthèse de couverture : faits agrégés, jamais de valeur codée en dur. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-couverture{color:var(--ink-soft)}

/* E043-05 — Badges de nature : pastille textuelle ajoutée au bouton du point. */
.recit-layout.recit-v2-e043-scope .recit-thread-item .recit-v2-e043-badge{margin-left:5px;padding:1px 4px;border:1px solid var(--line-strong);border-radius:4px;color:var(--gold);font-size:7px;letter-spacing:.06em;white-space:nowrap;transition:background-color .18s ease}
.recit-layout.recit-v2-e043-scope .recit-thread-item[data-v2-e043-kind="récit"] .recit-v2-e043-badge{color:var(--gold-bright)}

/* E043-06 — Doublons de libellé : marqueur numérique sur les points répétés. */
.recit-layout.recit-v2-e043-scope .recit-thread-item .recit-v2-e043-dup{margin-left:4px;color:var(--muted-2);font-size:8px;font-weight:700;white-space:nowrap}

/* E043-07 — Registre des clés : liste des data-fk réellement exposés. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-keys{margin:0;padding-left:16px;color:var(--muted-2);font-size:9px;line-height:1.6;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-keys li{margin:1px 0}

/* E043-08 — Légende des abréviations : équivalent textuel des badges. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-abr{color:var(--muted-2)}

/* E043-09 — Marqueur du point courant dans le répertoire indexé. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-entree-courante{color:var(--gold-bright);font-weight:700}
.recit-layout.recit-v2-e043-scope .recit-v2-e043-entree-courante::before{content:"▶ ";font-weight:700}

/* E043-10 — Accessibilité : focus, mouvement réduit, contraste forcé, repli mobile. */
.recit-layout.recit-v2-e043-scope .recit-v2-e043-panneau :focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-v2-e043-scope.recit-v2-e043-reduit .recit-thread-item .recit-v2-e043-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout.recit-v2-e043-scope .recit-thread-item .recit-v2-e043-badge{transition:none}
}
@media (max-width:620px){
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-panneau{padding:8px}
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-index,
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-fait,
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-keys{font-size:10px}
}
@media (forced-colors:active){
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-panneau,
  .recit-layout.recit-v2-e043-scope .recit-thread-item .recit-v2-e043-badge{border-color:CanvasText}
  .recit-layout.recit-v2-e043-scope .recit-v2-e043-entree-courante{color:CanvasText}
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function addClasse(node, ...names) {
  if (!node || !node.classList) return;
  names.forEach((name) => { if (!node.classList.contains(name)) node.classList.add(name); });
}

function setOnce(node, attr, value) {
  if (node && typeof node.setAttribute === 'function' && !node.hasAttribute(attr)) {
    node.setAttribute(attr, value);
  }
}

function fabrique(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Libellé lisible d'un point : on préfère l'aria-label déjà calculé par la vue,
   sinon on retire la pastille de type et l'ordinal du textContent. */
function libelle(item) {
  const aria = item.getAttribute('aria-label') || '';
  const m = aria.match(/:\s*(.+)$/);
  if (m && m[1] && m[1].trim()) return m[1].trim();
  const copie = item.cloneNode(true);
  qa(copie, '.thread-kind').forEach((n) => n.remove());
  return String(copie.textContent || '').trim().replace(/^\d+\.\s*/, '');
}

/* Toutes les valeurs sont lues sur le DOM rendu : aucun chiffre n'est inventé. */
function litFacts(layout) {
  const body = q(layout, '.recit-body') || layout;
  const items = qa(body, '.recit-thread-item');
  const byKind = {};
  const byConf = {};
  const labels = [];
  items.forEach((item) => {
    const k = item.getAttribute('data-kind') || 'point';
    const c = item.getAttribute('data-confidence') || '';
    byKind[k] = (byKind[k] || 0) + 1;
    byConf[c] = (byConf[c] || 0) + 1;
    labels.push(libelle(item));
  });
  const current = items.find((it) => it.classList && it.classList.contains('is-current')) || null;
  return { body, items, byKind, byConf, labels, current, currentIndex: items.indexOf(current) };
}

/* Panneau unique, inséré avant la légende : retrouvé par classe à chaque rendu. */
function assurerPanneau(ctx, body) {
  let panneau = q(body, '.recit-v2-e043-panneau');
  if (!panneau) {
    panneau = fabrique(ctx, 'div', 'recit-v2-e043-panneau');
    panneau.id = 'v2-e043-panneau';
    const ancre = q(body, '.recit-legend') || q(body, '.recit-actions');
    if (ancre && ancre.parentNode) ancre.parentNode.insertBefore(panneau, ancre);
    else body.appendChild(panneau);
  }
  return panneau;
}

/* Section identifiée, créée une seule fois puis réutilisée (idempotence). */
function section(ctx, panneau, id, titre) {
  let sec = q(panneau, '#' + id);
  if (!sec) {
    sec = fabrique(ctx, 'section', 'recit-v2-e043-section');
    sec.id = id;
    const h = fabrique(ctx, 'h3', 'recit-v2-e043-titre', titre);
    sec.appendChild(h);
    panneau.appendChild(sec);
  }
  return sec;
}

/* Paragraphe de synthèse visible, créé une seule fois puis mis à jour en texte. */
function paragraphe(ctx, sec, id, classe) {
  let p = q(sec, '#' + id);
  if (!p) {
    p = fabrique(ctx, 'p', 'recit-v2-e043-fait ' + classe);
    p.id = id;
    sec.appendChild(p);
  }
  return p;
}

/* Répertoire indexé : la liste ordonnée des libellés du fil. */
function repertoire(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-repertoire', 'Répertoire du fil');
  let liste = q(sec, '.recit-v2-e043-index');
  if (!liste) {
    liste = fabrique(ctx, 'ol', 'recit-v2-e043-index');
    liste.id = 'v2-e043-index';
    sec.appendChild(liste);
  }
  liste.textContent = '';
  if (!f.items.length) {
    liste.appendChild(fabrique(ctx, 'li', 'recit-v2-e043-entree', 'Aucun point affiché dans le fil.'));
    return;
  }
  f.items.forEach((item, i) => {
    const entree = fabrique(ctx, 'li', 'recit-v2-e043-entree', `${i + 1}. ${f.labels[i] || ''}`);
    liste.appendChild(entree);
  });
}

/* Compteurs de nature, dérivés des data-kind des points affichés. */
function natures(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-natures', 'Natures des points');
  const p = paragraphe(ctx, sec, 'v2-e043-kinds', '');
  const connus = ['récit', 'figure', 'lieu', 'audit'];
  const presents = connus.filter((k) => f.byKind[k] > 0);
  const autres = Object.keys(f.byKind).filter((k) => !connus.includes(k));
  const detail = presents.concat(autres).map((k) => `${k} ×${f.byKind[k]}`).join(' · ');
  p.textContent = `Natures du fil (${f.items.length}) : ${detail || 'aucun point'}.`;
}

/* Compteurs de certitude, dérivés des data-confidence des points affichés. */
function certitudes(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-certitudes', 'Certitudes des points');
  const p = paragraphe(ctx, sec, 'v2-e043-conf', '');
  const lib = (c) => (c === '' ? 'non renseignée' : (c === 'disputed' ? 'contesté' : c));
  const ordre = ['vérifié', 'certain', 'probable', 'disputed'];
  const presents = ordre.filter((c) => f.byConf[c] > 0);
  const autres = Object.keys(f.byConf).filter((c) => !ordre.includes(c));
  const detail = presents.concat(autres).map((c) => `${lib(c)} ×${f.byConf[c]}`).join(' · ');
  p.textContent = `Certitudes du fil (${f.items.length}) : ${detail || 'aucun point'}.`;
}

/* Synthèse de couverture : volume, diversité et nature dominante chiffrée. */
function couverture(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-couverture-bloc', 'Couverture du fil');
  const p = paragraphe(ctx, sec, 'v2-e043-couverture', 'recit-v2-e043-couverture');
  if (!f.items.length) {
    p.textContent = 'Couverture du fil : aucun point affiché.';
    return;
  }
  const natures = Object.keys(f.byKind).length;
  const certs = Object.keys(f.byConf).filter((c) => c).length;
  let dominante = '';
  let max = -1;
  Object.keys(f.byKind).forEach((k) => {
    if (f.byKind[k] > max) { max = f.byKind[k]; dominante = k; }
  });
  const pct = Math.round((max / f.items.length) * 100);
  p.textContent = `Couverture du fil : ${f.items.length} point(s), ${natures} nature(s), `
    + `${certs} certitude(s) renseignée(s). Nature dominante : ${dominante} `
    + `(${max} point(s), ${pct} %).`;
}

const ABREVIATIONS = {
  'récit': 'RÉCIT', 'figure': 'FIG.', 'lieu': 'LIEU', 'audit': 'AUDIT', 'point': 'POINT',
};

/* Pastille de nature ajoutée au bouton, sans toucher à son libellé ni à son aria. */
function badges(ctx, f) {
  f.items.forEach((item) => {
    const k = item.getAttribute('data-kind') || 'point';
    setOnce(item, 'data-v2-e043-kind', k);
    if (q(item, '.recit-v2-e043-badge')) return;
    const badge = fabrique(ctx, 'span', 'recit-v2-e043-badge', ABREVIATIONS[k] || k.toUpperCase());
    badge.setAttribute('aria-hidden', 'true');
    item.appendChild(badge);
  });
}

/* Signalement des libellés répétés : compte calculé sur l'ensemble du fil. */
function doublons(ctx, f) {
  const norm = (s) => String(s || '').toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim();
  const comptes = {};
  f.labels.forEach((l) => { const n = norm(l); comptes[n] = (comptes[n] || 0) + 1; });
  f.items.forEach((item, i) => {
    const n = comptes[norm(f.labels[i])] || 0;
    if (n < 2 || q(item, '.recit-v2-e043-dup')) return;
    const marque = fabrique(ctx, 'span', 'recit-v2-e043-dup', `×${n}`);
    marque.setAttribute('aria-hidden', 'true');
    setOnce(marque, 'title', 'Libellé répété dans le fil');
    item.appendChild(marque);
  });
}

/* Registre des clés fonctionnelles réellement portées par les points. */
function registre(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-registre', 'Registre des clés');
  let liste = q(sec, '.recit-v2-e043-keys');
  if (!liste) {
    liste = fabrique(ctx, 'ul', 'recit-v2-e043-keys');
    liste.id = 'v2-e043-keys';
    sec.appendChild(liste);
  }
  liste.textContent = '';
  const avecCle = f.items.filter((item) => item.getAttribute('data-fk'));
  if (!avecCle.length) {
    liste.appendChild(fabrique(ctx, 'li', '', 'Aucune clé fonctionnelle exposée par le fil.'));
    return;
  }
  avecCle.forEach((item) => {
    const fk = item.getAttribute('data-fk');
    const i = f.items.indexOf(item);
    liste.appendChild(fabrique(ctx, 'li', '', `${fk} → ${f.labels[i] || ''}`));
  });
}

/* Légende des abréviations : équivalent textuel des pastilles de nature. */
function legende(ctx, panneau, f) {
  const sec = section(ctx, panneau, 'v2-e043-legende-abrev', 'Légende des abréviations');
  const p = paragraphe(ctx, sec, 'v2-e043-abr', 'recit-v2-e043-abr');
  const connus = ['récit', 'figure', 'lieu', 'audit', 'point'];
  const presents = connus.filter((k) => f.byKind[k] > 0);
  const autres = Object.keys(f.byKind).filter((k) => !connus.includes(k));
  const detail = presents.concat(autres)
    .map((k) => `${ABREVIATIONS[k] || k.toUpperCase()} = ${k}`).join(' · ');
  p.textContent = `Abréviations des pastilles : ${detail || 'aucun point'}.`;
}

/* Marqueur du point courant dans le répertoire, sans toucher au fil lui-même. */
function courantIndex(ctx, panneau, f) {
  if (f.currentIndex < 0) return;
  const liste = q(panneau, '#v2-e043-index');
  if (!liste || !liste.children) return;
  const entree = liste.children[f.currentIndex];
  if (!entree) return;
  addClasse(entree, 'recit-v2-e043-entree-courante');
  setOnce(entree, 'aria-current', 'true');
}

/* Mouvement réduit : une seule classe posée sur la coque, jamais retirée. */
function mouvementReduit(ctx, layout) {
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    addClasse(layout, 'recit-v2-e043-reduit');
  }
}

register('E043', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const layout = (ctx.layout && ctx.layout.classList) ? ctx.layout : q(ctx.stage, '.recit-layout');
    if (!layout || typeof layout.querySelector !== 'function') return;
    addClasse(layout, 'recit-v2-e043-scope');
    if (typeof ctx.css === 'function') ctx.css('recit-v2-e043', CSS);
    else if (!document.getElementById('recit-v2-e043')) {
      const style = document.createElement('style');
      style.id = 'recit-v2-e043';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const faits = litFacts(layout);
    if (!faits.body) return;
    const panneau = assurerPanneau(ctx, faits.body);
    if (!panneau) return;
    repertoire(ctx, panneau, faits);
    natures(ctx, panneau, faits);
    certitudes(ctx, panneau, faits);
    couverture(ctx, panneau, faits);
    badges(ctx, faits);
    doublons(ctx, faits);
    registre(ctx, panneau, faits);
    legende(ctx, panneau, faits);
    courantIndex(ctx, panneau, faits);
    mouvementReduit(ctx, layout);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
