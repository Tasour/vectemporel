import { register } from './registry.js';

/* V2 lentille E047 — Contraste et perception (vue Récit).
   Dix chantiers NEUFS, distincts de ceux de la passe 1 (textes secondaires,
   styles de bordure de la pastille, encoche de progression, double anneau de
   focus, marqueur de l'item courant, échantillons de légende, commandes
   désactivées, chapeau de contexte, pastilles de type, bascule de contraste).
   Ici : kicker d'étape, jauge de certitude en glyphes, placeholder contrasté,
   statut en chiffres tabulaires, code de forme par type, numérotation du fil,
   règles de séparation, plateau de lisibilité média, survol des commandes et
   bascule « texte large ». Tout est additif : aucun texte, attribut ou nœud
   existant n'est retiré, aucun chiffre n'est inventé (les barres de la jauge
   viennent du libellé réel, la numérotation du fil est un compteur CSS).
   Préfixes : ids v2-e047-, classes recit-v2-e047-. */

const RULES = `
.recit-v2-e047-racine{
  --v2-e047-ink:#f2ecdd;
  --v2-e047-accent:#ffd989;
  --v2-e047-line:rgba(255,255,255,.28);
}

/* Kicker d'étape rehaussé : contraste, filet d'accent et chiffres tabulaires,
   sans toucher au texte « Étape i / n · kind » calculé par la vue. */
.recit-v2-e047-racine .recit-v2-e047-kicker{
  color:var(--v2-e047-ink);font-weight:700;letter-spacing:.14em;
  font-variant-numeric:tabular-nums;
  border-left:3px solid var(--v2-e047-accent);padding-left:9px;
}

/* Jauge de certitude en glyphes pleins/vides, ajoutée à côté du libellé réel :
   motif dérivé de la mention lue dans la pastille. */
.recit-v2-e047-racine .recit-v2-e047-jauge{
  margin-left:6px;font-family:monospace;font-size:9px;
  letter-spacing:1px;color:var(--v2-e047-accent);white-space:nowrap;
}

/* Placeholder du champ de recherche porté au contraste du texte, avec un
   filet de bordure distinct du fond. */
.recit-v2-e047-racine .recit-v2-e047-search{border-color:var(--v2-e047-line)}
.recit-v2-e047-racine .recit-v2-e047-search::placeholder{color:var(--v2-e047-ink);opacity:.78}

/* Statut des filtres en chiffres tabulaires et soulignement en tirets : le
   décompte de la vue devient stablement lisible. */
.recit-v2-e047-racine .recit-v2-e047-status{
  color:var(--v2-e047-ink);font-variant-numeric:tabular-nums;
  border-bottom:1px dashed var(--v2-e047-line);padding-bottom:4px;
}

/* Un glyphe de forme distinct par type de point, lu sur data-kind du bouton :
   surcharge graphique sans modifier l'étiquette textuelle. */
.recit-v2-e047-racine .recit-v2-e047-kind::before{margin-right:3px;font-weight:700}
.recit-v2-e047-racine .recit-v2-e047-kind--recit::before{content:'▤'}
.recit-v2-e047-racine .recit-v2-e047-kind--figure::before{content:'◆'}
.recit-v2-e047-racine .recit-v2-e047-kind--lieu::before{content:'⌖'}
.recit-v2-e047-racine .recit-v2-e047-kind--audit::before{content:'■'}

/* Numérotation ordinale du fil par compteur CSS : les « 01, 02… » sont
   calculés depuis l'ordre réel des <li>, jamais codés en dur. */
.recit-v2-e047-racine .recit-v2-e047-fil{counter-reset:v2e047-item}
.recit-v2-e047-racine .recit-v2-e047-fil>li{counter-increment:v2e047-item}
.recit-v2-e047-racine .recit-v2-e047-fil>li::before{
  content:counter(v2e047-item,decimal-leading-zero);
  display:inline-block;min-width:22px;margin-right:4px;
  color:var(--v2-e047-accent);font-size:9px;font-variant-numeric:tabular-nums;
}

/* Règles de séparation entre le fil et la traçabilité : hiérarchie visuelle
   portée par un filet, pas par une couleur seule. */
.recit-v2-e047-racine .recit-v2-e047-regle{
  border-top:1px solid var(--v2-e047-line);padding-top:10px;margin-top:12px;
}

/* Plateau sombre sous les légendes média : lisibilité renforcée par un fond
   et une ombre portée, en plus de la couleur déjà relevée en passe 1. */
.recit-v2-e047-racine .recit-v2-e047-plateau{
  background:rgba(8,10,16,.72);border-radius:5px;padding:3px 6px;
  text-shadow:0 1px 2px #000;
}

/* Survol des commandes : filet interne et fond d'accent ajoutés via
   box-shadow, sans modifier bordure ni dimensions des boutons. */
.recit-v2-e047-racine .recit-v2-e047-actions button:hover:not([disabled]){
  box-shadow:inset 0 0 0 1px var(--v2-e047-accent);
  background-color:rgba(255,217,137,.14);
  text-decoration:underline;text-underline-offset:2px;
}

/* Bascule « texte large » : agrandissement ciblé des textes à taille fixe,
   et transition neutralisée en mouvement réduit. */
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-body{line-height:1.7}
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-title{font-size:clamp(28px,7vw,42px)}
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-context{font-size:16px}
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-timing,
.recit-v2-e047-racine.recit-v2-e047-texte-large .c3a-status,
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-legend,
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-trace,
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-thread-item,
.recit-v2-e047-racine.recit-v2-e047-texte-large .c3a-search,
.recit-v2-e047-racine.recit-v2-e047-texte-large .c3a-filter{font-size:12px}
.recit-v2-e047-racine.recit-v2-e047-texte-large .recit-conf,
.recit-v2-e047-racine.recit-v2-e047-texte-large .thread-kind{font-size:10px}
.recit-v2-e047-racine .recit-v2-e047-bascule{
  min-height:36px;padding:6px 10px;border:2px solid var(--v2-e047-accent);
  border-radius:8px;background:transparent;color:var(--v2-e047-accent);
  font:inherit;font-size:11px;font-weight:700;cursor:pointer;
}
.recit-v2-e047-racine .recit-v2-e047-bascule[aria-pressed="true"]{
  background:var(--v2-e047-accent);color:#10131b;
}
html[data-recit-v2-e047-motion="reduce"] .recit-v2-e047-bascule{
  transition:none!important;animation:none!important;
}
`;

