import { register } from './registry.js';

/* Lentille E051 — Lisibilité et mesure de lecture (vue Récit).
 *
 * Dix chantiers indépendants, tous additifs et non destructifs : sans ce
 * module, la vue reste intégralement lisible. Aucun appel réseau, aucun aléa,
 * aucun console.*, aucun timer. Un seul register('E051', …) et un seul bloc
 * CSS injecté via css('recit-e051', …). Toutes les classes créées sont
 * préfixées recit-e051- et tous les identifiants e051- (uniques, gardés
 * contre le doublon et contre les reconstructions du DOM par la coque).
 *
 * E001 traitait déjà la mesure fixe ; E051 se distingue par la MESURE
 * CALCULÉE : indice de Flesch, temps de référence comparé à l'estimation de
 * la vue, longueur des phrases, densité lexicale, calibreur interactif et
 * indicateur de progression de lecture.
 */

const CSS_ID = 'recit-e051';
const MESURES = [55, 66, 75]; /* largeurs cibles, en caractères */
const IDS_ENFANTS = [
  'e051-synth', 'e051-calibre', 'e051-regle', 'e051-detail',
  'e051-msg-flesch', 'e051-msg-temps', 'e051-msg-phrases',
  'e051-msg-lexique', 'e051-msg-note',
];

/* --- Bloc CSS unique de la lentille -------------------------------------- */
const CSS = `
/* E051-05 — calibreur de mesure et sa règle visible. */
.recit-e051-root{--e051-or:#e6b96f}
.recit-e051-corps .recit-title,
.recit-e051-corps .recit-context,
.recit-e051-corps .recit-e051-panel{max-width:var(--e051-measure,66ch)}
.recit-e051-panel{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e051-calibre{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0 2px}
.recit-e051-btn{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:11px;cursor:pointer;transition:border-color .16s linear,color .16s linear}
.recit-e051-btn:hover{border-color:var(--e051-or);color:var(--ink)}
.recit-e051-btn:focus-visible{outline:2px solid var(--e051-or);outline-offset:2px}
.recit-e051-regle{position:relative;display:block;width:var(--e051-measure,66ch);max-width:100%;height:8px;border-bottom:1px dashed var(--line-strong)}
.recit-e051-regle::before{content:'';position:absolute;left:0;bottom:-3px;width:1px;height:7px;background:var(--e051-or)}
.recit-e051-regle::after{content:attr(data-e051-mesure);position:absolute;right:0;bottom:9px;color:var(--muted-2);font-size:9px;white-space:nowrap}

/* E051-01 à E051-04, E051-09 — panneau de mesures et sa synthèse. */
.recit-e051-synth{margin:0;color:var(--ink);font-size:12px;line-height:1.65}
.recit-e051-detail{margin-top:6px}
.recit-e051-summary{min-height:36px;display:flex;align-items:center;color:var(--muted);font-size:11px;cursor:pointer}
.recit-e051-summary:focus-visible{outline:2px solid var(--e051-or);outline-offset:2px}
.recit-e051-detail[open] .recit-e051-summary{color:var(--gold-bright)}
.recit-e051-metric{margin:4px 0;color:var(--ink-soft);font-size:11px;line-height:1.6}
.recit-e051-note{margin:6px 0 0;color:var(--muted-2);font-size:10px;line-height:1.55;font-style:italic}

/* E051-06 — respirations typographiques : pas de mot orphelin. */
.recit-e051-corps .recit-context,
.recit-e051-corps .recit-e051-synth,
.recit-e051-corps .recit-e051-metric{text-wrap:pretty;orphans:3;widows:3}

/* E051-07 — indicateur de progression de lecture dans le point. */
.recit-e051-readbar{height:2px;margin:0 0 8px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.recit-e051-readbar-fill{display:block;height:100%;width:0;background:var(--e051-or);transition:width .12s linear}

/* E051-08 — rythme du bloc de lecture, chiffres alignés. */
.recit-e051-corps .recit-context{margin:10px 0 14px}
.recit-e051-corps .recit-timing{margin:4px 0 0;font-variant-numeric:tabular-nums}
.recit-e051-corps > .recit-legend,
.recit-e051-corps > .recit-trace{margin-top:14px}
.recit-e051-regle::after,
.recit-e051-synth,
.recit-e051-metric{font-variant-numeric:tabular-nums}

/* E051-10 — mouvement réduit et confort mobile. */
.recit-e051-reduit .recit-e051-readbar-fill,
.recit-e051-reduit .recit-e051-btn{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e051-readbar-fill,.recit-e051-btn{transition:none}
}
@media (max-width:620px){
  .recit-e051-btn{min-height:40px}
  .recit-e051-panel{padding:8px 10px}
  .recit-e051-regle{max-width:100%}
}
`;

