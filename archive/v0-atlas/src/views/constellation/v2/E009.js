import { register } from './registry.js';

/* Lentille V2 E009 — robustesse et garde-fous des soleils de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau, sans
   source aléatoire et sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e009 (aucune collision avec la passe 1 e009-). */

const CSS_ID = 'constellation-v2-e009';
const AUDIT_ID = 'v2e009-audit';
const LIVE_ID = 'v2e009-live';
const ACTIVE = 'data-v2e009-on';
const LIMITE_LIBELLE = 36;

const CSS = `
.v2e009-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.const-sun.v2e009-long::after{content:attr(data-v2e009-court)}
.const-sun.v2e009-teinte-partagee{box-shadow:inset 0 -3px 0 0 rgba(230,185,111,.9)}
.constellation-layout[data-v2e009-on] .const-sun:focus-visible{outline:2px solid #e6b96f;outline-offset:3px}
.constellation-layout[data-v2e009-on] .v2e009-audit{display:none}
`;

function lireVar(node, nom) {
  try { return String(node.style.getPropertyValue(nom) || '').trim(); }
  catch { return ''; }
}

function nombre(node, nom) {
  const brut = parseFloat(lireVar(node, nom));
  return Number.isFinite(brut) ? brut : Number.NaN;
}

function nettoyer(texte) {
  return String(texte == null ? '' : texte)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function creerNode(ctx, tag, className, texte) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, texte);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (texte !== undefined) node.textContent = texte;
  return node;
}

function annees(label) {
  const source = String(label || '').split('·').pop() || '';
  const resultat = [];
  const motif = /(\d+)\s*(av\.\s*J\.-C\.)?/g;
  let trouve = null;
  while (resultat.length < 2 && (trouve = motif.exec(source)) !== null) {
    resultat.push(trouve[2] ? -Number(trouve[1]) : Number(trouve[1]));
  }
  return resultat;
}

function assurerTypeBouton(soleils) {
  let corrections = 0;
  soleils.forEach((sun) => {
    if (String(sun.getAttribute('type') || '').toLowerCase() === 'button') {
      sun.setAttribute('data-v2e009-type', 'natif');
      return;
    }
    try { sun.setAttribute('type', 'button'); }
    catch { return; }
    sun.setAttribute('data-v2e009-type', 'repare');
    corrections += 1;
  });
  return corrections;
}

function assainirLibelles(soleils) {
  let corrections = 0;
  const attributs = ['data-label', 'aria-label', 'title'];
  soleils.forEach((sun) => {
    attributs.forEach((attribut) => {
      const brut = sun.getAttribute(attribut);
      if (brut == null) return;
      const propre = nettoyer(brut);
      if (propre === brut) return;
      sun.setAttribute(attribut, propre);
      corrections += 1;
    });
  });
  return corrections;
}

function compacterLibelles(soleils) {
  let touches = 0;
  soleils.forEach((sun) => {
    const label = nettoyer(sun.getAttribute('data-label') || sun.getAttribute('aria-label') || '');
    if (label.length <= LIMITE_LIBELLE) {
      sun.removeAttribute('data-v2e009-court');
      sun.classList.remove('v2e009-long');
      return;
    }
    const court = `${label.slice(0, LIMITE_LIBELLE - 1).trimEnd()}…`;
    sun.setAttribute('data-v2e009-court', court);
    sun.classList.add('v2e009-long');
    touches += 1;
  });
  return touches;
}

