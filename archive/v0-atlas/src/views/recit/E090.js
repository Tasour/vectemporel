import { register } from './registry.js';

/* Lentille E090 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers E090-01 … E090-10, tous implémentés ici. Rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E090.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js.
 *
 * Une seule feuille de style (`recit-e090`), un seul enregistrement, des ids
 * préfixés `e090-` et uniques, des classes préfixées `recit-e090-`. Aucun appel
 * réseau, aucune sortie de débogage, aucune source d'aléa : chaque valeur est
 * recalculée depuis le texte ou les attributs réellement rendus par la vue.
 * Enrichissement strictement additif : sans JS, la vue reste lisible.
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
.recit-layout .recit-e090-origin{margin:6px 0 2px;padding-left:8px;border-left:2px solid var(--line-strong);color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-layout .recit-e090-key{margin-left:8px;padding:1px 6px;border:1px dotted var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap;font-variant-numeric:tabular-nums}
.recit-layout .recit-e090-fiche{margin:10px 0 2px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-layout .recit-e090-fiche-titre{margin:0 0 6px;color:var(--muted);font-size:9px;letter-spacing:.06em;text-transform:uppercase}
.recit-layout .recit-e090-fiche-liste{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:3px 16px}
.recit-layout .recit-e090-fiche-entree{color:var(--ink-soft);font-size:10px;font-variant-numeric:tabular-nums}
.recit-layout .recit-e090-fiche-entree b{color:var(--muted);font-weight:400}
.recit-layout .recit-e090-metrique{margin:5px 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout .recit-e090-reserve{margin:6px 0;padding-left:8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:10px;line-height:1.5}
.recit-layout .recit-e090-trace-note{margin-top:5px;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-layout .recit-e090-sceau{margin:4px 0;color:var(--muted-2);font-size:8px;letter-spacing:.03em;font-variant-numeric:tabular-nums}
.recit-layout[data-e090-motion="reduce"] .recit-e090-fiche,
.recit-layout[data-e090-motion="reduce"] .recit-e090-origin{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout .recit-e090-fiche,
  .recit-layout .recit-e090-origin{transition:none}
}
@media print{
  .recit-layout .recit-e090-origin,
  .recit-layout .recit-e090-fiche,
  .recit-layout .recit-e090-reserve{color:#111;border-color:#777;background:none}
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

function assure(parent, id, balise, classe, fabrique) {
  if (!parent || typeof parent.appendChild !== 'function' || !id) return null;
  let noeud = q(parent, `#${id}`);
  if (noeud && noeud.parentElement === parent) return noeud;
  if (!noeud) noeud = cree(fabrique, balise, classe);
  if (!noeud) return null;
  noeud.id = id;
  try { parent.appendChild(noeud); }
  catch { return null; }
  return noeud;
}

function retire(parent, id) {
  const noeud = parent ? q(parent, `#${id}`) : null;
  if (noeud && typeof noeud.remove === 'function') noeud.remove();
}

function vide(noeud) {
  if (!noeud) return;
  try { while (noeud.firstChild) noeud.removeChild(noeud.firstChild); }
  catch { /* contenu laissé en place en cas d'échec. */ }
}

function apres(noeud, reference, parent) {
  if (!noeud || !parent || typeof parent.insertBefore !== 'function') return;
  if (reference && reference.parentNode === parent) parent.insertBefore(noeud, reference.nextSibling);
  else {
    try { parent.appendChild(noeud); } catch { /* sans objet. */ }
  }
}

function poserSiAbsent(noeud, attribut, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  if (typeof noeud.hasAttribute === 'function' && noeud.hasAttribute(attribut)) return;
  noeud.setAttribute(attribut, valeur);
}

/* Signature légère et déterministe : résultat stable pour un même libellé,
   donc comparable d'un rendu à l'autre. Aucune source d'aléa. */
