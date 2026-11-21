import { register } from './registry.js';

/* Lentille E092 — Hiérarchie visuelle et informationnelle (vue Récit).
   Dix chantiers distincts (E092-01 à E092-10), tous additifs : sans ce module,
   la vue reste intégralement lisible et navigable. Un seul register, un seul
   css regroupant toutes les règles, classes préfixées recit-e092-, ids DOM
   préfixés e092- et uniques. Aucun appel réseau, aucun aléa, aucune sortie de
   débogage. Chaque chantier est isolé : une défaillance locale est neutralisée
   sans jamais interrompre le rendu de la vue. */

const CSS = `
/* E092-01 — échelle typographique à trois niveaux. */
.recit-e092-echelle .view-kicker{font-size:11px}
.recit-e092-echelle .recit-title{font-size:clamp(26px,3.2vw,46px);line-height:1.12;font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.recit-e092-echelle .recit-meta,
.recit-e092-echelle .recit-context{font-size:14px;line-height:1.62}
.recit-e092-echelle .recit-timing,
.recit-e092-echelle .recit-legend{font-size:11px}

/* E092-02 — surtitre d'étape en onglet numéroté. */
.recit-e092-kicker{display:inline-flex;align-items:center;padding:3px 9px;margin:0 0 10px;border-left:3px solid var(--gold,#e6b96f);border-radius:0 6px 6px 0;background:rgba(230,185,111,.08);color:var(--gold-bright,#f5e9d0);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-variant-numeric:tabular-nums}

/* E092-03 — point courant prééminent dans le fil. */
.recit-e092-fil .recit-thread-item{transition:border-color .18s linear,background-color .18s linear,opacity .18s linear}
.recit-e092-fil .recit-thread-item[aria-current="step"]{border-width:2px;font-weight:700;box-shadow:inset 3px 0 0 var(--gold,#e6b96f)}
.recit-e092-fil .recit-thread-item[aria-current="step"]::before{content:'▶ ';font-size:9px}
.recit-e092-fil .recit-thread-item:not([aria-current="step"]){opacity:.86}

/* E092-04 — badge de certitude à rang explicite. */
.recit-e092-conf{padding:3px 9px;box-shadow:0 1px 0 rgba(230,185,111,.25)}
.recit-e092-conf::before{content:'CERTITUDE · ';font-size:8px;letter-spacing:.1em;opacity:.8}

/* E092-05 — hiérarchie des commandes : primaire, accent, utilitaire. */
.recit-e092-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.recit-e092-actions button{min-height:40px;padding:0 12px;border:1px solid var(--line,#3a3f4a);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft,#d7d1c6);font-size:11px;cursor:pointer;transition:border-color .18s linear,background-color .18s linear,color .18s linear}
.recit-e092-actions button[data-fk="c3a-next"]{border-color:var(--gold,#e6b96f);background:var(--gold,#e6b96f);color:#141821;font-weight:700}
.recit-e092-actions button[data-fk="c3a-play"]{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f5e9d0)}
.recit-e092-actions button[data-fk="c3a-chrono"],
.recit-e092-actions button[data-fk="c3a-next-event"]{border-style:dashed;color:var(--muted,#a9a9ad)}
.recit-e092-actions button[disabled]{opacity:.35;cursor:not-allowed}
.recit-e092-actions button:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}

/* E092-06 — légende structurée en paliers. */
.recit-e092-overline{margin:0 0 4px;color:var(--gold-bright,#f5e9d0);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.recit-e092-legend{padding-left:10px;border-left:2px solid rgba(230,185,111,.35)}
.recit-e092-legend p{position:relative;padding-left:12px;line-height:1.7}
.recit-e092-legend p::before{content:'▸';position:absolute;left:0;top:0;color:var(--gold,#e6b96f);font-size:9px}

/* E092-07 — bloc preuve à deux états : traçabilité / absence de source. */
.recit-e092-preuve summary{font-weight:700;color:var(--gold-bright,#f5e9d0);text-transform:uppercase;letter-spacing:.06em;font-size:10px}
.recit-e092-preuve summary::before{content:'▣ ';color:var(--gold,#e6b96f)}
.recit-e092-sans-source{padding:7px 10px;border:1px dashed var(--line-strong,#4a4f5a);border-radius:7px;color:var(--muted-2,#8c8d91);font-size:10px;line-height:1.5}
.recit-e092-sans-source::before{content:'ℹ ';color:var(--muted,#a9a9ad)}

/* E092-08 — repère de progression chiffré, visuel uniquement. */
.recit-e092-progress-readout{margin:0 0 12px;color:var(--gold-bright,#f5e9d0);font-size:11px;font-weight:700;letter-spacing:.08em;font-variant-numeric:tabular-nums}

/* E092-09 — en-tête de section du fil avec compteur. */
.recit-e092-thread-title{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.recit-e092-thread-count{padding:1px 7px;border:1px solid var(--line,#3a3f4a);border-radius:999px;color:var(--ink-soft,#d7d1c6);font-size:9px;font-variant-numeric:tabular-nums}

/* E092-10 — repli responsive et mouvement réduit. */
@media (max-width:620px){
  .recit-e092-echelle .recit-title{font-size:clamp(23px,6.4vw,32px)}
  .recit-e092-echelle .recit-meta{font-size:12px}
  .recit-e092-kicker{font-size:9px;letter-spacing:.1em}
  .recit-e092-actions button{padding:0 9px;font-size:11px}
}
.recit-layout[data-e092-motion="reduce"] .recit-e092-fil .recit-thread-item,
.recit-layout[data-e092-motion="reduce"] .recit-e092-actions button{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e092-fil .recit-thread-item,
  .recit-e092-actions button{transition:none}
}
`;

