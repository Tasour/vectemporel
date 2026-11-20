import { register } from './registry.js';

/* V2 lentille E021 — « Confort de lecture et mesures structurelles » (vue Récit).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (qui mesurait les
   caractères par ligne, l'interlignage, le contraste WCAG, les règles de lecture,
   les mots du titre, le fil abrégé, la progression, la hiérarchie titre/corps,
   la synthèse du tiroir diagnostics et les réglages groupés). Ici : taille de
   police effective, longueur des phrases, mots longs, largeur utile, blocs de
   texte, indice de confort, respiration ponctuelle, lisibilité du fil, aération
   des commandes et mouvement réduit propre à la V2.

   Toutes les valeurs sont RECALCULÉES depuis le DOM réellement rendu (styles
   calculés, texte du point, largeurs mesurées, nœuds comptés) : aucun chiffre
   historique n'est inventé. Une seule inscription de lentille et un seul appel
   de feuille de style regroupent toutes les règles du module.

   Préfixes : classes recit-v2-e021-, ids DOM v2-e021- (jamais e021- de la passe 1,
   jamais e001- d'une autre lentille). Zéro journalisation, zéro réseau, zéro
   aléa, aucune injection de balisage. Enrichissement strictement additif : sans ce module la vue
   reste intégralement lisible. Chaque chantier est isolé par safe(). */

const CSS = `
/* E021-01 — Taille de police effective du corps. */
.recit-v2-e021-bandeau{margin:8px 0 12px;padding:8px 10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e021-bandeau h2{margin:0 0 6px;color:var(--gold,#e6b96f);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
.recit-v2-e021-mesure{margin:2px 0;color:var(--muted-2,#9a8b73);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e021-taille{color:var(--muted,#b9a98c)}

/* E021-02 — Longueur moyenne des phrases. */
.recit-v2-e021-phrases{color:var(--muted,#b9a98c)}

/* E021-03 — Part de mots longs (≥ 7 lettres). */
.recit-v2-e021-longs{color:var(--muted,#b9a98c)}

/* E021-04 — Largeur utile du texte et part de la fenêtre. */
.recit-v2-e021-largeur{color:var(--muted,#b9a98c)}

/* E021-05 — Nombre de blocs de texte affichés. */
.recit-v2-e021-blocs{color:var(--muted,#b9a98c)}

/* E021-06 — Indice de confort global, écrit en toutes lettres. */
.recit-v2-e021-indice{margin-top:6px;padding-top:6px;border-top:1px solid var(--line,rgba(255,255,255,.1));color:var(--gold-bright,#f5e9d0);font-weight:700}

/* E021-07 — Respiration par la ponctuation. */
.recit-v2-e021-respiration{color:var(--muted,#b9a98c)}

/* E021-08 — Étiquettes de type du fil plus lisibles. */
.recit-layout .recit-v2-e021-fil .thread-kind{color:var(--gold,#e6b96f);font-weight:700;letter-spacing:.08em}

/* E021-09 — Aération des commandes, cibles tactiles élargies. */
.recit-layout .recit-v2-e021-commandes{gap:10px 12px}
.recit-layout .recit-v2-e021-commandes button{min-height:38px}

/* E021-10 — Mouvement réduit propre à la V2. */
.recit-v2-e021-mesure{transition:opacity .2s linear}
.recit-layout[data-v2-e021-motion="reduce"] .recit-v2-e021-mesure{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e021-mesure{transition:none}}
`;

/* Ids et classes des sept lectures chiffrées, dans un ordre stable. */
const LECTURES = [
  ['v2-e021-mes-taille', 'recit-v2-e021-taille'],
  ['v2-e021-mes-phrases', 'recit-v2-e021-phrases'],
  ['v2-e021-mes-longs', 'recit-v2-e021-longs'],
  ['v2-e021-mes-largeur', 'recit-v2-e021-largeur'],
  ['v2-e021-mes-blocs', 'recit-v2-e021-blocs'],
  ['v2-e021-mes-indice', 'recit-v2-e021-indice'],
  ['v2-e021-mes-respiration', 'recit-v2-e021-respiration'],
];

