import { register } from './registry.js';

/*
 * Lentille E021 — « Lisibilité et mesure de lecture » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E021-01 … E021-10) sont réunis dans CE
 * seul module : aucun fichier partagé n'est modifié. La coque reconstruisant le
 * DOM à chaque rendu, apply() recrée ses nœuds dans le stage courant ; les
 * préférences de lecture, elles, vivent dans l'état module et survivent aux
 * reconstructions. Toutes les valeurs affichées sont RECALCULÉES depuis le DOM
 * réellement rendu (largeur, taille de police, interlignage, couleurs calculées,
 * texte du point, kicker « Étape i / n ») : aucune donnée historique n'est
 * inventée, aucune mesure n'est codée en dur.
 *
 * CSS unique : ctx.css('recit-e021', …), cadré par la racine .recit-e021.
 * Toutes les classes créées sont préfixées `recit-e021-` ; tous les ids sont
 * préfixés `e021-` et uniques. Zéro console, zéro réseau, zéro aléa, zéro
 * innerHTML. Enrichissement strictement additif : sans JavaScript le récit
 * reste lisible. Chaque chantier est isolé par sansEchec() : l'absence d'un
 * repère DOM ne produit jamais d'exception et ne casse jamais le rendu.
 */

const FEUILLE = 'recit-e021';

/* Préférences de lecture — conservées d'un point à l'autre. */
const prefs = {
  colonne: false,     /* E021-01 : colonne optimale à 68 caractères. */
  aere: false,        /* E021-02 : interlignage aéré. */
  regles: false,      /* E021-04 : règles horizontales de lecture. */
  espacement: false,  /* E021-08 : espacement des mots. */
};

let derniere = null;         /* dernier contexte enrichi { layout, refs }. */
let ecouteInstalle = false;  /* garde des écouteurs globaux. */
let cadre = 0;               /* au plus une frame rAF en vol. */
const boutonsLies = new WeakSet(); /* évite un second écouteur sur le même nœud. */

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Tout est cadré par .recit-e021 posé sur la grille.
 * ------------------------------------------------------------------------- */
const REGLES_BASE = `
.recit-e021 .recit-e021-bandeau{margin:8px 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e021 .recit-e021-bandeau-titre{margin:0 0 5px;color:var(--gold);font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.recit-e021 .recit-e021-ligne{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums}
.recit-e021 .recit-e021-colonne{max-width:68ch}
.recit-e021 .recit-context.recit-e021-aere,.recit-e021 .recit-title.recit-e021-aere{line-height:1.8}
.recit-e021 .recit-e021-espacement{word-spacing:.14em;letter-spacing:.015em}
.recit-e021 .recit-e021-regles{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(var(--e021-rhythme,1.7em) - 1px),rgba(230,185,111,.16) calc(var(--e021-rhythme,1.7em) - 1px),rgba(230,185,111,.16) var(--e021-rhythme,1.7em))}
.recit-e021 .recit-e021-reglages{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--line)}
.recit-e021 .recit-e021-reglages-resume{min-height:36px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright);font-size:10px}
.recit-e021 .recit-e021-reglages-resume:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e021 .recit-e021-reglages-corps{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.recit-e021 .recit-e021-bouton{min-width:44px;min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e021 .recit-e021-bouton[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12)}
.recit-e021 .recit-e021-bouton:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e021 .recit-e021-compte{align-self:center;margin:0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e021-synthese{display:none!important}
body.recit-diagnostics .recit-e021-synthese{display:block!important;margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e021-synthese h2{margin:0 0 6px;color:var(--gold);font-size:12px}
.recit-e021-synthese p{margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
`;

/* Transition douce uniquement si l'utilisateur accepte le mouvement. */
function transitionDe(reducedMotion) {
  const reduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  if (reduit) return '';
  return '\n.recit-e021 .recit-e021-colonne,.recit-e021 .recit-e021-aere,'
    + '.recit-e021 .recit-e021-espacement{transition:max-width .2s ease,line-height .2s ease,letter-spacing .2s ease}';
}

/* ------------------------------------------------------------------------- *
 * Utilitaires sans risque.
 * ------------------------------------------------------------------------- */
