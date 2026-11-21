import { register } from './registry.js';

/* Lentille V2 E071 — Lisibilité et mesure de lecture : profondeur du texte et
 * accessibilité de la lecture (vue Récit). Dix chantiers V2 E071-01 … E071-10,
 * tous implémentés ici, distincts des dix chantiers de la passe 1.
 * Rapport détaillé : UNIFIED_AUDIT/RECIT/V2/views/E071.md.
 *
 * Une seule feuille `recit-v2-e071`, un seul enregistrement, des ids préfixés
 * `v2-e071-`, des classes préfixées `recit-v2-e071-`. Aucun appel réseau,
 * aucune sortie de débogage, aucune source d'aléa : chaque valeur est
 * recalculée depuis le texte, les attributs, les styles et la géométrie
 * réellement rendus par la vue. Enrichissement strictement additif : sans
 * JavaScript, la vue reste intégralement lisible et navigable.
 */

/* Feuille unique. Aucune règle ne masque du contenu existant ; aucune
   information n'est portée par la seule couleur. */
const CSS = `
.recit-layout .recit-v2-e071-tableau{margin:10px 0 4px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-layout .recit-v2-e071-tableau-titre{margin:0 0 6px;color:var(--muted);font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.recit-layout .recit-v2-e071-ligne{margin:3px 0;color:var(--ink-soft);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-layout .recit-v2-e071-hist{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 2px}
.recit-layout .recit-v2-e071-barre{flex:1 1 80px;min-width:70px}
.recit-layout .recit-v2-e071-barre-titre{display:block;color:var(--muted-2);font-size:9px}
.recit-layout .recit-v2-e071-barre-piste{display:block;height:6px;margin-top:3px;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:rgba(255,255,255,.04)}
.recit-layout .recit-v2-e071-barre-remplissage{display:block;height:100%;background:var(--gold);border-radius:999px}
.recit-layout .recit-v2-e071-synthese{margin-top:6px;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-layout .recit-v2-e071-ligne:focus-visible,
.recit-layout .recit-v2-e071-synthese:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .recit-layout .recit-v2-e071-barre-remplissage{transition:none}
}
@media print{
  .recit-layout .recit-v2-e071-tableau,
  .recit-layout .recit-v2-e071-tableau-titre,
  .recit-layout .recit-v2-e071-ligne,
  .recit-layout .recit-v2-e071-hist,
  .recit-layout .recit-v2-e071-barre-piste,
  .recit-layout .recit-v2-e071-barre-remplissage,
  .recit-layout .recit-v2-e071-synthese{color:#111;border-color:#777;background:none}
}
`;

/* --- Utilitaires de garde : aucune recherche ne doit pouvoir faire échouer
        le rendu, même sur une vue partiellement construite. --- */

function q(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur)
    : null;
}

function qa(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selecteur))
    : [];
}

function safe(action) {
  try { action(); }
  catch { /* une lentille défaillante ne casse jamais la vue. */ }
}

function cree(fabrique, balise, classe, texte) {
  try {
    let noeud;
    if (typeof fabrique === 'function') noeud = fabrique(balise, classe || undefined, texte);
    else {
      noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
    return noeud || null;
  } catch { return null; }
}

function assure(parent, id, balise, classe, fabrique) {
  if (!parent || typeof parent.appendChild !== 'function' || !id) return null;
  const deja = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (deja) return deja.parentElement === parent ? deja : null;
  const noeud = cree(fabrique, balise, classe);
  if (!noeud) return null;
  noeud.id = id;
  try { parent.appendChild(noeud); }
  catch { return null; }
  return noeud;
}

function insereApres(noeud, reference, parent) {
  if (!noeud) return;
  if (reference && reference.parentNode === parent && typeof parent.insertBefore === 'function') {
    parent.insertBefore(noeud, reference.nextSibling);
  } else if (parent && typeof parent.appendChild === 'function') {
    parent.appendChild(noeud);
  }
}

/* --- Mesures déterministes, recalculées depuis le texte rendu. --- */

function mots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean);
}

