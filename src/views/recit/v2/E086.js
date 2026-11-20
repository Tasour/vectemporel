import { register } from './registry.js';

/* V2 lentille E086 — Mobile et reflow responsive (second regard).
 *
 * La passe 1 E086 simule une largeur, élargit les cibles, rend le visuel
 * compact, fixe les actions, transforme le fil en bandeau, ajoute le balayage,
 * gère paysage/zones sûres et l'anti-zoom, puis affiche une fiche de réglages.
 * Cette V2 ne reprend aucun de ces chantiers : elle MESURE le rendu réel et
 * restitue dix diagnostics chiffrés, tous dérivés du DOM (rects, styles
 * calculés, scrollWidth/clientWidth, nombre de nœuds). Rien n'est simulé, rien
 * n'est réglé, aucun chiffre n'est inventé.
 *
 * Préfixes : classes recit-v2-e086-, ids DOM v2-e086- (jamais les ids e086- de
 * la passe 1, qui tourne sur le même DOM). Une seule feuille de style, un seul
 * register. Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié.
 * Enrichissement non destructif : sans ce module, la vue reste lisible.
 *
 * Les dix chantiers E086-01 … E086-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E086.md.
 */

const ZERO = { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 };

/* Bloc CSS unique, intégralement porté par la classe racine posée sur la layout. */
const CSS = `
/* E086-01 — panneau de diagnostic : lecture chiffrée, non intrusive. */
.recit-v2-e086-panel{
  margin:8px 0 12px;padding:9px 11px;
  border:1px solid var(--line-strong);border-radius:9px;
  background:rgba(8,11,16,.55);
}
.recit-v2-e086-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);
  font-size:11px;letter-spacing:.06em;
}
.recit-v2-e086-readout{
  margin:0 0 4px;color:var(--ink-soft,#d7d1c6);
  font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
  transition:opacity .18s linear;
}
.recit-v2-e086-readout:last-child{margin-bottom:0;}
.recit-v2-e086-readout strong{color:var(--gold-bright,#f4d69e);}
.recit-v2-e086-root .recit-body{overflow-x:clip;}

/* E086-02 — filet anti-débordement : aucune règle de largeur n'est réécrite. */
.recit-v2-e086-root .recit-thread-list{min-width:0;}

/* E086-03 — répartition visuel/lecture : hauteurs intactes, mesure seule. */
.recit-v2-e086-root .recit-media{min-width:0;}

/* E086-04 — ratio du visuel : cadrage et object-fit non modifiés. */
.recit-v2-e086-root .recit-v2-e086-ratio{color:var(--muted,#a8a198);}

/* E086-05 — densité du fil : aucun point n'est retiré ni masqué. */
.recit-v2-e086-root .recit-v2-e086-fildensite{color:var(--muted-2,#9a938a);}

/* E086-06 — espacement des cibles : boutons d'origine intacts. */
.recit-v2-e086-root .recit-v2-e086-espacement{font-variant-numeric:tabular-nums;}

/* E086-07 — taille de police : pas d'inflation de texte au focus. */
.recit-v2-e086-root{-webkit-text-size-adjust:100%;text-size-adjust:100%;}

/* E086-08 — colonnes de grille : la grille n'est pas redéfinie. */
.recit-v2-e086-root .recit-v2-e086-colonnes{white-space:normal;}

/* E086-09 — gouttière de défilement stable, sans déplacer le contenu. */
.recit-v2-e086-root .recit-body{scrollbar-gutter:stable;}

/* E086-10 — synthèse et mouvement réduit du panneau V2 uniquement. */
.recit-v2-e086-fiche{
  margin-top:7px;padding-top:7px;
  border-top:1px solid var(--line);color:var(--muted,#a8a198);
}
.recit-v2-e086-root[data-v2-e086-motion="reduce"] .recit-v2-e086-readout{transition:none;}
@media (prefers-reduced-motion:reduce){.recit-v2-e086-readout{transition:none;}}
`;

/* Rectangles mesurés : retourne un objet sûr même si l'API est absente. */
function rect(noeud) {
  try {
    if (!noeud || typeof noeud.getBoundingClientRect !== 'function') return ZERO;
    return noeud.getBoundingClientRect();
  } catch {
    return ZERO;
  }
}