/* Ajoute une classe sans écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.nodeType === 1 && noeud.classList && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Pose un attribut seulement s'il n'existe pas déjà : enrichissement non destructif. */
function setOnce(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

/* E092-01 — échelle typographique à trois niveaux (surtitre, titre, corps). */
function chantier01(body) {
  ajouteClasse(body, 'recit-e092-echelle');
}

/* E092-02 — le kicker « Étape N / M · type » devient un surtitre hiérarchisé. */
function chantier02(body) {
  ajouteClasse(body.querySelector('.view-kicker'), 'recit-e092-kicker');
}

/* E092-03 — le point courant du fil devient le repère d'attention dominant. */
function chantier03(body) {
  ajouteClasse(body.querySelector('.recit-thread'), 'recit-e092-fil');
}

/* E092-04 — la pastille de certitude devient un badge de rang explicite.
   Le rang porte sur le symbole et le libellé déjà présents, jamais sur la seule
   couleur : le préfixe textuel « CERTITUDE · » rend le rôle informationnel clair. */
function chantier04(body) {
  ajouteClasse(body.querySelector('.recit-conf'), 'recit-e092-conf');
}

/* E092-05 — les six commandes reçoivent trois poids visuels distincts.
   Aucun réordonnancement : l'ordre visuel reste l'ordre de tabulation. */
function chantier05(body) {
  ajouteClasse(body.querySelector('.recit-actions'), 'recit-e092-actions');
}

/* E092-06 — la légende dense est découpée en paliers par un surtitre et des
   puces. Le surtitre est un vrai paragraphe inséré avant la légende. */
function chantier06(body, el, legend) {
  if (!legend) return;
  let overline = document.getElementById('e092-legend-overline');
  if (!overline || overline.parentElement !== body) {
    overline = el('p', 'recit-e092-overline', 'Légende et repères');
    overline.id = 'e092-legend-overline';
  }
  body.insertBefore(overline, legend);
  ajouteClasse(legend, 'recit-e092-legend');
}

/* E092-07 — deux états de preuve clairement séparés : traçabilité disponible
   (details.summary mis en évidence) et absence de source (avis neutre).
   Contexte : 587 points du jeu n'ont aucun identifiant de source. */
function chantier07(body) {
  ajouteClasse(body.querySelector('.recit-trace'), 'recit-e092-preuve');
  ajouteClasse(body.querySelector('.recit-sources'), 'recit-e092-sans-source');
}

/* E092-08 — la progression reçoit une lecture chiffrée « N / M » visible,
   dérivée du surtitre réel calculé par la vue. Masquée aux lecteurs d'écran
   pour éviter un doublon avec ce surtitre déjà annoncé. */
function chantier08(body, el) {
  const progress = body.querySelector('.recit-progress');
  const kicker = body.querySelector('.view-kicker');
  if (!progress || !progress.parentNode || !kicker) return;
  const found = String(kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  if (!found) return;
  let readout = document.getElementById('e092-progress-readout');
  if (!readout || readout.parentElement !== body) {
    readout = el('p', 'recit-e092-progress-readout');
    readout.id = 'e092-progress-readout';
  }
  readout.textContent = `${found[1]} / ${found[2]}`;
  setOnce(readout, 'aria-hidden', 'true');
  progress.parentNode.insertBefore(readout, progress.nextSibling);
}

/* E092-09 — l'en-tête du fil devient un vrai titre de section avec un
   compteur de points affichés, calculé depuis la liste réellement rendue. */
function chantier09(body, el) {
  const title = body.querySelector('.recit-thread-title');
  if (!title) return;
  ajouteClasse(title, 'recit-e092-thread-title');
  let count = document.getElementById('e092-thread-count');
  if (!count || !title.contains(count)) {
    count = el('span', 'recit-e092-thread-count');
    count.id = 'e092-thread-count';
    title.appendChild(count);
  }
  const list = body.querySelector('#c3a-thread') || body.querySelector('.recit-thread-list');
  const n = list && list.querySelectorAll ? list.querySelectorAll('.recit-thread-item').length : 0;
  count.textContent = `${n} point${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}`;
}

/* E092-10 — la hiérarchie reste lisible à 390 px (repli CSS) et les effets
   d'emphase ne dépendent jamais du mouvement. */
function chantier10(layout, reducedMotion) {
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  if (layout && layout.setAttribute) layout.setAttribute('data-e092-motion', reduce ? 'reduce' : 'full');
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E092', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !stage || !layout || typeof layout.querySelector !== 'function') return;
  safe(() => css('recit-e092', CSS));
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  safe(() => chantier01(body));
  safe(() => chantier02(body));
  safe(() => chantier03(body));
  safe(() => chantier04(body));
  safe(() => chantier05(body));
  safe(() => chantier06(body, el, body.querySelector('.recit-legend')));
  safe(() => chantier07(body));
  safe(() => chantier08(body, el));
  safe(() => chantier09(body, el));
  safe(() => chantier10(layout, reducedMotion));
});