/* Un chantier défaillant est neutralisé : les autres continuent, le rendu reste intact. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

function txt(noeud) {
  return noeud ? String(noeud.textContent || '').trim() : '';
}

function ecrit(noeud, valeur) {
  if (noeud && noeud.textContent !== valeur) noeud.textContent = valeur;
}

function decimal(nombre) {
  return String(nombre).replace('.', ',');
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function styleCalcule(noeud) {
  return safe(() => (typeof getComputedStyle === 'function' ? getComputedStyle(noeud) : null));
}

/* Analyse du texte réel : mots, phrases, mots longs, ponctuation de respiration. */
function analyse(texte) {
  const mots = texte.match(/\S+/g) || [];
  const lettres = (m) => m.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]/g, '').length;
  return {
    nbMots: mots.length,
    nbPhrases: texte.split(/[.!?]+(?:\s|$)/).map((s) => s.trim()).filter(Boolean).length,
    nbLongs: mots.filter((m) => lettres(m) >= 7).length,
    nbRespiration: (texte.match(/[,;:]/g) || []).length,
  };
}

/* Crée le bandeau une seule fois (replacé à chaque reconstruction du DOM). */
function prepareBandeau(body, el) {
  if (!body || typeof body.insertBefore !== 'function') return null;
  let bandeau = typeof document !== 'undefined' ? document.getElementById('v2-e021-bandeau') : null;
  if (!bandeau) {
    bandeau = el('section', 'recit-v2-e021-bandeau');
    bandeau.id = 'v2-e021-bandeau';
    bandeau.setAttribute('aria-label', 'Mesures de confort de lecture — complément V2');
    bandeau.appendChild(el('h2', '', 'Confort de lecture · mesures V2'));
    LECTURES.forEach(([id, classe]) => {
      const p = el('p', `recit-v2-e021-mesure ${classe}`);
      p.id = id;
      bandeau.appendChild(p);
    });
    const ancre = body.querySelector('.recit-timing') || body.querySelector('.recit-meta');
    body.insertBefore(bandeau, ancre && ancre.parentNode === body ? ancre.nextSibling : null);
  }
  return bandeau;
}

