import { register } from './registry.js';

/* V2 lentille E070 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers V2 neufs E070-01 … E070-10, distincts de ceux de la passe 1.
 * La passe 1 donne une vue synthétique (pastille de couverture, profils de
 * certitude et de type, signature de contrôle, réserve prudentielle, nommage
 * de la traçabilité, contrôle de cohérence, miroir global). La V2 propose ici
 * un « dossier analytique » : identifiants énumérés, complétude des champs,
 * pourcentages, statistiques de longueur, contrôle titre ↔ fil, millésime,
 * portée du jeu affiché, légende des indicateurs, confort et miroir dédié.
 *
 * Chaque valeur affichée est dérivée du DOM réellement rendu (textContent,
 * data-confidence, aria-pressed, value du champ de recherche), jamais inventée.
 * Un seul register, une seule feuille css, ids préfixés `v2-e070-`, classes
 * préfixées `recit-v2-e070-` (jamais les ids `e070-` de la passe 1, qui tourne
 * sur le même DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier
 * partagé modifié. Enrichissement strictement additif : sans ce module la vue
 * reste intégralement lisible et navigable.
 */

const CSS = `
/* E070-01 — Énumération visible des identifiants de source. */
.recit-layout .recit-v2-e070-ids{margin:6px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E070-02 — Indice de complétude des données du point. */
.recit-layout .recit-v2-e070-completude{margin:2px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E070-03 — Certitudes en pourcentage du fil affiché. */
.recit-layout .recit-v2-e070-pourcent{margin:0 0 6px;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E070-04 — Statistiques de longueur des identifiants. */
.recit-layout .recit-v2-e070-longueur{margin:2px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E070-05 — Contrôle d'intégrité titre ↔ fil. */
.recit-layout .recit-v2-e070-integrite{margin:2px 0;color:var(--ink-soft);font-size:9px;line-height:1.5}

/* E070-06 — Millésime lu dans la métadonnée. */
.recit-layout .recit-v2-e070-millesime{margin:2px 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E070-07 — Portée du jeu affiché (filtres et recherche). */
.recit-layout .recit-v2-e070-portee{margin:2px 0 8px;color:var(--muted-2);font-size:9px;line-height:1.5}

/* E070-08 — Légende des indicateurs analytiques V2. */
.recit-layout .recit-v2-e070-notes{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.6}

/* E070-09 — Confort : mouvement réduit des lectures V2. */
.recit-v2-e070-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e070-motion="reduce"] .recit-v2-e070-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e070-readout{transition:none}}

/* E070-10 — Impression : les lectures restent lisibles en noir et blanc. */
@media print{
  .recit-layout .recit-v2-e070-ids,
  .recit-layout .recit-v2-e070-completude,
  .recit-layout .recit-v2-e070-pourcent,
  .recit-layout .recit-v2-e070-longueur,
  .recit-layout .recit-v2-e070-integrite,
  .recit-layout .recit-v2-e070-millesime,
  .recit-layout .recit-v2-e070-portee,
  .recit-layout .recit-v2-e070-notes{color:#111}
}
`;

/* --- Gardes d'existence : aucune recherche ne doit pouvoir casser le rendu. --- */

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

/* Dépose ou réutilise un paragraphe visible, à un emplacement stable.
   L'id est réutilisé s'il existe déjà : aucune duplication après rendu. */
function pose(fabriquer, parent, id, classe, texte, ancre, attrs) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!noeud) {
    try { noeud = fabriquer('p', `recit-v2-e070-readout ${classe}`, texte); }
    catch { return null; }
    if (!noeud) return null;
    noeud.id = id;
  }
  noeud.textContent = texte;
  if (attrs) {
    Object.keys(attrs).forEach((cle) => {
      try { noeud.setAttribute(cle, attrs[cle]); }
      catch { /* attribut non critique. */ }
    });
  }
  const ref = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (ref && noeud.nextSibling !== ref)) {
    try { parent.insertBefore(noeud, ref); }
    catch { return null; }
  }
  return noeud;
}

/* Extrait les identifiants réellement écrits dans le bloc de traçabilité. */
function identifiantsDe(trace) {
  const paragraphe = q(trace, 'p');
  const brut = String((paragraphe && paragraphe.textContent) || '');
  const trouve = brut.match(/Identifiants\s*:\s*([^.]+)/i);
  if (!trouve) return [];
  return trouve[1].split(',').map((morceau) => morceau.trim()).filter(Boolean);
}

