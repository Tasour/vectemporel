import { register } from './registry.js';
import { DATASET } from '../../data/dataset.js';

/* Lentille E010 — Données, traçabilité et provenance (vague RÉCIT).
 *
 * Dix chantiers E010-01..10, tous implémentés ici. Un seul enregistrement,
 * une seule feuille de style `recit-e010`, toutes les classes préfixées
 * `recit-e010-`, tous les ids DOM préfixés `e010-` et uniques. Zéro console,
 * zéro réseau, zéro aléa, aucun fichier partagé modifié. Les nœuds sont créés de façon non destructive
 * à l'intérieur de `.recit-body` : sans JS, la vue reste lisible et le fil
 * reste construisable. Les compteurs globaux sont calculés une fois depuis le
 * jeu de données local (aucune valeur codée en dur, aucun appel réseau).
 *
 * Lectures seules : src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/recit.js, src/data/dataset.js, src/views/_diagnostics.js.
 */

const KIND_ORDER = ['récit', 'figure', 'lieu', 'audit'];
const CONF_ORDER = ['vérifié', 'certain', 'probable', 'disputed'];

/* STATS : dérivé du jeu de données, déterministe, sans aucun aléa.
 * Le repli `empty` garantit qu'une forme inattendue du jeu ne fait jamais
 * lever d'exception (aucun `throw` dans la lentille). */
const STATS = (() => {
  const empty = {
    total: 0, withSources: 0, withoutSources: 0,
    byKind: {}, byConfidence: {}, meta: {},
  };
  try {
    const jeu = DATASET || {};
    const byKind = {};
    const byConfidence = {};
    let total = 0;
    let withSources = 0;
    const pays = Array.isArray(jeu.countries) ? jeu.countries : [];
    for (const paysItem of pays) {
      const evenements = paysItem && Array.isArray(paysItem.events) ? paysItem.events : [];
      for (const evenement of evenements) {
        const points = evenement && Array.isArray(evenement.points) ? evenement.points : [];
        for (const point of points) {
          if (!point) continue;
          total += 1;
          const type = String(point.kind || 'point');
          const certitude = String(point.confidence || '—');
          byKind[type] = (byKind[type] || 0) + 1;
          byConfidence[certitude] = (byConfidence[certitude] || 0) + 1;
          if (Array.isArray(point.sources) && point.sources.length > 0) withSources += 1;
        }
      }
    }
    return {
      total,
      withSources,
      withoutSources: total - withSources,
      byKind,
      byConfidence,
      meta: jeu.meta && typeof jeu.meta === 'object' ? jeu.meta : {},
    };
  } catch {
    return empty;
  }
})();

function ordered(map, ordre) {
  const clefs = Object.keys(map || {});
  const devant = ordre.filter((clef) => clefs.includes(clef));
  const reste = clefs.filter((clef) => !ordre.includes(clef)).sort();
  return [...devant, ...reste].map((clef) => [clef, map[clef]]);
}

function pourcentage(part, tout) {
  return tout > 0 ? `${Math.round((part / tout) * 100)} %` : '—';
}