/* L'état du calibreur survit aux reconstructions du DOM opérées par la coque. */
const prefs = { mesure: 66 };
let scrollLie = false;
let corpsRef = null;
let remplissageRef = null;

/* --- Gardes et petits utilitaires ---------------------------------------- */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
    && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function poseAttribut(noeud, nom, valeur) {
  if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
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

/* --- E051-01 / E051-03 / E051-04 : compteurs depuis le texte réel --------- */
function syllabesMot(mot) {
  const m = String(mot || '').toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüœæ']/g, '');
  if (!m) return 0;
  const voyelle = /[aeiouyàâäéèêëîïôöùûüœæ]/;
  let n = 0;
  let dansGroupe = false;
  for (let i = 0; i < m.length; i += 1) {
    if (voyelle.test(m.charAt(i))) {
      if (!dansGroupe) { n += 1; dansGroupe = true; }
    } else {
      dansGroupe = false;
    }
  }
  if (n > 1 && /e$/.test(m)) n -= 1; /* e final muet */
  return Math.max(1, n);
}

function compteMesures(brut) {
  const chaine = String(brut || '').trim();
  const mots = chaine.split(/\s+/).filter((m) => /[a-zA-ZÀ-ÿ0-9]/.test(m));
  const phrases = chaine.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean);
  const nbPhrases = Math.max(1, phrases.length);
  let nbSyllabes = 0;
  let motsLongs = 0;
  mots.forEach((mot) => {
    const s = syllabesMot(mot);
    nbSyllabes += s;
    if (s >= 3) motsLongs += 1;
  });
  return {
    nbMots: mots.length,
    nbPhrases,
    nbSyllabes,
    motsLongs,
    nbCaracteres: chaine.replace(/\s+/g, '').length,
  };
}

/* Flesch adapté au français, borné 0–100. */
function indiceFlesch(c) {
  if (!c.nbMots) return null;
  const brut = 206.835 - 1.015 * (c.nbMots / c.nbPhrases)
    - 84.6 * (c.nbSyllabes / c.nbMots);
  return Math.round(Math.max(0, Math.min(100, brut)));
}

function echelleLisibilite(score) {
  if (score === null) return 'non calculable';
  if (score >= 60) return 'facile';
  if (score >= 45) return 'moyen';
  if (score >= 30) return 'difficile';
  return 'très difficile';
}

function secondesReference(nbMots) {
  return Math.max(1, Math.round((nbMots / 150) * 60)); /* 150 mots/min */
}

function estimationVue(timing) {
  const trouvé = texte(timing).match(/≈\s*(\d+)\s*s/i);
  return trouvé ? Number(trouvé[1]) : null;
}

function compareEstimation(est, ref) {
  if (est === null) return '';
  if (est === ref) return 'concordante avec la référence';
  return est > ref
    ? `${est - ref} s de plus que la référence`
    : `${ref - est} s de moins que la référence`;
}

function motsParPhrase(c) {
  return c.nbPhrases ? Math.round((c.nbMots / c.nbPhrases) * 10) / 10 : 0;
}

function echellePhrases(v) {
  if (v <= 12) return 'phrases courtes, lecture aisée';
  if (v <= 20) return 'phrases de longueur moyenne';
  if (v <= 28) return 'phrases longues, attention soutenue';
  return 'phrases très longues, lecture dense';
}

function partMotsLongs(c) {
  return c.nbMots ? Math.round((c.motsLongs / c.nbMots) * 100) : 0;
}

function echelleLexique(p) {
  if (p <= 15) return 'vocabulaire abordable';
  if (p <= 30) return 'vocabulaire dense';
  return 'vocabulaire très dense';
}

