import { register } from './registry.js';

/* V2 lentille E080 — Données, traçabilité et provenance (second regard).
   La passe 1 traitait déjà le badge de couverture, les marques de certitude,
   les deux profils agrégés, le dossier de provenance, l'ancrage temporel, la
   bascule d'affichage, le contrôle pastille/fil, les métadonnées machine et la
   robustesse. La V2 propose dix chantiers NEUFS et DISTINCTS, tous dérivés du
   DOM réel : sens de la certitude, registre des identifiants, empreinte
   d'intégrité, légende observée, complétude de la fiche, provenance du média,
   lignage des filtres, cohérence des effectifs, référence de citation et
   accessibilité des nouveaux registres.

   Un seul greffon, une seule feuille CSS, classes préfixées recit-v2-e080-,
   ids DOM préfixés v2-e080- (jamais les ids e080- de la passe 1 qui tourne sur
   le MÊME DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé
   modifié. Sans ce module, la vue reste intégralement lisible. */

const CERTITUDES = {
  'vérifié': '✓ Vérifié',
  'certain': '■ Certain',
  'probable': '◐ Probable',
  'disputed': '≈ Contesté',
};

const CSS = `
/* E080-01 — glossaire de la certitude portée par la pastille. */
.recit-v2-e080-root .recit-v2-e080-glossaire{font-style:italic}

/* E080-02 — registre numéroté des identifiants locaux. */
.recit-v2-e080-root .recit-v2-e080-registre{margin:6px 0 0;padding-left:22px;color:var(--ink-soft);font-size:10px;line-height:1.5}
.recit-v2-e080-root .recit-v2-e080-registre li{margin:1px 0;overflow-wrap:anywhere}

/* E080-03 — empreinte d'intégrité du point. */
.recit-v2-e080-root .recit-v2-e080-hash{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;color:var(--gold-bright)}

/* E080-04 — légende des certitudes réellement observées dans le fil. */
.recit-v2-e080-root .recit-v2-e080-legende{color:var(--ink-soft)}

/* E080-05 — complétude de la fiche de données. */
.recit-v2-e080-root .recit-v2-e080-completude{font-variant-numeric:tabular-nums}

/* E080-06 — provenance du média. */
.recit-v2-e080-root .recit-media .recit-v2-e080-media{margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E080-07 — lignage de la vue (statut et filtres actifs). */
.recit-v2-e080-root .recit-v2-e080-lignage{color:var(--muted);font-size:9px}

/* E080-08 — contrôle de cohérence des effectifs. */
.recit-v2-e080-root .recit-v2-e080-coherence[data-v2-e080-etat="mismatch"]{border-left:3px solid var(--gold);padding-left:8px;background:rgba(230,185,111,.08);color:var(--ink)}

/* E080-09 — référence de citation stable du point. */
.recit-v2-e080-root .recit-v2-e080-ref{color:var(--gold-bright);font-style:normal}

/* E080-10 — portée, focus et mouvement réduit des registres V2. */
.recit-v2-e080-readout{margin:4px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;transition:opacity .18s linear}
.recit-v2-e080-root :focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e080-root[data-v2-e080-motion="reduce"] .recit-v2-e080-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e080-readout{transition:none}}
@media (max-width:620px){.recit-v2-e080-readout{font-size:11px}}
`;

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function present(noeud) {
  return !!(noeud && noeud.nodeType === 1);
}

function txt(noeud) {
  return String((noeud && noeud.textContent) || '');
}

