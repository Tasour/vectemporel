import { register } from './registry.js';

/* Lentille E097 — Contraste et perception (vue Récit).
 *
 * Dix chantiers concrets et distincts (E097-01 … E097-10), détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E097.md. Greffon strictement additif : aucun
 * texte existant n'est retiré, aucun attribut préexistant n'est réécrit,
 * aucun contrôle de la vue n'est ré-attribué. Toutes les valeurs diffusées
 * sont soit des libellés d'interface, soit des rapports de contraste
 * recalculés par la formule WCAG depuis les jetons de couleur réellement
 * relevés dans la feuille de style — aucune donnée historique n'est
 * inventée, aucune ressource distante, aucun aléa, aucune journalisation.
 *
 * Un seul register('E097', …), un seul css('recit-e097', …) regroupant
 * toutes les règles, classes préfixées `recit-e097-`, ids préfixés `e097-`
 * et protégés contre le doublon. Chaque chantier est isolé : une défaillance
 * locale est neutralisée sans jamais interrompre le rendu de la vue.
 */

const CSS_ID = 'recit-e097';
const RACINE = 'recit-e097-root';

/* Bloc CSS unique, entièrement porté par la classe racine : aucune règle
   globale, aucune ressource distante, aucune police téléchargée. Aucune
   information n'est portée par la seule couleur (symboles + mots partout). */
const CSS = `
/* E097-01 — contraste des bordures et séparateurs (interface non textuelle). */
.recit-e097-root.recit-e097-bordures .recit-thread-item,
.recit-e097-root.recit-e097-bordures .recit-conf,
.recit-e097-root.recit-e097-bordures .recit-trace,
.recit-e097-root.recit-e097-bordures .recit-legend{border-color:var(--muted)}
.recit-e097-root.recit-e097-bordures .recit-thread-item.is-current{border-color:var(--gold-bright)}

/* E097-02 — piste de progression contrastée et crantée. */
.recit-e097-root .recit-e097-progress{
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.17) 0 1px,transparent 1px 9px),rgba(255,255,255,.15);
  box-shadow:inset 0 0 0 1px var(--muted);
}

/* E097-03 — contraste des micro-étiquettes. */
.recit-e097-root.recit-e097-micro .thread-kind,
.recit-e097-root.recit-e097-micro .recit-thread-title,
.recit-e097-root.recit-e097-micro .view-kicker,
.recit-e097-root.recit-e097-micro .recit-media-credit{color:var(--ink-soft)}

/* E097-04 — anneau de focus à fort contraste. */
.recit-e097-root.recit-e097-focus .recit-actions button:focus-visible,
.recit-e097-root.recit-e097-focus .c3a-filter:focus-visible,
.recit-e097-root.recit-e097-focus .c3a-reset:focus-visible,
.recit-e097-root.recit-e097-focus .c3a-search:focus-visible,
.recit-e097-root.recit-e097-focus .recit-thread-item:focus-visible,
.recit-e097-root.recit-e097-focus .recit-trace summary:focus-visible{
  outline:3px solid var(--gold-bright);outline-offset:3px;box-shadow:0 0 0 5px rgba(244,214,158,.28)
}

/* E097-05 — figure/fond : surfaces de lecture distinctes. */
.recit-e097-root.recit-e097-surfaces .recit-timing,
.recit-e097-root.recit-e097-surfaces .recit-legend,
.recit-e097-root.recit-e097-surfaces .recit-trace{
  background:rgba(255,255,255,.05);border-radius:6px;padding:6px 9px;
}

/* E097-06 — note de mesure des rapports de contraste. */
.recit-e097-note{
  margin:8px 0 0;padding:7px 9px;border-left:2px solid var(--gold);border-radius:0 6px 6px 0;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;line-height:1.55;
  font-variant-numeric:tabular-nums;
}
.recit-e097-note strong{color:var(--gold-bright)}

/* E097-07 — bascule « contraste maximal ». */
.recit-e097-btn{
  min-height:36px;padding:0 11px;border:1px solid var(--line-strong);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.recit-e097-btn[aria-pressed="true"]{border-color:var(--gold-bright);color:var(--gold-bright);background:rgba(244,214,158,.14)}
.recit-e097-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e097-root.recit-e097-contraste-max .recit-context,
.recit-e097-root.recit-e097-contraste-max .recit-timing,
.recit-e097-root.recit-e097-contraste-max .recit-sources,
.recit-e097-root.recit-e097-contraste-max .recit-legend,
.recit-e097-root.recit-e097-contraste-max .recit-meta,
.recit-e097-root.recit-e097-contraste-max .recit-thread-item:not(.is-current),
.recit-e097-root.recit-e097-contraste-max .thread-kind,
.recit-e097-root.recit-e097-contraste-max .recit-thread-title,
.recit-e097-root.recit-e097-contraste-max .view-kicker,
.recit-e097-root.recit-e097-contraste-max .recit-media-credit{color:var(--ink)}
.recit-e097-root.recit-e097-contraste-max .recit-thread-item,
.recit-e097-root.recit-e097-contraste-max .recit-conf,
.recit-e097-root.recit-e097-contraste-max .recit-trace,
.recit-e097-root.recit-e097-contraste-max .recit-legend{border-color:var(--ink)}
.recit-e097-root.recit-e097-contraste-max .recit-progress>span{background:var(--gold-bright)}
.recit-e097-root.recit-e097-contraste-max .recit-thread-item.is-current{background:rgba(244,214,158,.2);border-color:var(--gold-bright)}

/* E097-08 — signal système de préférence de contraste (note distincte). */
.recit-e097-signal{color:var(--gold-bright);font-weight:700}

/* E097-09 — renfort perceptif du point courant dans le fil. */
.recit-e097-root.recit-e097-courant .recit-thread-item[aria-current="step"]{
  border-left-width:3px;background:rgba(244,214,158,.16);color:var(--gold-bright);
}
.recit-e097-root.recit-e097-courant .recit-thread-item[aria-current="step"]::before{content:"▶ ";font-weight:700}

/* E097-10 — confort perceptif : mouvement réduit. */
.recit-e097-root.recit-e097-reduit .recit-e097-btn,
.recit-e097-root.recit-e097-reduit .recit-e097-progress,
.recit-e097-root.recit-e097-reduit.recit-e097-courant .recit-thread-item{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e097-btn,.recit-e097-progress{transition:none}
}
`;