const CSS = `
.recit-e010-scope .recit-e010-fiche,
.recit-e010-scope .recit-e010-panel,
.recit-e010-scope .recit-e010-glossary,
.recit-e010-scope .recit-e010-verif{margin:14px 0;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:rgba(127,156,255,.035)}
.recit-e010-h{margin:0 0 8px;color:var(--gold-bright);font-family:var(--serif);font-size:13px;font-weight:450}
.recit-e010-note{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.55}
.recit-e010-dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;font-size:9px;line-height:1.55}
.recit-e010-dt{color:var(--muted);font-weight:600}
.recit-e010-dd{margin:0;color:var(--ink-soft);overflow-wrap:anywhere}
.recit-e010-absence,
.recit-e010-presence{margin:6px 0;padding:6px 9px;border-left:2px solid var(--line-strong);color:var(--muted);font-size:9px;line-height:1.55}
.recit-e010-sources{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:5px}
.recit-e010-chip{padding:2px 7px;border:1px solid var(--line);border-radius:999px;color:var(--gold-bright);font-size:9px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.recit-e010-table{width:100%;border-collapse:collapse;font-size:9px;font-variant-numeric:tabular-nums}
.recit-e010-cap{margin:0 0 6px;color:var(--muted);font-size:9px;text-align:left}
.recit-e010-table th,
.recit-e010-table td{padding:4px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.recit-e010-table thead th{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.08em}
.recit-e010-table tbody th{color:var(--muted);font-weight:450}
.recit-e010-table tbody td{color:var(--ink);font-weight:600}
.recit-e010-dist-group + .recit-e010-dist-group{margin-top:10px}
.recit-e010-dist{margin:6px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:5px}
.recit-e010-dist li{display:flex;justify-content:space-between;gap:8px;padding:4px 7px;border:1px solid var(--line);border-radius:6px;font-size:9px}
.recit-e010-dist-label{color:var(--muted)}
.recit-e010-dist-value{color:var(--gold-bright);font-variant-numeric:tabular-nums;font-weight:600}
.recit-e010-thread-stats{margin:8px 0 0;padding-top:8px;border-top:1px solid var(--line);color:var(--muted);font-size:9px;line-height:1.6}
.recit-e010-glossary summary{min-height:30px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright);font-size:11px}
.recit-e010-glossary summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e010-glossary[open] .recit-e010-dl{margin-top:9px}
.recit-e010-dataset{margin:12px 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.6;overflow-wrap:anywhere}
.recit-e010-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e010-btn:hover{border-color:var(--gold)}
.recit-e010-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e010-readout{margin:8px 0 0;padding:7px 9px;border-left:2px solid var(--blue);background:rgba(8,11,16,.5);color:var(--ink-soft);font-size:9px;line-height:1.65;font-variant-numeric:tabular-nums}
.recit-e010-verif[data-e010-chain="complet"] .recit-e010-readout{border-left-color:var(--gold)}
@media (max-width:620px){
  .recit-e010-scope .recit-e010-fiche,
  .recit-e010-scope .recit-e010-panel,
  .recit-e010-scope .recit-e010-glossary,
  .recit-e010-scope .recit-e010-verif{padding:8px}
  .recit-e010-dl{grid-template-columns:1fr;gap:2px}
  .recit-e010-dist{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){.recit-e010-btn{transition:none}}
.recit-e010-scope[data-e010-reduced="1"] .recit-e010-btn{transition:none}
`;

