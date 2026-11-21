import { register } from './registry.js';

/*
 * Lentille V2 E068 — « Performance et sobriété » (vue Récit).
 *
 * Dix chantiers neufs, distincts de ceux de la passe 1 (isolation de rendu,
 * content-visibility, décodage d'image, mode sobre, animations réduites,
 * chiffres tabulaires, text-wrap, pointer-events, économie de données).
 * Ici la sobriété est mesurée et rendue lisible : jauge de charge du fil,
 * récapitulatif, coût structurel, volume de texte, avertissement de fil
 * chargé, statut image, levier de densité, respect du mouvement réduit pour
 * les propres artefacts V2, rang du point courant et panneau de synthèse.
 *
 * Une seule feuille (identifiant recit-v2-e068), classes `recit-v2-e068-*`,
 * ids `v2-e068-*` (jamais les ids `e068-*` de la passe 1, qui partage le DOM).
 * Tout chiffre affiché est lu dans le DOM réel ou dans un signal d'environnement
 * effectivement consulté. Aucune journalisation, aucune requête, aucune source
 * d'aléa et aucune injection de balisage. try/catch global, gardes d'existence,
 * idempotence : aucun attribut existant n'est écrasé.
 */

/* Seuil interne de déclenchement de l'avertissement : une convention de budget
   de rendu, jamais affichée comme un fait mesuré. Seul le nombre réel de points
   est écrit dans le DOM. */
const SEUIL_FIL = 120;

/* État de la bascule de densité, conservé entre deux reconstructions du DOM
   par la coque (shell.js). Aucun stockage externe, aucun appel réseau. */
let compact = false;

/* ---------- Utilitaires purs : aucun effet de bord ---------- */

function safe(fn) {
  try { return fn(); } catch { return undefined; }
}

function txt(node) {
  return node && typeof node.textContent === 'string' ? node.textContent : '';
}

function lireTotaux(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const etape = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(txt(kicker));
  const totalEtape = etape ? Math.max(0, Number(etape[2])) : 0;
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  const compte = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/.exec(txt(statut));
  const affiches = compte ? Math.max(0, Number(compte[1])) : 0;
  const totalStatut = compte ? Math.max(0, Number(compte[2])) : 0;
  return { affiches, total: totalEtape || totalStatut || 0 };
}

function volumeTexte(titre, contexte) {
  const brut = (txt(titre) + ' ' + txt(contexte)).replace(/\s+/g, ' ').trim();
  return {
    caracteres: brut.length,
    mots: brut ? brut.split(' ').filter(Boolean).length : 0,
  };
}

function profilImage(media) {
  const images = media ? safe(() => media.querySelectorAll('img')) : null;
  return {
    nombre: images ? images.length : 0,
    vide: Boolean(media && safe(() => media.querySelector('.media-empty'))),
  };
}

function rangCourant(items) {
  return items.findIndex((bouton) =>
    bouton.getAttribute('aria-current') === 'step' || bouton.classList.contains('is-current'));
}

/* Insertion après une ancre, sans jamais réutiliser un id existant. */
function insererApres(ancrage, noeud, id, racine) {
  if (!ancrage || !ancrage.parentNode || !racine || typeof racine.querySelector !== 'function') return false;
  try { if (racine.querySelector('#' + id)) return false; } catch { return false; }
  ancrage.parentNode.insertBefore(noeud, ancrage.nextSibling);
  return true;
}

function poser(apres, noeud, id, racine, secours) {
  if (insererApres(apres, noeud, id, racine)) return noeud;
  if (secours && secours.parentNode && typeof secours.querySelector === 'function'
    && !secours.querySelector('#' + id)) secours.appendChild(noeud);
  return noeud;
}

/* ---------- Feuille unique ---------- */

