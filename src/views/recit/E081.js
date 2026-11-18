import { register } from './registry.js';

/* Lentille E081 — Lisibilité et mesure de lecture (vue Récit).
   Dix chantiers concrets et distincts, tous additifs et non destructifs : sans
   ce module, la vue reste intégralement lisible. Aucun appel réseau, aucun aléa,
   aucune sortie de débogage, aucun fichier partagé modifié. Les classes ajoutées
   sont préfixées recit-e081- et les ancres DOM e081- sont uniques. */

const CSS = `
/* E081-01 — sélection de texte contrastée pendant la lecture. */
.recit-e081-selection ::selection{background:rgba(230,185,111,.34);color:var(--ink)}
.recit-e081-selection ::-moz-selection{background:rgba(230,185,111,.34);color:var(--ink)}

/* E081-02 / 03 / 08 / 09 — bloc de mesures de lecture. */
.recit-e081-mesures{margin:6px 0 4px;padding:6px 10px;border-left:2px solid rgba(230,185,111,.38);background:rgba(230,185,111,.04);border-radius:0 8px 8px 0}
.recit-e081-mesure{margin:2px 0;color:var(--ink-soft);font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E081-04 — police de lecture sérif (bascule). */
.recit-e081-serif .recit-title,
.recit-e081-serif .recit-context{font-family:Georgia,'Times New Roman',serif}

/* E081-05 — taille du texte ajustable (cycle 100 / 110 / 120 %). */
.recit-body[data-e081-taille="110"] .recit-context{font-size:1.1em}
.recit-body[data-e081-taille="120"] .recit-context{font-size:1.2em}

/* E081-06 — largeur de mesure ajustable (double sélecteur pour prévaloir). */
.recit-body.recit-e081-largeur[data-e081-largeur="54"] .recit-title,
.recit-body.recit-e081-largeur[data-e081-largeur="54"] .recit-context{max-width:54ch}
.recit-body.recit-e081-largeur[data-e081-largeur="66"] .recit-title,
.recit-body.recit-e081-largeur[data-e081-largeur="66"] .recit-context{max-width:66ch}
.recit-body.recit-e081-largeur[data-e081-largeur="78"] .recit-title,
.recit-body.recit-e081-largeur[data-e081-largeur="78"] .recit-context{max-width:78ch}

/* E081-07 — guide de ligne horizontal aligné sur l'interlignage. */
.recit-e081-lignes{background-image:linear-gradient(to bottom,transparent calc(100% - 1px),rgba(230,185,111,.10) calc(100% - 1px));background-size:100% 1.72em;background-repeat:repeat}

/* E081-09 — chiffres stables dans les mesures natives de la vue. */
.recit-e081-chiffres .recit-timing,
.recit-e081-chiffres .c3a-status{font-variant-numeric:tabular-nums}

/* Commandes de confort. */
.recit-e081-btn{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.recit-e081-btn:hover{border-color:var(--gold);color:var(--ink)}
.recit-e081-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-e081-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E081-10 — confort : mouvement réduit. */
.recit-body[data-e081-motion="reduce"] .recit-e081-btn{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e081-btn{transition:none}}
`;