/* État de la bascule : survit aux reconstructions du DOM par la coque.
   `null` signifie « pas encore initialisé » (premier rendu). */
let contrasteActif = null;

/* --- utilitaires de lecture et d'écriture, tous gardés ------------------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function txt(node) {
  return String((node && node.textContent) || '');
}

function present(node) {
  return Boolean(node && node.nodeType === 1);
}

function add(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function remove(node, className) {
  if (present(node) && node.classList && typeof node.classList.remove === 'function') {
    node.classList.remove(className);
  }
}

function setOnce(node, name, value) {
  if (present(node) && typeof node.hasAttribute === 'function'
      && !node.hasAttribute(name)) node.setAttribute(name, value);
}

function deja(id) {
  return typeof document !== 'undefined' && Boolean(document.getElementById(id));
}

function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Insère (ou rafraîchit) un paragraphe unique juste après un nœud repère,
   avec repli en fin de corps. Ne déplace aucun nœud préexistant. */
function note(donnees, id, className, texte) {
  if (typeof document === 'undefined') return null;
  const { body, el } = donnees;
  if (!present(body) || typeof el !== 'function') return null;
  let noeud = document.getElementById(id);
  if (noeud) {
    noeud.textContent = texte;
    return noeud;
  }
  noeud = el('p', className, texte);
  noeud.id = id;
  if (present(donnees.apres) && donnees.apres.parentNode
      && typeof donnees.apres.parentNode.insertBefore === 'function') {
    donnees.apres.parentNode.insertBefore(noeud, donnees.apres.nextSibling);
  } else if (typeof body.appendChild === 'function') {
    body.appendChild(noeud);
  }
  return noeud;
}

/* --- calcul déterministe des rapports de contraste (formule WCAG) -------- */

function hexRgb(valeur) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(valeur || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb) {
  if (!rgb) return null;
  const canaux = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];
}