const BASCULE_ID = 'v2-e047-bascule-texte';

/* Mémorisé entre deux reconstructions du DOM opérées par la coque. */
let texteLarge = false;

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

/* Ajoute un attribut seulement s'il est absent : aucun attribut porté par la
   coque (lang, aria-*, data-*) n'est écrasé. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* -- Chantiers ----------------------------------------------------------- */

/* E047-01 — renforce le kicker d'étape, déjà calculé par la vue, sans le
   réécrire : classe locale et palette privée à la racine V2. */
function chantier01(body) {
  ajouteClasse(q(body, '.view-kicker'), 'recit-v2-e047-kicker');
}

/* E047-02 — ajoute une jauge de glyphes à côté de la pastille de certitude.
   Le motif est dérivé du libellé réel (« vérifié », « certain », « probable »,
   « disputed/contesté ») ; aucun niveau n'est deviné. Le nœud est décoratif
   (aria-hidden) et le texte d'origine n'est pas modifié. */
function chantier02(body, fabrique) {
  const chip = q(body, '.recit-conf');
  if (!chip || typeof fabrique !== 'function') return;
  if (q(chip, '.recit-v2-e047-jauge')) return;
  const t = texte(chip).toLocaleLowerCase('fr');
  let motif = '';
  if (t.indexOf('contest') >= 0 || t.indexOf('disputed') >= 0) motif = '▮▯▯▯';
  else if (t.indexOf('vérifié') >= 0 || t.indexOf('verifie') >= 0) motif = '▮▮▮▮';
  else if (t.indexOf('certain') >= 0) motif = '▮▮▮▯';
  else if (t.indexOf('probable') >= 0) motif = '▮▮▯▯';
  if (!motif) return;
  let jauge;
  try { jauge = fabrique('span', 'recit-v2-e047-jauge', motif); }
  catch { return; }
  if (!jauge) return;
  jauge.setAttribute('aria-hidden', 'true');
  chip.appendChild(jauge);
}

/* E047-03 — contraste du champ de recherche et de son texte indicatif, sans
   toucher à son aria-label, sa valeur ni son identifiant c3a-search. */
function chantier03(body) {
  ajouteClasse(q(body, '#c3a-search'), 'recit-v2-e047-search');
}

/* E047-04 — stabilise la lecture du compteur de filtres en chiffres tabulaires. */
function chantier04(body) {
  ajouteClasse(q(body, '#c3a-status'), 'recit-v2-e047-status');
}

/* E047-05 — code de forme par type de point : la classe est choisie d'après
   l'attribut data-kind réellement posé par la vue sur le bouton du fil. */