/* --- E051-05 : calibreur -------------------------------------------------- */
function appliqueMesure(corps) {
  if (!corps || !corps.style || typeof corps.style.setProperty !== 'function') return;
  corps.style.setProperty('--e051-measure', `${prefs.mesure}ch`);
  const regle = document.getElementById('e051-regle');
  poseAttribut(regle, 'data-e051-mesure', `${prefs.mesure} caractères`);
}

function metAJourBouton(bouton) {
  if (!bouton || typeof bouton.textContent === 'undefined') return;
  const libelle = `Mesure de ligne : ${prefs.mesure} caractères — ajuster`;
  bouton.textContent = libelle;
  poseAttribut(bouton, 'aria-label', `${libelle} (55, 66 ou 75 caractères)`);
}

/* Construit (ou reconstruit) les enfants du panneau de mesures. */
function construitPanneau(panel, el) {
  panel.textContent = '';

  const synth = el('p', 'recit-e051-synth');
  synth.id = 'e051-synth';
  poseAttribut(synth, 'role', 'status');
  poseAttribut(synth, 'aria-live', 'polite');
  panel.appendChild(synth);

  const calibre = el('div', 'recit-e051-calibre');
  const bouton = el('button', 'recit-e051-btn');
  bouton.id = 'e051-calibre';
  bouton.type = 'button';
  calibre.appendChild(bouton);
  const regle = el('span', 'recit-e051-regle');
  regle.id = 'e051-regle';
  poseAttribut(regle, 'aria-hidden', 'true');
  calibre.appendChild(regle);
  panel.appendChild(calibre);

  const detail = el('details', 'recit-e051-detail');
  detail.id = 'e051-detail';
  detail.appendChild(el('summary', 'recit-e051-summary', 'Détail des mesures et des formules'));
  const lignes = [
    ['e051-msg-flesch', 'recit-e051-metric'],
    ['e051-msg-temps', 'recit-e051-metric'],
    ['e051-msg-phrases', 'recit-e051-metric'],
    ['e051-msg-lexique', 'recit-e051-metric'],
    ['e051-msg-note', 'recit-e051-note'],
  ];
  lignes.forEach(([id, classe]) => {
    const p = el('p', classe);
    p.id = id;
    detail.appendChild(p);
  });
  panel.appendChild(detail);

  metAJourBouton(bouton);
  if (typeof bouton.addEventListener === 'function') {
    bouton.addEventListener('click', () => {
      const pos = MESURES.indexOf(prefs.mesure);
      prefs.mesure = MESURES[(pos + 1) % MESURES.length];
      appliqueMesure(document.querySelector('.recit-e051-corps'));
      metAJourBouton(document.getElementById('e051-calibre'));
    });
  }
}

/* --- E051-07 : progression de lecture ------------------------------------ */
function metAJourBarre() {
  const remplissage = remplissageRef && remplissageRef.isConnected
    ? remplissageRef : document.getElementById('e051-readbar-fill');
  const corps = corpsRef && corpsRef.isConnected
    ? corpsRef : document.querySelector('.recit-e051-corps');
  if (!remplissage || !corps || typeof corps.getBoundingClientRect !== 'function') return;
  try {
    const rect = corps.getBoundingClientRect();
    const vh = (typeof window !== 'undefined' && window.innerHeight)
      || (document.documentElement && document.documentElement.clientHeight) || 1;
    const parcours = rect.height - vh;
    const p = parcours > 0 ? Math.min(1, Math.max(0, -rect.top / parcours)) : 1;
    remplissage.style.width = `${(p * 100).toFixed(1)}%`;
  } catch { /* rendu préservé */ }
}