function rapport(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const haut = Math.max(la, lb);
  const bas = Math.min(la, lb);
  return (haut + 0.05) / (bas + 0.05);
}

function jeton(nom, repli) {
  try {
    const brut = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return hexRgb(brut) ? brut : repli;
  } catch {
    return repli;
  }
}

function francise(nombre) {
  return Number(nombre).toFixed(1).replace('.', ',');
}

function qualifie(ratio, seuil) {
  if (ratio === null) return 'non calculable';
  return ratio >= seuil ? 'conforme' : 'insuffisant';
}

/* Applique l'état de contraste maximal à la racine et synchronise le bouton. */
function appliqueContraste(donnees) {
  const { layout } = donnees;
  if (present(layout) && typeof layout.setAttribute === 'function') {
    layout.setAttribute('data-e097-contraste', contrasteActif ? 'maximal' : 'normal');
  }
  if (contrasteActif) add(layout, 'recit-e097-contraste-max');
  else remove(layout, 'recit-e097-contraste-max');
  const bouton = deja('e097-toggle') ? document.getElementById('e097-toggle') : null;
  if (present(bouton)) {
    const libelle = contrasteActif
      ? 'Contraste maximal : désactiver' : 'Contraste maximal : activer';
    bouton.textContent = libelle;
    bouton.setAttribute('aria-label', libelle);
    bouton.setAttribute('aria-pressed', contrasteActif ? 'true' : 'false');
  }
}

/* --- les dix chantiers ---------------------------------------------------- */

/* E097-01 — bordures et séparateurs portés à un contraste non textuel
   suffisant : la forme des contrôles reste perceptible sans la couleur. */
function chantier01(d) {
  add(d.layout, 'recit-e097-bordures');
}

/* E097-02 — piste de progression crantée : la position est lisible par la
   texture des graduations, pas seulement par la teinte du remplissage. */
function chantier02(d) {
  add(d.progress, 'recit-e097-progress');
}

/* E097-03 — micro-étiquettes (type du fil, titre du fil, kicker, crédit
   d'image) remontées du gris atténué vers l'encre douce. */
function chantier03(d) {
  add(d.layout, 'recit-e097-micro');
}

/* E097-04 — anneau de focus épaissi et halo : le point d'attention est
   perceptible même sur fond clair ou pour une vision sensible. */
function chantier04(d) {
  add(d.layout, 'recit-e097-focus');
}

/* E097-05 — figure/fond : les blocs secondaires reçoivent une surface
   légèrement distincte, sans masquer ni déplacer leur contenu. */
function chantier05(d) {
  add(d.layout, 'recit-e097-surfaces');
}

/* E097-06 — mesure chiffrée : rapports WCAG recalculés depuis les jetons
   de couleur relevés, comparés aux références 3:1 et 4,5:1. */
function chantier06(d) {
  const fond = hexRgb(jeton('--bg', '#070a0e'));
  const titre = hexRgb(jeton('--ink', '#f2ede3'));
  const courant = hexRgb(jeton('--ink-soft', '#d7d1c6'));
  const secondaire = hexRgb(jeton('--muted-2', '#8c8d91'));
  const rTitre = rapport(titre, fond);
  const rCourant = rapport(courant, fond);
  const rSecond = rapport(secondaire, fond);
  const texte = 'Contraste mesuré (formule WCAG, fond de la vue) : '
    + `titre <strong>${rTitre === null ? '—' : francise(rTitre) + ' : 1'}</strong> (réf. 3 : 1, texte large — ${qualifie(rTitre, 3)}) · `
    + `texte courant <strong>${rCourant === null ? '—' : francise(rCourant) + ' : 1'}</strong> (réf. 4,5 : 1 — ${qualifie(rCourant, 4.5)}) · `
    + `mention secondaire <strong>${rSecond === null ? '—' : francise(rSecond) + ' : 1'}</strong> (réf. 4,5 : 1 — ${qualifie(rSecond, 4.5)}).`;
  const noeud = note(d, 'e097-ratio', 'recit-e097-note', '');
  if (!present(noeud)) return;
  /* Le texte est bâti en fragments pour mettre en évidence les chiffres. */
  noeud.textContent = '';
  const parties = texte.split(/(<strong>.*?<\/strong>)/);
  parties.forEach((partie) => {
    const m = /^<strong>(.*?)<\/strong>$/.exec(partie);
    if (m) {
      noeud.appendChild(d.el('strong', '', m[1]));
    } else if (partie) {
      noeud.appendChild(document.createTextNode(partie));
    }
  });
}

