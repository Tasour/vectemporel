import { register } from './registry.js';

/* Lentille E009 — Robustesse et garde-fous des soleils de la vue Constellation.
 *
 * Rapport : UNIFIED_AUDIT/CONSTELLATION/views/E009.md — chantiers E009-01 à E009-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/constellation.js, ni registry.js, ni index.js, ni styles.css.
 *
 * Cible : les boutons .const-sun rendus par constellation.js (un par ère), avec
 * leurs variables --x / --y / --era, leurs attributs data-const-key, title,
 * aria-label et aria-current. La lentille ne remplace aucun contrôle : elle
 * borde, répare, désambiguïse et scelle le DOM déjà présent.
 *
 * Contrat : register("E009", ctx => { … }) avec
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
 * ctx.layout est vérifié avant tout ajout DOM ; une seule feuille CSS est
 * injectée sous l'identifiant constellation-e009. Tous les IDs DOM créés
 * portent le préfixe e009-. Zéro appel réseau, zéro aléa, zéro sortie console,
 * aucune minuterie ni boucle d'animation propre, aucune écriture HTML brute.
 */

const CSS_ID = 'constellation-e009'; // feuille unique, injectée une seule fois
const AUDIT_ID = 'e009-robustesse-audit';
const ACTIVE = 'data-e009-on';

const CSS = `
  .constellation-layout[data-e009-on] .const-sun {
    transform: translate(-50%, -50%) scale(var(--e009-scale, 1));
    min-width: 42px;
    min-height: 42px;
  }
  .constellation-layout[data-e009-on] .const-sun.e009-petite-cible {
    min-width: 44px;
    min-height: 44px;
  }
  .constellation-layout[data-e009-on] .const-sun.e009-crowded {
    box-shadow: 0 0 0 1px rgba(255, 242, 210, .8);
  }
  .constellation-layout[data-e009-on] .const-sun.e009-color-fallback {
    border-style: dashed;
  }
  .constellation-layout[data-e009-on] .const-sun.e009-halo {
    color: #fff2d2;
    text-shadow: 0 1px 3px rgba(0, 0, 0, .95);
  }
  .constellation-layout[data-e009-on] .const-sun:focus-visible {
    outline: 2px solid #e6b96f;
    outline-offset: 3px;
  }
  .constellation-layout[data-e009-on] .e009-audit { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout[data-e009-on] .const-sun { transition: none; }
  }
`;

const PALETTE = ['#e6b96f', '#b28bdd', '#7fb2d9', '#8fc9a6', '#d9968f', '#c9b06b'];
const NOMS = new Set(['gold', 'violet', 'blue', 'green', 'red', 'orange', 'white', 'black', 'transparent', 'none']);
const layersGuarded = new WeakSet();

function lireVar(node, nom) {
  try { return String(node.style.getPropertyValue(nom) || '').trim(); }
  catch { return ''; }
}

function ecrireVar(node, nom, valeur) {
  try { node.style.setProperty(nom, valeur); return true; }
  catch { return false; }
}

function nombre(node, nom, secours) {
  const valeur = parseFloat(lireVar(node, nom));
  return Number.isFinite(valeur) ? valeur : secours;
}

function positionSecours(index, total) {
  const rayon = total > 1 ? 22 : 0;
  const radians = (index * 360 / Math.max(1, total) - 90) * Math.PI / 180;
  return {
    x: Math.max(12, Math.min(88, 50 + rayon * Math.cos(radians))),
    y: Math.max(14, Math.min(86, 50 + rayon * Math.sin(radians))),
  };
}

function couleurValide(valeur) {
  if (!valeur) return false;
  if (valeur.startsWith('var(') || valeur.startsWith('rgb(') || valeur.startsWith('hsl(')) return true;
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(valeur)) return true;
  return NOMS.has(valeur.toLowerCase());
}