function empreinte(texte) {
  const chaine = String(texte || '');
  let h = 2166136261;
  for (let i = 0; i < chaine.length; i += 1) {
    h = (h ^ chaine.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 65536).toString(16).toUpperCase().padStart(4, '0');
}

function nombre(match, rang) {
  return match ? parseInt(match[rang], 10) : null;
}

function pluriel(n, mot) {
  const v = n === null || n === undefined ? '—' : String(n);
  return `${v} ${mot}${n === 1 ? '' : 's'}`;
}

register('E090', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, stage, css, el, reducedMotion } = ctx;
    if (typeof css === 'function') css('recit-e090', CSS);
    const racine = layout || stage;
    if (!racine || typeof racine.querySelector !== 'function') return;
    if (typeof racine.hasAttribute === 'function' && racine.hasAttribute('data-e090-provenance')) return;

    const corps = q(racine, '.recit-body');
    const meta = q(racine, '.recit-meta');
    const kicker = q(racine, '.view-kicker');
    const titre = document.getElementById('recit-point-title');
    const confChip = q(racine, '.recit-conf');
    const statut = q(racine, '.c3a-status');
    const fil = q(racine, '.recit-thread');
    const liste = q(racine, '.recit-thread-list');
    const items = qa(liste, '.recit-thread-item');
    const trace = q(racine, '.recit-trace');
    const resume = trace ? q(trace, 'summary') : null;
    const texteTrace = trace ? q(trace, 'p') : null;
    const sansSource = q(racine, '.recit-sources');
    const legend = q(racine, '.recit-legend');

    const libelleKicker = String((kicker && kicker.textContent) || '');
    const libelleStatut = String((statut && statut.textContent) || '');
    const libelleTitre = String((titre && titre.textContent) || '');
    const libelleConf = String((confChip && confChip.textContent) || '');
    const etape = libelleKicker.match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
    const comptage = libelleStatut.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
    const total = nombre(etape, 2) !== null ? nombre(etape, 2) : nombre(comptage, 2);
    const affiches = nombre(comptage, 1);
    const courant = q(racine, '.recit-thread-item[aria-current="step"]');
    let confCle = courant && courant.dataset ? (courant.dataset.confidence || '') : '';
    if (!confCle) {
      const marque = libelleConf.trim().charAt(0);
      const parMarque = { '✓': 'vérifié', '■': 'certain', '◐': 'probable', '≈': 'disputed' };
      confCle = parMarque[marque] || '';
    }
    const confEntree = CERTITUDES.find(([cle]) => cle === confCle) || null;
    const prudent = confCle === 'probable' || confCle === 'disputed';

    let nbSources = 0;
    const mention = String((resume && resume.textContent) || '').match(/(\d+)\s*référence/i);
    if (mention) nbSources = nombre(mention, 1) || 0;
    const identifiants = (() => {
      const brut = String((texteTrace && texteTrace.textContent) || '');
      const trouve = brut.match(/Identifiants\s*:\s*([^.]+)/i);
      return trouve ? trouve[1].trim() : '';
    })();

    const comptesConf = Object.create(null);
    const comptesType = Object.create(null);
    items.forEach((item) => {
      const c = (item && item.dataset && item.dataset.confidence) || 'autre';
      const k = (item && item.dataset && item.dataset.kind) || 'autre';
      comptesConf[c] = (comptesConf[c] || 0) + 1;
      comptesType[k] = (comptesType[k] || 0) + 1;
    });
    const fiables = (comptesConf['vérifié'] || 0) + (comptesConf.certain || 0);
    const couverture = items.length ? fiables / items.length : 0;
    const masques = total !== null && affiches !== null ? Math.max(0, total - affiches) : null;
    const clePoint = empreinte(`${libelleTitre}|${libelleKicker}`);
    const empreinteFil = empreinte(items.map((it) => (it && it.textContent) || '').join('¦'));

    /* E090-01 — Bandeau d'origine des données. */
    safe(() => {
      if (!corps) return;
      const note = assure(corps, 'e090-origin', 'p', 'recit-e090-origin', el);
      if (!note) return;
      note.textContent = 'Origine des données : cette vue est construite uniquement à partir des audits et du registre local. Aucun fait historique n’est ajouté ici ; les libellés ci-dessous sont calculés depuis les champs réellement affichés.';
      note.setAttribute('aria-label', 'Origine et limites du jeu de données affiché.');
      apres(note, q(corps, '.view-kicker'), corps);
    });

    /* E090-02 — Fiche de provenance consolidée du point courant. */
    safe(() => {
      if (!corps) return;
      const fiche = assure(corps, 'e090-fiche', 'div', 'recit-e090-fiche', el);
      if (!fiche) return;
      vide(fiche);
      fiche.appendChild(cree(el, 'p', 'recit-e090-fiche-titre', 'Fiche de provenance du point'));
      const listeInterne = cree(el, 'ul', 'recit-e090-fiche-liste');
      const champs = [
        ['Type', (courant && courant.dataset && courant.dataset.kind) || (libelleKicker.split('·').pop() || '').trim() || '—'],
        ['Certitude', confEntree ? confEntree[2] : (libelleConf || '—')],
        ['Références locales', pluriel(nbSources, 'référence')],
        ['Identifiants', identifiants ? identifiants.slice(0, 120) : 'aucun'],
      ];
      champs.forEach(([nom, valeur]) => {
        const ligne = cree(el, 'li', 'recit-e090-fiche-entree');
        if (!ligne) return;
        ligne.appendChild(cree(el, 'b', '', `${nom} : `));
        ligne.appendChild(document.createTextNode(String(valeur)));
        if (listeInterne) listeInterne.appendChild(ligne);
      });
      if (listeInterne) fiche.appendChild(listeInterne);
      fiche.setAttribute('aria-label', 'Récapitulatif de la provenance du point courant : type, certitude, références et identifiants.');
      apres(fiche, trace || sansSource || fil, corps);
    });

    /* E090-03 — Clé d'identification stable du libellé courant. */
    safe(() => {
      if (!meta) return;
      const cle = assure(meta, 'e090-key', 'span', 'recit-e090-key', el);
      if (!cle) return;
      cle.textContent = `Clé ${clePoint}`;
      cle.setAttribute('title', 'Empreinte déterministe du libellé et de l’étape : stable d’un rendu à l’autre.');
      cle.setAttribute('aria-label', `Clé d’identification stable du point courant : ${clePoint}.`);
      if (titre && typeof titre.setAttribute === 'function') titre.setAttribute('data-e090-key', clePoint);
    });

    /* E090-04 — Compteur de traçabilité du fil (avec référence explicite). */
    safe(() => {
      if (!corps) return;
      const note = assure(corps, 'e090-coverage', 'p', 'recit-e090-metrique recit-e090-coverage', el);
      if (!note) return;
      const pourcent = items.length ? Math.round(couverture * 100) : 0;
      note.textContent = `Traçabilité du fil : ${pluriel(fiables, 'point')} sur ${pluriel(items.length, 'point')} portent une mention vérifiée ou certaine, soit ${pourcent} %. Référence d’intégrité : 100 %.`;
      note.setAttribute('aria-label', note.textContent);
      apres(note, statut && statut.parentNode === corps ? statut : fil, corps);
    });

    /* E090-05 — Points masqués par les filtres (intégrité du comptage). */
    safe(() => {
      if (!corps) return;
      const note = assure(corps, 'e090-masques', 'p', 'recit-e090-metrique recit-e090-masques', el);
      if (!note) return;
      note.textContent = masques === null
        ? 'Contrôle du filtrage : compteurs indisponibles sur ce rendu.'
        : `Contrôle du filtrage : ${pluriel(masques, 'point')} masqué${masques === 1 ? '' : 's'} par les critères actifs sur ${pluriel(total, 'point')} ; ils sont filtrés, non absents du jeu de données.`;
      note.setAttribute('aria-label', note.textContent);
      apres(note, q(corps, '#e090-coverage'), corps);
    });

    /* E090-06 — Réserve sur les mentions prudentielles. */
    safe(() => {
      if (!corps) return;
      if (!prudent) { retire(corps, 'e090-reserve'); return; }
      const note = assure(corps, 'e090-reserve', 'p', 'recit-e090-reserve', el);
      if (!note) return;
      note.textContent = confCle === 'disputed'
        ? '≈ Réserve de provenance : ce point porte la mention source « disputed », traduite par « contesté ». Elle doit être lue comme une affirmation discutée, non comme un fait établi.'
        : '◐ Réserve de provenance : ce point est avancé avec la mention « probable » ; son degré de certitude est intermédiaire.';
      note.setAttribute('role', 'note');
      note.setAttribute('aria-label', note.textContent);
      apres(note, q(corps, '#e090-fiche'), corps);
    });

    /* E090-07 — Accessibilité de la traçabilité et portée des identifiants. */
    safe(() => {
      if (!trace) return;
      if (identifiants && typeof trace.setAttribute === 'function') {
        trace.setAttribute('data-e090-ids', identifiants.slice(0, 240));
      }
      const note = assure(trace, 'e090-trace-note', 'p', 'recit-e090-trace-note', el);
      if (note) {
        note.textContent = 'Les identifiants affichés sont des clés du registre local : ils permettent de remonter au libellé d’origine sans quitter l’atlas ni charger de ressource externe.';
        note.setAttribute('aria-label', 'Portée des identifiants de traçabilité.');
      }
      if (resume) {
        poserSiAbsent(resume, 'aria-label', `Traçabilité : ${pluriel(nbSources, 'référence')} ; ${identifiants ? `identifiants : ${identifiants}.` : 'aucun identifiant.'}`);
        if (note) {
          const deja = String(resume.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
          if (deja.indexOf('e090-trace-note') === -1) {
            deja.push('e090-trace-note');
            resume.setAttribute('aria-describedby', deja.join(' '));
          }
        }
      }
    });

    /* E090-08 — Empreinte d'intégrité du fil (reproductibilité). */
    safe(() => {
      if (!legend) return;
      const note = assure(legend, 'e090-sceau', 'p', 'recit-e090-sceau', el);
      if (!note) return;
      note.textContent = `Empreinte du fil : ${empreinteFil} · clé du point : ${clePoint} · calculées sur les libellés rendus, identiques d’un rendu à l’autre pour un même contenu.`;
      note.setAttribute('aria-label', `Empreinte d’intégrité du fil : ${empreinteFil}.`);
    });

    /* E090-09 — Préférence de mouvement, lue une seule fois par rendu. */
    safe(() => {
      let mode = 'normal';
      try { mode = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
      catch { mode = 'normal'; }
      if (typeof racine.setAttribute === 'function') racine.setAttribute('data-e090-motion', mode);
      if (legend) {
        const note = assure(legend, 'e090-motion', 'p', 'recit-e090-sceau', el);
        if (note) {
          note.textContent = `Mouvement : ${mode === 'reduce' ? 'réduit (préférence système respectée)' : 'standard'}.`;
          note.setAttribute('aria-label', note.textContent);
        }
      }
    });

    /* E090-10 — Sceau de provenance unique, observable sans outil. */
    safe(() => {
      if (typeof racine.setAttribute !== 'function') return;
      const jetons = [
        `origines:1`,
        `sources:${nbSources}`,
        `ids:${identifiants ? 'oui' : 'non'}`,
        `certitude:${confCle || 'inconnue'}`,
        `fiables:${fiables}/${items.length}`,
        `couverture:${Math.round(couverture * 100)}%`,
        `masques:${masques === null ? '—' : masques}`,
        `tresor:${empreinteFil}`,
        `cle:${clePoint}`,
        `motion:${typeof racine.getAttribute === 'function' ? (racine.getAttribute('data-e090-motion') || 'normal') : 'normal'}`,
        `css:1`,
      ];
      racine.setAttribute('data-e090-provenance', jetons.join(' '));
    });
  } catch {
    /* Gardes d'existence : aucune erreur ne doit interrompre le rendu. */
  }
});
