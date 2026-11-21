import { register } from './registry.js';

/* Lentille E070 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers E070-01 … E070-10, tous implémentés ici. Rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E070.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js.
 *
 * Une seule feuille de style (`recit-e070`), un seul enregistrement, des ids
 * préfixés `e070-`, des classes préfixées `recit-e070-`. Aucun appel réseau,
 * aucune sortie de débogage, aucun aléa. Chaque valeur affichée est recalculée
 * depuis le texte ou les attributs réellement rendus par la vue : aucune donnée
 * historique n'est inventée. Enrichissement strictement additif, sans JS la vue
 * reste intégralement lisible et navigable.
 */

const CERTITUDES = [
  ['vérifié', '✓', 'Vérifié'],
  ['certain', '■', 'Certain'],
  ['probable', '◐', 'Probable'],
  ['disputed', '≈', 'Contesté'],
];

const TYPES = [
  ['récit', 'phrase de la synthèse vérifiée'],
  ['figure', 'affirmation sur un acteur'],
  ['lieu', 'repère géographique documenté'],
  ['audit', 'affirmation issue de l’audit'],
];

/* Une seule feuille, un seul appel. Aucune règle ne masque du contenu existant,
   aucune information n'est portée par la seule couleur. */
const CSS = `
.recit-layout .recit-e070-note{margin:6px 0;color:var(--muted-2);font-size:10px;line-height:1.5}
.recit-layout .recit-e070-source-chip{display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:1px 7px;border:1px dashed var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap;font-variant-numeric:tabular-nums}
.recit-layout .recit-e070-profile{margin:10px 0 2px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-layout .recit-e070-profile-titre{margin:0 0 5px;color:var(--muted);font-size:9px;letter-spacing:.06em;text-transform:uppercase}
.recit-layout .recit-e070-profile-liste{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px 12px}
.recit-layout .recit-e070-profile-entree{color:var(--ink-soft);font-size:10px;font-variant-numeric:tabular-nums}
.recit-layout .recit-e070-marque{margin-right:3px;color:var(--gold)}
.recit-layout .recit-e070-caution{padding-left:8px;border-left:2px solid var(--gold)}
.recit-layout .recit-e070-checksum,
.recit-layout .recit-e070-coherence{font-variant-numeric:tabular-nums}
.recit-layout .recit-e070-trace-desc{margin-top:4px}
.recit-layout[data-e070-motion="reduce"] .recit-e070-note,
.recit-layout[data-e070-motion="reduce"] .recit-e070-source-chip,
.recit-layout[data-e070-motion="reduce"] .recit-e070-profile{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout .recit-e070-note,
  .recit-layout .recit-e070-source-chip,
  .recit-layout .recit-e070-profile{transition:none}
}
@media print{
  .recit-layout .recit-e070-note,
  .recit-layout .recit-e070-source-chip,
  .recit-layout .recit-e070-profile{color:#111;border-color:#777;background:none}
}
`;

/* --- Utilitaires de garde : aucune recherche ne doit pouvoir faire échouer
       le rendu, même sur une vue partiellement construite. --- */

function q(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur)
    : null;
}

function qa(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selecteur))
    : [];
}

function safe(action) {
  try { action(); }
  catch { /* une lentille défaillante ne casse jamais la vue. */ }
}

function poserSiAbsent(noeud, attribut, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  if (typeof noeud.hasAttribute === 'function' && noeud.hasAttribute(attribut)) return;
  noeud.setAttribute(attribut, valeur);
}

function ajouterJeton(noeud, attribut, jeton) {
  if (!noeud || typeof noeud.getAttribute !== 'function' || typeof noeud.setAttribute !== 'function') return;
  const existants = String(noeud.getAttribute(attribut) || '').trim().split(/\s+/).filter(Boolean);
  if (existants.indexOf(jeton) !== -1) return;
  existants.push(jeton);
  noeud.setAttribute(attribut, existants.join(' '));
}