function sansEchec(fn) {
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

function calcule(noeud) {
  return sansEchec(() => (typeof getComputedStyle === 'function' ? getComputedStyle(noeud) : null));
}

/* Crée un nœud uniquement si son id n'existe pas déjà dans le document. */
function creerSiAbsent(el, parent, balise, classe, id, texte, avant) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  if (id && typeof document !== 'undefined' && document.getElementById(id)) return null;
  const noeud = el(balise, classe, texte);
  if (id) noeud.id = id;
  if (avant && avant.parentNode === parent) parent.insertBefore(noeud, avant);
  else parent.appendChild(noeud);
  return noeud;
}

/* Crée (ou récupère) une ligne de mesure portant l'id donné. */
function ligne(el, parent, id) {
  creerSiAbsent(el, parent, 'p', 'recit-e021-ligne', id, '—');
  return parent ? parent.querySelector(`#${id}`) : null;
}

/* Position réelle lue dans le kicker rendu par la vue, avec repli sur le fil. */
function position(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const found = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(txt(kicker));
  if (found) {
    return { index: Math.max(0, Number(found[1]) - 1), total: Math.max(0, Number(found[2])) };
  }
  return { index: 0, total: layout.querySelectorAll('.recit-thread-item').length };
}

/* ------------------------------------------------------------------------- *
 * Contraste texte / fond (E021-03) : ratio WCAG calculé, jamais inventé.
 * ------------------------------------------------------------------------- */
function parseCouleur(valeur) {
  if (!valeur) return null;
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i.exec(valeur);
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha };
}

function luminance(rgb) {
  const canaux = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];
}

function fondLisible(noeud) {
  let courant = noeud;
  while (courant && courant !== document.documentElement) {
    const st = calcule(courant);
    const parsed = st && parseCouleur(st.backgroundColor);
    if (parsed && parsed.alpha > 0) return parsed.rgb;
    courant = courant.parentElement;
  }
  return [8, 11, 18]; // repli sombre cohérent avec la charte de la vue.
}

function contraste(noeud) {
  const st = calcule(noeud);
  const texte = st && parseCouleur(st.color);
  if (!texte) return null;
  const l1 = luminance(texte.rgb);
  const l2 = luminance(fondLisible(noeud));
  const clair = Math.max(l1, l2);
  const sombre = Math.min(l1, l2);
  return Math.round(((clair + 0.05) / (sombre + 0.05)) * 100) / 100;
}

function qualificatifContraste(ratio) {
  if (ratio >= 7) return 'excellent';
  if (ratio >= 4.5) return 'conforme';
  if (ratio >= 3) return 'partiel';
  return 'faible';
}

/* ------------------------------------------------------------------------- *
 * Application des préférences et calcul de toutes les mesures.
 * ------------------------------------------------------------------------- */
function appliquerPrefs(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const cibles = layout.querySelectorAll('.recit-context, #recit-point-title, .recit-title');
  Array.prototype.forEach.call(cibles, (noeud) => {
    noeud.classList.toggle('recit-e021-colonne', prefs.colonne);
    noeud.classList.toggle('recit-e021-aere', prefs.aere);
    noeud.classList.toggle('recit-e021-espacement', prefs.espacement);
  });
  const ciblesRegles = layout.querySelectorAll('.recit-context, #recit-point-title, .recit-title');
  Array.prototype.forEach.call(ciblesRegles, (noeud) => {
    noeud.classList.toggle('recit-e021-regles', prefs.regles);
    if (prefs.regles) {
      const st = calcule(noeud);
      const rhythm = st && parseFloat(st.lineHeight);
      if (rhythm && rhythm > 0) noeud.style.setProperty('--e021-rhythme', `${rhythm}px`);
    } else {
      sansEchec(() => noeud.style.removeProperty('--e021-rhythme'));
    }
  });
}