register('E021', (ctx) => {
  try {
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;

    /* Une seule feuille, regroupant toutes les règles de la lentille. */
    safe(() => css('recit-v2-e021', CSS));

    const body = layout.querySelector('.recit-body');
    if (!body) return; /* garde d'existence : pas de corps = aucun enrichissement. */

    const titre = document.getElementById('recit-point-title') || body.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || body.querySelector('.recit-context');
    const cibleTexte = contexte || titre;
    const texte = txt(cibleTexte);
    const a = analyse(texte);

    const bandeau = prepareBandeau(body, el);
    const n = (id) => (bandeau ? bandeau.querySelector(`#${id}`) : null);

    /* E021-01 — taille de police calculée, avec le plancher recommandé de 16 px. */
    safe(() => {
      const st = cibleTexte ? styleCalcule(cibleTexte) : null;
      const fs = st && parseFloat(st.fontSize);
      ecrit(n('v2-e021-mes-taille'), fs > 0
        ? `Taille du corps : ${decimal(Math.round(fs * 10) / 10)} px (plancher recommandé : 16 px) · ${fs >= 16 ? 'conforme' : 'sous le plancher'}`
        : 'Taille du corps : non mesurable');
    });

    /* E021-02 — moyenne de mots par phrase, issue du texte réel. */
    safe(() => {
      const moy = a.nbPhrases ? Math.round(a.nbMots / a.nbPhrases) : 0;
      ecrit(n('v2-e021-mes-phrases'), a.nbPhrases
        ? `Longueur moyenne des phrases : ${moy} mot(s) sur ${a.nbPhrases} phrase(s) (repère : ≤ 20)`
        : 'Longueur moyenne des phrases : non mesurable');
    });

    /* E021-03 — part de mots d'au moins sept lettres. */
    safe(() => {
      const pct = a.nbMots ? Math.round((a.nbLongs / a.nbMots) * 100) : 0;
      ecrit(n('v2-e021-mes-longs'), a.nbMots
        ? `Mots longs (≥ 7 lettres) : ${pct} % (${a.nbLongs}/${a.nbMots}) · repère ≤ 30 %`
        : 'Mots longs : non mesurable');
    });

    /* E021-04 — largeur mesurée du bloc et part de la fenêtre. */
    let largeurOk = false;
    safe(() => {
      const largeur = cibleTexte ? Math.round(cibleTexte.getBoundingClientRect().width) : 0;
      const fenetre = typeof window !== 'undefined' ? window.innerWidth : 0;
      const part = largeur > 0 && fenetre > 0 ? Math.round((largeur / fenetre) * 100) : null;
      largeurOk = largeur >= 320 && largeur <= 900;
      ecrit(n('v2-e021-mes-largeur'), largeur > 0
        ? `Largeur utile du texte : ${largeur} px${part !== null ? `, soit ${part} % de la fenêtre` : ''} (repère : 320–900 px)`
        : 'Largeur utile du texte : non mesurable');
    });

    /* E021-05 — comptage réel des blocs de lecture affichés. */
    let blocs = 0;
    safe(() => {
      blocs = body.querySelectorAll('.recit-context, .recit-legend p, .recit-sources, .recit-trace p').length;
      ecrit(n('v2-e021-mes-blocs'), `Blocs de texte affichés : ${blocs} (contexte, légende, sources, tracabilité)`);
    });

    /* E021-06 — indice de confort : nombre de critères dans la cible, en toutes lettres. */
    safe(() => {
      const st = cibleTexte ? styleCalcule(cibleTexte) : null;
      const fs = st && parseFloat(st.fontSize);
      const moy = a.nbPhrases ? Math.round(a.nbMots / a.nbPhrases) : 0;
      const pctLongs = a.nbMots ? Math.round((a.nbLongs / a.nbMots) * 100) : 0;
      const criteres = [
        fs > 0 && fs >= 16,
        a.nbPhrases > 0 && moy <= 20,
        a.nbMots > 0 && pctLongs <= 30,
        largeurOk,
        blocs >= 1,
      ];
      const bons = criteres.filter(Boolean).length;
      const noms = ['taille', 'phrases', 'mots longs', 'largeur', 'blocs'];
      const horsCible = noms.filter((_, i) => !criteres[i]);
      const detail = horsCible.length ? ` · hors cible : ${horsCible.join(', ')}` : ' · tous dans la cible';
      ecrit(n('v2-e021-mes-indice'), `Indice de confort : ${bons}/5 critères dans la cible${detail}.`);
    });

    /* E021-07 — marques de respiration pour cent mots. */
    safe(() => {
      const taux = a.nbMots ? Math.round((a.nbRespiration / a.nbMots) * 100) : 0;
      ecrit(n('v2-e021-mes-respiration'), a.nbMots
        ? `Respiration : ${taux} marque(s) , ; : pour 100 mots (${a.nbRespiration}/${a.nbMots}).`
        : 'Respiration : non mesurable');
    });

    /* E021-08 — étiquettes de type du fil contrastées, sans toucher aux libellés. */
    safe(() => ajouteClasse(body.querySelector('.recit-thread'), 'recit-v2-e021-fil'));

    /* E021-09 — commandes aérées et cibles tactives élargies. */
    safe(() => ajouteClasse(body.querySelector('.recit-actions'), 'recit-v2-e021-commandes'));

    /* E021-10 — mouvement réduit, publié sous un attribut propre à la V2. */
    safe(() => {
      let reduit = false;
      try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
      catch { reduit = false; }
      const voulu = reduit ? 'reduce' : 'normal';
      if (layout.getAttribute('data-v2-e021-motion') !== voulu) {
        layout.setAttribute('data-v2-e021-motion', voulu);
      }
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