/* État des réglages : survit aux reconstructions du DOM opérées par la coque. */
let policeSerif = false;
let etapeTaille = 0;
let etapeLargeur = 1;
const TAILLES = [100, 110, 120];
const LARGEURS = [54, 66, 78];
const NOMS_LARGEUR = ['compacte', 'confortable', 'large'];

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function motsDe(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

function appliqueEtats(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return;
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  if (policeSerif) ajouteClasse(body, 'recit-e081-serif');
  else if (body.classList) body.classList.remove('recit-e081-serif');
  if (body.setAttribute) {
    body.setAttribute('data-e081-taille', String(TAILLES[etapeTaille]));
    body.setAttribute('data-e081-largeur', String(LARGEURS[etapeLargeur]));
  }
}

function synchroniseBoutons() {
  if (typeof document === 'undefined') return;
  const police = document.getElementById('e081-police-btn');
  if (police) {
    const libelle = policeSerif
      ? 'Police de lecture : sérif (désactiver)'
      : 'Police de lecture : sérif (activer)';
    police.textContent = libelle;
    police.setAttribute('aria-label', libelle);
    police.setAttribute('aria-pressed', policeSerif ? 'true' : 'false');
  }
  const taille = document.getElementById('e081-taille-btn');
  if (taille) {
    const libelle = `Taille du texte : ${TAILLES[etapeTaille]} % (cliquer pour agrandir)`;
    taille.textContent = libelle;
    taille.setAttribute('aria-label', libelle);
  }
  const largeur = document.getElementById('e081-largeur-btn');
  if (largeur) {
    const libelle = `Largeur de lecture : ${NOMS_LARGEUR[etapeLargeur]} (${LARGEURS[etapeLargeur]} caractères) — cliquer pour changer`;
    largeur.textContent = libelle;
    largeur.setAttribute('aria-label', libelle);
  }
}

function assureBouton(actions, id, onClick) {
  if (!actions || !actions.appendChild) return null;
  let bouton = document.getElementById(id);
  if (!bouton || bouton.parentElement !== actions) {
    bouton = el('button', 'recit-e081-btn');
    bouton.id = id;
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  if (bouton.getAttribute('data-e081-bound') !== '1') {
    bouton.setAttribute('data-e081-bound', '1');
    bouton.addEventListener('click', () => {
      onClick();
      const cadre = bouton.closest ? (bouton.closest('.recit-layout') || document.querySelector('.recit-layout')) : document.querySelector('.recit-layout');
      appliqueEtats(cadre);
      synchroniseBoutons();
    });
  }
  return bouton;
}

function paragraphe(id, texte) {
  const p = el('p', 'recit-e081-mesure', texte);
  p.id = id;
  p.setAttribute('aria-label', texte);
  return p;
}

function dureeLisible(minutes) {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} s`;
  return `${minutes.toFixed(1)} min`;
}

register('E081', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-e081', CSS); /* un seul appel, toutes les règles du module. */

    const body = layout.querySelector('.recit-body');
    const titre = document.getElementById('recit-point-title') || layout.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || layout.querySelector('.recit-context');
    const timing = layout.querySelector('.recit-timing');
    const actions = layout.querySelector('.recit-actions');
    const fil = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');

    /* E081-01 — sélection contrastée. */
    ajouteClasse(body, 'recit-e081-selection');

    /* E081-02 — durée de lecture du repère entier, dérivée du fil réel. */
    let motsFil = 0;
    let pointsFil = 0;
    const comptes = { 'récit': 0, 'figure': 0, 'lieu': 0, 'audit': 0, 'autre': 0 };
    if (fil && typeof fil.querySelectorAll === 'function') {
      fil.querySelectorAll('.recit-thread-item').forEach((item) => {
        let texte = item.textContent || '';
        const kind = item.querySelector ? item.querySelector('.thread-kind') : null;
        if (kind && kind.textContent) texte = texte.split(kind.textContent).join(' ');
        texte = texte.replace(/^\s*\d+\.\s*/, '');
        motsFil += motsDe(texte);
        pointsFil += 1;
        const kindDonnee = item.getAttribute ? (item.getAttribute('data-kind') || '') : '';
        const cle = Object.prototype.hasOwnProperty.call(comptes, kindDonnee) ? kindDonnee : 'autre';
        comptes[cle] += 1;
      });
    }
    const minutes = motsFil / 180; /* débit de référence : 180 mots/min. */

    /* E081-03 — densité du point courant (mots par phrase). */
    const texteTitre = titre ? (titre.textContent || '') : '';
    const nbMots = motsDe(texteTitre);
    const nbPhrases = texteTitre.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean).length || 1;
    const densite = nbMots / nbPhrases;
    const qualificatif = densite <= 12 ? 'aisée' : (densite <= 20 ? 'soutenue' : 'dense');

    /* E081-09 — progression chiffrée, lue depuis le repère de progression réel. */
    let etape = 0;
    let total = 0;
    const kicker = layout.querySelector('.view-kicker');
    if (kicker && kicker.textContent) {
      const found = kicker.textContent.match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      if (found) { etape = Number(found[1]); total = Number(found[2]); }
    }
    if (!total) {
      const fill = layout.querySelector('.recit-progress > span');
      if (fill && fill.style && fill.style.width) {
        const pct = parseFloat(fill.style.width);
        if (!Number.isNaN(pct)) { total = 100; etape = Math.round(pct); }
      }
    }
    const pourcent = total ? Math.round((etape / total) * 100) : 0;

    /* Bloc unique de mesures, déplacé et rempli à chaque rendu. */
    let mesures = document.getElementById('e081-mesures');
    if (!mesures) {
      mesures = el('div', 'recit-e081-mesures');
      mesures.id = 'e081-mesures';
    }
    if (mesures.textContent) mesures.textContent = '';
    mesures.appendChild(paragraphe('e081-duree',
      `Lecture du repère : ≈ ${dureeLisible(minutes)} pour ${pointsFil} point(s), à 180 mots/min (débit de référence).`));
    mesures.appendChild(paragraphe('e081-densite',
      `Densité du point : ${densite.toFixed(1)} mot(s) par phrase — lecture ${qualificatif}.`));
    const partiesFil = Object.keys(comptes).filter((c) => comptes[c] > 0)
      .map((c) => `${comptes[c]} ${c}`);
    mesures.appendChild(paragraphe('e081-fil-resume',
      `Fil : ${partiesFil.length ? partiesFil.join(' · ') : 'aucun point affiché'}.`));
    mesures.appendChild(paragraphe('e081-progression',
      `Progression de lecture : ${pourcent} % · point ${etape} sur ${total}.`));
    const ancre = timing || document.getElementById('recit-context') || titre;
    if (ancre && ancre.parentNode && ancre.parentNode.insertBefore) {
      ancre.parentNode.insertBefore(mesures, ancre.nextSibling);
    } else if (body && body.appendChild) {
      body.appendChild(mesures);
    }

    /* E081-04 / 05 / 06 / 09 — réglages, classe de chiffres et états. */
    ajouteClasse(body, 'recit-e081-largeur');
    ajouteClasse(body, 'recit-e081-chiffres');
    ajouteClasse(contexte, 'recit-e081-lignes');
    appliqueEtats(layout);

    /* E081-04 — bascule de police (bascule indépendante : aria-pressed). */
    assureBouton(actions, 'e081-police-btn', () => { policeSerif = !policeSerif; });
    /* E081-05 — cycle de taille (choix multiple : pas d'aria-pressed). */
    assureBouton(actions, 'e081-taille-btn', () => { etapeTaille = (etapeTaille + 1) % TAILLES.length; });
    /* E081-06 — cycle de largeur (choix multiple : pas d'aria-pressed). */
    assureBouton(actions, 'e081-largeur-btn', () => { etapeLargeur = (etapeLargeur + 1) % LARGEURS.length; });
    synchroniseBoutons();

    /* E081-10 — mouvement réduit, lu une seule fois par rendu. */
    if (body && body.setAttribute) {
      let reduit = false;
      if (reducedMotion && typeof reducedMotion === 'function') reduit = reducedMotion() === true;
      body.setAttribute('data-e081-motion', reduit ? 'reduce' : 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
