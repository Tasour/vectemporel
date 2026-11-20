import { register } from './registry.js';

/* Lentille E047 — Contraste et perception (vue Récit).
 *
 * Dix chantiers concrets et distincts (E047-01 … E047-10), tous implémentés
 * dans CE seul module. Rapport : UNIFIED_AUDIT/RECIT/views/E047.md.
 *
 * Greffon strictement non destructif : aucun texte n'est retiré, aucun attribut
 * existant n'est réécrit, aucun nœud n'est supprimé. Les enrichissements
 * consistent en classes, attributs de données, une variable CSS locale et un
 * seul bouton de bascule. Sans JavaScript, le récit reste lisible.
 *
 * Un seul register('E047', …), un seul css('recit-e047', …). Toutes les
 * classes sont préfixées `recit-e047-`, le seul id créé est préfixé `e047-`.
 * Zéro console, zéro réseau, zéro aléa, zéro innerHTML, aucun écouteur global.
 * Une défaillance locale est neutralisée sans interrompre le rendu.
 */

const CSS_ID = 'recit-e047';
const BASCULE_ID = 'e047-bascule-contraste';

/* Persiste entre deux reconstructions du DOM opérées par la coque. */
let contrasteRenforce = false;

/* Bloc CSS unique, cadré par la classe racine .recit-e047-racine posée sur
   .recit-layout. Aucune ressource distante, aucune police téléchargée, aucune
   information portée par la seule couleur (bordures, glyphes, hachures,
   soulignement et texte viennent doubler le contraste). */
const RULES = `
.recit-e047-racine{
  --e047-sec:#d3cbb8;
  --e047-ter:#b9b1a0;
  --e047-accent:#ffdc92;
  --e047-ring:#fff0c7;
}
/* E047-01 — textes secondaires rehaussés. */
.recit-e047-racine .recit-e047-sec{color:var(--e047-sec)}
.recit-e047-racine .recit-e047-sec.recit-legend{line-height:1.75}
.recit-e047-racine .recit-e047-sec.media-caption,
.recit-e047-racine .recit-e047-sec.recit-media-credit{color:var(--e047-sec)}
/* E047-02 — pastille de certitude : texte + symbole + style de bordure. */
.recit-e047-racine .recit-e047-conf{border-width:2px;font-weight:700;letter-spacing:.02em}
.recit-e047-racine .recit-e047-conf--verifie{border-style:solid}
.recit-e047-racine .recit-e047-conf--certain{border-style:double;border-width:3px}
.recit-e047-racine .recit-e047-conf--probable{border-style:dashed}
.recit-e047-racine .recit-e047-conf--conteste{border-style:dotted}
/* E047-03 — piste de progression contrastée et encoche de position. */
.recit-e047-racine .recit-progress{position:relative;height:4px;background:rgba(255,255,255,.24);box-shadow:inset 0 0 0 1px var(--line-strong)}
.recit-e047-racine .recit-progress>span{background:var(--e047-accent)}
.recit-e047-racine .recit-progress[data-e047-prog="1"]::after{content:'';position:absolute;top:0;left:var(--e047-pos,0%);width:2px;height:100%;background:var(--e047-ring);transform:translateX(-1px)}
/* E047-04 — anneau de focus à double contour, lisible sur tout fond. */
.recit-e047-racine[data-e047-focus="1"] .recit-actions button:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .recit-thread-item:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .recit-trace summary:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .c3a-search:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .c3a-filter:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .c3a-reset:focus-visible,
.recit-e047-racine[data-e047-focus="1"] .recit-e047-bascule:focus-visible{
  outline:3px solid var(--e047-ring);outline-offset:2px;
  box-shadow:0 0 0 6px rgba(8,10,16,.92);
}
/* E047-05 — point courant : filet, gras, soulignement et marqueur texte. */
.recit-e047-racine .recit-e047-courant{position:relative;border-left-width:4px;padding-right:18px;font-weight:700;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
.recit-e047-racine .recit-e047-courant::after{content:'◀';position:absolute;right:5px;top:50%;transform:translateY(-50%);color:var(--e047-accent);font-size:8px}
/* E047-06 — légende : échantillons visuels ajoutés en pseudo-éléments. */
.recit-e047-racine .recit-e047-legende p{display:flex;align-items:baseline;gap:8px}
.recit-e047-racine .recit-e047-legende p::before{content:'';flex:none;display:inline-grid;place-items:center;width:14px;height:14px;border:1px solid var(--line-strong);border-radius:3px;background:rgba(255,255,255,.08);color:var(--e047-accent);font-size:9px;font-weight:700;line-height:1}
.recit-e047-racine .recit-e047-legende-conf::before{content:'✓'}
.recit-e047-racine .recit-e047-legende-type::before{content:'◆'}
.recit-e047-racine .recit-e047-legende-clavier::before{content:'⌨'}
.recit-e047-racine .recit-e047-legende-fil::before{content:'↕'}
/* E047-07 — commandes désactivées : opacité remontée + hachures + tirets. */
.recit-e047-racine .recit-e047-desactive{opacity:.8;border-style:dashed;color:var(--e047-ter);background-image:repeating-linear-gradient(135deg,transparent 0 4px,rgba(255,255,255,.07) 4px 6px)}
/* E047-08 — chapeau de contexte : contraste et filet d'accent. */
.recit-e047-racine .recit-e047-context{color:var(--e047-sec);border-left:3px solid var(--e047-accent);padding-left:12px;line-height:1.75}
/* E047-09 — étiquettes de type du fil en pastilles contrastées. */
.recit-e047-racine .recit-e047-type{display:inline-block;padding:1px 4px;border:1px solid var(--line-strong);border-radius:4px;background:rgba(255,255,255,.09);color:var(--e047-sec);font-size:9px;font-weight:700;letter-spacing:.04em}
/* E047-10 — bascule de contraste renforcé et repli système. */
.recit-e047-racine .recit-e047-bascule{min-height:36px;padding:6px 10px;border:2px solid var(--e047-accent);border-radius:8px;background:transparent;color:var(--e047-accent);font:inherit;font-size:11px;font-weight:700;cursor:pointer}
.recit-e047-racine .recit-e047-bascule[aria-pressed="true"]{background:var(--e047-accent);color:#10131b}
.recit-e047-racine:not([data-e047-mouvement="reduce"]) .recit-e047-bascule{transition:background-color .15s ease,color .15s ease}
.recit-e047-racine.recit-e047-haut-contraste{--e047-sec:#ffffff;--e047-ter:#f5eeda;--e047-ring:#ffffff;--e047-accent:#ffe27a}
.recit-e047-racine.recit-e047-haut-contraste .recit-e047-sec,
.recit-e047-racine.recit-e047-haut-contraste .recit-e047-context,
.recit-e047-racine.recit-e047-haut-contraste .recit-e047-type{color:#fff}
.recit-e047-racine.recit-e047-haut-contraste .recit-progress{background:rgba(255,255,255,.45)}
.recit-e047-racine.recit-e047-haut-contraste .recit-thread-item,
.recit-e047-racine.recit-e047-haut-contraste .c3a-filter,
.recit-e047-racine.recit-e047-haut-contraste .recit-e047-bascule:not([aria-pressed="true"]){background-color:rgba(0,0,0,.6);color:#fff}
@media (prefers-contrast: more){
  .recit-e047-racine{--e047-sec:#ffffff;--e047-ter:#f5eeda;--e047-ring:#ffffff;--e047-accent:#ffe27a}
  .recit-e047-racine .recit-e047-sec,
  .recit-e047-racine .recit-e047-context,
  .recit-e047-racine .recit-e047-type{color:#fff}
  .recit-e047-racine .recit-progress{background:rgba(255,255,255,.45)}
}
`;

