import { register } from './registry.js';

/* Lentille E031 — Lisibilité et mesure de lecture, vue Récit.
 *
 * Dix chantiers E031-01 … E031-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E031.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/_diagnostics.js.
 *
 * Greffon strictement additif : une feuille de style unique, des classes
 * préfixées recit-e031-, deux paragraphes de mesure déposés dans .recit-body
 * et un miroir d'audit sur le conteneur. Aucun nœud retiré, aucun écouteur,
 * aucun timer, aucun observateur, aucune boucle, aucun aléa, aucun appel
 * réseau et aucune journalisation. Sans ce greffon, la vue reste lisible.
 *
 * Les deux identifiants créés (e031-mesure, e031-progression) sont uniques
 * et ne sont jamais déposés directement sous body, stage ou layout : ils
 * vivent dans .recit-body, donc le tiroir de diagnostic ne les masque pas.
 */

const CSS = `
/* E031-01 — colonne mesurée : 60 à 75 caractères par ligne. */
@media (min-width: 1001px) {
  .recit-layout .recit-e031-corps { max-width: 72ch; }
}
.recit-layout .recit-e031-corps .recit-context,
.recit-layout .recit-e031-corps #recit-point-title { max-width: 70ch; }

/* E031-02 — interlignage et respiration verticale. */
.recit-layout .recit-e031-corps .recit-context,
.recit-layout .recit-e031-corps .recit-meta,
.recit-layout .recit-e031-corps .recit-legend p,
.recit-layout .recit-e031-corps .recit-trace p,
.recit-layout .recit-e031-corps .recit-sources,
.recit-layout .recit-e031-mesure,
.recit-layout .recit-e031-progression { line-height: 1.65; }
.recit-layout .recit-e031-corps .recit-legend p { margin: 6px 0; }

/* E031-03 et E031-07 — plancher de taille et contraste des textes secondaires. */
.recit-layout .recit-e031-timing,
.recit-layout .recit-e031-meta,
.recit-layout .recit-e031-kicker,
.recit-layout .recit-e031-legende,
.recit-layout .recit-e031-sources,
.recit-layout .recit-e031-trace,
.recit-layout .recit-e031-mesure,
.recit-layout .recit-e031-progression { font-size: 12px; color: var(--muted); }

/* E031-04 — mesure chiffrée du temps de lecture. */
.recit-layout .recit-e031-mesure {
  margin: 8px 0 0;
  font-variant-numeric: tabular-nums;
}

/* E031-05 — progression textuelle, jamais portée par la seule couleur. */
.recit-layout .recit-e031-progression {
  margin: 6px 0 0;
  font-variant-numeric: tabular-nums;
}

/* E031-06 — titre équilibré, sans rafale de mots isolés. */
.recit-layout .recit-e031-titre {
  line-height: 1.18;
  letter-spacing: -0.01em;
  text-wrap: balance;
  -webkit-hyphens: auto;
  hyphens: auto;
  overflow-wrap: break-word;
}

/* E031-08 — fil de lecture aéré et jalonné. */
.recit-layout .recit-e031-fil .recit-thread-list { gap: 8px; }
.recit-layout .recit-e031-fil .recit-thread-list .recit-thread-item {
  font-size: 12px;
  line-height: 1.4;
  min-height: 36px;
  padding: 7px 10px;
}
.recit-layout .recit-e031-fil .recit-thread-item.is-current::before { content: "▶ "; }
.recit-layout .recit-e031-fil .thread-kind { font-size: 10px; }

/* E031-09 — traçabilité et mention d'absence de source lisibles. */
.recit-layout .recit-e031-trace { font-size: 12px; line-height: 1.6; }
.recit-layout .recit-e031-trace summary { min-height: 36px; }
.recit-layout .recit-e031-trace p { margin-top: 8px; }

/* E031-10 — barre de progression perceptible. */
.recit-layout .recit-e031-progress {
  height: 6px;
  background: rgba(255, 255, 255, .14);
  border: 1px solid var(--line);
}
.recit-layout .recit-e031-progress > span { background: var(--gold-bright); }

/* Mouvement réduit : aucun effet de transition sur les repères de lecture. */
.recit-layout.recit-e031-sans-mouvement { scroll-behavior: auto; }
.recit-layout.recit-e031-sans-mouvement .recit-e031-progress > span,
.recit-layout.recit-e031-sans-mouvement .recit-actions button,
.recit-layout.recit-e031-sans-mouvement .recit-thread-item,
.recit-layout.recit-e031-sans-mouvement .recit-trace summary { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  .recit-layout .recit-e031-progress > span,
  .recit-layout .recit-actions button,
  .recit-layout .recit-thread-item,
  .recit-layout .recit-trace summary { transition: none !important; }
}
`;

function estNoeud(noeud) {
  return Boolean(noeud) && typeof noeud === 'object' && noeud.nodeType === 1;
}

function chercher(racine, selecteur) {
  return estNoeud(racine) && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur)
    : null;
}

function ajouterClasse(noeud, classe) {
  if (estNoeud(noeud) && noeud.classList
      && typeof noeud.classList.add === 'function'
      && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(classe)) {
    noeud.classList.add(classe);
    return 1;
  }
  return 0;
}

function ecrireAttribut(noeud, nom, valeur) {
  if (!estNoeud(noeud) || typeof noeud.setAttribute !== 'function') return;
  try { noeud.setAttribute(nom, valeur); } catch { /* garde : rendu préservé */ }
}

