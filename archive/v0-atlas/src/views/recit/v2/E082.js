import { register } from './registry.js';

/* V2 lentille E082 — Hiérarchie visuelle et informationnelle (complément de la passe 1).
 * La passe 1 traite déjà : progression chiffrée, badge de nature, fil d'Ariane,
 * niveaux de filtres, codage du type par bordure, provenance, séparateur de
 * commandes, sommaire, paliers de lecture et composition du fil par type.
 * La V2 propose donc dix chantiers neufs et distincts, tous centrés sur
 * l'explicitation des niveaux d'information : six lectures chiffrées dérivées
 * du DOM réel et quatre marqueurs visuels de hiérarchie. Tous non destructifs :
 * sans ce module, la vue Récit reste intégralement lisible et utilisable.
 * Préfixes : classes recit-v2-e082-, ids DOM v2-e082- (jamais les ids e082-
 * de la passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console,
 * zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* Résultats de lecture communs aux chantiers 01 à 06. */
.recit-v2-e082-readout{margin:4px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e082-readout b{color:var(--gold);font-weight:600}

/* E082-01 — Rang de certitude explicité en toutes lettres. */
.recit-v2-e082-cert b{color:var(--gold-bright)}

/* E082-02 — Portée du filtrage (sous-ensemble vs repère complet). */
.recit-v2-e082-portee b{color:var(--gold-bright)}

/* E082-03 — Répartition des certitudes présentes dans le fil. */
.recit-v2-e082-repartition{overflow-wrap:anywhere}

/* E082-04 — Volume de l'énoncé courant. */
.recit-v2-e082-volume{margin-top:2px}

/* E082-05 — Ancrage temporel isolé du repère. */
.recit-v2-e082-ancre b{color:var(--gold)}

/* E082-06 — Position du point courant dans le fil. */
.recit-v2-e082-position{color:var(--muted)}

/* E082-07 — Titre érigé en niveau 1 (filet et graisse). */
.recit-layout .recit-v2-e082-niveau1 .recit-title{border-bottom:1px solid var(--line-strong);padding-bottom:8px;font-weight:700}

/* E082-08 — Métadonnées érigées en niveau 2 (filet supérieur discret). */
.recit-layout .recit-v2-e082-niveau2 .recit-meta{border-top:1px solid var(--line);padding-top:6px}

/* E082-09 — Légende érigée en niveau 3 (aide en retrait guidé). */
.recit-layout .recit-v2-e082-niveau3 .recit-legend{border-left:2px solid var(--line-strong);padding-left:10px}
.recit-layout .recit-v2-e082-niveau3 .recit-legend p{margin:6px 0}

/* E082-10 — Groupement fonctionnel des commandes (sans texte ajouté). */
.recit-layout .recit-v2-e082-groupes .recit-actions [data-fk="c3a-play"],
.recit-layout .recit-v2-e082-groupes .recit-actions [data-fk="c3a-restart"]{box-shadow:inset 0 -2px 0 var(--line-strong)}
.recit-layout .recit-v2-e082-groupes .recit-actions [data-fk="c3a-next-event"],
.recit-layout .recit-v2-e082-groupes .recit-actions [data-fk="c3a-chrono"]{border-style:dashed}

@media (max-width:620px){
  .recit-v2-e082-readout{font-size:9px}
  .recit-layout .recit-v2-e082-niveau3 .recit-legend{padding-left:7px}
}
`;

/* ---------- Utilitaires purs : gardes, aucun chiffre inventé ---------- */

function texte(noeud) {
  return String((noeud && noeud.textContent) || '');
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe visible à un emplacement stable. */
function placeParagraphe(id, classe, parent, ancre, contenu) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = (typeof document !== 'undefined') ? document.getElementById(id) : null;
  if (!noeud) {
    noeud = el('p', `recit-v2-e082-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = contenu;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Lit l'ordre des degrés de certitude dans le texte réel de la légende :
   elle énonce « ✓ Vérifié · ■ Certain · ◐ Probable · ≈ Contesté ». */
function degresDepuisLegende(legend) {
  const paires = [];
  const motif = /([✓■◐≈])\s*([A-Za-zÀ-ÿéèê]+)/g;
  let found;
  const source = texte(legend);
  while ((found = motif.exec(source)) !== null) {
    paires.push({ marque: found[1], libelle: found[2] });
  }
  return paires;
}

register('E082', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e082', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const meta = corps.querySelector('.recit-meta');
    const conf = corps.querySelector('.recit-conf');
    const status = corps.querySelector('#c3a-status');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const threadTitre = corps.querySelector('.recit-thread-title');
    const legend = corps.querySelector('.recit-legend p');

    /* E082-01 — rang de la certitude courante, ordre lu dans la légende. */
    try {
      const degres = degresDepuisLegende(legend);
      const confTexte = texte(conf).trim();
      if (degres.length && confTexte) {
        const index = degres.findIndex((d) => d.marque === confTexte.charAt(0));
        if (index >= 0 && meta) {
          placeParagraphe('v2-e082-cert', 'recit-v2-e082-cert', corps, meta,
            `Niveau de certitude : ${index + 1} sur ${degres.length} · ${degres[index].libelle}.`);
        }
      }
    } catch { /* lecture facultative */ }

    /* E082-02 — portée du fil : lu dans #c3a-status, jamais estimé. */
    try {
      const trouvé = texte(status).match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/);
      if (trouvé) {
        const affichés = Number(trouvé[1]);
        const total = Number(trouvé[2]);
        const portée = affichés === total ? 'vue complète du repère' : 'sous-ensemble filtré';
        placeParagraphe('v2-e082-portee', 'recit-v2-e082-portee', corps, status,
          `Portée du fil : ${affichés} affiché(s) sur ${total} · ${portée}.`);
      }
    } catch { /* lecture facultative */ }

    /* E082-03 — répartition des certitudes réellement portées par les items. */
    try {
      if (thread) {
        const items = Array.from(thread.querySelectorAll('.recit-thread-item'));
        if (items.length) {
          const comptes = Object.create(null);
          items.forEach((item) => {
            const cle = (item.dataset && item.dataset.confidence) || '';
            const nom = cle || 'non renseigné';
            comptes[nom] = (comptes[nom] || 0) + 1;
          });
          const detail = Object.keys(comptes)
            .map((nom) => `${nom} ×${comptes[nom]}`).join(' · ');
          placeParagraphe('v2-e082-repartition', 'recit-v2-e082-repartition', thread, threadTitre,
            `Certitudes dans le fil : ${detail}.`);
        }
      }
    } catch { /* lecture facultative */ }

    /* E082-04 — volume du seul énoncé courant, compté sur son texte réel. */
    try {
      if (titre) {
        const brut = texte(titre).trim();
        const mots = brut.split(/\s+/).filter(Boolean).length;
        const signes = brut.replace(/\s+/g, '').length;
        placeParagraphe('v2-e082-volume', 'recit-v2-e082-volume', corps, titre,
          `Énoncé : ${mots} mot(s) · ${signes} signes.`);
      }
    } catch { /* lecture facultative */ }

    /* E082-05 — ancrage temporel : deuxième segment de la meta. */
    try {
      const segments = texte(meta).split('·').map((s) => s.trim()).filter(Boolean);
      if (segments.length > 1 && segments[1]) {
        placeParagraphe('v2-e082-ancre', 'recit-v2-e082-ancre', corps, meta,
          `Ancrage du repère : ${segments[1]}.`);
      }
    } catch { /* lecture facultative */ }

    /* E082-06 — position du point courant dans le fil affiché. */
    try {
      if (thread) {
        const items = Array.from(thread.querySelectorAll('.recit-thread-item'));
        const index = items.findIndex((n) => n.classList && n.classList.contains('is-current'));
        if (index >= 0) {
          placeParagraphe('v2-e082-position', 'recit-v2-e082-position', thread, threadTitre,
            `Position dans le fil : point ${index + 1} sur ${items.length}.`);
        }
      }
    } catch { /* lecture facultative */ }

    /* E082-07 à E082-10 — marqueurs visuels de hiérarchie, purement additifs. */
    ajouteClasse(corps, 'recit-v2-e082-niveau1');   // E082-07
    ajouteClasse(corps, 'recit-v2-e082-niveau2');   // E082-08
    ajouteClasse(corps, 'recit-v2-e082-niveau3');   // E082-09
    ajouteClasse(corps, 'recit-v2-e082-groupes');   // E082-10

    /* Aucune animation n'est introduite : reducedMotion est consulté pour
       consigner l'état sans modifier de transition existante. */
    if (typeof reducedMotion === 'function') {
      try { layout.setAttribute('data-v2-e082-motion', reducedMotion() ? 'reduce' : 'normal'); }
      catch { /* attribut facultatif */ }
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