/* E097-07 — bascule « contraste maximal » : l'utilisateur force l'encre
   pleine et des bordures franches, de façon réversible et persistante. */
function chantier07(d) {
  const { actions, el } = d;
  if (!present(actions) || typeof el !== 'function') return;
  let bouton = deja('e097-toggle') ? document.getElementById('e097-toggle') : null;
  if (!present(bouton) || bouton.parentElement !== actions) {
    bouton = el('button', 'recit-e097-btn');
    bouton.id = 'e097-toggle';
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  if (bouton.getAttribute('data-e097-bound') !== '1') {
    bouton.setAttribute('data-e097-bound', '1');
    bouton.addEventListener('click', () => {
      contrasteActif = !contrasteActif;
      appliqueContraste({ layout: document.querySelector('.recit-e097-root') });
    });
  }
  appliqueContraste(d);
}

/* E097-08 — préférence système `prefers-contrast` : signal enregistré dans
   le DOM et, au premier rendu seulement, activation du contraste maximal. */
function chantier08(d) {
  let fort = false;
  try {
    fort = Boolean(window.matchMedia
      && window.matchMedia('(prefers-contrast: more)').matches);
  } catch {
    fort = false;
  }
  if (present(d.layout) && typeof d.layout.setAttribute === 'function') {
    d.layout.setAttribute('data-e097-signal', fort ? 'renforce' : 'normal');
  }
  if (contrasteActif === null) contrasteActif = fort;
  if (fort) {
    note(d, 'e097-signal', 'recit-e097-note',
      'Préférence système détectée : contraste renforcé demandé par votre environnement.');
    const signal = q(document, '#e097-signal');
    if (present(signal)) add(signal, 'recit-e097-signal');
  }
  appliqueContraste(d);
}

/* E097-09 — item courant du fil : marqueur textuel « ▶ » et bordure
   renforcée, en complément de l'attribut aria-current déjà présent. */
function chantier09(d) {
  add(d.layout, 'recit-e097-courant');
  qa(d.layout, '.recit-thread-item[aria-current="step"]').forEach((item) => {
    setOnce(item, 'data-e097-courant', '1');
  });
}

/* E097-10 — mouvement réduit : les seules transitions de la lentille sont
   neutralisées quand la préférence est active ; état exposé dans le DOM. */
function chantier10(d) {
  let reduit = false;
  try { reduit = Boolean(typeof d.reducedMotion === 'function' && d.reducedMotion()); }
  catch { reduit = false; }
  if (reduit) add(d.layout, 'recit-e097-reduit');
  else remove(d.layout, 'recit-e097-reduit');
  if (present(d.layout) && typeof d.layout.setAttribute === 'function') {
    d.layout.setAttribute('data-e097-motion', reduit ? 'reduit' : 'normal');
  }
}

register('E097', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
  const racine = present(layout) ? layout
    : (present(stage) && typeof stage.querySelector === 'function' ? stage : null);
  if (!racine) return;

  safe(() => { if (typeof css === 'function') css(CSS_ID, CSS); });
  add(layout, RACINE);

  const corps = q(racine, '.recit-body');
  const donnees = {
    stage,
    layout,
    el,
    reducedMotion,
    body: corps,
    progress: q(racine, '.recit-progress'),
    timing: q(racine, '.recit-timing'),
    actions: q(racine, '.recit-actions'),
    apres: q(racine, '.recit-timing') || corps,
  };

  safe(() => chantier01(donnees));
  safe(() => chantier02(donnees));
  safe(() => chantier03(donnees));
  safe(() => chantier04(donnees));
  safe(() => chantier05(donnees));
  safe(() => chantier06(donnees));
  safe(() => chantier08(donnees)); /* initialise l'état avant la bascule */
  safe(() => chantier07(donnees));
  safe(() => chantier09(donnees));
  safe(() => chantier10(donnees));
});
