import { register } from './registry.js';

/* V2 lentille E090 — Données, traçabilité et provenance (second regard).
 *
 * Thème repris de la passe 1, mais dix chantiers V2 neufs et distincts :
 * histogramme des certitudes, composition par type, complétude des
 * métadonnées, rang du point courant, cohérence de la certitude affichée,
 * cohérence des références, autonomie hors réseau, portée du filtrage, note
 * de méthode et sceau de traçabilité. La passe 1 traitait déjà le bandeau
 * d'origine, la fiche consolidée, la clé FNV du libellé, la couverture
 * vérifié/certain, les points masqués, la réserve prudentielle, l'aria de la
 * traçabilité, l'empreinte du fil, le mouvement réduit et le sceau global.
 *
 * Greffon strictement additif : sans ce module, la vue reste intégralement
 * lisible. Une seule feuille de style, injectée une seule fois sous
 * l'identifiant unique `recit-v2-e090`, un seul enregistrement, classes
 * préfixées `recit-v2-e090-`, ids DOM préfixés
 * `v2-e090-` (jamais les ids `e090-` de la passe 1 qui tourne sur le MÊME DOM).
 * Zéro réseau, zéro console, zéro aléa : chaque valeur est recalculée depuis
 * les textes et attributs réellement rendus. Aucun fichier partagé modifié.
 */

/* Certitudes sources, telles que portées par `data-confidence` des boutons. */
const CONF = [
  ['vérifié', '✓', 'Vérifié'],
  ['certain', '■', 'Certain'],
  ['probable', '◐', 'Probable'],
  ['disputed', '≈', 'Contesté'],
];

/* Types de points sources (cf. KIND de la vue), tels que dans `data-kind`. */
const KINDS = ['récit', 'figure', 'lieu', 'audit'];

/* Correspondance marque de la pastille → clé de certitude. */
const MARQUE_CLE = { '✓': 'vérifié', '■': 'certain', '◐': 'probable', '≈': 'disputed' };

/* Une seule feuille, un seul appel. Aucune règle ne masque du contenu ; aucune
   information n'est portée par la seule couleur. */
const CSS = `
/* E090-01 — Histogramme des degrés de certitude du fil. */
.recit-layout .recit-v2-e090-histo{margin:5px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-02 — Composition du fil par type de points. */
.recit-layout .recit-v2-e090-types{margin:3px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-03 — Complétude des métadonnées du fil, comparée à 100 %. */
.recit-layout .recit-v2-e090-complet{margin:3px 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-04 — Rang du point courant dans le fil. */
.recit-layout .recit-v2-e090-rang{margin:4px 0;color:var(--gold-bright);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-05 — Cohérence de la pastille de certitude avec le point courant. */
.recit-layout .recit-v2-e090-cohconf{margin:3px 0;padding-left:8px;border-left:2px solid var(--line-strong);color:var(--ink-soft);font-size:9px;line-height:1.5}

/* E090-06 — Cohérence des références annoncées et des identifiants listés. */
.recit-layout .recit-v2-e090-cohrefs{margin:5px 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-07 — Contrôle d'autonomie hors réseau (dépendances externes). */
.recit-layout .recit-v2-e090-reseau{margin:4px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-08 — Portée du filtrage sur les mesures V2. */
.recit-layout .recit-v2-e090-portee{margin:3px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E090-09 — Note de méthode : provenance des chiffres affichés. */
.recit-layout .recit-v2-e090-methode{margin:6px 0 2px;padding-top:6px;border-top:1px dotted var(--line);color:var(--muted-2);font-size:8px;line-height:1.6}

/* E090-10 — Sceau de traçabilité V2 : porté par un attribut sur la layout,
   sans nœud visible supplémentaire (voir le bloc JS E090-10). */
@media print{
  .recit-layout .recit-v2-e090-histo,
  .recit-layout .recit-v2-e090-types,
  .recit-layout .recit-v2-e090-complet,
  .recit-layout .recit-v2-e090-cohconf,
  .recit-layout .recit-v2-e090-cohrefs,
  .recit-layout .recit-v2-e090-methode{color:#111;border-color:#777}
}
`;

/* --- Utilitaires de garde : aucune recherche ne doit pouvoir faire échouer
        le rendu, même sur une vue partiellement construite. --- */