function lieDefilement() {
  if (scrollLie || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  scrollLie = true;
  try {
    window.addEventListener('scroll', metAJourBarre, { passive: true });
    window.addEventListener('resize', metAJourBarre, { passive: true });
  } catch { /* rendu préservé */ }
}

/* --- Point d'entrée unique ----------------------------------------------- */
register('E051', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;

    /* Un seul appel CSS, toutes les règles du module. */
    css(CSS_ID, CSS);

    const corps = layout.querySelector('.recit-body');
    const titre = document.getElementById('recit-point-title') || layout.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || layout.querySelector('.recit-context');
    const timing = layout.querySelector('.recit-timing');

    ajouteClasse(layout, 'recit-e051-root');
    if (corps) ajouteClasse(corps, 'recit-e051-corps');

    /* Mesures E051-01 … E051-04, calculées sur le texte réel du point. */
    const c = compteMesures(texte(titre) || texte(contexte));
    const score = indiceFlesch(c);
    const court = c.nbMots < 12;
    const ref = secondesReference(c.nbMots);
    const est = estimationVue(timing);
    const mpp = motsParPhrase(c);
    const part = partMotsLongs(c);

    /* E051-05 + E051-09 : panneau de mesures et calibreur. */
    let panel = document.getElementById('e051-panel');
    const incomplet = IDS_ENFANTS.some((id) => !document.getElementById(id));
    if (!panel && corps) {
      panel = el('div', 'recit-e051-panel');
      panel.id = 'e051-panel';
    }
    if (panel && (!panel.firstChild || incomplet)) construitPanneau(panel, el);
    if (panel && corps) {
      place(panel, corps, timing && timing.parentNode === corps ? timing.nextSibling : null);
    }
    appliqueMesure(corps);

    const ecris = (id, valeur) => {
      const noeud = document.getElementById(id);
      if (noeud && typeof noeud.textContent !== 'undefined') noeud.textContent = valeur;
    };

    ecris('e051-synth',
      `Lisibilité : ${score === null ? '—' : `${score}/100`} (${echelleLisibilite(score)})`
      + ` · lecture de référence : ${ref} s`
      + ` · ${mpp} mot${mpp > 1 ? 's' : ''} par phrase`
      + ` · ${part} % de mots longs${court ? ' · échantillon court, mesure indicative' : ''}.`);
    ecris('e051-msg-flesch',
      `Indice de lisibilité : ${score === null ? 'non calculable' : `${score} sur 100`} — ${echelleLisibilite(score)}${court ? ' ; échantillon court, mesure indicative.' : '.'}`);
    ecris('e051-msg-temps',
      `Temps de lecture : ${ref} s à 150 mots/min pour ${c.nbMots} mot${c.nbMots > 1 ? 's' : ''}${est === null ? '' : ` ; la vue affiche ${est} s (${compareEstimation(est, ref)})`}.`);
    ecris('e051-msg-phrases',
      `Phrases : ${c.nbPhrases} phrase${c.nbPhrases > 1 ? 's' : ''}, ${mpp} mot${mpp > 1 ? 's' : ''} en moyenne — ${echellePhrases(mpp)}.`);
    ecris('e051-msg-lexique',
      `Vocabulaire : ${c.motsLongs} mot${c.motsLongs > 1 ? 's' : ''} d'au moins trois syllabes sur ${c.nbMots} (${part} %) — ${echelleLexique(part)}.`);
    ecris('e051-msg-note',
      'Formules : Flesch adapté = 206,835 − 1,015 × mots/phrases − 84,6 × syllabes/mots ; référence 150 mots/min ; syllabes estimées par groupes de voyelles, e final muet exclu. Mesures indicatives, recalculées sur le texte réel du point, sans donnée ajoutée.');

    /* E051-07 : barre de progression de lecture dans le point. */
    let barre = document.getElementById('e051-readbar');
    if (!barre && corps) {
      barre = el('div', 'recit-e051-readbar');
      barre.id = 'e051-readbar';
      poseAttribut(barre, 'aria-hidden', 'true');
      const remplissage = el('span', 'recit-e051-readbar-fill');
      remplissage.id = 'e051-readbar-fill';
      barre.appendChild(remplissage);
    }
    if (barre && corps) place(barre, corps, corps.firstChild);
    corpsRef = corps;
    remplissageRef = document.getElementById('e051-readbar-fill');
    lieDefilement();
    metAJourBarre();

    /* E051-10 : mouvement réduit, lu une seule fois par rendu. */
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      if (corps) ajouteClasse(corps, 'recit-e051-reduit');
      poseAttribut(layout, 'data-e051-motion', 'reduit');
    } else {
      poseAttribut(layout, 'data-e051-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
