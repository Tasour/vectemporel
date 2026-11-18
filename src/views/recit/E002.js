import { register } from './registry.js';

/* Lentille E002 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Greffon strictement additif : il n'efface aucun texte, ne ré-attribue aucune
 * commande et ne touche à aucun fichier partagé. Il pose une classe racine
 * sur la disposition, injecte UN seul bloc CSS (id `recit-e002` via `css()`)
 * et enrichit les éléments déjà présents dans le DOM du récit. Toutes les
 * classes créées sont préfixées `recit-e002-` ; aucun identifiant d'élément
 * n'est ajouté (l'unicité est donc triviale). Zéro réseau, zéro aléa, zéro
 * journalisation, aucune animation pilotée par JavaScript.
 *
 * Les dix chantiers E002-01 … E002-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E002.md.
 */

const RACINE = 'recit-e002-root';
const CSS_ID = 'recit-e002';

/* Bloc CSS unique, entièrement porté par la classe racine : aucune règle
   globale, aucune ressource distante, aucune police téléchargée. */
const CSS = `
.recit-e002-root{
  --e002-fs-titre:clamp(34px,4.4vw,58px);
  --e002-fs-chapeau:15px;
  --e002-fs-etiquette:11px;
  --e002-fs-secondaire:9px;
  --e002-fs-tertiaire:8px;
}
/* E002-01 — échelle typographique : le titre domine nettement le chapeau,
   puis viennent les étiquettes, le secondaire et le tertiaire. */
.recit-e002-root .recit-title{font-size:var(--e002-fs-titre);line-height:1.06;margin:0 0 16px}
.recit-e002-root .recit-meta{font-size:var(--e002-fs-etiquette);letter-spacing:.01em}
/* E002-02 — surtitre d'étape en « eyebrow » : étiquette haute, espacée,
   accentuée par un filet court à gauche. */
.recit-e002-root .recit-e002-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  margin:0 0 12px;padding-left:9px;
  border-left:3px solid var(--gold);
  color:var(--gold);font-size:var(--e002-fs-etiquette);font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;
}
.recit-e002-root .recit-e002-eyebrow::before{
  content:'';flex:none;width:6px;height:6px;border-radius:2px;
  background:var(--gold);transform:rotate(45deg);
}
/* E002-03 — ancrage du point courant : numéro ordinal en pastille + filet. */
.recit-e002-root .recit-e002-title{
  position:relative;padding:2px 0 2px 62px;
  border-left:3px solid var(--line-strong);
}
.recit-e002-root .recit-e002-title::before{
  content:attr(data-e002-ordinal);
  position:absolute;left:12px;top:2px;
  display:grid;place-items:center;
  width:42px;height:42px;border:1px solid var(--line-strong);border-radius:10px;
  background:rgba(230,185,111,.1);color:var(--gold-bright);
  font:700 15px/1 var(--sans);font-variant-numeric:tabular-nums;
}
/* E002-04 — certitude en premier plan : pastille hiérarchisée et jauge
   symbolique (pleines/vides), jamais portée par la seule couleur. */
.recit-e002-root .recit-e002-conf{
  display:inline-flex;align-items:center;gap:7px;
  padding:3px 9px;border:1px solid var(--line-strong);border-radius:999px;
  background:rgba(230,185,111,.08);color:var(--gold-bright);
  font-size:var(--e002-fs-etiquette);font-weight:600;letter-spacing:.02em;
}
.recit-e002-root .recit-e002-conf::after{
  content:attr(data-e002-meter);color:var(--gold);
  font-size:var(--e002-fs-secondaire);letter-spacing:1px;
}
/* E002-05 — chapeau : le résumé du repère devient l'entrée en matière. */
.recit-e002-root .recit-e002-lead{
  margin:0 0 22px;padding:10px 14px;
  border-left:2px solid var(--line-strong);border-radius:0 8px 8px 0;
  background:rgba(255,255,255,.02);
  color:var(--ink-soft);font-size:var(--e002-fs-chapeau);line-height:1.65;
}
/* E002-06 — profil du repère : synthèse calculée depuis les données
   data-* déjà présentes sur les items du fil. */
.recit-e002-root .recit-e002-profile{
  margin:0 0 8px;padding:7px 10px;
  border:1px dashed var(--line-strong);border-radius:8px;
  background:rgba(230,185,111,.04);color:var(--muted);
  font-size:var(--e002-fs-secondaire);line-height:1.55;
}
/* Étiquettes de section : architecture de l'information explicite. */
.recit-e002-root .recit-e002-section-label{
  margin:0 0 8px;color:var(--gold);font-size:var(--e002-fs-secondaire);
  font-weight:700;letter-spacing:.16em;text-transform:uppercase;
}
/* E002-07 — fil : l'élément courant domine, les autres passent en retrait. */
.recit-e002-root .recit-e002-thread{padding-top:6px;border-top:1px solid var(--line)}
.recit-e002-root .recit-e002-thread-list .recit-thread-item{opacity:.8}
.recit-e002-root .recit-e002-thread-list .recit-thread-item.is-current{
  opacity:1;border-left:3px solid var(--gold);font-weight:600;
}
/* E002-08 — légende en grille clé/valeur compacte, lisible d'un coup d'œil. */
.recit-e002-root .recit-e002-legend{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 20px;
  margin-top:18px;padding-top:12px;border-top:1px solid var(--line);
}
.recit-e002-root .recit-e002-legend .recit-e002-section-label{grid-column:1/-1;margin:0 0 4px}
.recit-e002-root .recit-e002-legend p{
  margin:0;font-size:var(--e002-fs-secondaire);line-height:1.55;
}
/* E002-09 — temps de lecture et traçabilité relégués au niveau tertiaire. */
.recit-e002-root .recit-e002-subtle{
  color:var(--muted-2);font-size:var(--e002-fs-secondaire);
  font-style:italic;letter-spacing:.01em;
}
.recit-e002-root .recit-e002-tertiary{opacity:.78}
.recit-e002-root .recit-e002-tertiary summary{font-size:var(--e002-fs-secondaire)}
/* E002-10 — commandes : primaire mis en avant, secondaires atténuées. */
.recit-e002-root .recit-e002-actions{padding-top:6px;border-top:1px solid var(--line)}
.recit-e002-root .recit-e002-actions button{min-height:38px}
.recit-e002-root .recit-e002-primary{
  border-color:var(--gold);background:rgba(230,185,111,.16);
  color:var(--gold-bright);font-weight:700;
}
.recit-e002-root .recit-e002-secondary{color:var(--muted)}
.recit-e002-root .recit-e002-actions button[disabled]{opacity:.35}
/* E002-motion — transitions douces uniquement si l'utilisateur les accepte. */
.recit-e002-motion .recit-e002-thread-list .recit-thread-item{
  transition:border-color .15s ease,opacity .15s ease;
}
@media (prefers-reduced-motion:reduce){
  .recit-e002-root .recit-thread-item{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .recit-e002-root .recit-title{font-size:clamp(24px,7vw,34px)}
  .recit-e002-root .recit-e002-title{padding-left:54px}
  .recit-e002-root .recit-e002-title::before{width:36px;height:36px;left:10px;font-size:13px}
  .recit-e002-root .recit-e002-legend{grid-template-columns:1fr}
}
`;