function cree(fabrique, balise, classe, texte) {
  try {
    let noeud;
    if (typeof fabrique === 'function') noeud = fabrique(balise, classe || undefined, texte);
    else {
      noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
    return noeud || null;
  } catch { return null; }
}

function assure(parent, id, balise, classe, fabrique) {
  if (!parent || typeof parent.appendChild !== 'function' || !id) return null;
  let noeud = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (noeud && noeud.parentElement === parent) return noeud;
  if (!noeud) noeud = cree(fabrique, balise, classe);
  if (!noeud) return null;
  noeud.id = id;
  try { parent.appendChild(noeud); }
  catch { return null; }
  return noeud;
}

function vide(noeud) {
  if (!noeud) return;
  try { while (noeud.firstChild) noeud.removeChild(noeud.firstChild); }
  catch { /* contenu laissé en place en cas d'échec. */ }
}

function insereApres(noeud, reference, parent) {
  if (!noeud) return;
  if (reference && reference.parentNode === parent && typeof parent.insertBefore === 'function') {
    parent.insertBefore(noeud, reference.nextSibling);
  } else if (parent && typeof parent.appendChild === 'function') {
    parent.appendChild(noeud);
  }
}

function comptePar(noeuds, cle) {
  const resultat = Object.create(null);
  noeuds.forEach((noeud) => {
    let valeur = '';
    try { valeur = noeud && noeud.dataset ? (noeud.dataset[cle] || '') : ''; }
    catch { valeur = ''; }
    const retenue = valeur || 'autre';
    resultat[retenue] = (resultat[retenue] || 0) + 1;
  });
  return resultat;
}

/* Signature légère et déterministe : aucune source d'aléa, résultat stable
   pour un même libellé, donc comparable d'un rendu à l'autre. */
function sommeDeControle(texte) {
  const chaine = String(texte || '');
  let h = 2166136261;
  for (let i = 0; i < chaine.length; i += 1) {
    h = (h ^ chaine.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 65536).toString(16).toUpperCase().padStart(4, '0');
}

function lectureCompteurs(texteEtape, texteStatut) {
  const etape = String(texteEtape || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  const statut = String(texteStatut || '').match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  return {
    etape: etape ? parseInt(etape[1], 10) : null,
    totalEtape: etape ? parseInt(etape[2], 10) : null,
    affiches: statut ? parseInt(statut[1], 10) : null,
    totalStatut: statut ? parseInt(statut[2], 10) : null,
  };
}

function nomSources(nombre) {
  return `${nombre} référence${nombre > 1 ? 's' : ''} locale${nombre > 1 ? 's' : ''}`;
}

register('E070', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css === 'function') css('recit-e070', CSS);
    const racine = layout || stage;
    if (!racine || typeof racine.querySelector !== 'function') return;
    if (typeof racine.hasAttribute === 'function' && racine.hasAttribute('data-e070-provenance')) return;

    const corps = q(racine, '.recit-body');
    const meta = q(racine, '.recit-meta');
    const fil = q(racine, '.recit-thread');
    const liste = q(racine, '.recit-thread-list');
    const items = qa(liste, '.recit-thread-item');
    const kicker = q(racine, '.view-kicker');
    const statut = document.getElementById('c3a-status');
    const pastilleConf = q(racine, '.recit-conf');
    const titre = document.getElementById('recit-point-title');
    const chrono = q(racine, '.recit-timing');
    const trace = q(racine, '.recit-trace');
    const resumeTrace = trace ? q(trace, 'summary') : null;
    const texteTrace = trace ? q(trace, 'p') : null;
    const sansSource = q(racine, '.recit-sources');
    const legend = q(racine, '.recit-legend');

    const confComptes = comptePar(items, 'confidence');
    const typeComptes = comptePar(items, 'kind');
    const compteurs = lectureCompteurs(
      kicker && kicker.textContent,
      statut && statut.textContent
    );

    /* Nombre de références du point courant : lu dans le récapitulatif réel
       de la traçabilité, ou déduit de l'absence explicite de source. */
    let nbSources = 0;
    const mention = String((resumeTrace && resumeTrace.textContent) || '').match(/(\d+)\s*référence/i);
    if (mention) nbSources = parseInt(mention[1], 10) || 0;
    else if (!trace && sansSource) nbSources = 0;

    const empreinte = sommeDeControle(titre && titre.textContent);
    const libelleConf = String((pastilleConf && pastilleConf.textContent) || '');
    const prudent = /contesté|probable/i.test(libelleConf);
    const coherent = compteurs.totalEtape !== null
      && compteurs.totalStatut !== null
      && compteurs.totalEtape === compteurs.totalStatut
      && compteurs.affiches !== null
      && compteurs.affiches === items.length;

    /* E070-01 — pastille de couverture des sources du point courant. */
    safe(() => {
      if (!meta) return;
      const pastille = assure(meta, 'e070-source-chip', 'span', 'recit-e070-source-chip', el);
      if (!pastille) return;
      const texte = nbSources > 0
        ? `◈ Sources : ${nomSources(nbSources)}`
        : '∅ Sources : aucune référence locale attachée';
      pastille.textContent = texte;
      pastille.setAttribute('aria-label', `Provenance du point courant : ${texte}.`);
      pastille.setAttribute('title', 'Identifiants conservés dans le registre local, sans lien externe.');
    });

    /* E070-02 — répartition des degrés de certitude dans le fil affiché. */
    safe(() => {
      if (!fil) return;
      const bloc = assure(fil, 'e070-conf-profile', 'div',
        'recit-e070-profile recit-e070-conf-profile', el);
      if (!bloc) return;
      vide(bloc);
      bloc.appendChild(cree(el, 'p', 'recit-e070-profile-titre', 'Profil de certitude du repère'));
      const listeInterne = cree(el, 'ul', 'recit-e070-profile-liste');
      const entrees = CERTITUDES.map(([cle, marque, libelle]) => [cle, marque, libelle]);
      if (confComptes.autre) entrees.push(['autre', '•', 'Autre mentions']);
      entrees.forEach(([cle, marque, libelle]) => {
        const nombre = confComptes[cle] || 0;
        const ligne = cree(el, 'li', 'recit-e070-profile-entree');
        const symbole = cree(el, 'span', 'recit-e070-marque', marque);
        if (symbole) symbole.setAttribute('aria-hidden', 'true');
        if (ligne) {
          if (symbole) ligne.appendChild(symbole);
          ligne.appendChild(document.createTextNode(` ${libelle} — ${nombre} point${nombre > 1 ? 's' : ''}`));
        }
        if (listeInterne && ligne) listeInterne.appendChild(ligne);
      });
      if (listeInterne) bloc.appendChild(listeInterne);
      bloc.setAttribute('aria-label', 'Répartition des degrés de certitude parmi les points affichés du fil.');
    });

    /* E070-03 — répartition des types de points dans le fil affiché. */
    safe(() => {
      if (!fil) return;
      const bloc = assure(fil, 'e070-kind-profile', 'div',
        'recit-e070-profile recit-e070-kind-profile', el);
      if (!bloc) return;
      vide(bloc);
      bloc.appendChild(cree(el, 'p', 'recit-e070-profile-titre', 'Profil typologique du repère'));
      const listeInterne = cree(el, 'ul', 'recit-e070-profile-liste');
      const entrees = TYPES.slice();
      if (typeComptes.autre) entrees.push(['autre', 'autre type de point']);
      entrees.forEach(([cle, gloss]) => {
        const nombre = typeComptes[cle] || 0;
        const ligne = cree(el, 'li', 'recit-e070-profile-entree',
          `${cle} — ${nombre} point${nombre > 1 ? 's' : ''} (${gloss})`);
        if (listeInterne && ligne) listeInterne.appendChild(ligne);
      });
      if (listeInterne) bloc.appendChild(listeInterne);
      bloc.setAttribute('aria-label', 'Répartition des types de points parmi les points affichés du fil.');
    });

    /* E070-04 — rappel de la provenance ajouté à la légende existante. */
    safe(() => {
      if (!legend) return;
      const note = assure(legend, 'e070-provenance-note', 'p',
        'recit-e070-note recit-e070-provenance', el);
      if (!note) return;
      note.textContent = 'Provenance : les degrés de certitude (✓ vérifié, ■ certain, ◐ probable, ≈ contesté) sont des mentions reprises des audits. Un point peut être vérifié sans identifiant de source : l’absence de référence locale ne signifie pas l’absence de vérification. Les identifiants affichés renvoient au registre local, sans lien externe.';
      note.setAttribute('aria-label', 'Rappel de la provenance des données et de la portée des identifiants locaux.');
    });

    /* E070-05 — signature de contrôle déterministe du libellé courant. */
    safe(() => {
      if (!corps) return;
      const note = assure(corps, 'e070-checksum', 'p',
        'recit-e070-note recit-e070-checksum', el);
      if (!note) return;
      note.textContent = `Signature de contrôle du libellé courant : ${empreinte} (somme légère calculée sur le texte affiché, stable d’un rendu à l’autre).`;
      note.setAttribute('aria-label', `Empreinte de contrôle du point courant : ${empreinte}.`);
      insereApres(note, meta, corps);
    });

    /* E070-06 — réserve explicite sur les mentions prudentielles. */
    safe(() => {
      if (!corps) return;
      if (!prudent) {
        const ancien = document.getElementById('e070-caution');
        if (ancien && ancien.parentElement === corps && typeof ancien.remove === 'function') ancien.remove();
        return;
      }
      const note = assure(corps, 'e070-caution', 'p',
        'recit-e070-note recit-e070-caution', el);
      if (!note) return;
      note.textContent = /contesté/i.test(libelleConf)
        ? '≈ Mention contestée : ce point porte une réserve explicite dans l’audit ; il ne doit pas être traité comme un fait établi.'
        : '◐ Mention probable : ce point est avancé avec un degré de certitude intermédiaire par l’audit.';
      note.setAttribute('role', 'note');
      note.setAttribute('aria-label', `Réserve de provenance : ${note.textContent}`);
      insereApres(note, meta, corps);
    });

    /* E070-07 — traçabilité nommée et décrite pour les lecteurs d'écran. */
    safe(() => {
      if (!trace) return;
      const bruts = String((texteTrace && texteTrace.textContent) || '');
      const trouve = bruts.match(/Identifiants\s*:\s*([^.]+)/i);
      const identifiants = trouve ? trouve[1].trim() : '';
      if (identifiants && typeof trace.setAttribute === 'function') {
        trace.setAttribute('data-e070-source-ids', identifiants.slice(0, 240));
      }
      const description = assure(trace, 'e070-trace-desc', 'p',
        'recit-e070-note recit-e070-trace-desc', el);
      if (description) {
        description.textContent = 'Ces identifiants sont des clés du registre local : ils permettent de remonter au libellé d’origine sans quitter l’atlas et sans recours à une ressource externe.';
        description.setAttribute('aria-label', 'Portée des identifiants de traçabilité.');
      }
      if (resumeTrace) {
        poserSiAbsent(resumeTrace, 'aria-label',
          `Traçabilité : ${nomSources(nbSources)} ; ${identifiants ? `identifiants : ${identifiants}.` : 'aucun identifiant.'}`);
        ajouterJeton(resumeTrace, 'aria-describedby', 'e070-trace-desc');
      }
    });

    /* E070-08 — contrôle de cohérence des compteurs affichés. */
    safe(() => {
      if (!corps) return;
      const note = assure(corps, 'e070-coherence', 'p',
        'recit-e070-note recit-e070-coherence', el);
      if (!note) return;
      note.textContent = coherent
        ? `✓ Contrôle des compteurs : cohérent (${compteurs.affiches} point${compteurs.affiches > 1 ? 's' : ''} affiché${compteurs.affiches > 1 ? 's' : ''} sur ${compteurs.totalEtape}).`
        : `! Contrôle des compteurs : écart détecté (fil ${items.length}, statut ${compteurs.affiches === null ? '—' : compteurs.affiches}, étape ${compteurs.totalEtape === null ? '—' : compteurs.totalEtape}).`;
      note.setAttribute('aria-label', note.textContent);
      insereApres(note, statut && statut.parentNode === corps ? statut : fil, corps);
    });

    /* E070-09 — préférence de mouvement, lue une seule fois par rendu. */
    safe(() => {
      let mode = 'normal';
      try { mode = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
      catch { mode = 'normal'; }
      if (typeof racine.setAttribute === 'function') racine.setAttribute('data-e070-motion', mode);
    });

    /* E070-10 — miroir de provenance unique, observable sans outil de débogage. */
    safe(() => {
      if (typeof racine.setAttribute !== 'function') return;
      const jetons = [
        `sources:${nbSources}`,
        `certitudes:${Object.keys(confComptes).length}`,
        `types:${Object.keys(typeComptes).length}`,
        `fil:${items.length}`,
        `empreinte:${empreinte}`,
        `coherence:${coherent ? 'ok' : 'ecart'}`,
        `motion:${typeof racine.getAttribute === 'function' ? (racine.getAttribute('data-e070-motion') || 'normal') : 'normal'}`,
        'css:1',
        'ids:8',
      ];
      racine.setAttribute('data-e070-provenance', jetons.join(' '));
    });
  } catch {
    /* Gardes d'existence : aucune erreur ne doit interrompre le rendu. */
  }
});
