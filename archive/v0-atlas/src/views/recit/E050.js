import { register } from './registry.js';

/* Lentille E050 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers concrets et distincts (E050-01 … E050-10), détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E050.md. Greffon strictement additif : aucun
 * texte existant n'est retiré, aucun attribut préexistant n'est réécrit,
 * aucun contrôle de la vue n'est ré-attribué. Toutes les valeurs diffusées
 * sont recalculées depuis le DOM réellement rendu (titre, kicker, pastille
 * de certitude, identifiants de la traçabilité, attributs data-* du fil,
 * statut de filtrage) — aucune donnée historique n'est inventée, aucun
 * appel réseau, aucun aléa, aucune journalisation.
 *
 * Un seul register('E050', …), un seul css('recit-e050', …) regroupant
 * toutes les règles, classes préfixées `recit-e050-`, ids préfixés `e050-`
 * et protégés contre le doublon. Chaque chantier est isolé : une défaillance
 * locale est neutralisée sans jamais interrompre le rendu de la vue.
 */

const CSS_ID = 'recit-e050';
const RACINE = 'recit-e050-root';

/* Bloc CSS unique, entièrement porté par la classe racine : aucune règle
   globale, aucune ressource distante, aucune police téléchargée. Aucune
   information n'est portée par la seule couleur (symboles + mots partout). */
const CSS = `
.recit-e050-root .recit-e050-bandeau{
  display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;
  margin:6px 0 10px;padding:6px 9px;
  border:1px dashed var(--line-strong);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.recit-e050-root .recit-e050-ligne{
  margin:0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.recit-e050-root .recit-e050-ligne strong{color:var(--gold-bright);font-weight:700}
.recit-e050-root .recit-e050-empreinte strong{
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  letter-spacing:.08em;
}
.recit-e050-root .recit-e050-alerte-faible{color:var(--gold-bright);font-weight:700}
.recit-e050-root .recit-e050-alerte-forte{color:var(--muted)}
.recit-e050-root .recit-e050-lien{
  color:var(--gold-bright);font-size:9px;text-decoration:underline;
  text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer;
}
.recit-e050-root .recit-e050-lien:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e050-root .recit-e050-lien-sans{color:var(--muted-2);font-size:9px;font-style:italic}
.recit-e050-root .recit-e050-refs{
  margin:6px 0 0;padding-left:20px;color:var(--muted);font-size:9px;line-height:1.55;
}
.recit-e050-root .recit-e050-refs li{margin:1px 0;overflow-wrap:anywhere}
.recit-e050-root .recit-e050-refs code{
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--gold-bright);
}
.recit-e050-root .recit-e050-panneau{
  margin:6px 0 0;padding:6px 9px;
  border-left:2px solid var(--line-strong);border-radius:0 6px 6px 0;
  color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.recit-e050-root .recit-e050-panneau strong{color:var(--gold-bright)}
@media (max-width:620px){
  .recit-e050-root .recit-e050-bandeau{gap:3px 10px;padding:5px 7px}
  .recit-e050-root .recit-e050-ligne,
  .recit-e050-root .recit-e050-panneau{font-size:10px}
}
@media (prefers-reduced-motion:reduce){
  .recit-e050-root .recit-e050-lien{transition:none!important}
}
.recit-e050-root.recit-e050-reduced .recit-e050-lien{transition:none!important}
`;

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

function setOnce(node, name, value) {
  if (present(node) && typeof node.hasAttribute === 'function'
      && !node.hasAttribute(name)) node.setAttribute(name, value);
}

function deja(id) {
  return typeof document !== 'undefined' && Boolean(document.getElementById(id));
}

/* Empreinte FNV-1a 32 bits : déterministe et reproductible, zéro aléa.
   Deux points identiques (texte + type + certitude + références) produisent
   toujours la même signature ; une seule virgule de différence la change. */