register('E010', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!stage || !layout || typeof css !== 'function' || typeof el !== 'function') return;
  const corps = layout.querySelector('.recit-body');
  if (!corps) return;

  /* Injection unique + ancrage de portée (le CSS est groupé en un seul bloc). */
  css('recit-e010', CSS);
  corps.classList.add('recit-e010-scope');

  const mk = (tag, classe, texte) => el(tag, classe || null, texte);

  /* getOrCreate : id unique, garde anti-doublon, jamais de throw. Tous les
     nœuds porteurs d'un id sont déposés dans `.recit-body` (ou ses enfants) :
     leur parent n'est ni stage ni layout, donc le tiroir de _diagnostics.js
     (/^(e\d{2,3}[-_ ]|.*-e\d{2,3})/) ne les masque pas par défaut. */
  const getOrCreate = (id, tag, classe, parent) => {
    if (!parent) return null;
    let noeud = document.getElementById(id);
    if (!noeud || noeud.parentNode !== parent) {
      noeud = mk(tag, classe);
      noeud.id = id;
    }
    if (noeud.parentNode !== parent) {
      try { parent.appendChild(noeud); } catch { return null; }
    }
    return noeud;
  };
  const apres = (ancre, noeud) => {
    if (!ancre || !noeud || !ancre.parentNode) return;
    if (ancre.nextSibling) ancre.parentNode.insertBefore(noeud, ancre.nextSibling);
    else ancre.parentNode.appendChild(noeud);
  };
  const titre = (id, texte) => {
    const h = mk('h2', 'recit-e010-h', texte);
    h.id = id;
    return h;
  };
  const ligne = (dl, terme, valeur) => {
    const dt = mk('dt', 'recit-e010-dt', terme);
    const dd = mk('dd', 'recit-e010-dd', valeur);
    dl.append(dt, dd);
  };
  const tableau = (captionTexte, lignes) => {
    const table = mk('table', 'recit-e010-table');
    table.appendChild(mk('caption', 'recit-e010-cap', captionTexte));
    const thead = mk('thead');
    const trHead = mk('tr');
    ['Indicateur', 'Valeur'].forEach((libelle) => {
      const th = mk('th', null, libelle);
      th.setAttribute('scope', 'col');
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    const tbody = mk('tbody');
    lignes.forEach(([libelle, valeur]) => {
      const tr = mk('tr');
      const th = mk('th', null, libelle);
      th.setAttribute('scope', 'row');
      tr.append(th, mk('td', null, valeur));
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    return table;
  };

  const ancre = corps.querySelector('.recit-trace') || corps.querySelector('.recit-sources');
  const kicker = corps.querySelector('.view-kicker');
  const chipConf = corps.querySelector('.recit-conf');
  const courant = corps.querySelector('.recit-thread-item.is-current');

  /* E010-01 — Fiche de provenance du point courant. */
  const fiche = getOrCreate('e010-fiche', 'section', 'recit-e010-fiche', corps);
  if (fiche) {
    fiche.setAttribute('aria-labelledby', 'e010-fiche-title');
    let h = document.getElementById('e010-fiche-title');
    if (!h || h.parentNode !== fiche) { h = titre('e010-fiche-title', 'Fiche de provenance du point courant'); fiche.appendChild(h); }
    let dl = fiche.querySelector('dl');
    if (!dl) { dl = mk('dl', 'recit-e010-dl'); fiche.appendChild(dl); }
    dl.replaceChildren();
    const resumeTrace = corps.querySelector('.recit-trace summary');
    const references = resumeTrace
      ? resumeTrace.textContent.trim()
      : (corps.querySelector('.recit-sources') ? 'Aucun identifiant attaché à ce point' : 'Non déterminé');
    ligne(dl, 'Rang dans le repère', kicker ? kicker.textContent.trim() : 'Non déterminé');
    ligne(dl, 'Type de point', courant && courant.dataset.kind ? courant.dataset.kind : 'Non déterminé');
    ligne(dl, 'Certitude', chipConf
      ? `${chipConf.textContent.trim()} — ${chipConf.title || 'mention reprise de l’audit'}`
      : 'Non déterminée');
    ligne(dl, 'Références', references);
    apres(ancre, fiche);
  }

  /* E010-02 — Signal textuel explicite de présence / absence de source.
     L'absence est une donnée, jamais déduite de la seule couleur. */
  const sansSource = corps.querySelector('.recit-sources');
  if (sansSource) {
    const marque = getOrCreate('e010-absence', 'p', 'recit-e010-absence', corps);
    if (marque) {
      marque.textContent = '∅ Provenance non renseignée : l’absence de référence est un état de la donnée, pas une erreur de rendu.';
      apres(sansSource, marque);
    }
  } else if (ancre && ancre.classList.contains('recit-trace')) {
    const marque = getOrCreate('e010-presence', 'p', 'recit-e010-presence', corps);
    if (marque) {
      marque.textContent = '✓ Provenance renseignée : au moins un identifiant de source est attaché à ce point.';
      apres(ancre, marque);
    }
  }

  /* E010-03 — Identifiants de source en puces sémantiques (non destructif). */
  const trace = corps.querySelector('.recit-trace');
  if (trace) {
    let liste = document.getElementById('e010-source-list');
    if (!liste || liste.parentNode !== trace) {
      liste = mk('ul', 'recit-e010-sources');
      liste.id = 'e010-source-list';
      liste.setAttribute('aria-label', 'Identifiants de source du point courant');
      trace.appendChild(liste);
    }
    const trouvailles = (trace.textContent || '').match(/SRC[- ][0-9]+/gi) || [];
    const identifiants = [...new Set(trouvailles.map((id) => id.replace(/\s+/g, '-').toUpperCase()))];
    liste.replaceChildren();
    if (identifiants.length) {
      identifiants.forEach((id) => liste.appendChild(mk('li', 'recit-e010-chip', id)));
    } else {
      liste.appendChild(mk('li', 'recit-e010-chip', 'Référence locale'));
    }
  }

  /* E010-04 — Tableau de bord des données du jeu complet. */
  const tableauBord = getOrCreate('e010-dashboard', 'section', 'recit-e010-panel', corps);
  if (tableauBord) {
    tableauBord.setAttribute('aria-labelledby', 'e010-dashboard-title');
    let h = document.getElementById('e010-dashboard-title');
    if (!h || h.parentNode !== tableauBord) { h = titre('e010-dashboard-title', 'Données — vue d’ensemble du jeu'); tableauBord.appendChild(h); }
    const note = getOrCreate('e010-dashboard-note', 'p', 'recit-e010-note', tableauBord);
    if (note) note.textContent = 'Chiffres calculés depuis le jeu de données local, sans appel réseau.';
    const table = tableau(
      'Couverture des références sur l’ensemble des points',
      [
        ['Points du jeu', String(STATS.total)],
        ['Points avec référence', String(STATS.withSources)],
        ['Points sans référence', String(STATS.withoutSources)],
        ['Couverture', pourcentage(STATS.withSources, STATS.total)],
      ]
    );
    const ancien = tableauBord.querySelector('table');
    if (ancien) ancien.replaceWith(table); else tableauBord.appendChild(table);
  }

  /* E010-05 — Répartition par type de point et par degré de certitude. */
  const repartition = getOrCreate('e010-distribution', 'section', 'recit-e010-panel', corps);
  if (repartition) {
    repartition.setAttribute('aria-labelledby', 'e010-distribution-title');
    let h = document.getElementById('e010-distribution-title');
    if (!h || h.parentNode !== repartition) { h = titre('e010-distribution-title', 'Données — répartition des points'); repartition.appendChild(h); }
    let groupes = repartition.querySelector('.recit-e010-dist-groups');
    if (!groupes) { groupes = mk('div', 'recit-e010-dist-groups'); repartition.appendChild(groupes); }
    groupes.replaceChildren();
    const familles = [
      ['Types de points', ordered(STATS.byKind, KIND_ORDER)],
      ['Degrés de certitude', ordered(STATS.byConfidence, CONF_ORDER)],
    ];
    familles.forEach(([libelle, entrees]) => {
      const bloc = mk('div', 'recit-e010-dist-group');
      bloc.appendChild(mk('p', 'recit-e010-note', libelle));
      const liste = mk('ul', 'recit-e010-dist');
      liste.setAttribute('aria-label', libelle);
      entrees.forEach(([clef, compte]) => {
        const item = mk('li');
        item.append(mk('span', 'recit-e010-dist-label', clef), mk('span', 'recit-e010-dist-value', String(compte)));
        liste.appendChild(item);
      });
      bloc.appendChild(liste);
      groupes.appendChild(bloc);
    });
  }

  /* E010-06 — Signature de traçabilité du fil, dérivée des data-* du DOM. */
  const fil = corps.querySelector('.recit-thread');
  if (fil) {
    const items = Array.from(fil.querySelectorAll('.recit-thread-item'));
    const total = items.length;
    const parType = {};
    const parConf = {};
    items.forEach((item) => {
      const type = item.dataset.kind || 'point';
      const conf = item.dataset.confidence || '—';
      parType[type] = (parType[type] || 0) + 1;
      parConf[conf] = (parConf[conf] || 0) + 1;
    });
    const signature = `Fil du repère · ${total} point(s) affiché(s) · types : ${ordered(parType, KIND_ORDER).map(([c, n]) => `${c} ${n}`).join(', ') || 'aucun'} · certitudes : ${ordered(parConf, CONF_ORDER).map(([c, n]) => `${c} ${n}`).join(', ') || 'aucune'}.`;
    const stat = getOrCreate('e010-thread-stats', 'p', 'recit-e010-thread-stats', fil);
    if (stat) stat.textContent = signature;
  }

  /* E010-07 — Glossaire des données et de la traçabilité. */
  const glossaire = getOrCreate('e010-glossary', 'details', 'recit-e010-glossary', corps);
  if (glossaire) {
    let summary = glossaire.querySelector(':scope > summary');
    if (!summary) { summary = mk('summary', null, 'Glossaire des données et de la traçabilité'); glossaire.appendChild(summary); }
    let defs = glossaire.querySelector(':scope > dl');
    if (!defs) { defs = mk('dl', 'recit-e010-dl'); glossaire.appendChild(defs); }
    defs.replaceChildren();
    const notions = [
      ['Point', 'Unité élémentaire du jeu : un énoncé court associé à un type et à un degré de certitude.'],
      ['Type', 'Nature de l’énoncé : récit, figure, lieu ou audit.'],
      ['Certitude', 'Mention d’audit reprise telle quelle : vérifié, certain, probable ou contesté (terme source « disputed »).'],
      ['Source', 'Référence locale identifiée, consultable dans le registre hors de cette vue ; aucun lien externe.'],
      ['Identifiant SRC', 'Code court (par exemple SRC-001) qui désigne une source dans le jeu de données local.'],
      ['Omission de source', 'Absence d’identifiant attaché à un point : un état de la donnée, signalé explicitement et non masqué.'],
      ['Couverture', 'Part des points pour lesquels au moins une référence est renseignée.'],
    ];
    notions.forEach(([terme, definition]) => ligne(defs, terme, definition));
  }

  /* E010-08 — Méta-provenance : identité et origine du jeu de données. */
  const meta = STATS.meta || {};
  const provenance = getOrCreate('e010-dataset-meta', 'p', 'recit-e010-dataset', corps);
  if (provenance) {
    provenance.textContent = [
      `Jeu de données local « ${meta.name || 'Vectemporel'} »`,
      meta.version ? `version ${meta.version}` : null,
      meta.generated ? `généré le ${meta.generated}` : null,
      meta.source ? `origine : ${meta.source}` : null,
      meta.externalLinks === false ? 'aucun lien externe' : null,
    ].filter(Boolean).join(' · ') + '.';
  }

  /* E010-09 — Vérificateur de chaîne : contrôle local, rejouable, sans réseau. */
  const verif = getOrCreate('e010-verif', 'section', 'recit-e010-verif', corps);
  if (verif) {
    verif.setAttribute('aria-labelledby', 'e010-verif-title');
    let h = document.getElementById('e010-verif-title');
    if (!h || h.parentNode !== verif) { h = titre('e010-verif-title', 'Vérificateur de chaîne de traçabilité'); verif.appendChild(h); }
    const consigne = getOrCreate('e010-verif-note', 'p', 'recit-e010-note', verif);
    if (consigne) consigne.textContent = 'Contrôle rejouable : il relit le DOM affiché et vérifie que le point courant porte un rang, un type, une certitude et une référence.';
    const bouton = getOrCreate('e010-verif-button', 'button', 'recit-e010-btn', verif);
    if (bouton) {
      bouton.type = 'button';
      bouton.textContent = 'Vérifier la chaîne';
      if (bouton.dataset.e010Bound !== '1') {
        bouton.dataset.e010Bound = '1';
        bouton.addEventListener('click', () => {
          const k = corps.querySelector('.view-kicker');
          const c = corps.querySelector('.recit-conf');
          const item = corps.querySelector('.recit-thread-item.is-current');
          const aTrace = Boolean(corps.querySelector('.recit-trace'));
          const controles = [
            ['rang', Boolean(k && k.textContent.trim())],
            ['type', Boolean(item && item.dataset.kind)],
            ['certitude', Boolean(c && c.textContent.trim())],
            ['référence', aTrace],
          ];
          const complet = controles.every(([, ok]) => ok);
          const detail = controles.map(([nom, ok]) => `${nom} : ${ok ? 'présent' : 'absent'}`).join(' · ');
          const sortie = document.getElementById('e010-verif-readout');
          if (sortie) {
            sortie.textContent = `Chaîne ${complet ? 'complète' : 'incomplète'} — ${detail}. Contrôle dérivé du DOM affiché.`;
          }
          verif.setAttribute('data-e010-chain', complet ? 'complet' : 'incomplet');
        });
      }
    }
    const sortie = getOrCreate('e010-verif-readout', 'p', 'recit-e010-readout', verif);
    if (sortie) {
      sortie.setAttribute('role', 'status');
      sortie.setAttribute('aria-live', 'polite');
    }
  }

  /* E010-10 — Robustesse : couplage mouvement réduit, état non périmé, focus.
     La préférence est lue au rendu : la requête média et le
     repli programmatique de ctx.reducedMotion(). Les boutons créés portent
     type="button" et un :focus-visible (voir CSS). */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    corps.setAttribute('data-e010-reduced', '1');
  } else {
    corps.removeAttribute('data-e010-reduced');
  }
  const sortieFinale = document.getElementById('e010-verif-readout');
  const verifFinale = document.getElementById('e010-verif');
  if (sortieFinale) sortieFinale.textContent = 'Chaîne non encore vérifiée. Lancez le contrôle.';
  if (verifFinale) verifFinale.removeAttribute('data-e010-chain');
});