function luminance(couleur) {
  const brut = String(couleur || '').trim();
  const hex = brut.replace(/^#/, '');
  let r;
  let g;
  let b;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    const rgbs = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(brut);
    if (!rgbs) return null;
    r = Number(rgbs[1]);
    g = Number(rgbs[2]);
    b = Number(rgbs[3]);
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function centre(sun) {
  let rect = null;
  try { rect = sun.getBoundingClientRect(); }
  catch { rect = null; }
  if (rect && rect.width > 0 && rect.height > 0) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  /* Repli géométrique déterministe si le champ n'est pas encore mesurable. */
  return {
    x: nombre(sun, '--x', 50) / 100 * 800,
    y: nombre(sun, '--y', 50) / 100 * 500,
  };
}

/* E009-01 — Bornage des positions : --x/--y invalides ou hors champ ramenés
   dans [10,90] / [12,88], avec repli circulaire calculé depuis l'index. */
function bornerPositions(soleils) {
  let corrections = 0;
  soleils.forEach((sun, index) => {
    const x = nombre(sun, '--x', Number.NaN);
    const y = nombre(sun, '--y', Number.NaN);
    const xValide = Number.isFinite(x) && x >= 10 && x <= 90;
    const yValide = Number.isFinite(y) && y >= 12 && y <= 88;
    if (xValide && yValide) return;
    const repli = positionSecours(index, soleils.length);
    const nx = Number.isFinite(x) ? Math.max(10, Math.min(90, x)) : repli.x;
    const ny = Number.isFinite(y) ? Math.max(12, Math.min(88, y)) : repli.y;
    ecrireVar(sun, '--x', `${nx.toFixed(2)}%`);
    ecrireVar(sun, '--y', `${ny.toFixed(2)}%`);
    sun.setAttribute('data-e009-borne', '1');
    corrections += 1;
  });
  return corrections;
}

/* E009-02 — Anti-chevauchement : deux centres à moins de 48 px sont rapprochés,
   marqués .e009-crowded et réduits via --e009-scale (au plus 0,72). */
function parerChevauchements(soleils, field) {
  const centres = soleils.map((sun) => centre(sun));
  const contacts = new Array(soleils.length).fill(0);
  let paires = 0;
  for (let i = 0; i < centres.length; i += 1) {
    for (let j = i + 1; j < centres.length; j += 1) {
      const dx = centres[i].x - centres[j].x;
      const dy = centres[i].y - centres[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 48) {
        contacts[i] += 1;
        contacts[j] += 1;
        paires += 1;
      }
    }
  }
  let touches = 0;
  soleils.forEach((sun, index) => {
    if (!contacts[index]) return;
    const echelle = Math.max(0.72, 1 - contacts[index] * 0.12);
    ecrireVar(sun, '--e009-scale', echelle.toFixed(2));
    sun.classList.add('e009-crowded');
    sun.setAttribute('data-e009-overlap', String(contacts[index]));
    touches += 1;
  });
  if (field) field.setAttribute('data-e009-paires', String(paires));
  return touches;
}

/* E009-03 — Couleur de secours : --era absent ou non reconnu reçoit une teinte
   de la palette, indexée par rang, et un marqueur visuel en pointillé. */
function secourirCouleur(soleils) {
  let secours = 0;
  soleils.forEach((sun, index) => {
    if (couleurValide(lireVar(sun, '--era'))) return;
    ecrireVar(sun, '--era', PALETTE[index % PALETTE.length]);
    sun.classList.add('e009-color-fallback');
    sun.setAttribute('data-e009-color', 'secours');
    secours += 1;
  });
  return secours;
}

/* E009-04 — aria-current unique : aligné sur .is-active, ou sur le premier
   soleil à défaut d'ère active ; les aria-current parasites sont retirés. */
function unifierAriaCurrent(soleils) {
  if (!soleils.length) return 0;
  let changements = 0;
  const actif = soleils.find((sun) => sun.classList.contains('is-active')) || null;
  const cible = actif || soleils[0];
  soleils.forEach((sun) => {
    const doit = sun === cible;
    const courant = sun.getAttribute('aria-current');
    if (doit && courant !== 'true') {
      sun.setAttribute('aria-current', 'true');
      changements += 1;
    } else if (!doit && courant) {
      sun.removeAttribute('aria-current');
      changements += 1;
    }
  });
  return changements;
}

/* E009-05 — Nom accessible de secours : aria-label ou title vidé est reconstruit
   depuis data-label, title, texte ou « Ère n° » ; les doublons sont suffixés. */
function nommerSoleils(soleils) {
  let corrections = 0;
  const vus = new Map();
  soleils.forEach((sun, index) => {
    const initial = String(sun.getAttribute('aria-label') || '').trim();
    const base = initial
      || String(sun.dataset.label || '').trim()
      || String(sun.getAttribute('title') || '').trim()
      || String(sun.textContent || '').trim()
      || `Ère n°${index + 1}`;
    const doublon = vus.get(base) || 0;
    const label = doublon ? `${base} (ère n°${index + 1})` : base;
    vus.set(base, doublon + 1);
    if (initial !== label) {
      sun.setAttribute('aria-label', label);
      corrections += 1;
    }
    if (!String(sun.getAttribute('title') || '').trim()) {
      sun.setAttribute('title', label);
      corrections += 1;
    }
  });
  return corrections;
}

/* E009-06 — Clés de focus uniques : une data-const-key vide ou dupliquée est
   remplacée par sun:<rang> (ou e009-sun:<rang> en cas de collision). */
function clefsUniques(soleils) {
  const vues = new Set();
  let corrections = 0;
  soleils.forEach((sun, index) => {
    const cle = String(sun.dataset.constKey || '').trim();
    if (cle && !vues.has(cle)) {
      vues.add(cle);
      sun.setAttribute('data-e009-key', cle);
      return;
    }
    let proposition = cle || `sun:${index}`;
    let suffixe = 1;
    while (vues.has(proposition)) {
      proposition = `e009-sun:${index}-${suffixe}`;
      suffixe += 1;
    }
    sun.dataset.constKey = proposition;
    vues.add(proposition);
    sun.setAttribute('data-e009-key', proposition);
    corrections += 1;
  });
  return corrections;
}

/* E009-07 — Plancher tactile : toute cible mesurée sous 44 px (ou non mesurable)
   reçoit .e009-petite-cible, que la feuille E009 élargit à 44 px. */
function ciblesTactiles(soleils) {
  let touches = 0;
  soleils.forEach((sun) => {
    let rect = null;
    try { rect = sun.getBoundingClientRect(); }
    catch { rect = null; }
    const petit = !rect || rect.width === 0 || Math.min(rect.width, rect.height) < 44;
    if (!petit) {
      sun.setAttribute('data-e009-cible', 'ok');
      return;
    }
    sun.classList.add('e009-petite-cible');
    sun.setAttribute('data-e009-cible', 'sous-44');
    touches += 1;
  });
  return touches;
}

/* E009-08 — Halo de lisibilité : luminance calculée depuis --era ; en dessous
   de 0,45 (ou couleur illisible), le chiffre du soleil reçoit .e009-halo. */
function haloContraste(soleils) {
  let touches = 0;
  soleils.forEach((sun) => {
    const clarté = luminance(lireVar(sun, '--era'));
    if (clarté !== null && clarté >= 0.45) return;
    sun.classList.add('e009-halo');
    sun.setAttribute('data-e009-halo', clarté === null ? 'inconnu' : 'sombre');
    touches += 1;
  });
  return touches;
}

/* E009-09 — Garde-fou clavier : un seul écouteur délégué par couche (WeakSet),
   Home/End focalisent le premier/dernier soleil, focusin pose son marqueur. */
function garderFocusClavier(layer, soleils) {
  if (!layer || typeof layer.addEventListener !== 'function') return 0;
  if (!layersGuarded.has(layer)) {
    layersGuarded.add(layer);
    layer.addEventListener('keydown', (event) => {
      if (event.key !== 'Home' && event.key !== 'End') return;
      const cibles = typeof layer.querySelectorAll === 'function'
        ? Array.from(layer.querySelectorAll('.const-sun')) : [];
      if (!cibles.length) return;
      if (typeof event.preventDefault === 'function') event.preventDefault();
      const cible = event.key === 'Home' ? cibles[0] : cibles[cibles.length - 1];
      if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
    });
    layer.addEventListener('focusin', (event) => {
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('.const-sun') : null;
      if (cible && layer.contains(cible)) cible.setAttribute('data-e009-focus', '1');
    });
  }
  layer.setAttribute('data-e009-keyguard', 'on');
  soleils.forEach((sun) => {
    if (!sun.hasAttribute('tabindex')) sun.setAttribute('tabindex', '0');
  });
  return 1;
}

/* E009-10 — Sceau auditable : compteurs sur le layout et panneau #e009-audit…,
   recréé de façon idempotente avec un récapitulatif en texte réel. */
function scellerAudit(ctx, counts, total, soleils) {
  if (ctx.layout && ctx.layout.dataset) {
    ctx.layout.dataset.e009Robustesse = String(total);
    ctx.layout.dataset.e009Checks = counts
      .map((n, index) => `${String(index + 1).padStart(2, '0')}:${n}`).join(' ');
  }
  let panneau = document.getElementById(AUDIT_ID);
  if (!panneau || panneau.parentNode !== ctx.layout) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = ctx.el('section', 'e009-audit');
    panneau.id = AUDIT_ID;
    panneau.setAttribute('aria-label', `Audit de robustesse des soleils · ${CSS_ID}`);
    ctx.layout.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  const calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  panneau.appendChild(ctx.el('h3', 'e009-audit-titre', 'Robustesse des soleils — E009'));
  panneau.appendChild(ctx.el('p', 'e009-audit-ligne',
    `${soleils.length} soleil(s) examiné(s) · ${total} effet(s) · `
    + `${counts.filter((n) => n > 0).length} chantier(s) actif(s).`));
  counts.forEach((n, index) => {
    panneau.appendChild(ctx.el('p', 'e009-audit-ligne',
      `E009-${String(index + 1).padStart(2, '0')} : ${n} effet(s).`));
  });
  panneau.appendChild(ctx.el('p', 'e009-audit-ligne',
    `Mouvement réduit : ${calme ? 'actif' : 'inactif'} · aucune animation ajoutée.`));
}

register('E009', (ctx) => {
  /* Contrat : ctx.layout est exigé avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof document === 'undefined') return;

  const layout = ctx.layout;
  const soleils = Array.from(layout.querySelectorAll('.const-sun'));
  const field = layout.querySelector('.constellation-field');
  const layer = layout.querySelector('.const-layer-suns') || field;

  layout.setAttribute(ACTIVE, 'on');
  ctx.css('constellation-e009', CSS);

  const etapes = [
    () => bornerPositions(soleils),
    () => parerChevauchements(soleils, field),
    () => secourirCouleur(soleils),
    () => unifierAriaCurrent(soleils),
    () => nommerSoleils(soleils),
    () => clefsUniques(soleils),
    () => ciblesTactiles(soleils),
    () => haloContraste(soleils),
    () => garderFocusClavier(layer, soleils),
  ];
  const counts = etapes.map((etape) => {
    try { return Math.max(0, Number(etape()) || 0); }
    catch { return 0; }
  });
  counts.push(1); // E009-10 : le panneau et le sceau sont produits à chaque passe.
  const total = counts.reduce((somme, n) => somme + n, 0);
  try { scellerAudit(ctx, counts, total, soleils); }
  catch { /* greffon tolérant : un rendu partiel reste lisible. */ }
});