function empreinte(chaine) {
  let h = 2166136261;
  const s = String(chaine || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/* Identifiants de sources lus dans le paragraphe réel de la traçabilité :
   « Identifiants : A, B. Titres affichés dans le registre local, … ». */
function lireIdentifiants(trace) {
  if (!present(trace)) return [];
  const paragraphe = q(trace, 'p');
  const trouvé = txt(paragraphe).match(/Identifiants\s*:\s*(.*?)(?:\.\s*Titres|$)/);
  if (!trouvé) return [];
  return trouvé[1].split(',').map((part) => part.trim()).filter(Boolean);
}

/* Nombre de références : identifiants effectivement lisibles, sinon le
   compte déjà affiché par le résumé de la vue (jamais une valeur inventée). */
function nombreReferences(trace, identifiants) {
  if (identifiants.length) return identifiants.length;
  const resume = q(trace, 'summary');
  const trouvé = txt(resume).match(/(\d+)\s*référence/);
  return trouvé ? Number(trouvé[1]) : 0;
}

/* Répartition d'un attribut data-* du fil, dans un ordre canonique stable.
   Les libellés sont ceux du jeu de données, aucun n'est traduit arbitrairement. */
function repartition(items, attribut, ordre) {
  const comptes = Object.create(null);
  items.forEach((item) => {
    const valeur = String(item.getAttribute(attribut) || '—');
    comptes[valeur] = (comptes[valeur] || 0) + 1;
  });
  return ordre.map((cle) => `${cle} ${comptes[cle] || 0}`).join(' · ');
}

function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Insère une ligne de provenance dans le bandeau, créé une seule fois juste
   après le paragraphe de métadonnées. Ne déplace aucun nœud existant. */
function ajouterLigne(donnees, id, className, texte) {
  if (deja(id)) return null;
  const { body, meta, el } = donnees;
  if (!present(body) || typeof el !== 'function') return null;
  let bandeau = q(body, '.recit-e050-bandeau');
  if (!bandeau) {
    bandeau = el('div', 'recit-e050-bandeau');
    bandeau.id = 'e050-bandeau';
    const parent = (present(meta) && meta.parentNode) ? meta.parentNode : body;
    const avant = (present(meta) && meta.parentNode)
      ? meta.nextSibling : (body.firstChild || null);
    if (parent && typeof parent.insertBefore === 'function') {
      parent.insertBefore(bandeau, avant);
    } else if (typeof body.appendChild === 'function') {
      body.appendChild(bandeau);
    } else {
      return null;
    }
  }
  if (typeof bandeau.appendChild !== 'function') return null;
  const ligne = el('p', `recit-e050-ligne ${className}`, texte);
  ligne.id = id;
  bandeau.appendChild(ligne);
  return ligne;
}

/* Insère un panneau dans le fil, juste après son titre. */
function ajouterAuFil(donnees, id, texte) {
  if (deja(id)) return null;
  const { fil, el } = donnees;
  if (!present(fil) || typeof el !== 'function') return null;
  const panneau = el('p', 'recit-e050-panneau', texte);
  panneau.id = id;
  const titre = q(fil, '.recit-thread-title');
  if (present(titre) && titre.parentNode
      && typeof titre.parentNode.insertBefore === 'function') {
    titre.parentNode.insertBefore(panneau, titre.nextSibling);
  } else {
    fil.appendChild(panneau);
  }
  return panneau;
}

/* --- les dix chantiers ---------------------------------------------------- */

/* E050-01 — empreinte déterministe du point : signature vérifiable de la
   donnée affichée (texte source + type + certitude + références). */
function chantier01(d) {
  const source = [txt(d.titre), txt(d.kicker), txt(d.conf), d.identifiants.join('|')]
    .join('\u001f');
  const ligne = ajouterLigne(d, 'e050-empreinte', 'recit-e050-empreinte', '');
  if (!ligne || typeof d.el !== 'function') return;
  const valeur = d.el('strong', '', empreinte(source));
  ligne.appendChild(document.createTextNode('Empreinte de données : '));
  ligne.appendChild(valeur);
  ligne.appendChild(document.createTextNode(' · calculée depuis le texte et les références affichés.'));
}

/* E050-02 — couverture de source du point courant, déduite de la présence
   de .recit-trace / .recit-sources et du compte réel d'identifiants. */
function chantier02(d) {
  let texte;
  if (present(d.trace)) {
    texte = `Couverture source : ${d.nbRef} référence(s) locale(s) renseignée(s) pour ce point.`;
  } else if (present(d.sansSource)) {
    texte = 'Couverture source : aucune référence locale attachée à ce point.';
  } else {
    texte = 'Couverture source : information non présente dans ce rendu.';
  }
  ajouterLigne(d, 'e050-couverture', 'recit-e050-couverture', texte);
}

/* E050-03 — registre numéroté des références : identifiants rendus
   individuellement lisibles dans le <details> déjà présent. Le paragraphe
   d'origine est conservé tel quel, la liste s'ajoute après lui. */
function chantier03(d) {
  if (!present(d.trace) || !d.identifiants.length || deja('e050-registre')) return;
  if (typeof d.el !== 'function') return;
  const liste = d.el('ol', 'recit-e050-refs');
  liste.id = 'e050-registre';
  d.identifiants.forEach((identifiant) => {
    const entree = d.el('li');
    entree.appendChild(d.el('code', '', identifiant));
    liste.appendChild(entree);
  });
  d.trace.appendChild(liste);
}

/* E050-04 — raccourci d'accès à la traçabilité depuis les métadonnées :
   ouvre le <details> et rejoint le registre ; aucun lien externe. */
function chantier04(d) {
  if (deja('e050-lien-trace') || typeof d.el !== 'function') return;
  const parent = present(d.meta) ? d.meta : d.body;
  if (!present(parent)) return;
  let lien;
  if (present(d.trace)) {
    lien = d.el('a', 'recit-e050-lien',
      `Traçabilité · ${d.nbRef} référence(s)`);
    lien.href = '#e050-registre';
    setOnce(lien, 'aria-controls', 'e050-registre');
    lien.addEventListener('click', () => {
      try { if (d.trace && typeof d.trace.open === 'boolean') d.trace.open = true; }
      catch { /* le fragment suffit si l'ouverture est refusée */ }
    });
  } else {
    lien = d.el('span', 'recit-e050-lien-sans', 'Traçabilité · aucune référence locale');
  }
  lien.id = 'e050-lien-trace';
  parent.appendChild(lien);
}

/* E050-05 — alerte de fiabilité : la mention « contesté / disputed » est
   signalée en texte et par un symbole, jamais par la seule couleur. */
function chantier05(d) {
  const valeur = txt(d.conf).toLowerCase();
  const contestee = valeur.indexOf('contesté') >= 0 || valeur.indexOf('disputed') >= 0;
  const solide = valeur.indexOf('vérifié') >= 0 || valeur.indexOf('certain') >= 0;
  if (!contestee && !solide) return;
  setOnce(d.conf, 'data-e050-fiabilite', contestee ? 'faible' : 'forte');
  const classe = contestee ? 'recit-e050-alerte-faible' : 'recit-e050-alerte-forte';
  const texte = contestee
    ? '⚠ Fiabilité : mention contestée (terme source « disputed »).'
    : '✓ Fiabilité : mention vérifiée ou certaine, reprise de l’audit.';
  ajouterLigne(d, 'e050-alerte', classe, texte);
}

/* E050-06 — transparence du filtrage : le compte « affichés sur » est lu
   dans #c3a-status pour rappeler que la liste est un échantillon du repère. */
function chantier06(d) {
  const trouvé = txt(d.status).match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/);
  if (!trouvé) return;
  const affiches = Number(trouvé[1]);
  const total = Number(trouvé[2]);
  const texte = affiches === total
    ? `Échantillon affiché : la totalité des ${total} points du repère est visible.`
    : `Échantillon affiché : ${affiches} point(s) sur ${total} · critères cumulés appliqués au fil.`;
  ajouterAuFil(d, 'e050-echantillon', texte);
}

/* E050-07 — répartition des certitudes du repère, calculée depuis les
   attributs data-confidence réels des items affichés. */
function chantier07(d) {
  if (!d.items.length) return;
  const detail = repartition(d.items, 'data-confidence',
    ['vérifié', 'certain', 'probable', 'disputed']);
  ajouterAuFil(d, 'e050-certitudes',
    `Certitudes du repère (${d.items.length} affichés) : ${detail}.`);
}

/* E050-08 — répartition des origines du repère, calculée depuis les
   attributs data-kind réels des items affichés. */
function chantier08(d) {
  if (!d.items.length) return;
  const detail = repartition(d.items, 'data-kind',
    ['récit', 'figure', 'lieu', 'audit']);
  ajouterAuFil(d, 'e050-origines',
    `Origines des points (${d.items.length} affichés) : ${detail}.`);
}

/* E050-09 — miroir machine de provenance sur la racine : un seul attribut
   compact, posé une fois, réunissant les faits calculés pour le diagnostic
   et l'audit (aucune donnée supplémentaire n'est diffusée à l'écran). */
function chantier09(d) {
  if (!present(d.root)) return;
  const confiance = String(d.conf && d.conf.getAttribute('data-e050-fiabilite') || '—');
  const tokens = [
    `emp:${empreinte([txt(d.titre), txt(d.kicker), txt(d.conf), d.identifiants.join('|')].join('\u001f'))}`,
    `src:${d.nbRef}`,
    `fiab:${confiance}`,
    `fil:${d.items.length}`,
    `css:1`,
  ];
  setOnce(d.root, 'data-e050-provenance', tokens.join(' '));
}

/* E050-10 — origine visible de la mention de certitude : le « gloss » déjà
   porté par le title de la pastille est rendu en texte lisible, sans toucher
   à l'attribut d'origine. */
function chantier10(d) {
  if (!present(d.conf) || typeof d.conf.getAttribute !== 'function') return;
  const gloss = String(d.conf.getAttribute('title') || '').trim();
  if (!gloss) return;
  ajouterLigne(d, 'e050-gloss', 'recit-e050-gloss',
    `Origine de la mention : ${gloss}.`);
}

register('E050', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !layout) return;
  const racine = present(layout) && typeof layout.querySelector === 'function'
    ? layout
    : (present(stage) && typeof stage.querySelector === 'function' ? stage : null);
  if (!racine) return;

  safe(() => { if (typeof css === 'function') css(CSS_ID, CSS); });
  marquer(layout, RACINE);
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  if (reduce) marquer(layout, 'recit-e050-reduced');

  const identifiants = lireIdentifiants(q(racine, '.recit-trace'));
  const donnees = {
    root: layout,
    stage,
    el,
    body: q(racine, '.recit-body'),
    meta: q(racine, '.recit-meta'),
    titre: q(racine, '#recit-point-title'),
    kicker: q(racine, '.view-kicker'),
    conf: q(racine, '.recit-conf'),
    trace: q(racine, '.recit-trace'),
    sansSource: q(racine, '.recit-sources'),
    status: q(racine, '#c3a-status'),
    fil: q(racine, '.recit-thread'),
    items: qa(racine, '#c3a-thread .recit-thread-item'),
    identifiants,
    nbRef: nombreReferences(q(racine, '.recit-trace'), identifiants),
  };

  safe(() => chantier01(donnees));
  safe(() => chantier02(donnees));
  safe(() => chantier03(donnees));
  safe(() => chantier04(donnees));
  safe(() => chantier05(donnees));
  safe(() => chantier06(donnees));
  safe(() => chantier07(donnees));
  safe(() => chantier08(donnees));
  safe(() => chantier09(donnees));
  safe(() => chantier10(donnees));
});