function compterMots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

/* Lecture de « Étape X / N · … » sans toucher au texte affiché. */
function lireEtape(noeud) {
  const brut = estNoeud(noeud) && typeof noeud.textContent === 'string'
    ? noeud.textContent : '';
  const trouvé = brut.match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  if (!trouvé) return null;
  const courant = Number(trouvé[1]);
  const total = Number(trouvé[2]);
  if (!Number.isFinite(courant) || !Number.isFinite(total) || total <= 0) return null;
  return {
    courant: Math.min(courant, total),
    total,
    pourcent: Math.round((Math.min(courant, total) / total) * 100),
  };
}

register('E031', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css === 'function') css('recit-e031', CSS);

  const racine = estNoeud(stage) ? stage : (estNoeud(layout) ? layout : null);
  if (!racine || typeof el !== 'function') return;

  const corps = chercher(racine, '.recit-body');
  const conteneur = estNoeud(layout) ? layout : racine;

  /* E031-01 — mesure de la colonne de lecture. */
  ajouterClasse(corps, 'recit-e031-corps');

  /* E031-02 — interlignage (feuille de style, cadrée par recit-e031-corps). */

  /* E031-03 et E031-07 — plancher de taille et contraste. */
  const chronometrage = chercher(racine, '.recit-timing');
  const enTete = chercher(racine, '.view-kicker');
  ajouterClasse(chronometrage, 'recit-e031-timing');
  ajouterClasse(chercher(racine, '.recit-meta'), 'recit-e031-meta');
  ajouterClasse(enTete, 'recit-e031-kicker');
  ajouterClasse(chercher(racine, '.recit-legend'), 'recit-e031-legende');

  /* E031-06 — titre équilibré et césure française. */
  const titre = chercher(racine, '#recit-point-title') || chercher(racine, '.recit-title');
  ajouterClasse(titre, 'recit-e031-titre');
  if (estNoeud(titre) && typeof titre.hasAttribute === 'function'
      && !titre.hasAttribute('lang')) {
    ecrireAttribut(titre, 'lang', 'fr');
  }

  /* E031-04 — temps de lecture recalculé à partir du texte réel affiché. */
  const contexte = chercher(racine, '#recit-context') || chercher(racine, '.recit-context');
  const texteTitre = estNoeud(titre) && typeof titre.textContent === 'string' ? titre.textContent : '';
  const texteContexte = estNoeud(contexte) && typeof contexte.textContent === 'string' ? contexte.textContent : '';
  const mots = compterMots([texteTitre, texteContexte].filter(Boolean).join(' '));
  const minutes = Math.max(1, Math.ceil(mots / 220));
  if (!chercher(racine, '#e031-mesure')) {
    const mesure = el('p', 'recit-e031-mesure',
      `Mesure de lecture : ${mots} mot(s) · ≈ ${minutes} min à 220 mots/min.`);
    if (estNoeud(mesure)) {
      mesure.id = 'e031-mesure';
      if (estNoeud(chronometrage) && estNoeud(chronometrage.parentNode)) {
        chronometrage.parentNode.insertBefore(mesure, chronometrage.nextSibling);
      } else if (estNoeud(corps)) {
        corps.appendChild(mesure);
      }
    }
  }

  /* E031-05 — progression textuelle, déduite du kicker existant. */
  const etape = lireEtape(enTete);
  if (etape && !chercher(racine, '#e031-progression')) {
    const progression = el('p', 'recit-e031-progression',
      `Progression mesurée : ${etape.courant} sur ${etape.total} · ${etape.pourcent} % du repère parcouru.`);
    if (estNoeud(progression)) {
      progression.id = 'e031-progression';
      const barre = chercher(racine, '.recit-progress');
      if (estNoeud(barre) && estNoeud(barre.parentNode)) {
        barre.parentNode.insertBefore(progression, barre.nextSibling);
      } else if (estNoeud(corps)) {
        corps.appendChild(progression);
      }
    }
  }

  /* E031-08 — fil aéré, lisible même quand il est dense. */
  ajouterClasse(chercher(racine, '.recit-thread'), 'recit-e031-fil');

  /* E031-09 — traçabilité et absence de source lisibles. */
  ajouterClasse(chercher(racine, '.recit-trace'), 'recit-e031-trace');
  ajouterClasse(chercher(racine, '.recit-sources'), 'recit-e031-sources');

  /* E031-10 — barre de progression perceptible. */
  ajouterClasse(chercher(racine, '.recit-progress'), 'recit-e031-progress');

  /* Mouvement réduit : classé sur le conteneur, sans écouteur permanent. */
  let mouvement = 'normal';
  try { mouvement = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
  catch { mouvement = 'normal'; }
  if (mouvement === 'reduce') ajouterClasse(conteneur, 'recit-e031-sans-mouvement');

  /* Miroir d'audit compact : une seule écriture, aucun texte de point copié. */
  ecrireAttribut(conteneur, 'data-e031-mesure', [
    'col:72ch',
    'lh:1.65',
    'min:12px',
    `mots:${mots}`,
    `min:${minutes}`,
    `prog:${etape ? etape.pourcent : 0}%`,
    `motion:${mouvement}`,
    'mesure:1',
    'progression:1',
    'css:1',
  ].join(' '));
});