/* -- Utilitaires gardés -------------------------------------------------- */

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

function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

function ajouteClasse(node, classe) {
  if (node && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(classe)) node.classList.add(classe);
}

function texte(node) {
  return node && typeof node.textContent === 'string' ? node.textContent : '';
}

/* -- Chantiers ----------------------------------------------------------- */

/* E047-01 — relève le contraste des textes secondaires sans toucher aux
   textes ni aux variables globales : classe locale et palette privée. */
function chantier01(root) {
  qa(root, '.recit-timing, .recit-thread-title, .recit-legend, .media-caption, .recit-media-credit')
    .forEach((n) => ajouteClasse(n, 'recit-e047-sec'));
}

/* E047-02 — la pastille garde son texte et son symbole, et reçoit en plus un
   style de bordure propre à chaque degré : l'information ne tient pas à la
   couleur. Le niveau est lu sur le texte réel, jamais inventé. */
function chantier02(root) {
  const pastille = q(root, '.recit-conf');
  if (!pastille) return;
  ajouteClasse(pastille, 'recit-e047-conf');
  const t = texte(pastille).toLocaleLowerCase('fr');
  let niveau = '';
  if (t.indexOf('contest') >= 0 || t.indexOf('disputed') >= 0) niveau = 'conteste';
  else if (t.indexOf('vérifié') >= 0 || t.indexOf('verifie') >= 0) niveau = 'verifie';
  else if (t.indexOf('certain') >= 0) niveau = 'certain';
  else if (t.indexOf('probable') >= 0) niveau = 'probable';
  if (niveau) ajouteClasse(pastille, `recit-e047-conf--${niveau}`);
}

/* E047-03 — encoche de position sur la piste : la largeur est relue sur le
   style réel du remplissage, bornée puis publiée en variable CSS locale. */
function chantier03(root) {
  const barre = q(root, '.recit-progress');
  if (!barre) return;
  const remplissage = q(barre, 'span');
  if (!remplissage || !remplissage.style) return;
  const largeur = String(remplissage.style.width || '').trim();
  const trouvé = /^(\d+(?:\.\d+)?)%$/.exec(largeur);
  if (!trouvé) return;
  const valeur = Number(trouvé[1]);
  if (!Number.isFinite(valeur)) return;
  const pos = `${Math.min(100, Math.max(0, valeur))}%`;
  try { barre.style.setProperty('--e047-pos', pos); }
  catch { return; }
  barre.setAttribute('data-e047-prog', '1');
}