const RULES = `
/* E068-01 — jauge de charge du fil. */
.recit-layout[data-v2-e068="on"] .recit-v2-e068-jauge{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}
.recit-v2-e068-jauge-texte{color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.recit-v2-e068-jauge-piste{flex:1 1 90px;min-width:60px;height:5px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.recit-v2-e068-jauge-rempli{display:block;height:100%;background:var(--gold);transition:width .18s ease}
/* E068-02 — récapitulatif de sobriété. */
.recit-v2-e068-recap{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
/* E068-03 / 04 / 06 / 09 — notes de synthèse visibles. */
.recit-v2-e068-note,.recit-v2-e068-rang{margin:4px 0;color:var(--muted-2);font-size:9px;line-height:1.45;font-variant-numeric:tabular-nums}
.recit-v2-e068-avertissement{margin:4px 0;padding:5px 8px;border-left:2px solid var(--gold);color:var(--muted);font-size:9px;line-height:1.45;font-variant-numeric:tabular-nums}
/* E068-07 — levier de densité (cible tactile ≥ 36 px, focus visible). */
.recit-v2-e068-bouton{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:9px;white-space:nowrap;cursor:pointer}
.recit-v2-e068-bouton:hover{border-color:var(--gold);color:var(--ink)}
.recit-v2-e068-bouton:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-v2-e068-compact .c3a-tools{margin:6px 0 4px}
.recit-layout.recit-v2-e068-compact .recit-thread-list{gap:2px}
.recit-layout.recit-v2-e068-compact .recit-thread{margin-bottom:10px}
.recit-layout.recit-v2-e068-compact .recit-legend{margin-top:6px;padding-top:6px}
.recit-layout.recit-v2-e068-compact .recit-actions{gap:4px}
/* E068-08 — mouvement réduit appliqué aux artefacts V2. */
.recit-layout.recit-v2-e068-sans-mouvement .recit-v2-e068-jauge-rempli{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e068-jauge-rempli{transition:none!important;animation:none!important}
}
/* E068-10 — panneau de synthèse (tiroir diagnostic). */
.recit-v2-e068-panel{display:block;margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e068-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-v2-e068-panel p{margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
@media (max-width:620px){
  .recit-v2-e068-jauge-piste{flex-basis:100%}
  .recit-v2-e068-bouton{white-space:normal}
}
`;

/* E068-07 — synchronisation de la densité sur la racine et le bouton. */
function syncCompact(layout, button) {
  layout.classList.toggle('recit-v2-e068-compact', compact);
  if (!button) return;
  safe(() => {
    button.setAttribute('aria-pressed', String(compact));
    button.textContent = compact ? 'Densité : compacte' : 'Densité : normale';
  });
}

/* E068-10 — champs du panneau, tous dérivés du DOM ou de signaux locaux. */
const CHAMPS = [
  ['noeuds', 'Nœuds de base : —'],
  ['fil', 'Points affichés : —'],
  ['couverture', 'Couverture du fil : —'],
  ['volume', 'Volume du point : —'],
  ['image', 'Image : —'],
  ['mouvement', 'Mouvement : —'],
  ['densite', 'Densité : —'],
  ['rang', 'Rang du point courant : —'],
  ['bilan', 'Bilan sobriété : —'],
];