function desambiguiserTeintes(soleils) {
  const vus = new Map();
  let touches = 0;
  soleils.forEach((sun) => {
    const couleur = lireVar(sun, '--era').toLowerCase();
    if (!couleur) {
      sun.removeAttribute('data-v2e009-teinte-partagee');
      sun.classList.remove('v2e009-teinte-partagee');
      return;
    }
    const occurrence = (vus.get(couleur) || 0) + 1;
    vus.set(couleur, occurrence);
    if (occurrence === 1) {
      sun.removeAttribute('data-v2e009-teinte-partagee');
      sun.classList.remove('v2e009-teinte-partagee');
      return;
    }
    sun.setAttribute('data-v2e009-teinte-partagee', String(occurrence));
    sun.classList.add('v2e009-teinte-partagee');
    const label = sun.getAttribute('aria-label') || '';
    if (label.toLowerCase().indexOf('teinte partagee') === -1) {
      sun.setAttribute('aria-label', `${label} — teinte partagée, occurrence ${occurrence}`);
    }
    touches += 1;
  });
  return touches;
}

function signalerDensite(champ, soleils, details) {
  const total = soleils.length;
  const niveau = total === 0 ? 'vide' : (total <= 8 ? 'faible' : (total <= 16 ? 'moyen' : 'eleve'));
  if (champ && champ.dataset) champ.dataset.v2e009Densite = niveau;
  details.push(`Densité du champ : ${niveau} (${total} soleil${total > 1 ? 's' : ''}).`);
  return niveau === 'eleve' ? 1 : 0;
}

function verifierDates(soleils, details) {
  let anomalies = 0;
  soleils.forEach((sun) => {
    const deux = annees(sun.getAttribute('data-label') || sun.getAttribute('title') || '');
    if (deux.length < 2) {
      sun.removeAttribute('data-v2e009-dates');
      return;
    }
    const coherente = deux[1] >= deux[0];
    sun.setAttribute('data-v2e009-dates', coherente ? 'coherente' : 'incoherente');
    if (!coherente) anomalies += 1;
  });
  details.push(`Plages de dates incohérentes : ${anomalies}.`);
  return anomalies;
}

function detecterMasques(soleils, details) {
  let masques = 0;
  soleils.forEach((sun) => {
    let masque = false;
    try {
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const style = window.getComputedStyle(sun);
        if (style && (style.display === 'none' || style.visibility === 'hidden'
            || Number(style.opacity) === 0)) masque = true;
      }
    } catch { masque = false; }
    if (!masque && sun.style) {
      masque = sun.style.display === 'none' || sun.style.visibility === 'hidden'
        || sun.style.opacity === '0';
    }
    if (masque) {
      sun.setAttribute('data-v2e009-masque', '1');
      masques += 1;
    } else {
      sun.removeAttribute('data-v2e009-masque');
    }
  });
  details.push(`Soleils visuellement masqués : ${masques}.`);
  return masques;
}

function calculerIntegrite(soleils, layout, details) {
  const champs = ['type', 'data-label', 'aria-label', 'title', '--x', '--y', '--era', 'data-const-key'];
  let points = 0;
  soleils.forEach((sun) => {
    champs.forEach((champ) => {
      if (champ === '--x' || champ === '--y') {
        if (Number.isFinite(nombre(sun, champ))) points += 1;
        return;
      }
      const brut = champ.indexOf('--') === 0
        ? lireVar(sun, champ)
        : String(sun.getAttribute(champ) || '').trim();
      if (brut) points += 1;
    });
  });
  const maximum = soleils.length * champs.length;
  const score = maximum > 0 ? Math.round(points / maximum * 100) : 0;
  if (layout && layout.dataset) layout.dataset.v2e009Integrite = String(score);
  details.push(`Indice d'intégrité : ${score} % (${points}/${maximum} champs renseignés).`);
  return score;
}

function reparerRangs(soleils, details) {
  let reparation = 0;
  const total = soleils.length;
  soleils.forEach((sun, index) => {
    const texte = String(sun.textContent || '').trim();
    const attendu = String(index + 1);
    const valide = /^\d+$/.test(texte) && Number(texte) >= 1 && Number(texte) <= total;
    if (valide && texte === attendu) {
      sun.removeAttribute('data-v2e009-rang');
      return;
    }
    try { sun.textContent = attendu; }
    catch { return; }
    sun.setAttribute('data-v2e009-rang', `${texte || 'vide'} vers ${attendu}`);
    reparation += 1;
  });
  details.push(`Numéros de rang réparés : ${reparation}.`);
  return reparation;
}

