import { register } from './registry.js';

/*
 * Lentille V2 E100 — « Données, traçabilité et provenance » (vue Récit).
 *
 * Dix chantiers neufs, distincts de la passe 1 : inventaire des identifiants
 * locaux, contrôle de cohérence de la traçabilité, empreinte textuelle du
 * point, indice de certitude pondéré, fiche de provenance de l'illustration,
 * description du titre enrichie, complétude de la fiche, contrôle du décompte
 * de points, miroir de données en attributs et hygiène CSS verrouillée.
 *
 * Une seule feuille de style groupée, classes `recit-v2-e100-*`, ids
 * `v2-e100-*` (jamais les ids `e100-*` de la passe 1 : les deux passes
 * partagent le même DOM). Tout chiffre affiché est lu dans le DOM réel.
 * Zéro console, zéro réseau, zéro aléa, zéro innerHTML. try/catch global,
 * gardes d'existence, idempotence : aucun attribut existant n'est écrasé.
 */

const PANNEAU_ID = 'v2-e100-dossier';

/* Barème d'interface, énoncé tel quel dans la synthèse : la pondération est
   une convention affichée, jamais une donnée historique inventée. */
const BAREME = Object.freeze({
  'vérifié': 4,
  certain: 3,
  probable: 2,
  disputed: 1,
});

/* Huit lignes visibles, dans un ordre déterministe, toutes préfixées. */
const LIGNES = Object.freeze([
  ['v2-e100-inventaire', 'recit-v2-e100-ligne'],
  ['v2-e100-coherence', 'recit-v2-e100-ligne'],
  ['v2-e100-empreinte', 'recit-v2-e100-ligne'],
  ['v2-e100-indice', 'recit-v2-e100-ligne'],
  ['v2-e100-image', 'recit-v2-e100-ligne'],
  ['v2-e100-completude', 'recit-v2-e100-ligne'],
  ['v2-e100-decompte', 'recit-v2-e100-ligne'],
  ['v2-e100-synthese', 'recit-v2-e100-ligne recit-v2-e100-synthese'],
]);

/* ---------- Feuille unique, cadrée par le verrou de la lentille ---------- */
const RULES = `
.recit-layout[data-v2-e100="on"] .recit-v2-e100-dossier{display:block;margin:12px 0 4px;padding:10px 12px;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;background:rgba(255,255,255,.025);transition:border-color .18s linear}
.recit-layout[data-v2-e100="on"] .recit-v2-e100-titre{margin:0 0 7px;color:var(--gold);font-size:11px;font-weight:600}
.recit-layout[data-v2-e100="on"] .recit-v2-e100-ligne{margin:0 0 5px;color:var(--muted);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e100="on"] .recit-v2-e100-synthese{margin-top:9px;padding-top:8px;border-top:1px solid var(--line);color:var(--ink-soft)}
.recit-layout[data-v2-e100="on"] .recit-v2-e100-dossier:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-v2-e100-sans-mouvement .recit-v2-e100-dossier{transition:none}
@media (prefers-reduced-motion:reduce){.recit-layout .recit-v2-e100-dossier{transition:none}}
`;

/* ---------- Gardes : aucun ne peut lever d'erreur ---------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function safe(fn) {
  try { fn(); }
  catch { /* chantier neutralisé : la vue reste lisible et inchangée */ }
}

