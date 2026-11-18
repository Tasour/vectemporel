import { register } from './registry.js';

/* Lentille E078 — Performance et sobriété (vue Récit).
 *
 * Dix chantiers indépendants, tous non destructifs : sans ce module, la vue
 * reste intégralement lisible et le fil utilisable. Un seul greffon, une seule
 * feuille de style (id `recit-e078`), toutes les classes préfixées
 * `recit-e078-`, tous les identifiants préfixés `e078-` et uniques.
 * Zéro appel réseau, zéro sortie de débogage, zéro aléa, aucune injection de balisage.
 * L'état (mode sobre, cache de mesure) vit dans ce module et survit aux
 * reconstructions du DOM opérées par la coque à chaque rendu.
 *
 * Les dix chantiers sont documentés dans UNIFIED_AUDIT/RECIT/views/E078.md.
 */

/* Cache borné des mesures de texte, clé par le contenu réel du point. */
const mesureCache = new Map();
const BUDGET_CACHE = 200;

/* Préférence « mode sobre » mémorisée entre deux rendus. */
let sobreActif = false;

const CSS = `
/* E078-01 — isolation de la zone d'illustration (aucune ressource ajoutée). */
.recit-e078-media{isolation:isolate}

/* E078-02 — le fil long n'est plus peint lorsqu'il est hors écran. */
.recit-e078-cv .recit-thread{content-visibility:auto;contain-intrinsic-size:auto 360px}

/* E078-03 — même traitement pour les annexes de fin de colonne. */
.recit-e078-cv .recit-legend,
.recit-e078-cv .recit-trace,
.recit-e078-cv .recit-sources{content-visibility:auto;contain-intrinsic-size:auto 120px}

/* E078-04 — confinement de la mise en page du corps de lecture. */
.recit-e078-isolate .recit-body{contain:layout style}

/* E078-05 / 08 / 09 — lectures de coût, discretes et tabulaires. */
.recit-e078-empreinte,
.recit-e078-mesure,
.recit-e078-charge{margin:5px 0 0;color:var(--muted-2);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-e078-charge{color:var(--gold-bright)}

/* E078-10 — bilan replie, sans impact sur la lecture courante. */
.recit-e078-bilan{margin-top:8px;color:var(--muted-2);font-size:9px}
.recit-e078-bilan summary{min-height:26px;display:flex;align-items:center;cursor:pointer}
.recit-e078-bilan p{margin:4px 0;line-height:1.6}

/* E078-06 — commande de mode sobre et economie de peinture. */
.recit-e078-btn{min-height:36px;padding:4px 11px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear}
.recit-e078-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-e078-btn:focus-visible,.recit-e078-bilan summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-e078-sobre,
.recit-layout.recit-e078-sobre *{box-shadow:none!important;text-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background-image:none!important;transition:none!important;animation:none!important}

/* E078-07 — mouvement reduit : aucune transition, aucune animation. */
.recit-e078-sans-mouvement .recit-e078-btn,
.recit-e078-sans-mouvement .recit-e078-bilan summary{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e078-btn,.recit-e078-bilan summary{transition:none;animation:none}
}
@media (max-width:620px){
  .recit-e078-btn{min-height:40px}
}
`;

