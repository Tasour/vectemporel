import { register } from './registry.js';

/* V2 lentille E051 — Lisibilité et mesure de lecture (complément de la passe 1).
   La passe 1 (E051) traite déjà : indice de Flesch, temps de référence à 150
   mots/min, longueur moyenne des phrases, densité lexicale (mots ≥ 3 syllabes),
   calibreur 55/66/75 ch, respirations orphelines, barre de progression locale,
   chiffres tabulaires, panneau <details> de mesures et mouvement réduit.
   La V2 propose donc DIX chantiers neufs et distincts : une « fiche de lecture »
   chiffrée (richesse lexicale, mot le plus long, densité de pauses, souffles de
   lecture), trois réglages typographiques ciblés, une hiérarchie visuelle et un
   confort mouvement/mobile. Tout est dérivé du DOM réel, jamais inventé.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e051-, ids DOM v2-e051- (jamais les ids e051- de la
   passe 1, qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa. */

const IDS_FICHE = [
  'v2-e051-richesse',
  'v2-e051-longest',
  'v2-e051-pauses',
  'v2-e051-souffles',
  'v2-e051-note',
];

/* --- Bloc CSS unique de la lentille -------------------------------------- */
const CSS = `
/* E051-01 à E051-04, E051-05 — panneau « Fiche de lecture » et ses mesures. */
.recit-v2-e051-fiche{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e051-fiche-titre{margin:0 0 6px;color:var(--ink);font-size:11px;font-weight:700;letter-spacing:.06em}
.recit-v2-e051-liste{margin:0;padding-left:18px;color:var(--ink-soft);font-size:11px;line-height:1.6}
.recit-v2-e051-liste li{margin:3px 0}
.recit-v2-e051-note{margin:8px 0 0;color:var(--muted-2);font-size:10px;line-height:1.5;font-style:italic}

/* E051-06 — aération discrète du titre. */
.recit-layout .recit-v2-e051-aeration .recit-title{letter-spacing:.01em;word-spacing:.06em}

/* E051-07 — interlignage généreux du chapeau. */
.recit-layout .recit-v2-e051-chapeau .recit-context{line-height:1.72}

/* E051-08 — contraste renforcé du temps de lecture. */
.recit-layout .recit-v2-e051-timing .recit-timing{color:var(--ink-soft)}

/* E051-09 — hiérarchie visuelle de la fiche : filet et chiffres alignés. */
.recit-v2-e051-corps .recit-v2-e051-fiche{border-left:3px solid var(--gold);font-variant-numeric:tabular-nums}

/* E051-10 — mouvement réduit et confort mobile de la fiche. */
.recit-v2-e051-anime{animation:recit-v2-e051-apparition .28s ease-out both}
@keyframes recit-v2-e051-apparition{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.recit-layout[data-v2-e051-motion="reduce"] .recit-v2-e051-anime{animation:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e051-anime{animation:none}}
@media (max-width:620px){.recit-v2-e051-fiche{padding:8px 10px}.recit-v2-e051-liste{font-size:10px}}
`;

/* --- Gardes et utilitaires ------------------------------------------------ */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
    && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function texte(noeud) {
  return String((noeud && noeud.textContent) || '').trim();
}

/* Déplace (ou insère) un nœud sans jamais lever d'erreur. */
function place(noeud, parent, avant) {
  if (!noeud || !parent || typeof parent.insertBefore !== 'function') return;
  if (noeud.parentElement === parent && (!avant || noeud.nextSibling === avant)) return;
  try { parent.insertBefore(noeud, avant || null); } catch { /* rendu préservé */ }
}

function ecris(id, valeur) {
  const noeud = document.getElementById(id);
  if (noeud && typeof noeud.textContent !== 'undefined') noeud.textContent = valeur;
}

/* --- Mesures dérivées du texte réel (Aucune donnée ajoutée) --------------- */
function motsDuTexte(brut) {
  return String(brut || '').split(/\s+/).filter((m) => /[a-zA-ZÀ-ÿ0-9]/.test(m));
}

function cleMot(mot) {
  return String(mot || '').toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüœæ']/g, '');
}

function lettresMot(mot) {
  return String(mot || '').replace(/[^a-zA-ZÀ-ÿ]/g, '');
}

/* E051-01 — richesse lexicale : mots distincts / mots totaux. */
function richesseLexicale(mots) {
  const cles = mots.map(cleMot).filter(Boolean);
  const distincts = new Set(cles);
  const total = cles.length;
  if (!total) return null;
  const part = Math.round((distincts.size / total) * 100);
  const qualificatif = part >= 70 ? 'vocabulaire varié'
    : part >= 50 ? 'vocabulaire modérément varié' : 'vocabulaire répétitif';
  return { distincts: distincts.size, total, part, qualificatif };
}

/* E051-02 — mot le plus long, mesuré en lettres. */
function motLePlusLong(mots) {
  let meilleur = '';
  for (const mot of mots) {
    const lettres = lettresMot(mot);
    if (lettres.length > meilleur.length) meilleur = lettres;
  }
  return meilleur ? { mot: meilleur, longueur: meilleur.length } : null;
}