/* Ajoute une classe sans jamais écraser les classes existantes. */
function marquer(noeud, nom) {
  if (present(noeud) && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Crée (via l'usine du contrat) ou réutilise un nœud portant l'id, puis le
   place juste après l'ancre. Insertion non destructive et idempotente :
   un seul nœud par id, déplacé au bon endroit à chaque rendu. */
function placeNoeud(id, tag, classe, parent, ancre, el) {
  if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el(tag, classe);
    noeud.id = id;
  } else {
    marquer(noeud, classe);
  }
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Remplace le contenu d'un nœud sans dépendre de replaceChildren. */
function remplaceEnfants(noeud, enfants) {
  if (!present(noeud)) return;
  if (typeof noeud.replaceChildren === 'function') {
    noeud.replaceChildren(...enfants);
    return;
  }
  while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
  enfants.forEach((enfant) => noeud.appendChild(enfant));
}

/* Identifiants de source lus dans le paragraphe réel de .recit-trace. */
function identifiantsSource(trace) {
  if (!present(trace) || typeof trace.querySelectorAll !== 'function') return [];
  const paragraphes = Array.from(trace.querySelectorAll('p'));
  const brutTexte = paragraphes.length ? txt(paragraphes[paragraphes.length - 1]) : txt(trace);
  const idx = brutTexte.indexOf('Identifiants');
  if (idx < 0) return [];
  const brut = brutTexte.slice(idx).replace(/^Identifiants\s*:\s*/i, '').split('.')[0];
  return brut.split(',').map((part) => part.trim()).filter(Boolean);
}

/* Titre et millésime lus dans .recit-meta (« titre · année · pastille »). */
function titreMeta(meta) {
  const parties = txt(meta).split('·').map((part) => part.trim()).filter(Boolean);
  return parties[0] || '';
}

function anneeMeta(meta) {
  const parties = txt(meta).split('·').map((part) => part.trim()).filter(Boolean);
  for (const partie of parties) {
    if (/^\d{3,4}$/.test(partie) || /^\d+\s*av\.\s*J\.-C\.$/i.test(partie)) return partie;
  }
  return '';
}

/* Position « Étape X / N » lue dans le kicker. */
function reference(kicker) {
  const trouve = txt(kicker).match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  return { x: trouve ? trouve[1] : '', n: trouve ? trouve[2] : '' };
}

/* Effectifs « M point(s) affiché(s) sur N » lus dans #c3a-status. */
function compteur(status) {
  const trouve = txt(status).match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  return trouve ? { affiches: trouve[1], total: trouve[2] } : null;
}

/* Empreinte déterministe (djb2) : aucun aléa, reproductible à l'identique. */
function empreinte(texte) {
  let h = 5381;
  for (let i = 0; i < texte.length; i += 1) {
    h = (((h << 5) + h) + texte.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

register('E080', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !present(layout)
        || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e080', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    const progress = layout.querySelector('.recit-progress');
    const kicker = layout.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title')
      || layout.querySelector('.recit-title');
    const meta = layout.querySelector('.recit-meta');
    const conf = layout.querySelector('.recit-conf');
    const timing = layout.querySelector('.recit-timing');
    const statut = document.getElementById('c3a-status') || layout.querySelector('.c3a-status');
    const recherche = document.getElementById('c3a-search');
    const thread = layout.querySelector('.recit-thread');
    const trace = layout.querySelector('.recit-trace');
    const media = layout.querySelector('.recit-media');
    const items = thread && typeof thread.querySelectorAll === 'function'
      ? Array.from(thread.querySelectorAll('.recit-thread-item')) : [];

    const ids = identifiantsSource(trace);
    const ref = reference(kicker);
    const titreRepere = titreMeta(meta);
    const annee = anneeMeta(meta);
    const libelleConf = txt(conf).trim();

    /* E080-01 — sens de la certitude affichée, jusque-là caché dans title. */
    const gloss = conf && typeof conf.getAttribute === 'function'
      ? (conf.getAttribute('title') || '') : '';
    if (gloss) {
      const noeud = placeNoeud('v2-e080-glossaire', 'p',
        'recit-v2-e080-readout recit-v2-e080-glossaire', corps, timing, el);
      if (noeud) {
        noeud.textContent = `Sens de la certitude : ${libelleConf || 'non précisée'} — ${gloss}`;
      }
    }

    /* E080-02 — registre numéroté des identifiants locaux du point. */
    if (ids.length && (trace || layout.querySelector('.recit-sources'))) {
      const ancreRegistre = trace || layout.querySelector('.recit-sources');
      const liste = placeNoeud('v2-e080-registre', 'ol',
        'recit-v2-e080-readout recit-v2-e080-registre', corps, ancreRegistre, el);
      if (liste) {
        liste.setAttribute('aria-label',
          `Registre des ${ids.length} référence(s) locale(s) du point courant`);
        remplaceEnfants(liste, ids.map((id, index) =>
          el('li', '', `Référence locale ${index + 1} : ${id}`)));
      }
    }

    /* E080-03 — empreinte d'intégrité calculée sur les données affichées. */
    if (corps) {
      const base = [txt(kicker), txt(titre), libelleConf, annee, ids.join('|')].join('¤');
      const empreinteTexte = empreinte(base);
      const noeud = placeNoeud('v2-e080-empreinte', 'p',
        'recit-v2-e080-readout recit-v2-e080-empreinte', corps, meta, el);
      if (noeud) {
        remplaceEnfants(noeud, [
          document.createTextNode('Empreinte de traçabilité : '),
          el('span', 'recit-v2-e080-hash', empreinteTexte),
          document.createTextNode(`. Calculée sur l’étape, le titre, la certitude, l’année et les ${ids.length} identifiant(s) affiché(s).`),
        ]);
      }
    }

    /* E080-04 — légende des certitudes réellement présentes dans le fil. */
    if (items.length) {
      const presents = {};
      items.forEach((item) => {
        const valeur = item && item.dataset ? (item.dataset.confidence || '') : '';
        if (valeur) presents[valeur] = (presents[valeur] || 0) + 1;
      });
      const clefs = Object.keys(CERTITUDES).filter((cle) => presents[cle]);
      const inattendues = Object.keys(presents).filter((cle) => !CERTITUDES[cle]);
      const detail = clefs.map((cle) => `${CERTITUDES[cle]} ×${presents[cle]}`)
        .concat(inattendues.map((cle) => `${cle} ×${presents[cle]}`)).join(' · ');
      if (detail) {
        const noeud = placeNoeud('v2-e080-legende', 'p',
          'recit-v2-e080-readout recit-v2-e080-legende', corps, statut, el);
        if (noeud) {
          noeud.textContent = `Certitudes observées dans le fil : ${detail} (sur ${items.length} point${items.length > 1 ? 's' : ''} affiché${items.length > 1 ? 's' : ''}).`;
        }
      }
    }

    /* E080-05 — complétude de la fiche de données du point. */
    if (corps) {
      const champs = [
        ['titre', !!txt(titre).trim()],
        ['année', !!annee],
        ['certitude', !!libelleConf],
        ['source', ids.length > 0],
      ];
      const remplis = champs.filter(([, ok]) => ok);
      const manquants = champs.filter(([, ok]) => !ok).map(([nom]) => nom);
      const noeud = placeNoeud('v2-e080-completude', 'p',
        'recit-v2-e080-readout recit-v2-e080-completude', corps, titre, el);
      if (noeud) {
        noeud.textContent = `Complétude de la fiche de données : ${remplis.length} champ${remplis.length > 1 ? 's' : ''} renseigné${remplis.length > 1 ? 's' : ''} sur ${champs.length}${manquants.length ? ' · manquant(s) : ' + manquants.join(', ') : ''}.`;
      }
    }

    /* E080-06 — provenance de l'illustration, crédit et licence inclus. */
    if (present(media)) {
      const img = media.querySelector('img');
      const credit = media.querySelector('.recit-media-credit');
      const vide = media.querySelector('.media-empty');
      const sourceMedia = img
        ? `Illustration : ${(img.getAttribute('alt') || 'sans description').trim()}${credit ? ' · ' + txt(credit).trim() : ''}`
        : (vide ? txt(vide).trim() : 'Illustration : aucune information de provenance dans le DOM.');
      const noeud = placeNoeud('v2-e080-media', 'p',
        'recit-v2-e080-media', media, null, el);
      if (noeud) noeud.textContent = sourceMedia;
    }

    /* E080-07 — lignage de la vue : statut, filtres et recherche actifs. */
    if (corps) {
      const compte = compteur(statut);
      const actifs = Array.from(layout.querySelectorAll('.c3a-filter[aria-pressed="true"]'))
        .map((bouton) => txt(bouton).trim()).filter(Boolean);
      const requete = recherche && typeof recherche.value === 'string'
        ? recherche.value.trim() : '';
      const parties = [];
      if (compte) parties.push(`${compte.affiches} point(s) affiché(s) sur ${compte.total}`);
      if (actifs.length) parties.push(`filtres actifs : ${actifs.join(', ')}`);
      if (requete) parties.push(`recherche : « ${requete} »`);
      if (parties.length) {
        const noeud = placeNoeud('v2-e080-lignage', 'p',
          'recit-v2-e080-readout recit-v2-e080-lignage', corps, kicker, el);
        if (noeud) noeud.textContent = `Lignage de la vue : ${parties.join(' · ')}.`;
      }
    }

    /* E080-08 — cohérence des effectifs : statut, fil réel et kicker. */
    if (corps) {
      const compte = compteur(statut);
      const reels = items.length;
      const coherent = !!compte && String(reels) === compte.affiches
        && (!ref.n || compte.total === ref.n);
      const noeud = placeNoeud('v2-e080-coherence', 'p',
        'recit-v2-e080-readout recit-v2-e080-coherence', corps, thread, el);
      if (noeud) {
        noeud.setAttribute('role', 'note');
        noeud.setAttribute('data-v2-e080-etat', coherent ? 'ok' : 'mismatch');
        const etat = coherent ? 'cohérent' : 'à vérifier';
        const detailStatut = compte ? `${compte.affiches}/${compte.total}` : 'illisible';
        noeud.textContent = `Contrôle de cohérence des effectifs : ${etat} — statut ${detailStatut}, fil ${reels} point(s), kicker total ${ref.n || 'illisible'}.`;
      }
    }

    /* E080-09 — référence de citation stable, recomposée depuis le DOM. */
    if (corps && (titreRepere || ref.x)) {
      const noeud = placeNoeud('v2-e080-citation', 'p',
        'recit-v2-e080-readout recit-v2-e080-citation', corps, progress, el);
      if (noeud) {
        remplaceEnfants(noeud, [
          document.createTextNode('Référence de citation : '),
          el('span', 'recit-v2-e080-ref',
            `« ${titreRepere || 'repère non précisé'}${annee ? ' · ' + annee : ''} » — point ${ref.x || '?'}/${ref.n || '?'}`),
          document.createTextNode('.'),
        ]);
      }
    }

    /* E080-10 — portée, focus et mouvement réduit des registres V2. */
    marquer(layout, 'recit-v2-e080-root');
    if (typeof layout.setAttribute === 'function') {
      const reduit = reducedMotion && typeof reducedMotion === 'function' && reducedMotion();
      layout.setAttribute('data-v2-e080-motion', reduit ? 'reduce' : 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