/* E047-04 — active les anneaux de focus à double contour sur la racine. */
function chantier04(root) {
  if (root && root.dataset) root.dataset.e047Focus = '1';
}

/* E047-05 — renforce l'item courant du fil au-delà de la couleur dorée :
   filet, gras, soulignement et marqueur « ◀ » en pseudo-élément. */
function chantier05(root) {
  qa(root, '.recit-thread-item.is-current').forEach((n) => ajouteClasse(n, 'recit-e047-courant'));
}

/* E047-06 — chaque paragraphe de la légende reçoit un échantillon visuel
   distinct, reconnu d'après son texte réel et sans modifier ce texte. */
function chantier06(root) {
  const legende = q(root, '.recit-legend');
  if (!legende) return;
  ajouteClasse(legende, 'recit-e047-legende');
  qa(legende, 'p').forEach((p) => {
    const t = texte(p).toLocaleLowerCase('fr');
    let cle = '';
    if (t.indexOf('degré') >= 0 || t.indexOf('certitude') >= 0) cle = 'conf';
    else if (t.indexOf('type') >= 0) cle = 'type';
    else if (t.indexOf('lecture') >= 0) cle = 'clavier';
    else if (t.indexOf('fil') >= 0) cle = 'fil';
    if (cle) ajouteClasse(p, `recit-e047-legende-${cle}`);
  });
}

/* E047-07 — les commandes désactivées restent lisibles : opacité remontée,
   bordure en tirets et hachures, sans changer l'état `disabled`. */
function chantier07(root) {
  qa(root, '.recit-actions button[disabled]').forEach((n) => ajouteClasse(n, 'recit-e047-desactive'));
}

/* E047-08 — le résumé du repère (premier point) gagne un contraste et un
   filet d'accent, sans être déplacé ni réécrit. */
function chantier08(root) {
  const contexte = q(root, '#recit-context') || q(root, '.recit-context');
  ajouteClasse(contexte, 'recit-e047-context');
}

/* E047-09 — les étiquettes de type du fil deviennent des pastilles à fond et
   bordure, lisibles même quand le texte courant est atténué. */
function chantier09(root) {
  qa(root, '.thread-kind').forEach((n) => ajouteClasse(n, 'recit-e047-type'));
}

/* E047-10 — bascule locale de contraste renforcé, aria-pressed sur une
   bascule indépendante, état mémorisé entre rendus. Repli automatique pour
   `prefers-contrast: more` porté par la feuille unique. */
function chantier10(root, fabrique, reducedMotion) {
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  if (root && root.dataset) root.dataset.e047Mouvement = reduce ? 'reduce' : 'full';

  if (contrasteRenforce) ajouteClasse(root, 'recit-e047-haut-contraste');
  else if (root && root.classList && typeof root.classList.remove === 'function') {
    root.classList.remove('recit-e047-haut-contraste');
  }

  const actions = q(root, '.recit-actions');
  if (!actions || typeof actions.insertBefore !== 'function') return;
  if (typeof fabrique !== 'function') return;
  if (typeof document !== 'undefined' && document.getElementById(BASCULE_ID)) return;

  let bouton;
  try {
    bouton = fabrique('button', 'recit-e047-bascule',
      contrasteRenforce ? 'Contraste renforcé : activé' : 'Contraste renforcé : désactivé');
  } catch { return; }
  if (!bouton) return;
  bouton.id = BASCULE_ID;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(contrasteRenforce));
  bouton.addEventListener('click', () => {
    contrasteRenforce = !contrasteRenforce;
    try {
      bouton.setAttribute('aria-pressed', String(contrasteRenforce));
      bouton.textContent = contrasteRenforce
        ? 'Contraste renforcé : activé' : 'Contraste renforcé : désactivé';
      const racine = bouton.closest ? bouton.closest('.recit-e047-racine') : null;
      if (racine && racine.classList) {
        racine.classList.toggle('recit-e047-haut-contraste', contrasteRenforce);
      }
    } catch { /* neutralisé */ }
  });
  actions.insertBefore(bouton, actions.firstChild);
}

/* -- Point d'entrée unique ------------------------------------------------ */

register('E047', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined') return;
  if (typeof css === 'function') safe(() => css(CSS_ID, RULES));

  const racine = layout || stage;
  if (!racine || typeof racine.querySelector !== 'function') return;
  safe(() => ajouteClasse(racine, 'recit-e047-racine'));
  safe(() => chantier01(racine));
  safe(() => chantier02(racine));
  safe(() => chantier03(racine));
  safe(() => chantier04(racine));
  safe(() => chantier05(racine));
  safe(() => chantier06(racine));
  safe(() => chantier07(racine));
  safe(() => chantier08(racine));
  safe(() => chantier09(racine));
  safe(() => chantier10(racine, el, reducedMotion));
});