function chantier05(body) {
  const types = { récit: 'recit', figure: 'figure', lieu: 'lieu', audit: 'audit' };
  qa(body, '.c3a-thread-item .thread-kind').forEach((tag) => {
    const bouton = tag.parentElement;
    const brut = bouton && bouton.getAttribute ? bouton.getAttribute('data-kind') : '';
    const cle = types[brut]
      || (brut === 'point' ? '' : (types[String(brut || '').toLocaleLowerCase('fr')] || ''));
    if (cle) ajouteClasse(tag, `recit-v2-e047-kind--${cle}`);
    ajouteClasse(tag, 'recit-v2-e047-kind');
  });
}

/* E047-06 — numérotation ordinale du fil : pose la classe de compteur sur la
   liste réelle, le compteur CSS suit l'ordre des <li> après filtrage. */
function chantier06(body) {
  ajouteClasse(q(body, '#c3a-thread'), 'recit-v2-e047-fil');
}

/* E047-07 — filets de séparation au-dessus du fil et de la traçabilité pour
   rendre la hiérarchie perceptible sans couleur. */
function chantier07(body) {
  ajouteClasse(q(body, '.recit-thread'), 'recit-v2-e047-regle');
  ajouteClasse(q(body, 'details.recit-trace'), 'recit-v2-e047-regle');
}

/* E047-08 — plateau de lisibilité sous la légende et le crédit de l'image.
   Les deux paragraphes existants gardent leur texte et leur position. */
function chantier08(layout) {
  qa(layout, '.media-caption, .recit-media-credit')
    .forEach((n) => ajouteClasse(n, 'recit-v2-e047-plateau'));
}

/* E047-09 — survol des commandes : classe portée sur le conteneur, la règle
   cible les boutons non désactivés et n'altère ni `disabled` ni le focus. */
function chantier09(body) {
  ajouteClasse(q(body, '.recit-actions'), 'recit-v2-e047-actions');
}

/* E047-10 — bascule indépendante « texte large », aria-pressed, état mémorisé
   entre les rendus. Publie aussi la préférence de mouvement sur <html> sous un
   attribut propre à la V2, distinct de ceux des autres lentilles. */
function chantier10(root, body, fabrique, reducedMotion) {
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  if (document.documentElement) {
    const voulu = reduce ? 'reduce' : 'full';
    setOnce(document.documentElement, 'data-recit-v2-e047-motion', voulu);
    if (document.documentElement.getAttribute('data-recit-v2-e047-motion') !== voulu) {
      document.documentElement.setAttribute('data-recit-v2-e047-motion', voulu);
    }
  }

  if (texteLarge) ajouteClasse(root, 'recit-v2-e047-texte-large');
  else if (root && root.classList && typeof root.classList.remove === 'function') {
    root.classList.remove('recit-v2-e047-texte-large');
  }

  const actions = q(body, '.recit-actions');
  if (!actions || typeof actions.appendChild !== 'function') return;
  if (typeof fabrique !== 'function') return;
  if (typeof document !== 'undefined' && document.getElementById(BASCULE_ID)) return;

  let bouton;
  try {
    bouton = fabrique('button', 'recit-v2-e047-bascule',
      texteLarge ? 'Texte large : activé' : 'Texte large : désactivé');
  } catch { return; }
  if (!bouton) return;
  bouton.id = BASCULE_ID;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(texteLarge));
  bouton.addEventListener('click', () => {
    texteLarge = !texteLarge;
    try {
      bouton.setAttribute('aria-pressed', String(texteLarge));
      bouton.textContent = texteLarge ? 'Texte large : activé' : 'Texte large : désactivé';
      const racine = bouton.closest ? bouton.closest('.recit-v2-e047-racine') : null;
      if (racine && racine.classList) {
        racine.classList.toggle('recit-v2-e047-texte-large', texteLarge);
      }
    } catch { /* neutralisé */ }
  });
  actions.appendChild(bouton);
}

/* -- Point d'entrée unique ------------------------------------------------ */

register('E047', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !stage || !layout) return;
    safe(() => css('recit-v2-e047', RULES));

    const body = layout.querySelector('.recit-body');
    if (!body) return;
    safe(() => ajouteClasse(layout, 'recit-v2-e047-racine'));
    safe(() => chantier01(body));
    safe(() => chantier02(body, el));
    safe(() => chantier03(body));
    safe(() => chantier04(body));
    safe(() => chantier05(body));
    safe(() => chantier06(body));
    safe(() => chantier07(body));
    safe(() => chantier08(layout));
    safe(() => chantier09(body));
    safe(() => chantier10(layout, body, el, reducedMotion));
  } catch { /* neutralisé : la vue reste lisible et inchangée */ }
});