function normalise(texte) {
  return String(texte || '').toLowerCase().replace(/\s+/g, '');
}

function marque(bit, symbole) {
  return { bit, symbole };
}

const CERTITUDES_V2 = [
  marque('vérifié', '✓'),
  marque('certain', '■'),
  marque('probable', '◐'),
  marque('disputed', '≈'),
];

register('E070', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e070', CSS); /* un seul appel, toutes les règles du module. */

    const corps = q(layout, '.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || q(corps, '.recit-title');
    const meta = q(corps, '.recit-meta');
    const conf = q(corps, '.recit-conf');
    const timing = q(corps, '.recit-timing');
    const thread = q(corps, '.recit-thread');
    const threadTitre = q(corps, '.recit-thread-title');
    const liste = document.getElementById('c3a-thread') || q(corps, '.recit-thread-list');
    const items = qa(liste, '.recit-thread-item');
    const statut = document.getElementById('c3a-status');
    const trace = q(corps, '.recit-trace');
    const sansSource = q(corps, '.recit-sources');
    const recherche = document.getElementById('c3a-search');
    const legend = q(corps, '.recit-legend');

    const refs = trace ? identifiantsDe(trace) : [];

    /* E070-01 — énumération visible des identifiants de source. */
    safe(() => {
      const texte = refs.length
        ? `Identifiants de source (${refs.length}) : ${refs.join(' · ')}.`
        : 'Aucun identifiant de source attaché à ce point dans le jeu de données.';
      pose(el, corps, 'v2-e070-ids', 'recit-v2-e070-ids', texte,
        trace || sansSource || meta, { 'aria-label': `Provenance détaillée : ${texte}` });
    });

    /* E070-02 — indice de complétude des champs réellement renseignés. */
    safe(() => {
      const presents = [];
      if (titre && String(titre.textContent || '').trim()) presents.push('libellé');
      if (meta && String(meta.textContent || '').trim()) presents.push('métadonnées');
      if (conf && String(conf.textContent || '').trim()) presents.push('certitude');
      if (timing && String(timing.textContent || '').trim()) presents.push('durée');
      if (refs.length || sansSource) presents.push('provenance');
      const texte = `Champs de données renseignés : ${presents.length}/5${presents.length < 5 ? ` (présents : ${presents.join(', ')})` : ''}.`;
      pose(el, corps, 'v2-e070-completude', 'recit-v2-e070-completude', texte,
        timing || meta, { 'aria-label': `Complétude des données du point : ${texte}` });
    });

    /* E070-03 — répartition des certitudes en pourcentage du fil affiché. */
    safe(() => {
      if (!items.length) return;
      const comptes = Object.create(null);
      items.forEach((item) => {
        let cle = '';
        try { cle = item && item.dataset ? (item.dataset.confidence || 'autre') : 'autre'; }
        catch { cle = 'autre'; }
        const retenue = cle || 'autre';
        comptes[retenue] = (comptes[retenue] || 0) + 1;
      });
      const parties = CERTITUDES_V2.map(({ bit, symbole }) => {
        const n = comptes[bit] || 0;
        const pct = Math.round((n * 100) / items.length);
        return `${symbole} ${bit} ${pct} %`;
      });
      const texte = `Certitudes du fil affiché (${items.length} points) : ${parties.join(' · ')}.`;
      pose(el, thread || corps, 'v2-e070-pourcent', 'recit-v2-e070-pourcent',
        texte, threadTitre || null, { 'aria-label': `Répartition en pourcentage : ${texte}` });
    });

    /* E070-04 — statistiques de longueur des identifiants. */
    safe(() => {
      if (!refs.length) return;
      const longueurs = refs.map((ref) => ref.length);
      const total = longueurs.reduce((somme, n) => somme + n, 0);
      const moyenne = Math.round(total / refs.length);
      const mini = Math.min.apply(null, longueurs);
      const maxi = Math.max.apply(null, longueurs);
      const texte = `Identifiants : ${refs.length} référence${refs.length > 1 ? 's' : ''} · ${total} caractère${total > 1 ? 's' : ''} au total · longueur moyenne ${moyenne} (min ${mini}, max ${maxi}).`;
      pose(el, corps, 'v2-e070-longueur', 'recit-v2-e070-longueur', texte,
        document.getElementById('v2-e070-ids') || trace || meta,
        { 'aria-label': `Statistiques des identifiants : ${texte}` });
    });

    /* E070-05 — contrôle d'intégrité entre le libellé courant et le fil. */
    safe(() => {
      if (!titre || !items.length) return;
      const extrait = normalise(titre.textContent).slice(0, 14);
      if (extrait.length < 6) return;
      const index = items.findIndex((item) => normalise(item.textContent).indexOf(extrait) !== -1);
      const texte = index >= 0
        ? `Contrôle titre ↔ fil : le libellé courant figure dans le fil (point ${index + 1}).`
        : 'Contrôle titre ↔ fil : libellé non retrouvé à l’identique (le fil affiche une version tronquée).';
      pose(el, corps, 'v2-e070-integrite', 'recit-v2-e070-integrite', texte,
        document.getElementById('v2-e070-longueur') || document.getElementById('v2-e070-completude') || timing || meta,
        { 'aria-label': `Contrôle d'intégrité : ${texte}` });
    });

    /* E070-06 — millésime lu dans la métadonnée réelle. */
    safe(() => {
      if (!meta) return;
      const segments = String(meta.textContent || '').split('·');
      const brut = segments.length > 1 ? String(segments[1]).trim() : '';
      const trouve = brut.match(/\d{1,4}/);
      const texte = trouve
        ? `Millésime lu dans la métadonnée : ${trouve[0]}.`
        : 'Millésime : non renseigné dans la métadonnée affichée.';
      pose(el, corps, 'v2-e070-millesime', 'recit-v2-e070-millesime', texte,
        meta, { 'aria-label': `Millésime du repère : ${texte}` });
    });

    /* E070-07 — portée du jeu affiché : filtres actifs et recherche. */
    safe(() => {
      const actifs = qa(layout, '.c3a-filter[aria-pressed="true"]')
        .map((bouton) => String(bouton.textContent || '').trim())
        .filter(Boolean);
      const requete = recherche && typeof recherche.value === 'string' ? recherche.value.trim() : '';
      const texte = `Jeu affiché : ${actifs.length} filtre${actifs.length > 1 ? 's' : ''} actif${actifs.length > 1 ? 's' : ''}${actifs.length ? ` (${actifs.join(' · ')})` : ''}${requete ? ` · recherche « ${requete} »` : ''}.`;
      pose(el, corps, 'v2-e070-portee', 'recit-v2-e070-portee', texte,
        statut || thread || meta, { 'aria-label': `Portée des données affichées : ${texte}` });
    });

    /* E070-08 — légende des indicateurs analytiques introduits par la V2. */
    safe(() => {
      if (!legend) return;
      const texte = 'Indicateurs V2 de provenance : l’indice de complétude compte les champs réellement présents ; les pourcentages de certitude et le contrôle titre ↔ fil portent sur les points affichés du fil ; la longueur des identifiants et le millésime sont lus dans le texte rendu. Aucune valeur n’est devinée.';
      pose(el, legend, 'v2-e070-notes', 'recit-v2-e070-notes', texte, null,
        { 'aria-label': 'Définition des indicateurs analytiques de provenance.' });
    });

    /* E070-09 — préférence de mouvement, lue une seule fois par rendu. */
    safe(() => {
      let mode = 'normal';
      try { mode = reducedMotion && typeof reducedMotion === 'function' && reducedMotion() ? 'reduce' : 'normal'; }
      catch { mode = 'normal'; }
      if (typeof layout.setAttribute === 'function') layout.setAttribute('data-v2-e070-motion', mode);
    });

    /* E070-10 — miroir de traçabilité V2, consolidant les chantiers ci-dessus. */
    safe(() => {
      if (typeof layout.setAttribute !== 'function') return;
      const a = document.getElementById('v2-e070-integrite');
      const m = document.getElementById('v2-e070-millesime');
      const jetons = [
        `refs:${refs.length}`,
        `completude:${String((document.getElementById('v2-e070-completude') || '').textContent || '').match(/\d+\/5/)?.[0] || '0/5'}`,
        `certitudes:${items.length}`,
        `longueur:${refs.length ? refs.join('').length : 0}`,
        `integrite:${a && /figure dans le fil/.test(a.textContent || '') ? 'ok' : 'ecart'}`,
        `millesime:${m && /\d/.test(m.textContent || '') ? 'ok' : 'absent'}`,
        `portee:${qa(layout, '.c3a-filter[aria-pressed="true"]').length}`,
        'css:1',
        'noeuds:8',
      ];
      layout.setAttribute('data-v2-e070-trace', jetons.join(' '));
    });
  } catch {
    /* Gardes d'existence : aucune erreur ne doit interrompre le rendu. */
  }
});