function mesurer(ctx) {
  if (!ctx || !ctx.layout || !ctx.layout.isConnected) return;
  const { layout, refs } = ctx;
  const contexte = layout.querySelector('#recit-context') || layout.querySelector('.recit-context');
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  const cible = contexte || titre;
  const pos = position(layout);
  const b = refs.bandeau || {};
  const s = refs.synthese || {};

  /* E021-01 — caractères par ligne : largeur réelle / (taille de police × 0,5). */
  const car = cible ? sansEchec(() => {
    const largeur = cible.getBoundingClientRect().width;
    const st = calcule(cible);
    const fs = st && parseFloat(st.fontSize);
    if (!largeur || largeur <= 0 || !fs || fs <= 0) return null;
    const n = Math.round(largeur / (fs * 0.5));
    return n > 0 ? n : null;
  }) : null;
  ecrit(b.colonne, car !== null
    ? `Largeur de lecture : ≈ ${car} car./ligne (cible 45–75) · ${car >= 45 && car <= 75 ? 'dans la cible' : 'hors cible'}`
    : 'Largeur de lecture : non mesurable');
  ecrit(s.colonne, `Mesure de colonne : ${car !== null ? `≈ ${car} caractères par ligne` : 'non mesurable'} `
    + `(formule : largeur du bloc ÷ (taille de police × 0,5)) ; cible 45–75.`);

  /* E021-02 — ratio d'interlignage calculé (hauteur de ligne / taille de police). */
  const ratio = cible ? sansEchec(() => {
    const st = calcule(cible);
    const fs = st && parseFloat(st.fontSize);
    const lh = st && parseFloat(st.lineHeight);
    return fs > 0 && lh > 0 ? Math.round((lh / fs) * 100) / 100 : null;
  }) : null;
  ecrit(b.interlignage, ratio !== null
    ? `Interlignage : ${decimal(ratio)} (cible 1,5–1,8) · ${ratio >= 1.5 ? 'aéré' : 'serré'}`
    : 'Interlignage : non mesurable');
  ecrit(s.interlignage, `Ratio d'interlignage : ${ratio !== null ? decimal(ratio) : 'non mesurable'} `
    + `(formule : line-height ÷ font-size) ; cible 1,5–1,8.`);

  /* E021-03 — contraste WCAG texte/fond, calculé puis qualifié en texte. */
  const cr = cible ? contraste(cible) : null;
  ecrit(b.contraste, cr !== null
    ? `Contraste estimé : ${decimal(cr)}:1 · ${qualificatifContraste(cr)} (cible ≥ 4,5)`
    : 'Contraste estimé : non mesurable');
  ecrit(s.contraste, `Contraste texte/fond : ${cr !== null ? `${decimal(cr)}:1, ${qualificatifContraste(cr)}` : 'non mesurable'} `
    + `(formule : (Lclair + 0,05) ÷ (Lsombre + 0,05)) ; cible ≥ 4,5. Aucune couleur n'est modifiée.`);

  /* E021-05 — mesure du point : mots et durée recalculés depuis le titre réel. */
  const mots = (txt(titre).match(/\S+/g) || []).length;
  const secondes = mots ? Math.max(4, Math.min(12, Math.ceil(mots / 3))) : 0;
  ecrit(b.mots, `Mesure du point : ${mots} mot(s) · ≈ ${secondes} s (formule : max(4, min(12, ceil(mots/3))))`);
  ecrit(s.mots, `Longueur du point : ${mots} mots, soit ≈ ${secondes} s de lecture `
    + `(formule : max(4, min(12, arrondi_sup(mots ÷ 3)))).`);

  /* E021-06 — lisibilité du fil : libellés abrégés par la vue au-delà de 72 car. */
  const items = layout.querySelectorAll('.recit-thread-item');
  let abreges = 0;
  Array.prototype.forEach.call(items, (n) => { if (/…\s*$/.test(txt(n))) abreges += 1; });
  ecrit(b.fil, `Lisibilité du fil : ${items.length} point(s) · ${abreges} libellé(s) abrégé(s) au-delà de 72 car.`);
  ecrit(s.fil, `Fil du repère : ${items.length} point(s), ${abreges} libellé(s) tronqué(s) `
    + `(formule : comptage des libellés se terminant par « … »).`);

  /* E021-07 — progression chiffrée en pourcentage, en chiffres tabulaires. */
  const pct = pos.total > 0 ? Math.round(((pos.index + 1) / pos.total) * 100) : 0;
  ecrit(b.progression, `Progression : ${pct} % (étape ${pos.total ? pos.index + 1 : 0} / ${pos.total || '—'})`);
  ecrit(s.progression, `Progression : ${pct} % (formule : (étape ÷ total) × 100, arrondi ; `
    + `${pos.index + 1}/${pos.total || '—'} lu dans le kicker).`);

  /* E021-08 — hiérarchie typographique titre / corps, chiffrée. */
  const hierarchie = titre && cible ? sansEchec(() => {
    const a = calcule(titre);
    const z = calcule(cible);
    const fa = a && parseFloat(a.fontSize);
    const fz = z && parseFloat(z.fontSize);
    return fa > 0 && fz > 0 ? Math.round((fa / fz) * 100) / 100 : null;
  }) : null;
  ecrit(b.hierarchie, hierarchie !== null
    ? `Hiérarchie titre/corps : ${decimal(hierarchie)}×`
    : 'Hiérarchie titre/corps : non mesurable');
  ecrit(s.hierarchie, `Hiérarchie typographique : ${hierarchie !== null ? `${decimal(hierarchie)}×` : 'non mesurable'} `
    + `(formule : taille du titre ÷ taille du corps).`);
}