function ajouterPanneau(el, stage) {
  const ancien = safe(() => document.getElementById('v2-e068-diagnostic'));
  if (ancien && ancien.parentNode) {
    safe(() => ancien.parentNode.removeChild(ancien));
  }
  const panneau = el('section', 'recit-v2-e068-panel');
  panneau.id = 'v2-e068-diagnostic';
  panneau.setAttribute('data-recitv2-diagnostic', '');
  panneau.setAttribute('aria-label', 'Synthèse V2 de la performance et de la sobriété du récit');
  panneau.appendChild(el('h2', '', 'E068 V2 — Performance et sobriété · synthèse'));
  const noeuds = {};
  CHAMPS.forEach(([cle, texte]) => {
    const ligne = el('p', '', texte);
    ligne.id = 'v2-e068-diag-' + cle;
    panneau.appendChild(ligne);
    noeuds[cle] = ligne;
  });
  stage.appendChild(panneau);
  return noeuds;
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E068', (ctx) => {
  try {
    if (!ctx || !ctx.stage || !ctx.layout || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    if (typeof layout.querySelector !== 'function') return;
    css('recit-v2-e068', RULES);

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    layout.dataset.v2E068 = 'on';
    layout.classList.toggle('recit-v2-e068-sans-mouvement', sys);
    safe(() => layout.setAttribute('data-v2-e068-mouvement', sys ? 'reduit' : 'plein'));

    const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
    const kicker = layout.querySelector('.view-kicker');
    const timing = layout.querySelector('.recit-timing');
    const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
    const contexte = layout.querySelector('#recit-context');
    const media = layout.querySelector('.recit-media');
    const actions = layout.querySelector('.recit-actions');

    const totaux = lireTotaux(layout);
    const noeuds = safe(() => layout.querySelectorAll('*').length) || 0;
    const volume = volumeTexte(titre, contexte);
    const image = profilImage(media);
    const items = safe(() => Array.from(layout.querySelectorAll('.recit-thread-item'))) || [];
    const rang = rangCourant(items);
    const pct = totaux.total > 0 ? Math.round((totaux.affiches / totaux.total) * 100) : 0;

    /* Chaine d'ancrage : chaque note suit la precedente sans ecraser d'id. */
    let ancre = statut || kicker || corps.firstChild;
    const chainer = (noeud, id) => {
      const deja = safe(() => layout.querySelector('#' + id));
      if (deja) { ancre = deja; return deja; }
      poser(ancre, noeud, id, layout, corps);
      if (noeud.parentNode) ancre = noeud;
      return noeud;
    };

    /* E068-01 — jauge de charge du fil : taux lu dans le statut et l'étape. */
    const jauge = el('div', 'recit-v2-e068-jauge');
    jauge.id = 'v2-e068-jauge';
    jauge.appendChild(el('span', 'recit-v2-e068-jauge-texte',
      'Fil : ' + totaux.affiches + ' / ' + totaux.total + ' point(s) · ' + pct + ' % affichés'));
    const piste = el('span', 'recit-v2-e068-jauge-piste');
    piste.setAttribute('aria-hidden', 'true');
    const remplissage = el('span', 'recit-v2-e068-jauge-rempli');
    remplissage.style.width = pct + '%';
    piste.appendChild(remplissage);
    jauge.appendChild(piste);
    chainer(jauge, 'v2-e068-jauge');

    /* E068-02 — récapitulatif de sobriété en phrase, relu à chaque rendu. */
    const recap = el('p', 'recit-v2-e068-recap',
      'Profil sobriété : mouvement ' + (sys ? 'réduit' : 'complet')
      + ' · image ' + (image.nombre ? 'présente (' + image.nombre + ')' : 'absente')
      + ' · ' + noeuds + ' nœuds de base · ' + volume.caracteres + ' caractères de texte.');
    recap.id = 'v2-e068-recap';
    recap.setAttribute('role', 'status');
    recap.setAttribute('aria-live', 'polite');
    chainer(recap, 'v2-e068-recap');

    /* E068-05 — avertissement quand le fil dépasse le budget interne. */
    if (totaux.affiches >= SEUIL_FIL) {
      const avertissement = el('p', 'recit-v2-e068-avertissement',
        'Fil chargé : ' + totaux.affiches + ' point(s) affiché(s), autant de boutons disposés et peints. '
        + 'La recherche et les filtres réduisent ce coût.');
      avertissement.id = 'v2-e068-avertissement';
      chainer(avertissement, 'v2-e068-avertissement');
    }

    /* E068-09 — rang du point courant dans le fil réellement affiché. */
    const rangNote = el('p', 'recit-v2-e068-rang',
      'Point courant : ' + (rang >= 0 ? 'rang ' + (rang + 1) + ' / ' + items.length : 'hors du fil affiché')
      + ' · ' + items.length + ' bouton(s) dans le fil.');
    rangNote.id = 'v2-e068-rang';
    chainer(rangNote, 'v2-e068-rang');

    /* E068-03 — coût structurel : nœuds présents avant ce tableau de bord. */
    const noteNoeuds = el('p', 'recit-v2-e068-note',
      'Complexité de base : ' + noeuds + ' nœuds dans la vue, avant cet enrichissement V2.');
    noteNoeuds.id = 'v2-e068-noeuds';
    poser(kicker, noteNoeuds, 'v2-e068-noeuds', layout, corps);

    /* E068-04 — volume de texte du point, sans réécrire une seule phrase. */
    const noteVolume = el('p', 'recit-v2-e068-note',
      'Volume du point : ' + volume.caracteres + ' caractères · ' + volume.mots + ' mots (titre et chapeau).');
    noteVolume.id = 'v2-e068-volume';
    poser(timing, noteVolume, 'v2-e068-volume', layout, corps);

    /* E068-06 — statut image réel : aucun octet annoncé quand il n'y a pas d'image. */
    const noteImage = el('p', 'recit-v2-e068-note', image.nombre
      ? 'Image : ' + image.nombre + ' élément(s) image présent(s) dans ce repère.'
      : 'Aucune image pour ce repère : aucun octet d’image demandé.');
    noteImage.id = 'v2-e068-image';
    poser(noteVolume, noteImage, 'v2-e068-image', layout, corps);

    /* E068-07 — levier de densité, bascule indépendante (aria-pressed). */
    safe(() => {
      if (!actions || !el) return;
      let bouton = safe(() => document.getElementById('v2-e068-compact'));
      if (!bouton) bouton = safe(() => actions.querySelector('#v2-e068-compact'));
      if (!bouton) {
        bouton = el('button', 'recit-v2-e068-bouton',
          compact ? 'Densité : compacte' : 'Densité : normale');
        bouton.id = 'v2-e068-compact';
        bouton.type = 'button';
        bouton.setAttribute('aria-pressed', String(compact));
        bouton.title = 'Réduire les espacements pour afficher plus de contenu par écran, sans masquer de texte.';
        bouton.addEventListener('click', () => {
          safe(() => { compact = !compact; syncCompact(layout, bouton); });
        });
        actions.insertBefore(bouton, actions.firstChild);
      }
      syncCompact(layout, bouton);
    });

    /* E068-10 — panneau de synthèse, puis alimentation depuis les mesures. */
    const ind = ajouterPanneau(el, stage);
    const ecrire = (cle, valeur) => {
      const noeud = ind[cle];
      if (noeud && noeud.textContent !== valeur) noeud.textContent = valeur;
    };
    ecrire('noeuds', 'Nœuds de base : ' + noeuds + '.');
    ecrire('fil', 'Points affichés : ' + totaux.affiches + ' sur ' + totaux.total + '.');
    ecrire('couverture', 'Couverture du fil : ' + pct + ' % du repère.');
    ecrire('volume', 'Volume du point : ' + volume.caracteres + ' caractères · ' + volume.mots + ' mots.');
    ecrire('image', 'Image : ' + (image.nombre ? image.nombre + ' élément(s) présent(s)' : 'absente')
      + (image.vide ? ' (repère sans image vérifiée).' : '.'));
    ecrire('mouvement', 'Mouvement : ' + (sys ? 'réduit' : 'complet') + '.');
    ecrire('densite', 'Densité : ' + (compact ? 'compacte' : 'normale') + '.');
    ecrire('rang', 'Rang du point courant : '
      + (rang >= 0 ? (rang + 1) + ' / ' + items.length : '—') + '.');
    ecrire('bilan', 'Bilan : ' + noeuds + ' nœuds, ' + items.length + ' boutons de fil, '
      + volume.caracteres + ' caractères, mouvement ' + (sys ? 'réduit' : 'complet') + '.');
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