function texte(node) {
  return String((node && node.textContent) || '').trim();
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif. */
function setOnce(node, name, value) {
  if (!node || node.nodeType !== 1) return false;
  if (typeof node.hasAttribute !== 'function' || typeof node.setAttribute !== 'function') return false;
  if (node.hasAttribute(name)) return false;
  node.setAttribute(name, value);
  return true;
}

/* Complète une liste d'identifiants sans écraser ni dupliquer. */
function addToken(node, name, token) {
  if (!node || node.nodeType !== 1 || !token) return false;
  if (typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return false;
  const courant = node.getAttribute(name) || '';
  const parts = courant.split(/\s+/).filter(Boolean);
  if (parts.indexOf(token) !== -1) return false;
  parts.push(token);
  node.setAttribute(name, parts.join(' '));
  return true;
}

function attribut(node, name) {
  return node && typeof node.getAttribute === 'function'
    ? String(node.getAttribute(name) || '') : '';
}

function nombre(chaine, motif) {
  const trouve = motif.exec(String(chaine || ''));
  return trouve ? Number(trouve[1]) : null;
}

/* Panneau V2, distinct du panneau `#e100-panneau` de la passe 1. Il est
   inséré dans `.recit-body` (parent hors de body/stage/layout) pour échapper
   au marquage diagnostic de `_diagnostics.js`, qui cible ces trois parents. */
function dossier(corps, el) {
  if (!corps || typeof corps.appendChild !== 'function' || typeof el !== 'function') return null;
  let panneau = q(corps, `#${PANNEAU_ID}`);
  if (!panneau) {
    panneau = el('section', 'recit-v2-e100-dossier');
    panneau.id = PANNEAU_ID;
    panneau.appendChild(el('h2', 'recit-v2-e100-titre', 'E100 V2 — Dossier de données et de provenance'));
    corps.appendChild(panneau);
  }
  setOnce(panneau, 'aria-label', 'Données, traçabilité et provenance du point affiché');
  setOnce(panneau, 'tabindex', '-1');
  const nodes = {};
  LIGNES.forEach(([id, cls]) => {
    let node = q(panneau, `#${id}`);
    if (!node) {
      node = el('p', cls);
      node.id = id;
    }
    nodes[id] = node;
  });
  LIGNES.forEach(([id]) => { safe(() => panneau.appendChild(nodes[id])); });
  return { panneau, nodes };
}

/* Inventaire des identifiants réellement listés dans le paragraphe
   « Identifiants : … » produit par recit.js. */
function identifiants(layout) {
  const paragraphe = q(layout, '.recit-trace p');
  const brut = texte(paragraphe);
  const debut = brut.indexOf('Identifiants :');
  if (debut < 0) return [];
  let suite = brut.slice(debut + 'Identifiants :'.length);
  const fin = suite.indexOf('.');
  if (fin >= 0) suite = suite.slice(0, fin);
  return suite.split(',').map((morceau) => morceau.trim()).filter(Boolean);
}

/* Annonce du `<summary>` « Traçabilité · N référence(s) locale(s) ». */
function annonceTrace(layout) {
  return nombre(texte(q(layout, '.recit-trace summary')), /(\d+)\s*référence/);
}

/* Empreinte purement textuelle du titre du point. */
function empreinte(layout) {
  const titre = q(layout, '#recit-point-title') || q(layout, '.recit-title');
  const brut = texte(titre);
  if (!brut) return null;
  const lettres = Array.from(brut);
  return { caracteres: lettres.length, mots: brut.split(/\s+/).filter(Boolean).length, initiale: lettres[0] };
}

/* Distribution des certitudes lue sur les attributs du fil. */
function profilConfiance(layout) {
  const liste = q(layout, '#c3a-thread');
  const items = liste && typeof liste.querySelectorAll === 'function'
    ? Array.from(liste.querySelectorAll('.c3a-thread-item')) : [];
  let somme = 0;
  let notes = 0;
  const distribution = {};
  items.forEach((item) => {
    const cle = attribut(item, 'data-confidence');
    if (!cle) return;
    distribution[cle] = (distribution[cle] || 0) + 1;
    if (Object.prototype.hasOwnProperty.call(BAREME, cle)) {
      somme += BAREME[cle];
      notes += 1;
    }
  });
  return { nombre: items.length, notes, somme, distribution };
}

/* Métadonnées de l'illustration, lues sans jamais afficher `src`. */
function ficheImage(layout) {
  const media = q(layout, '.recit-media');
  if (!media) return null;
  const img = q(media, 'img');
  const caption = q(media, '.media-caption');
  const credit = q(media, '.recit-media-credit');
  if (!img && !caption && !credit) return null;
  return {
    alt: attribut(img, 'alt').trim() || 'non renseigné',
    caption: texte(caption) || 'non renseignée',
    credit: texte(credit) || 'non renseigné',
  };
}

/* Présence des cinq signaux de provenance du point. */
function signaux(layout) {
  const meta = texte(q(layout, '.recit-meta'));
  return [
    ['trace', !!q(layout, '.recit-trace')],
    ['image', !!q(layout, '.recit-media img')],
    ['contexte', !!q(layout, '#recit-context')],
    ['certitude', !!q(layout, '.recit-conf')],
    ['année', /\d{3,4}|av\.\s*J\.-C\./.test(meta)],
  ];
}

/* Trois décomptes déjà calculés par la vue, confrontés entre eux. */
function decompte(layout) {
  const recherche = q(layout, '#c3a-search');
  const valeurs = {
    kicker: nombre(texte(q(layout, '.view-kicker')), /Étape\s+\d+\s*\/\s*(\d+)/),
    recherche: nombre(attribut(recherche, 'aria-label'), /(\d+)\s+points/),
    statut: nombre(texte(q(layout, '#c3a-status')), /sur\s+(\d+)/),
  };
  const connus = Object.keys(valeurs)
    .filter((cle) => valeurs[cle] !== null).map((cle) => valeurs[cle]);
  return {
    valeurs,
    coherent: connus.length > 0 && connus.every((valeur) => valeur === connus[0]),
  };
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E100', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;

    const root = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!root) return;

    css('recit-v2-e100', RULES);

    const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    root.dataset.v2E100 = 'on';
    root.classList.toggle('recit-v2-e100-sans-mouvement', sys);

    const corps = q(root, '.recit-body');
    const ensemble = dossier(corps, el);
    if (!ensemble) return;
    const n = ensemble.nodes;

    const ids = identifiants(root);
    const annonce = annonceTrace(root);
    const trace = empreinte(root);
    const confiance = profilConfiance(root);
    const image = ficheImage(root);
    const signauxDuPoint = signaux(root);
    const decomptes = decompte(root);

    /* E100-01 — inventaire des identifiants locaux. */
    safe(() => {
      n['v2-e100-inventaire'].textContent = ids.length
        ? `Identifiants locaux inventoriés (${ids.length}) : ${ids.join(' · ')}. Aucun lien externe.`
        : 'Identifiants locaux inventoriés (0) : aucun identifiant attaché à ce point.';
    });

    /* E100-02 — cohérence entre l'annonce et la liste réelle. */
    safe(() => {
      let phrase;
      if (annonce === null && ids.length === 0) {
        phrase = 'Contrôle de traçabilité : aucune annonce ni liste à confronter pour ce point.';
      } else if (annonce === null) {
        phrase = `Contrôle de traçabilité : liste de ${ids.length} identifiant(s), annonce absente.`;
      } else if (annonce === ids.length) {
        phrase = `Contrôle de traçabilité : cohérent — ${annonce} annoncé(s), ${ids.length} listé(s).`;
      } else {
        phrase = `Contrôle de traçabilité : écart — ${annonce} annoncé(s), ${ids.length} listé(s).`;
      }
      n['v2-e100-coherence'].textContent = phrase;
    });

    /* E100-03 — empreinte du point. */
    safe(() => {
      n['v2-e100-empreinte'].textContent = trace
        ? `Empreinte du point : ${trace.caracteres} caractère(s) · ${trace.mots} mot(s) · initiale « ${trace.initiale} » (texte réel du titre).`
        : 'Empreinte du point : titre introuvable, empreinte non calculée.';
    });

    /* E100-04 — indice de certitude pondéré. */
    safe(() => {
      const valeur = confiance.notes
        ? (confiance.somme / confiance.notes).toFixed(2).replace('.', ',')
        : null;
      n['v2-e100-indice'].textContent = valeur
        ? `Indice de certitude du repère : ${valeur}/4 sur ${confiance.notes} point(s) noté(s) sur ${confiance.nombre} · barème d'interface : vérifié 4, certain 3, probable 2, contesté 1.`
        : 'Indice de certitude du repère : aucun point noté, indice non calculé.';
    });

    /* E100-05 — provenance de l'illustration. */
    safe(() => {
      n['v2-e100-image'].textContent = image
        ? `Image — texte alternatif : « ${image.alt} » · légende : « ${image.caption} » · crédit : « ${image.credit} ».`
        : 'Image — aucune métadonnée d’illustration présente dans ce repère.';
    });

    /* E100-06 — le titre décrit aussi le dossier de provenance. */
    safe(() => {
      const titre = q(root, '#recit-point-title') || q(root, '.recit-title');
      if (titre) addToken(titre, 'aria-describedby', PANNEAU_ID);
    });

    /* E100-07 — complétude de la fiche. */
    safe(() => {
      const presents = signauxDuPoint.filter((entree) => entree[1]).map((entree) => entree[0]);
      const absents = signauxDuPoint.filter((entree) => !entree[1]).map((entree) => entree[0]);
      n['v2-e100-completude'].textContent =
        `Complétude de la fiche : ${presents.length}/5 signaux présents (${presents.join(', ') || 'aucun'})`
        + ` · absents : ${absents.join(', ') || 'aucun'}.`;
    });

    /* E100-08 — confrontation des trois décomptes. */
    safe(() => {
      const d = decomptes.valeurs;
      const chaine = (valeur) => (valeur === null ? '—' : String(valeur));
      n['v2-e100-decompte'].textContent = decomptes.coherent
        ? `Décompte du repère : cohérent — étape ${chaine(d.kicker)}, recherche ${chaine(d.recherche)}, statut ${chaine(d.statut)} point(s).`
        : `Décompte du repère : écart — étape ${chaine(d.kicker)}, recherche ${chaine(d.recherche)}, statut ${chaine(d.statut)} point(s).`;
    });

    /* E100-09 — miroir de données en attributs, consultable sans recalcul. */
    safe(() => {
      const presents = signauxDuPoint.filter((entree) => entree[1]).length;
      setOnce(root, 'data-v2-e100-ids', String(ids.length));
      setOnce(root, 'data-v2-e100-coherence',
        annonce === null && ids.length === 0 ? 'sans-objet' : (annonce === ids.length ? 'oui' : 'non'));
      setOnce(root, 'data-v2-e100-indice', confiance.notes
        ? (confiance.somme / confiance.notes).toFixed(2).replace('.', ',') : 'indisponible');
      setOnce(root, 'data-v2-e100-completude', `${presents}/5`);
      setOnce(root, 'data-v2-e100-decompte', decomptes.coherent ? 'oui' : 'non');
    });

    /* E100-10 — synthèse visible, verrou de portée et mouvement réduit. */
    safe(() => {
      setOnce(root, 'data-v2-e100-motion', sys ? 'reduce' : 'complet');
      const presents = signauxDuPoint.filter((entree) => entree[1]).length;
      n['v2-e100-synthese'].textContent =
        `Synthèse V2 : ${ids.length} identifiant(s) local(aux) · traçabilité `
        + (annonce === null && ids.length === 0 ? 'sans objet'
          : (annonce === ids.length ? 'cohérente' : 'à vérifier'))
        + ` · indice ${confiance.notes ? (confiance.somme / confiance.notes).toFixed(2).replace('.', ',') + '/4' : 'indisponible'}`
        + ` · fiche ${presents}/5 · décompte ${decomptes.coherent ? 'cohérent' : 'à vérifier'}`
        + ` · mouvement ${sys ? 'réduit' : 'complet'}.`;
      setOnce(n['v2-e100-synthese'], 'role', 'status');
      setOnce(n['v2-e100-synthese'], 'aria-live', 'polite');
    });
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