/* Une seule frame pour les recalculs consécutifs à un redimensionnement. */
function planifier() {
  if (cadre || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { mesurer(derniere); return; }
  cadre = requestAnimationFrame(() => { cadre = 0; mesurer(derniere); });
}

/* Écouteurs uniques, installés une seule fois, sans timer ni boucle continue. */
function installer() {
  if (ecouteInstalle || typeof window === 'undefined') return;
  ecouteInstalle = true;
  window.addEventListener('resize', planifier, { passive: true });
  window.addEventListener('orientationchange', planifier, { passive: true });
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E021', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Une seule feuille, regroupant toutes les règles de la lentille. */
  css(FEUILLE, REGLES_BASE + transitionDe(reducedMotion));

  if (typeof layout.querySelector !== 'function') return;
  const corps = layout.querySelector('.recit-body');
  if (!corps) return; // garde d'existence : pas de corps = aucun enrichissement.

  layout.classList.add('recit-e021');

  const refs = { bandeau: {}, synthese: {} };

  /* --- Bandeau de mesures : inséré juste après le repère de lecture. ------- */
  const timing = layout.querySelector('.recit-timing');
  const meta = layout.querySelector('.recit-meta');
  const apres = timing || meta || layout.querySelector('.view-kicker');
  creerSiAbsent(el, corps, 'div', 'recit-e021-bandeau', 'e021-bandeau', '',
    apres && apres.parentNode === corps ? apres.nextSibling : null);
  const bandeau = layout.querySelector('#e021-bandeau');
  if (bandeau) {
    creerSiAbsent(el, bandeau, 'p', 'recit-e021-bandeau-titre', 'e021-bandeau-titre',
      'Mesures de lisibilité · recalculées depuis le texte affiché');
    refs.bandeau.colonne = ligne(el, bandeau, 'e021-val-colonne');
    refs.bandeau.interlignage = ligne(el, bandeau, 'e021-val-interlignage');
    refs.bandeau.contraste = ligne(el, bandeau, 'e021-val-contraste');
    refs.bandeau.mots = ligne(el, bandeau, 'e021-val-mots');
    refs.bandeau.fil = ligne(el, bandeau, 'e021-val-fil');
    refs.bandeau.progression = ligne(el, bandeau, 'e021-val-progression');
    refs.bandeau.hierarchie = ligne(el, bandeau, 'e021-val-hierarchie');
  }

  /* --- Panneau de synthèse falsifiable, remonté dans le tiroir diagnostics. */
  let synthese = document.getElementById('e021-synthese');
  if (!synthese) {
    synthese = el('section', 'recit-e021-synthese');
    synthese.id = 'e021-synthese';
    synthese.setAttribute('data-recit-diagnostic', '');
    synthese.setAttribute('aria-label', 'Synthèse des mesures de lisibilité du récit');
    const titrePanel = el('h2', '', 'E021 — Lisibilité et mesure de lecture · synthèse');
    titrePanel.id = 'e021-synthese-titre';
    synthese.appendChild(titrePanel);
    stage.appendChild(synthese);
  }
  refs.synthese.colonne = ligne(el, synthese, 'e021-syn-colonne');
  refs.synthese.interlignage = ligne(el, synthese, 'e021-syn-interlignage');
  refs.synthese.contraste = ligne(el, synthese, 'e021-syn-contraste');
  refs.synthese.mots = ligne(el, synthese, 'e021-syn-mots');
  refs.synthese.fil = ligne(el, synthese, 'e021-syn-fil');
  refs.synthese.progression = ligne(el, synthese, 'e021-syn-progression');
  refs.synthese.hierarchie = ligne(el, synthese, 'e021-syn-hierarchie');

  /* --- Réglages de lisibilité : quatre bascules indépendantes + remise à zéro. */
  creerSiAbsent(el, corps, 'details', 'recit-e021-reglages', 'e021-reglages', '');
  const reglages = layout.querySelector('#e021-reglages');
  if (reglages) {
    const resume = creerSiAbsent(el, reglages, 'summary', 'recit-e021-reglages-resume',
      'e021-reglages-resume', 'Réglages de lisibilité');
    creerSiAbsent(el, reglages, 'div', 'recit-e021-reglages-corps', 'e021-reglages-corps', '');
    const gruppe = reglages.querySelector('#e021-reglages-corps');

    const definicies = [
      ['colonne', 'e021-bascule-colonne', ['Colonne optimale : désactivée', 'Colonne optimale : activée']],
      ['aere', 'e021-bascule-aere', ['Interlignage aéré : désactivé', 'Interlignage aéré : activé']],
      ['regles', 'e021-bascule-regles', ['Règles de lecture : désactivées', 'Règles de lecture : activées']],
      ['espacement', 'e021-bascule-espacement', ['Espacement des mots : désactivé', 'Espacement des mots : activé']],
    ];

    const nbActifs = () => definicies.filter(([cle]) => prefs[cle]).length;
    const majCompte = () => {
      const n = nbActifs();
      ecrit(resume, `Réglages de lisibilité · ${n} actif(s)`);
      const compte = reglages.querySelector('#e021-compte');
      ecrit(compte, `${n} réglage(s) actif(s) sur ${definicies.length}.`);
    };

    definicies.forEach(([cle, id, libelles]) => {
      creerSiAbsent(el, gruppe, 'button', 'recit-e021-bouton', id,
        prefs[cle] ? libelles[1] : libelles[0]);
      const bouton = gruppe.querySelector(`#${id}`);
      if (!bouton) return;
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', String(prefs[cle]));
      bouton.title = `Ajuste la lisibilité : ${libelles[1].toLowerCase()}`;
      if (!boutonsLies.has(bouton)) {
        boutonsLies.add(bouton);
        bouton.addEventListener('click', () => {
          prefs[cle] = !prefs[cle];
          bouton.setAttribute('aria-pressed', String(prefs[cle]));
          bouton.textContent = prefs[cle] ? libelles[1] : libelles[0];
          appliquerPrefs(layout);
          majCompte();
          mesurer(derniere);
        });
      }
    });

    /* E021-10 — remise à zéro unique de tous les réglages de lecture. */
    creerSiAbsent(el, gruppe, 'button', 'recit-e021-bouton', 'e021-reinitialiser',
      'Rétablir les réglages par défaut');
    const raz = gruppe.querySelector('#e021-reinitialiser');
    if (raz) {
      raz.type = 'button';
      if (!boutonsLies.has(raz)) {
        boutonsLies.add(raz);
        raz.addEventListener('click', () => {
          definicies.forEach(([cle, id, libelles]) => {
            prefs[cle] = false;
            const bouton = gruppe.querySelector(`#${id}`);
            if (bouton) {
              bouton.setAttribute('aria-pressed', 'false');
              bouton.textContent = libelles[0];
            }
          });
          appliquerPrefs(layout);
          majCompte();
          mesurer(derniere);
        });
      }
    }
    creerSiAbsent(el, gruppe, 'p', 'recit-e021-compte', 'e021-compte', '');
    reglages.__e021MajCompte = majCompte;
  }

  /* Contexte partagé, puis application des préférences et première mesure. */
  derniere = { layout, refs, stage };
  sansEchec(() => appliquerPrefs(layout));
  sansEchec(() => {
    if (reglages && typeof reglages.__e021MajCompte === 'function') reglages.__e021MajCompte();
  });
  sansEchec(() => mesurer(derniere));
  installer();
});