/* E051-03 — densité de pauses internes pour 100 mots. */
function densitePauses(chaine, nbMots) {
  const pauses = (String(chaine || '').match(/[,;:()\[\]—–…]/g) || []).length;
  if (!nbMots) return null;
  const pour100 = Math.round((pauses / nbMots) * 100);
  const qualificatif = pour100 <= 8 ? 'phrases fluides, peu de pauses'
    : pour100 <= 18 ? 'rythme modéré' : 'rythme haché, pauses fréquentes';
  return { pauses, pour100, qualificatif };
}

/* E051-04 — volume en « souffles » d'environ 15 mots chacun. */
function soufflesLecture(nbMots) {
  if (!nbMots) return null;
  return Math.max(1, Math.ceil(nbMots / 15));
}

/* --- E051-05 : structure de la fiche, réutilisée par id ------------------- */
function construitFiche(panel, el) {
  panel.textContent = '';

  const titre = el('p', 'recit-v2-e051-fiche-titre', 'Fiche de lecture');
  panel.appendChild(titre);

  const liste = el('ul', 'recit-v2-e051-liste');
  const lignes = [
    ['v2-e051-richesse', 'Richesse lexicale : —'],
    ['v2-e051-longest', 'Mot le plus long : —'],
    ['v2-e051-pauses', 'Pauses : —'],
    ['v2-e051-souffles', 'Volume : —'],
  ];
  lignes.forEach(([id, libelle]) => {
    const li = el('li', 'recit-v2-e051-mesure', libelle);
    li.id = id;
    liste.appendChild(li);
  });
  panel.appendChild(liste);

  const note = el('p', 'recit-v2-e051-note');
  note.id = 'v2-e051-note';
  panel.appendChild(note);
}

/* --- Point d'entrée unique ------------------------------------------------ */
register('E051', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;

    /* Un seul appel CSS, toutes les règles du module. */
    css('recit-v2-e051', CSS);

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const timing = corps.querySelector('.recit-timing');

    ajouteClasse(layout, 'recit-v2-e051-root');
    ajouteClasse(corps, 'recit-v2-e051-corps');

    /* Texte réel du point : titre seul, ou titre + chapeau au premier point. */
    const brut = [texte(titre), texte(contexte)].filter(Boolean).join(' ').trim();
    const mots = motsDuTexte(brut);

    const riche = richesseLexicale(mots);
    const long = motLePlusLong(mots);
    const pauses = densitePauses(brut, mots.length);
    const souffles = soufflesLecture(mots.length);

    /* E051-05 : panneau réutilisé par id, reconstruit seulement si un enfant
       manque ; inséré après le temps de lecture (ou après le titre en repli). */
    let fiche = document.getElementById('v2-e051-fiche');
    const incomplet = IDS_FICHE.some((id) => !document.getElementById(id));
    if (!fiche) {
      fiche = el('div', 'recit-v2-e051-fiche recit-v2-e051-anime');
      fiche.id = 'v2-e051-fiche';
    }
    if (!fiche.firstChild || incomplet) construitFiche(fiche, el);
    const ancre = timing && timing.parentNode === corps ? timing : titre;
    place(fiche, corps, ancre && ancre.parentNode === corps ? ancre.nextSibling : null);

    /* E051-01 à E051-04 : chaque chiffre est recalculé depuis le texte. */
    ecris('v2-e051-richesse', riche
      ? `Richesse lexicale : ${riche.distincts} mot${riche.distincts > 1 ? 's' : ''} distinct${riche.distincts > 1 ? 's' : ''} sur ${riche.total} (${riche.part} %) — ${riche.qualificatif}.`
      : 'Richesse lexicale : texte vide, mesure non calculable.');
    ecris('v2-e051-longest', long
      ? `Mot le plus long : « ${long.mot} » (${long.longueur} lettre${long.longueur > 1 ? 's' : ''}).`
      : 'Mot le plus long : texte vide, mesure non calculable.');
    ecris('v2-e051-pauses', pauses
      ? `Pauses : ${pauses.pauses} signe${pauses.pauses > 1 ? 's' : ''} de ponctuation interne, soit ${pauses.pour100} pour 100 mots — ${pauses.qualificatif}.`
      : "Pauses : texte vide, mesure non calculable.");
    ecris('v2-e051-souffles', souffles
      ? `Volume : ≈ ${souffles} souffle${souffles > 1 ? 's' : ''} de lecture à ~15 mots par souffle (${mots.length} mots comptés).`
      : 'Volume : texte vide, mesure non calculable.');
    ecris('v2-e051-note',
      "Formules : richesse = mots distincts / mots totaux ; mot le plus long = longueur maximale en lettres ; pauses = virgules, points-virgules, deux-points, parenthèses, tirets et ellipses pour 100 mots ; souffle ≈ 15 mots. Tout est calculé sur le texte réel du point, sans donnée ajoutée.");

    /* E051-06 à E051-08 : réglages typographiques ciblés et additifs. */
    ajouteClasse(corps, 'recit-v2-e051-aeration');
    ajouteClasse(corps, 'recit-v2-e051-chapeau');
    if (timing) ajouteClasse(corps, 'recit-v2-e051-timing');

    /* E051-09 : le filet latéral et les chiffres tabulaires sont portés par
       .recit-v2-e051-corps .recit-v2-e051-fiche (déjà ajoutée plus haut). */

    /* E051-10 : mouvement réduit lu une seule fois par rendu, sans écraser
       l'attribut data-e051-motion de la passe 1. */
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e051-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e051-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