function scellerDiagnostic(ctx, counts, details, soleils) {
  const layout = ctx.layout;
  if (layout && layout.dataset) {
    layout.dataset.v2e009Checks = counts
      .map((n, index) => `${String(index + 1).padStart(2, '0')}:${n}`).join(' ');
    layout.dataset.v2e009Robustesse = String(counts.reduce((somme, n) => somme + n, 0));
  }

  let panneau = document.getElementById(AUDIT_ID);
  if (!panneau || panneau.parentNode !== layout) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = creerNode(ctx, 'section', 'v2e009-audit', '');
    panneau.id = AUDIT_ID;
    panneau.setAttribute('aria-label', 'Diagnostic V2 de robustesse des soleils');
    layout.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  panneau.appendChild(creerNode(ctx, 'h3', 'v2e009-audit-titre', 'Robustesse V2 des soleils — E009'));
  panneau.appendChild(creerNode(ctx, 'p', 'v2e009-audit-ligne',
    `${soleils.length} soleil(s) examiné(s) · ${counts.length} contrôles appliqués.`));
  details.forEach((ligne) => {
    panneau.appendChild(creerNode(ctx, 'p', 'v2e009-audit-ligne', ligne));
  });
  counts.forEach((n, index) => {
    panneau.appendChild(creerNode(ctx, 'p', 'v2e009-audit-ligne',
      `E009-${String(index + 1).padStart(2, '0')} : ${n} effet(s).`));
  });

  let live = document.getElementById(LIVE_ID);
  if (!live || live.parentNode !== layout) {
    if (live && live.parentNode) live.parentNode.removeChild(live);
    live = creerNode(ctx, 'p', 'v2e009-sr', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const integrite = layout && layout.dataset ? layout.dataset.v2e009Integrite : '?';
  const actifs = counts.filter((n) => n > 0).length;
  live.textContent = `Diagnostic V2 des soleils : ${soleils.length} soleil(s), `
    + `${actifs} contrôle(s) actif(s), intégrité ${integrite} %.`;
}

register('E009', (ctx) => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  css(CSS_ID, CSS);
  layout.setAttribute(ACTIVE, 'on');

  const soleils = Array.from(layout.querySelectorAll('.const-sun'));
  const champ = layout.querySelector('.constellation-field');
  const details = [];

  /* E009-01 — Type « button » garanti sur chaque soleil. */
  /* E009-02 — Libellés assainis des caractères de contrôle invisibles. */
  /* E009-03 — Étiquette visuelle compactée au-delà de 36 caractères. */
  /* E009-04 — Teintes partagées désambiguïsées par un repère textuel. */
  /* E009-05 — Densité du champ mesurée et signalée. */
  /* E009-06 — Cohérence des plages de dates vérifiée. */
  /* E009-07 — Soleils visuellement masqués détectés. */
  /* E009-08 — Indice d'intégrité des champs calculé. */
  /* E009-09 — Numéros de rang visible réparés. */
  /* E009-10 — Panneau de diagnostic idempotent et sceau d'audit. */
  const etapes = [
    () => assurerTypeBouton(soleils),
    () => assainirLibelles(soleils),
    () => compacterLibelles(soleils),
    () => desambiguiserTeintes(soleils),
    () => signalerDensite(champ, soleils, details),
    () => verifierDates(soleils, details),
    () => detecterMasques(soleils, details),
    () => calculerIntegrite(soleils, layout, details),
    () => reparerRangs(soleils, details),
  ];
  const counts = etapes.map((etape) => {
    try { return Math.max(0, Number(etape()) || 0); }
    catch { return 0; }
  });
  counts.push(1);
  try { scellerDiagnostic(ctx, counts, details, soleils); }
  catch { /* Greffon tolérant : un rendu partiel reste lisible. */ }
});