function nombreAvecVirgule(valeur, decimales = 1) {
  if (!Number.isFinite(valeur)) return '—';
  return valeur.toFixed(decimales).replace('.', ',');
}

function taillePx(valeur) {
  const trouve = String(valeur || '').match(/([0-9]+(?:\.[0-9]+)?)px/);
  return trouve ? parseFloat(trouve[1]) : null;
}

/* Le libellé accessible de l'item contient le texte intégral, contrairement
   au bouton dont le texte est abrégé par la coque. */
function texteIntegral(item) {
  const aria = item && typeof item.getAttribute === 'function'
    ? String(item.getAttribute('aria-label') || '') : '';
  const trouve = aria.match(/:\s*(.+)$/);
  if (trouve && trouve[1]) return trouve[1].trim();
  if (item && item.textContent) return String(item.textContent).trim().replace(/^\d+\.\s*/, '');
  return '';
}

/* Même borne que la vue : Estimation = max(4, min(12, ceil(mots / 3))). */
function secondesDeLecture(texte) {
  const nb = mots(texte).length;
  return Math.max(4, Math.min(12, Math.ceil(nb / 3)));
}

function dureeLisible(secondes) {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

function tokens(texte) {
  return String(texte || '').toLowerCase()
    .match(/[a-zàâçéèêëîïôùûüÿœæ0-9]+(?:['’-][a-zàâçéèêëîïôùûüÿœæ0-9]+)*/g) || [];
}

function motsLongs(texte) {
  return tokens(texte).filter((t) => /^[a-zàâçéèêëîïôùûüÿœæ]+$/.test(t) && t.length >= 7).length;
}

function chargeInfo(texte) {
  const chaine = String(texte || '');
  return {
    nombres: (chaine.match(/\d+(?:[., ]\d+)*/g) || []).length,
    sigles: (chaine.match(/\b[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ]{2,}\b/g) || []).length,
  };
}

function respiration(texte) {
  const segments = String(texte || '').split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const longueurs = segments.map((s) => mots(s).length);
  const total = longueurs.reduce((somme, n) => somme + n, 0);
  return {
    phrases: segments.length,
    moyenne: segments.length ? total / segments.length : null,
    maxi: longueurs.length ? Math.max.apply(null, longueurs) : 0,
  };
}

function parseCouleur(valeur) {
  const m = String(valeur || '')
    .match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
}

function fondEffectif(noeud) {
  let n = noeud;
  while (n && n.nodeType === 1) {
    try {
      const c = parseCouleur(window.getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) return c;
    } catch { return null; }
    n = n.parentElement;
  }
  return null;
}

function luminance(c) {
  const f = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

function contraste(noeud) {
  if (!noeud || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
  try {
    const fg = parseCouleur(window.getComputedStyle(noeud).color);
    const bg = fondEffectif(noeud);
    if (!fg || !bg || fg.a === 0) return null;
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return Number.isFinite(ratio) ? ratio : null;
  } catch { return null; }
}

function bandeContraste(ratio) {
  if (ratio === null) return 'non mesurable';
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA (grand texte)';
  return 'insuffisant';
}

function cibleMesure(noeuds) {
  let reel = Infinity;
  let declaree = Infinity;
  noeuds.forEach((n) => {
    if (!n || n.disabled) return;
    const h = typeof n.offsetHeight === 'number' ? n.offsetHeight : 0;
    if (h > 0) reel = Math.min(reel, h);
    safe(() => {
      const v = taillePx(window.getComputedStyle(n).minHeight);
      if (v !== null) declaree = Math.min(declaree, v);
    });
  });
  return {
    reel: Number.isFinite(reel) ? reel : null,
    declaree: Number.isFinite(declaree) ? declaree : null,
  };
}

function filCibleOrDash(valeur) {
  return valeur === null || valeur === undefined ? '-' : `${valeur}px`;
}

register('E071', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el } = ctx;
    if (typeof css === 'function') css('recit-v2-e071', CSS);
    const racine = layout || stage;
    if (!racine || typeof racine.querySelector !== 'function') return;
    if (typeof racine.hasAttribute === 'function' && racine.hasAttribute('data-recit-v2-e071-ready')) return;

    const corps = q(racine, '.recit-body');
    const titre = q(racine, '#recit-point-title');
    const contexte = q(racine, '#recit-context');
    const chrono = q(racine, '.recit-timing');
    const kicker = q(racine, '.view-kicker');
    const status = q(racine, '#c3a-status');
    const fil = q(racine, '.recit-thread');
    const liste = q(racine, '.recit-thread-list') || q(racine, '#c3a-thread');
    const items = qa(liste, '.recit-thread-item');
    const actions = q(racine, '.recit-actions');
    const legend = q(racine, '.recit-legend');

    const filCible = cibleMesure(items);
    const actionsCible = cibleMesure(actions ? qa(actions, 'button') : []);

    const texteCourant = titre && titre.textContent
      ? String(titre.textContent).trim() : '';
    const ratioTitre = contraste(titre);
    const ratioContexte = contraste(contexte);
    const info = chargeInfo(texteCourant);
    const motsUniques = new Set(tokens(texteCourant)).size;
    const tokensCourants = tokens(texteCourant).length;
    const diversite = tokensCourants ? motsUniques / tokensCourants : null;
    const longs = motsLongs(texteCourant);
    const respirationCourante = respiration(texteCourant);

    const indexCourant = items.findIndex((item) => {
      if (!item || typeof item.hasAttribute !== 'function') return false;
      return item.hasAttribute('aria-current') || (typeof item.classList === 'object'
        && item.classList.contains('is-current'));
    });
    const textesItems = items.map((item) => texteIntegral(item));
    const motsItems = textesItems.map((texte) => mots(texte).length);
    const totalMotsFil = motsItems.reduce((somme, n) => somme + n, 0);
    const restants = indexCourant < 0 ? [] : items.slice(indexCourant + 1);
    const secondesRestantes = restants.reduce(
      (somme, item) => somme + secondesDeLecture(texteIntegral(item)), 0);
    const motsCourantsFil = indexCourant >= 0 ? (motsItems[indexCourant] || 0) : mots(texteCourant).length;
    const poids = totalMotsFil ? (motsCourantsFil / totalMotsFil) * 100 : null;

    let couverture = null;
    safe(() => {
      const src = String((status && status.textContent) || '');
      const m = src.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
      if (m) couverture = { affiches: +m[1], total: +m[2] };
    });
    if (!couverture) {
      const etape = String((kicker && kicker.textContent) || '')
        .match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      if (etape) couverture = { affiches: items.length, total: +etape[2] };
    }

    /* E071-01 — Contraste texte/fond mesuré (WCAG approché) du titre et du contexte. */
    safe(() => {
      if (!corps) return;
      const tableau = assure(corps, 'v2-e071-tableau', 'div', 'recit-v2-e071-tableau', el);
      if (!tableau) return;
      const titreTableau = assure(tableau, 'v2-e071-tableau-titre', 'p', 'recit-v2-e071-tableau-titre', el);
      if (titreTableau) titreTableau.textContent = 'Profondeur et accessibilité de la lecture';
      tableau.setAttribute('role', 'group');
      tableau.setAttribute('aria-label',
        'Mesures V2 recalculées depuis le texte, les styles et la géométrie rendus');
      insereApres(tableau, chrono, corps);
      const ligne = assure(tableau, 'v2-e071-contraste', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      const partie = (nom, ratio) => `${nom} : ${ratio === null ? '—' : nombreAvecVirgule(ratio, 2) + ':1'} `
        + `(${bandeContraste(ratio)})`;
      ligne.textContent = `Contraste mesuré — ${partie('titre', ratioTitre)} ; `
        + `${partie('contexte', ratioContexte)}. Seuils : AA 4,5:1, AAA 7:1.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-02 — Charge d'information : nombres et sigles du libellé courant. */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-chiffres', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      ligne.textContent = `Densité d'information du libellé : ${info.nombres} nombre(s), `
        + `${info.sigles} sigle(s) en majuscules — repérage des passages à lire lentement.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-03 — Diversité lexicale (types distincts sur tokens) du libellé. */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-lexique', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      ligne.textContent = `Diversité lexicale : ${motsUniques} forme(s) distincte(s) sur `
        + `${tokensCourants} token(s), soit un ratio de `
        + `${diversite === null ? '—' : nombreAvecVirgule(diversite, 2)}.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-04 — Respiration des phrases du libellé courant. */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-respiration', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      const r = respirationCourante;
      const libelle = r.phrases === 0
        ? 'Coupures de phrases : aucune ponctuation détectée dans le libellé affiché.'
        : `Respiration du libellé : ${r.phrases} phrase(s), `
          + `${nombreAvecVirgule(r.moyenne)} mot(s) par phrase en moyenne, `
          + `${r.maxi} mot(s) pour la plus longue.`;
      ligne.textContent = libelle;
      ligne.setAttribute('aria-label', libelle);
    });

    /* E071-05 — Temps de lecture restant, du point courant à la fin du repère. */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-restant', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      const texte = indexCourant < 0
        ? 'Lecture restante : point courant introuvable dans le fil affiché.'
        : `Lecture restante : ${dureeLisible(secondesRestantes)} pour `
          + `${restants.length} point(s) après celui-ci, somme des estimations du fil affiché.`;
      ligne.textContent = texte;
      ligne.setAttribute('aria-label', texte);
    });

    /* E071-06 — Poids du point courant dans le volume total du fil. */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-poids', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      ligne.textContent = `Poids du point courant : ${motsCourantsFil} mot(s) sur `
        + `${totalMotsFil} du fil affiché, soit `
        + `${poids === null ? '—' : nombreAvecVirgule(poids) + ' %'} du volume de lecture.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-07 — Histogramme de répartition des longueurs du fil (agrégat). */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const hist = assure(tableau, 'v2-e071-histogramme', 'div', 'recit-v2-e071-hist', el);
      if (!hist) return;
      hist.setAttribute('role', 'group');
      hist.setAttribute('aria-label', 'Répartition des longueurs de libellés du fil affiché');
      const buckets = [
        { nom: 'Court · ≤ 8 mots', n: motsItems.filter((n) => n <= 8).length },
        { nom: 'Moyen · 9 à 20', n: motsItems.filter((n) => n >= 9 && n <= 20).length },
        { nom: 'Long · > 20 mots', n: motsItems.filter((n) => n > 20).length },
      ];
      let barres = qa(hist, '.recit-v2-e071-barre');
      if (barres.length !== 3) {
        try { hist.textContent = ''; } catch { /* nettoyage facultatif. */ }
        barres = buckets.map((b) => {
          const bloc = cree(el, 'div', 'recit-v2-e071-barre');
          if (!bloc) return null;
          const titreBarre = cree(el, 'span', 'recit-v2-e071-barre-titre', b.nom);
          const piste = cree(el, 'span', 'recit-v2-e071-barre-piste');
          const remplissage = cree(el, 'span', 'recit-v2-e071-barre-remplissage');
          if (remplissage) remplissage.setAttribute('aria-hidden', 'true');
          if (piste && remplissage) piste.appendChild(remplissage);
          if (titreBarre) bloc.appendChild(titreBarre);
          if (piste) bloc.appendChild(piste);
          if (bloc) hist.appendChild(bloc);
          return bloc;
        }).filter(Boolean);
      }
      barres.forEach((bloc, i) => {
        const titreBarre = q(bloc, '.recit-v2-e071-barre-titre');
        const remplissage = q(bloc, '.recit-v2-e071-barre-remplissage');
        const b = buckets[i];
        if (!b) return;
        if (titreBarre) titreBarre.textContent = `${b.nom} : ${b.n}`;
        if (remplissage) {
          const largeur = items.length ? Math.round((b.n / items.length) * 100) : 0;
          remplissage.style.width = `${largeur}%`;
        }
      });
      const ligne = assure(tableau, 'v2-e071-histogramme-legende', 'p',
        'recit-v2-e071-ligne', el);
      if (ligne) {
        ligne.textContent = `Répartition du fil affiché : ${buckets[0].n} court(s), `
          + `${buckets[1].n} moyen(s), ${buckets[2].n} long(s) sur ${items.length} point(s).`;
        ligne.setAttribute('aria-label', ligne.textContent);
      }
    });

    /* E071-08 — Cibles tactiles mesurées sur les boutons existants (aucun ajout). */
    safe(() => {
      const tableau = q(racine, '#v2-e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'v2-e071-cibles', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      const formater = (c) => `${c.reel === null ? '—' : c.reel + ' px réels'}`
        + ` (${c.declaree === null ? '—' : c.declaree + ' px déclarés'})`;
      const mini = [filCible.reel, actionsCible.reel].filter((n) => n !== null);
      const seuil = mini.length ? Math.min.apply(null, mini) : null;
      ligne.textContent = `Cibles tactiles mesurées — fil : ${formater(filCible)} ; `
        + `actions : ${formater(actionsCible)} · seuil 36 px : `
        + `${seuil === null ? 'non mesurable' : (seuil >= 36 ? 'conforme' : 'à renforcer')}.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-09 — Couverture du repère actuellement affiché dans le fil. */
    safe(() => {
      if (!fil) return;
      const ligne = assure(fil, 'v2-e071-couverture', 'p', 'recit-v2-e071-ligne', el);
      if (!ligne) return;
      const texte = couverture
        ? `Couverture du fil : ${couverture.affiches} point(s) affiché(s) sur `
          + `${couverture.total} du repère, soit `
          + `${couverture.total ? Math.round((couverture.affiches / couverture.total) * 100) : 0} %.`
        : 'Couverture du fil : effectifs indisponibles sur ce rendu.';
      ligne.textContent = texte;
      ligne.setAttribute('aria-label', texte);
      ligne.setAttribute('role', 'note');
      insereApres(ligne, liste, fil);
    });

    /* E071-10 — Miroir V2 : signature consolidée, lisible depuis l'inspecteur. */
    safe(() => {
      const ligne = legend
        ? assure(legend, 'v2-e071-synthese', 'p', 'recit-v2-e071-synthese', el) : null;
      if (ligne) {
        ligne.textContent = 'Lentille V2 E071 : dix mesures de lecture et d’accessibilité '
          + 'ajoutées sans modifier le contenu existant ; la vue reste lisible sans JavaScript.';
        ligne.setAttribute('aria-label', ligne.textContent);
      }
      if (typeof racine.setAttribute !== 'function') return;
      const jetons = [
        `contraste-titre:${ratioTitre === null ? '-' : nombreAvecVirgule(ratioTitre, 2)}`,
        `contraste-contexte:${ratioContexte === null ? '-' : nombreAvecVirgule(ratioContexte, 2)}`,
        `nombres:${info.nombres}`,
        `sigles:${info.sigles}`,
        `types:${motsUniques}/${tokensCourants}`,
        `longs:${longs}/${tokensCourants}`,
        `phrases:${respirationCourante.phrases}`,
        `restant:${secondesRestantes}s`,
        `poids:${poids === null ? '-' : Math.round(poids) + '%'}`,
        `cibles:${filCibleOrDash(filCible.reel)}`,
        `couverture:${couverture ? couverture.affiches + '/' + couverture.total : '-'}`,
        'css:1',
        'chantiers:10',
      ];
      racine.setAttribute('data-recit-v2-e071-metrics', jetons.join(' '));
      racine.setAttribute('data-recit-v2-e071-ready', '1');
    });
  } catch { /* neutralisation totale : la vue reste inchangée. */ }
});