/* Lit « Étape X / Y » dans le surtitre sans modifier son texte. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const found = texte.match(/(\d+)\s*\/\s*(\d+)/);
  if (!found) return null;
  return { etape: found[1], total: found[2] };
}

/* Rang de certitude, du plus fort au plus faible, lu sur la pastille. */
function rangCertitude(texte) {
  const value = String(texte || '').toLowerCase();
  if (value.indexOf('vérifié') >= 0 || value.indexOf('verifie') >= 0) return 4;
  if (value.indexOf('certain') >= 0) return 3;
  if (value.indexOf('probable') >= 0) return 2;
  if (value.indexOf('contesté') >= 0 || value.indexOf('disputed') >= 0) return 1;
  return 0;
}

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

register('E002', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el, reducedMotion } = ctx;
  const root = layout;

  /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
  if (typeof css === 'function') {
    try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
  }

  marquer(root, RACINE);
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    marquer(root, 'recit-e002-reduced');
  } else {
    marquer(root, 'recit-e002-motion');
  }

  /* --- E002-02 : surtitre d'étape ---------------------------------------- */
  const surtitre = root.querySelector('.view-kicker');
  marquer(surtitre, 'recit-e002-eyebrow');
  const etape = lireEtape(surtitre);

  /* --- E002-03 : titre ancré --------------------------------------------- */
  const titre = root.querySelector('#recit-point-title, .recit-title');
  marquer(titre, 'recit-e002-title');
  if (titre && etape) {
    try {
      titre.setAttribute('data-e002-ordinal', String(etape.etape).padStart(2, '0'));
      titre.setAttribute('data-e002-total', etape.total);
    } catch { /* attributs facultatifs */ }
  }

  /* --- E002-04 : pastille de certitude ----------------------------------- */
  const confiance = root.querySelector('.recit-conf');
  marquer(confiance, 'recit-e002-conf');
  if (confiance) {
    const rang = rangCertitude(confiance.textContent);
    const jauge = rang > 0
      ? '▮'.repeat(rang) + '▯'.repeat(Math.max(0, 4 - rang))
      : '';
    try {
      confiance.setAttribute('data-e002-rang', String(rang));
      confiance.setAttribute('data-e002-meter', jauge);
    } catch { /* attributs facultatifs */ }
  }

  /* --- E002-05 : résumé en chapeau --------------------------------------- */
  marquer(root.querySelector('#recit-context, .recit-context'), 'recit-e002-lead');

  /* --- E002-06 : profil du repère ---------------------------------------- */
  if (typeof el === 'function' && !root.querySelector('.recit-e002-profile')) {
    const items = Array.from(root.querySelectorAll('.c3a-thread-item'));
    if (items.length) {
      const types = Object.create(null);
      const certitudes = Object.create(null);
      items.forEach((item) => {
        const type = (item.getAttribute('data-kind') || 'point');
        const cert = (item.getAttribute('data-confidence') || '—');
        types[type] = (types[type] || 0) + 1;
        certitudes[cert] = (certitudes[cert] || 0) + 1;
      });
      const listeTypes = Object.keys(types)
        .map((key) => `${types[key]} ${key}`).join(' · ');
      const listeCertitudes = Object.keys(certitudes)
        .map((key) => `${certitudes[key]} ${key}`).join(' · ');
      const profil = el('p', 'recit-e002-profile',
        `Profil du repère : ${items.length} point(s) · ${listeTypes} · certitudes : ${listeCertitudes}.`);
      const outils = root.querySelector('.c3a-tools');
      const parent = (outils && outils.parentNode) || root.querySelector('.recit-body') || root;
      if (parent && typeof parent.insertBefore === 'function') {
        parent.insertBefore(profil, outils || null);
      }
    }
  }

  /* --- E002-07 : hiérarchie du fil --------------------------------------- */
  const fil = root.querySelector('.recit-thread');
  marquer(fil, 'recit-e002-thread');
  marquer(fil && fil.querySelector('.recit-thread-title'), 'recit-e002-section-label');
  marquer(fil && fil.querySelector('.c3a-thread, .recit-thread-list'), 'recit-e002-thread-list');

  /* --- E002-08 : légende en grille --------------------------------------- */
  const legende = root.querySelector('.recit-legend');
  marquer(legende, 'recit-e002-legend');
  if (typeof el === 'function' && legende && !legende.querySelector('.recit-e002-section-label')) {
    const etiquette = el('p', 'recit-e002-section-label', 'Légende et raccourcis');
    try { legende.insertBefore(etiquette, legende.firstChild); } catch { /* inchangé */ }
  }

  /* --- E002-09 : métadonnées tertiaires ---------------------------------- */
  marquer(root.querySelector('.recit-timing'), 'recit-e002-subtle');
  const tertiaires = root.querySelectorAll('.recit-trace, .recit-sources');
  Array.prototype.forEach.call(tertiaires, (node) => marquer(node, 'recit-e002-tertiary'));

  /* --- E002-10 : hiérarchie des commandes -------------------------------- */
  const actions = root.querySelector('.recit-actions');
  marquer(actions, 'recit-e002-actions');
  if (actions) {
    try {
      actions.setAttribute('role', 'toolbar');
      actions.setAttribute('aria-label', 'Commandes du récit');
    } catch { /* attributs facultatifs */ }
    Array.prototype.forEach.call(actions.querySelectorAll('button'), (button) => {
      const libelle = String(button.textContent || '');
      if (libelle.indexOf('Point suivant') >= 0 || libelle.indexOf('Repère suivant') >= 0) {
        marquer(button, 'recit-e002-primary');
      } else {
        marquer(button, 'recit-e002-secondary');
      }
    });
  }
});