/* Style calculé : getComputedStyle est gardé, jamais supposé. */
function styleOf(noeud) {
  try {
    if (!noeud || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
    return window.getComputedStyle(noeud);
  } catch {
    return null;
  }
}

function fsDe(noeud) {
  const s = styleOf(noeud);
  return s ? (parseFloat(s.fontSize) || 0) : 0;
}

/* Formatage décimal à virgule, sans chiffre inventé ni arrondi trompeur. */
function dec1(value) {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}
function dec2(value) {
  return (Math.round(value * 100) / 100).toString().replace('.', ',');
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Crée (ou réutilise) le panneau unique, inséré juste après le timing. */
function assurePanneau(corps, ancre) {
  let panneau = document.getElementById('v2-e086-panneau');
  if (!panneau) {
    panneau = document.createElement('section');
    panneau.className = 'recit-v2-e086-panel';
    panneau.id = 'v2-e086-panneau';
    panneau.setAttribute('aria-label', 'Diagnostic responsive de la vue Récit');
    const titre = document.createElement('h2');
    titre.id = 'v2-e086-titre';
    titre.textContent = 'Diagnostic responsive';
    panneau.appendChild(titre);
  }
  if (panneau.parentNode !== corps) {
    const cible = ancre && ancre.parentNode === corps ? ancre.nextSibling : null;
    try { corps.insertBefore(panneau, cible); }
    catch { corps.appendChild(panneau); }
  }
  return panneau;
}

/* Dépose un paragraphe visible, réutilisé par id (idempotent). */
function met(parent, id, classe, texte) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = document.createElement('p');
    noeud.id = id;
    noeud.className = `recit-v2-e086-readout ${classe}`;
  }
  noeud.textContent = texte;
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

register('E086', (ctx) => {
  /* Garde d'existence globale : une lentille ne doit jamais casser le rendu. */
  try {
    if (typeof document === 'undefined' || !ctx || !ctx.layout
      || typeof ctx.layout.querySelector !== 'function' || typeof ctx.css !== 'function') return;

    ctx.css('recit-v2-e086', CSS); /* un seul appel, toutes les règles du module. */
    const layout = ctx.layout;
    ajouteClasse(layout, 'recit-v2-e086-root');

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    const media = layout.querySelector('.recit-media');
    const timing = corps.querySelector('.recit-timing');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const actions = corps.querySelector('.recit-actions');
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');

    const panneau = assurePanneau(corps, timing || corps.firstChild);
    if (!panneau) return;

    /* E086-01 — largeur utile mesurée et caractères par ligne estimés. */
    const stCorps = styleOf(corps);
    const padG = parseFloat(stCorps && stCorps.paddingLeft) || 0;
    const padD = parseFloat(stCorps && stCorps.paddingRight) || 0;
    const largeurUtile = Math.max(0, (corps.clientWidth || rect(corps).width) - padG - padD);
    const fsTitre = fsDe(titre || corps) || 16;
    const carParLigne = largeurUtile > 0 ? Math.max(1, Math.round(largeurUtile / (fsTitre * 0.5))) : 0;
    met(panneau, 'v2-e086-mesure', 'recit-v2-e086-mesure',
      `Colonne de lecture : ${dec1(largeurUtile)} px · ≈ ${carParLigne} caractères par ligne (repère 66).`);

    /* E086-02 — débordement horizontal mesuré sur trois conteneurs réels. */
    const debordDe = (noeud) => noeud
      ? Math.max(0, (noeud.scrollWidth || 0) - (noeud.clientWidth || 0)) : 0;
    const debord = Math.max(debordDe(layout), debordDe(corps), debordDe(media));
    met(panneau, 'v2-e086-debord', 'recit-v2-e086-debord',
      `Débordement horizontal : ${debord > 0 ? `${dec1(debord)} px détectés` : 'aucun'} `
      + '(contrôle : conteneur, lecture, visuel).');

    /* E086-03 — répartition visuel / lecture dans la hauteur du conteneur. */
    const hLayout = rect(layout).height;
    const hMedia = media ? rect(media).height : 0;
    const hCorps = rect(corps).height;
    const pctVisuel = hLayout > 0 ? Math.round((hMedia / hLayout) * 100) : 0;
    const pctLecture = hLayout > 0 ? Math.round((hCorps / hLayout) * 100) : 0;
    met(panneau, 'v2-e086-repartition', 'recit-v2-e086-repartition',
      `Répartition : visuel ${pctVisuel} % · lecture ${pctLecture} % de la hauteur du conteneur.`);

    /* E086-04 — ratio d'aspect du visuel, comparé au repère 16:9. */
    const rMedia = media ? rect(media) : ZERO;
    const ratio = rMedia.height > 0 ? rMedia.width / rMedia.height : 0;
    met(panneau, 'v2-e086-ratio', 'recit-v2-e086-ratio',
      `Visuel : ${dec1(rMedia.width)} × ${dec1(rMedia.height)} px · ratio ${dec2(ratio)}:1 `
      + '(référence 16:9 ≈ 1,78:1).');

    /* E086-05 — densité du fil : points réellement dans le viewport. */
    const items = fil && fil.querySelectorAll
      ? Array.from(fil.querySelectorAll('.recit-thread-item')) : [];
    let vh = 0;
    let vw = 0;
    try { vh = window.innerHeight || 0; vw = window.innerWidth || 0; } catch { /* ignoré */ }
    const visibles = items.filter((noeud) => {
      const r = rect(noeud);
      return r.width > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    }).length;
    met(panneau, 'v2-e086-fildensite', 'recit-v2-e086-fildensite',
      `Fil : ${items.length} points · ${visibles} visibles dans le viewport.`);

    /* E086-06 — espacement minimal entre actions de la même rangée. */
    const boutons = actions && actions.querySelectorAll
      ? Array.from(actions.querySelectorAll('button')) : [];
    let ecartMin = null;
    for (let i = 1; i < boutons.length; i += 1) {
      const a = rect(boutons[i - 1]);
      const b = rect(boutons[i]);
      if (Math.abs(a.top - b.top) > 6 || a.width <= 0 || b.width <= 0) continue;
      const ecart = b.left - a.right;
      if (ecart >= 0 && (ecartMin === null || ecart < ecartMin)) ecartMin = ecart;
    }
    met(panneau, 'v2-e086-espacement', 'recit-v2-e086-espacement',
      `Espacement des actions : ${ecartMin === null
        ? 'non mesurable (moins de deux boutons alignés)'
        : `${dec1(ecartMin)} px minimal (repère 8 px)`}.`);

    /* E086-07 — taille de police effective du texte, lue sur le DOM. */
    const fsCorps = fsDe(corps);
    const fsContexte = contexte ? fsDe(contexte) : 0;
    met(panneau, 'v2-e086-police', 'recit-v2-e086-police',
      `Taille du texte : ${dec1(fsCorps)} px (corps)`
      + `${fsContexte ? ` · ${dec1(fsContexte)} px (contexte)` : ''} — repère mobile 16 px.`);

    /* E086-08 — nombre de colonnes réellement calculé pour la grille. */
    const stLayout = styleOf(layout);
    const colonnes = stLayout ? stLayout.gridTemplateColumns : '';
    const nbColonnes = colonnes && colonnes !== 'none'
      ? colonnes.split(/\s+/).filter(Boolean).length : 0;
    met(panneau, 'v2-e086-colonnes', 'recit-v2-e086-colonnes',
      `Grille active : ${nbColonnes || '?'} colonne(s) (valeur calculée : ${colonnes || '—'}).`);

    /* E086-09 — hauteur de défilement du panneau de lecture. */
    const scrollH = corps.scrollHeight || 0;
    const clientH = corps.clientHeight || 0;
    const defilement = scrollH > clientH;
    met(panneau, 'v2-e086-defilement', 'recit-v2-e086-defilement',
      `Panneau de lecture : ${dec1(scrollH)} px de contenu pour ${dec1(clientH)} px visibles · `
      + `${defilement ? 'défilement nécessaire' : 'contenu entièrement visible'}.`);

    /* E086-10 — fiche consolidée des dix mesures, annoncée poliment. */
    const fiche = `Diagnostic responsive · lecture ${dec1(largeurUtile)} px / ${carParLigne} car. · `
      + `débordement ${debord > 0 ? `${dec1(debord)} px` : 'aucun'} · `
      + `visuel ${pctVisuel} % / ratio ${dec2(ratio)}:1 · `
      + `fil ${visibles}/${items.length} visibles · grille ${nbColonnes || '?'} col. · `
      + `texte ${dec1(fsCorps)} px · ${defilement ? 'défilement' : 'sans défilement'}.`;
    const noeudFiche = met(panneau, 'v2-e086-fiche', 'recit-v2-e086-fiche', fiche);
    noeudFiche.setAttribute('role', 'status');
    noeudFiche.setAttribute('aria-live', 'polite');

    /* Mouvement réduit : attribut propre à la V2, jamais e086-motion (passe 1). */
    let reduit = false;
    try { reduit = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
    catch { reduit = false; }
    layout.setAttribute('data-v2-e086-motion', reduit ? 'reduce' : 'normal');
  } catch {
    /* Enrichissement non destructif : le récit reste lisible sans cette lentille. */
  }
});