function q(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur) : null;
}

function qa(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selecteur)) : [];
}

function safe(action) {
  try { action(); }
  catch { /* une lentille défaillante ne casse jamais la vue. */ }
}

function cree(fabrique, balise, classe, texte) {
  try {
    let noeud = null;
    if (typeof fabrique === 'function') noeud = fabrique(balise, classe || undefined, texte);
    if (!noeud) {
      noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
    return noeud;
  } catch { return null; }
}

/* Dépose (ou réutilise) un paragraphe visible juste après une ancre, en
   repositionnant le nœud si la coque a reconstruit le DOM. Idempotent. */
function placeApres(fabrique, parent, id, classe, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function' || !id) return null;
  let noeud = document.getElementById(id);
  if (!noeud || noeud.parentElement !== parent) {
    if (!noeud) noeud = cree(fabrique, 'p', classe);
    if (!noeud) return null;
    noeud.id = id;
    try { parent.appendChild(noeud); }
    catch { return null; }
  }
  if (classe && typeof noeud.className === 'string' && noeud.className !== classe) {
    noeud.className = classe;
  }
  noeud.textContent = texte;
  if (ancre && ancre.parentNode === parent && noeud.nextSibling !== ancre.nextSibling) {
    try { parent.insertBefore(noeud, ancre.nextSibling); }
    catch { /* position laissée en place. */ }
  }
  return noeud;
}

function pluriel(n, mot) {
  const v = (n === null || n === undefined) ? '—' : String(n);
  return `${v} ${mot}${n === 1 ? '' : 's'}`;
}

function pourcent(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

register('E090', (ctx) => {
  try {
    if (typeof document === 'undefined' || !ctx) return;
    const { layout, css, el } = ctx;
    if (typeof css === 'function') css('recit-v2-e090', CSS);
    if (!layout || typeof layout.querySelector !== 'function') return;
    if (typeof layout.hasAttribute === 'function' && layout.hasAttribute('data-v2-e090-pret')) return;

    const corps = q(layout, '.recit-body');
    if (!corps || typeof corps.insertBefore !== 'function') return;
    const fab = (balise, classe, texte) => (typeof el === 'function' ? el(balise, classe, texte) : null);

    const kicker = q(corps, '.view-kicker');
    const titre = document.getElementById('recit-point-title') || q(corps, '.recit-title');
    const meta = q(corps, '.recit-meta');
    const confChip = q(corps, '.recit-conf');
    const statut = q(corps, '.c3a-status');
    const thread = q(layout, '#c3a-thread') || q(corps, '.recit-thread-list');
    const items = qa(thread, '.recit-thread-item');
    const trace = q(corps, '.recit-trace');
    const sansSource = q(corps, '.recit-sources');
    const legend = q(corps, '.recit-legend');

    /* Valeurs de base, toutes dérivées du DOM réel, réutilisées par les chantiers. */
    const confCounts = Object.create(null);
    const kindCounts = Object.create(null);
    CONF.forEach(([cle]) => { confCounts[cle] = 0; });
    KINDS.forEach((cle) => { kindCounts[cle] = 0; });
    let autresKinds = 0;
    let complets = 0;
    items.forEach((item) => {
      const donnees = (item && item.dataset) || {};
      const conf = String(donnees.confidence || '');
      const kind = String(donnees.kind || '');
      if (Object.prototype.hasOwnProperty.call(confCounts, conf)) confCounts[conf] += 1;
      if (Object.prototype.hasOwnProperty.call(kindCounts, kind)) kindCounts[kind] += 1;
      else if (kind) autresKinds += 1;
      if (conf.trim() && kind.trim()) complets += 1;
    });
    const completPct = pourcent(complets, items.length);

    let idxCourant = items.findIndex((n) => n && typeof n.getAttribute === 'function'
      && n.getAttribute('aria-current') === 'step');
    if (idxCourant < 0) {
      idxCourant = items.findIndex((n) => n && n.classList && n.classList.contains('is-current'));
    }
    const confCourante = idxCourant >= 0
      ? String((items[idxCourant].dataset && items[idxCourant].dataset.confidence) || '') : '';

    const etape = String((kicker && kicker.textContent) || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
    const statusTotal = String((statut && statut.textContent) || '').match(/sur\s+(\d+)/i);
    const totalRepere = etape ? parseInt(etape[2], 10)
      : (statusTotal ? parseInt(statusTotal[1], 10) : items.length);

    const marqueChip = String((confChip && confChip.textContent) || '').trim().charAt(0);
    const cleChip = MARQUE_CLE[marqueChip] || '';
    const entreeChip = CONF.find(([cle]) => cle === cleChip) || null;
    const libelleChip = entreeChip ? entreeChip[2] : '';

    const resumeTrace = trace ? q(trace, 'summary') : null;
    const paraTrace = trace ? q(trace, 'p') : null;
    const annonceRefs = String((resumeTrace && resumeTrace.textContent) || '').match(/(\d+)\s*référence/i);
    const nbRefsAnnoncees = annonceRefs ? parseInt(annonceRefs[1], 10) : null;
    const idsMatch = String((paraTrace && paraTrace.textContent) || '').match(/Identifiants\s*:\s*([^.]+)/i);
    const listeIds = idsMatch ? idsMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
    const nbIds = listeIds.length;

    const externes = qa(layout, '[src], [href]').filter((n) => {
      const valeur = String((n.getAttribute && (n.getAttribute('src') || n.getAttribute('href'))) || '').trim();
      return /^(https?:)?\/\//i.test(valeur);
    });

    /* E090-01 — Histogramme des degrés de certitude du fil. */
    safe(() => {
      if (!items.length) return;
      const parties = CONF.map(([cle, marque, libelle]) => `${marque} ${libelle} ×${confCounts[cle]}`).join(' · ');
      const noeud = placeApres(fab, corps, 'v2-e090-histo', 'recit-v2-e090-histo',
        statut || titre, `Certitudes du fil : ${parties}.`);
      if (noeud) noeud.setAttribute('aria-label', `Répartition des certitudes du fil : ${parties}.`);
    });

    /* E090-02 — Composition du fil par type de points. */
    safe(() => {
      if (!items.length) return;
      const parties = KINDS.map((cle) => `${cle} ×${kindCounts[cle]}`).join(' · ')
        + (autresKinds ? ` · autre ×${autresKinds}` : '');
      const ancre = document.getElementById('v2-e090-histo') || statut || titre;
      placeApres(fab, corps, 'v2-e090-types', 'recit-v2-e090-types',
        ancre, `Types du fil : ${parties}.`);
    });

    /* E090-03 — Complétude des métadonnées (kind + certitude), référence 100 %. */
    safe(() => {
      if (!items.length) return;
      const ancre = document.getElementById('v2-e090-types') || document.getElementById('v2-e090-histo') || titre;
      placeApres(fab, corps, 'v2-e090-complet', 'recit-v2-e090-complet', ancre,
        `Complétude des métadonnées du fil : ${pluriel(complets, 'point')} sur ${pluriel(items.length, 'point')} renseignés en type et certitude, soit ${completPct} %. Référence d’intégrité : 100 %.`);
    });

    /* E090-04 — Rang du point courant dans le fil affiché. */
    safe(() => {
      if (!items.length || !titre) return;
      const texte = idxCourant >= 0
        ? `Rang du point courant : ${idxCourant + 1} sur ${items.length} · ${pourcent(idxCourant + 1, items.length)} % du fil parcouru.`
        : `Rang du point courant : non déterminé sur le fil affiché (${pluriel(items.length, 'point')}).`;
      placeApres(fab, corps, 'v2-e090-rang', 'recit-v2-e090-rang', titre, texte);
    });

    /* E090-05 — Cohérence entre la pastille de certitude et le point courant. */
    safe(() => {
      if (!meta || !marqueChip) return;
      let texte;
      if (idxCourant >= 0 && confCourante) {
        const ok = cleChip === confCourante;
        const entreeCour = CONF.find(([cle]) => cle === confCourante) || null;
        const libCour = entreeCour ? entreeCour[2] : confCourante;
        texte = `Cohérence de la certitude : ${ok ? 'conforme' : 'divergence détectée'} — pastille « ${marqueChip} ${libelleChip || cleChip} » ${ok ? 'correspond à' : 'diffère de'} la certitude du point courant « ${libCour} ».`;
      } else {
        texte = `Cohérence de la certitude : point courant absent du fil affiché (filtres actifs) — pastille « ${marqueChip} ${libelleChip || cleChip} » non confrontable.`;
      }
      placeApres(fab, corps, 'v2-e090-cohconf', 'recit-v2-e090-cohconf', meta, texte);
    });

    /* E090-06 — Références annoncées vs identifiants réellement listés. */
    safe(() => {
      if (!trace && !sansSource) return;
      let texte;
      if (trace && nbRefsAnnoncees !== null) {
        const ok = nbIds === nbRefsAnnoncees;
        texte = `Cohérence des références : ${pluriel(nbRefsAnnoncees, 'référence')} annoncée${nbRefsAnnoncees === 1 ? '' : 's'} dans le résumé, ${nbIds} identifiant${nbIds === 1 ? '' : 's'} listé${nbIds === 1 ? '' : 's'} — ${ok ? 'conforme' : 'divergence détectée'}.`;
      } else if (sansSource) {
        texte = 'Références du point : aucun identifiant attaché dans le jeu de données.';
      } else {
        texte = 'Références du point : décompte indisponible sur ce rendu.';
      }
      placeApres(fab, corps, 'v2-e090-cohrefs', 'recit-v2-e090-cohrefs', trace || sansSource, texte);
    });

    /* E090-07 — Autonomie hors réseau : seules les URL externes sont comptées. */
    safe(() => {
      const ancre = legend || trace || sansSource || q(corps, '.recit-actions') || titre;
      placeApres(fab, corps, 'v2-e090-reseau', 'recit-v2-e090-reseau', ancre,
        `Autonomie hors réseau : ${externes.length} ressource${externes.length === 1 ? '' : 's'} externe${externes.length === 1 ? '' : 's'} détectée${externes.length === 1 ? '' : 's'} dans la vue — ${externes.length === 0 ? 'aucune dépendance réseau' : 'dépendance réseau présente'}.`);
    });

    /* E090-08 — Portée du filtrage sur les mesures V2. */
    safe(() => {
      if (!items.length) return;
      const ancre = document.getElementById('v2-e090-complet')
        || document.getElementById('v2-e090-types') || titre;
      placeApres(fab, corps, 'v2-e090-portee', 'recit-v2-e090-portee', ancre,
        `Portée des mesures V2 : calculées sur les ${pluriel(items.length, 'point')} affichés après filtrage, sur ${pluriel(totalRepere, 'point')} du repère.`);
    });

    /* E090-09 — Note de méthode : d'où viennent les chiffres affichés. */
    safe(() => {
      const ancre = document.getElementById('v2-e090-reseau') || legend || titre;
      placeApres(fab, corps, 'v2-e090-methode', 'recit-v2-e090-methode', ancre,
        'Méthode V2 : chaque chiffre ci-dessus est recalculé à chaque rendu depuis les textes et attributs réellement présents dans le DOM (libellés, data-kind, data-confidence, résumé de traçabilité, attributs src/href). Aucune valeur n’est mémorisée ni inventée.');
    });

    /* E090-10 — Sceau de traçabilité V2 + garde d'idempotence (attributs sur la
       layout, distincts de `data-e090-provenance` de la passe 1). */
    safe(() => {
      if (typeof layout.setAttribute !== 'function') return;
      const jetons = [
        'notes:9',
        `pts:${items.length}`,
        `cert:${CONF.map(([cle]) => confCounts[cle]).join('-')}`,
        `types:${KINDS.map((cle) => kindCounts[cle]).join('-')}${autresKinds ? `-${autresKinds}` : ''}`,
        `complet:${completPct}%`,
        `rang:${idxCourant >= 0 ? idxCourant + 1 : 0}/${items.length}`,
        `cohcert:${(cleChip && confCourante) ? (cleChip === confCourante ? 'ok' : 'div') : '—'}`,
        `refs:${nbRefsAnnoncees === null ? '—' : nbRefsAnnoncees}/${nbIds}`,
        `ext:${externes.length}`,
        `portee:${items.length}/${totalRepere}`,
        'css:1',
      ];
      layout.setAttribute('data-v2-e090-trace', jetons.join(' '));
      layout.setAttribute('data-v2-e090-pret', '1');
    });
  } catch {
    /* Gardes d'existence : aucune erreur ne doit interrompre le rendu. */
  }
});