register('E078', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined') return;

    /* Une seule feuille, injectée une seule fois par cssOnce. */
    if (typeof css === 'function') {
      try { css('recit-e078', CSS); } catch (_) { /* rendu préservé */ }
    }

    /* Racine sûre : la coque reconstruisant le DOM, on ne travaille que dans
       le fragment courant. Un échec local est toujours absorbé. */
    const root = (layout && typeof layout.querySelector === 'function')
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!root) return;

    const q = (selector) => root.querySelector(selector);
    const qa = (selector) => Array.from(root.querySelectorAll(selector));
    const safe = (fn) => { try { fn(); } catch (_) { /* neutre : jamais de throw */ } };
    const unique = (id) => !document.getElementById(id);

    function addClass(node, name) {
      if (node && node.classList && typeof node.classList.add === 'function'
        && !node.classList.contains(name)) node.classList.add(name);
    }
    function setAttr(node, name, value) {
      if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
    }
    function appliqueSobre(cadre) {
      if (!cadre) return;
      if (sobreActif) {
        addClass(cadre, 'recit-e078-sobre');
        setAttr(cadre, 'data-e078-sobre', 'on');
      } else {
        if (cadre.classList && typeof cadre.classList.remove === 'function') {
          cadre.classList.remove('recit-e078-sobre');
        }
        if (typeof cadre.removeAttribute === 'function') cadre.removeAttribute('data-e078-sobre');
      }
    }

    /* --- E078-01 : décodage asynchrone de l'illustration. ---------------- */
    safe(() => {
      const media = q('.recit-media');
      const img = media && media.querySelector('img');
      if (!img || typeof img.setAttribute !== 'function') return;
      addClass(media, 'recit-e078-media');
      if (!img.hasAttribute('decoding')) setAttr(img, 'decoding', 'async');
      if (!img.hasAttribute('loading')) setAttr(img, 'loading', 'lazy');
      setAttr(img, 'data-e078-image', 'async');
    });

    /* --- E078-02 : confinement de rendu du fil narratif. ---------------- */
    safe(() => {
      if (!q('.recit-thread')) return;
      addClass(root, 'recit-e078-cv');
      setAttr(root, 'data-e078-fil', 'confine');
    });

    /* --- E078-03 : confinement des annexes de fin de colonne. ----------- */
    safe(() => {
      const annexes = q('.recit-legend') || q('.recit-trace') || q('.recit-sources');
      if (!annexes) return;
      addClass(root, 'recit-e078-cv');
      setAttr(root, 'data-e078-annexes', 'confinees');
    });

    /* --- E078-04 : isolation de la mise en page du corps. --------------- */
    safe(() => {
      if (!q('.recit-body')) return;
      addClass(root, 'recit-e078-isolate');
      setAttr(root, 'data-e078-isolement', 'layout-style');
    });

    /* --- E078-05 : empreinte DOM mesurée. -------------------------------- */
    safe(() => {
      if (!unique('e078-empreinte')) return;
      const legend = q('.recit-legend');
      if (!legend) return;
      const noeuds = root.querySelectorAll('*').length;
      const points = qa('#c3a-thread .c3a-thread-item').length;
      const p = el('p', 'recit-e078-empreinte',
        `Empreinte de rendu : ${noeuds} nœuds dans la vue, ${points} point(s) dans le fil.`);
      p.id = 'e078-empreinte';
      p.setAttribute('aria-label',
        `Coût de rendu : ${noeuds} éléments présents dans la vue, ${points} points affichés dans le fil.`);
      legend.appendChild(p);
    });

    /* --- E078-06 : bascule « mode sobre ». ------------------------------- */
    safe(() => {
      if (!unique('e078-sobre-btn')) return;
      const actions = q('.recit-actions');
      if (!actions) return;
      const bouton = el('button', 'recit-e078-btn');
      bouton.id = 'e078-sobre-btn';
      bouton.type = 'button';

      const synchronise = () => {
        const libelle = sobreActif ? 'Mode sobre : désactiver' : 'Mode sobre : activer';
        bouton.textContent = libelle;
        bouton.setAttribute('aria-label', libelle);
        bouton.setAttribute('aria-pressed', sobreActif ? 'true' : 'false');
      };
      synchronise();

      if (bouton.getAttribute('data-e078-bound') !== '1') {
        bouton.setAttribute('data-e078-bound', '1');
        bouton.addEventListener('click', () => {
          try {
            sobreActif = !sobreActif;
            appliqueSobre(document.querySelector('.recit-layout'));
            synchronise();
          } catch (_) { /* repli silencieux */ }
        });
      }
      actions.appendChild(bouton);
      appliqueSobre(root);
    });

    /* --- E078-07 : respect du mouvement réduit. -------------------------- */
    safe(() => {
      let reduit = false;
      if (typeof reducedMotion === 'function') {
        try { reduit = Boolean(reducedMotion()); } catch (_) { reduit = false; }
      }
      setAttr(root, 'data-e078-motion', reduit ? 'reduce' : 'normal');
      if (reduit) addClass(root, 'recit-e078-sans-mouvement');
    });

    /* --- E078-08 : mesure du point conservée en cache borné. ------------- */
    safe(() => {
      if (!unique('e078-mesure')) return;
      const titre = q('#recit-point-title');
      const legend = q('.recit-legend');
      if (!titre || !legend) return;
      const texte = String(titre.textContent || '').trim();
      if (!texte) return;

      let measure = mesureCache.get(texte);
      const reprise = Boolean(measure);
      if (!reprise) {
        const mots = texte.split(/\s+/).filter(Boolean).length;
        const caracteres = texte.replace(/\s+/g, '').length;
        measure = { mots, caracteres };
        if (mesureCache.size >= BUDGET_CACHE) mesureCache.clear();
        mesureCache.set(texte, measure);
      }

      const p = el('p', 'recit-e078-mesure',
        `Mesure du point conservée en cache local : ${measure.mots} mot(s) · ${measure.caracteres} caractère(s)`
        + ` (calcul ${reprise ? 'repris du cache' : 'effectué à la volée'} ; ${mesureCache.size}/${BUDGET_CACHE} entrées).`);
      p.id = 'e078-mesure';
      p.setAttribute('data-e078-cache', reprise ? 'hit' : 'miss');
      p.setAttribute('aria-label',
        `Longueur du point : ${measure.mots} mots, ${measure.caracteres} caractères. `
        + `Mesure ${reprise ? 'reprise du cache local' : 'calculée à la volée'}.`);
      legend.appendChild(p);
    });

    /* --- E078-09 : avertissement de densité du fil. ---------------------- */
    safe(() => {
      if (!unique('e078-charge')) return;
      const legend = q('.recit-legend');
      if (!legend) return;
      const points = qa('#c3a-thread .c3a-thread-item').length;
      if (points <= 150) return;
      const p = el('p', 'recit-e078-charge',
        `Fil dense : ${points} points affichés. Affinez la recherche ou les filtres de type `
        + 'et de certitude pour alléger le coût d’affichage.');
      p.id = 'e078-charge';
      p.setAttribute('data-e078-charge', String(points));
      legend.appendChild(p);
    });

    /* --- E078-10 : bilan de sobriété, replié par défaut. ----------------- */
    safe(() => {
      if (!unique('e078-bilan')) return;
      const legend = q('.recit-legend');
      if (!legend) return;
      const details = el('details', 'recit-e078-bilan');
      details.id = 'e078-bilan';
      details.appendChild(el('summary', '', 'Coût et sobriété de cette vue'));
      details.appendChild(el('p', '',
        'Cette lentille n’ajoute aucune ressource distante : aucune requête réseau, '
        + 'aucune police téléchargée, aucune image supplémentaire. Aucun texte du récit n’est modifié.'));
      details.appendChild(el('p', '',
        'Réglages disponibles : le mode sobre réduit les effets de peinture coûteux ; '
        + 'le mouvement réduit est respecté automatiquement ; le fil et les annexes sont '
        + 'confinés pour limiter le rendu hors écran.'));
      legend.appendChild(details);
    });
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
