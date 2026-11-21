import { register } from './registry.js';

/* Lentille V2 E043 — contraste visuel et lisibilité de la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   locaux et dégradables, sans réseau, sans aléa, sans minuteur ni boucle
   d'animation propre. Aucun identifiant de la passe 1 n'est réutilisé. */

const CSS_ID = 'constellation-v2-e043';

/* Luminance relative WCAG 2.1 d'une couleur hexadécimale à six chiffres. */
function luminanceV2(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255)
    + 0.7152 * canal((n >> 8) & 255)
    + 0.0722 * canal(n & 255);
}

/* Ratio de contraste (L_clair + 0,05) / (L_sombre + 0,05). */
function contrasteV2(a, b) {
  const la = luminanceV2(a);
  const lb = luminanceV2(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function formatV2(x) {
  return x === null ? 'n/d' : `${x.toFixed(2).replace('.', ',')} : 1`;
}

function verdictV2(x) {
  if (x === null) return 'n/d';
  if (x >= 7) return 'AAA';
  if (x >= 4.5) return 'AA';
  return 'Insuffisant';
}

const CSS = `
.v2e043-legend { position: relative; }
.v2e043-titre { margin: 0; color: var(--ink-soft); font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.v2e043-legend [data-v2e043-ordinal] { display: inline-flex; align-items: center; }
.v2e043-num { margin-right: 4px; color: var(--ink-soft); font-weight: 700; font-variant-numeric: tabular-nums; }
.v2e043-separes [data-v2e043-sep] { padding-left: 12px; border-left: 1px solid var(--line-strong); }
.v2e043-legend.v2e043-gris { filter: grayscale(1); }
.v2e043-live { position: absolute!important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.v2e043-faible { flex: 1 1 100%; margin: 4px 0 0; padding: 3px 8px; border: 1px solid var(--line-strong); border-radius: 6px; color: var(--ink-soft); font-size: 10px; }
.v2e043-commandes { flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.v2e043-commandes button { min-height: 36px; padding: 6px 10px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface-2); color: var(--ink-soft); font: inherit; font-size: 10px; cursor: pointer; }
.v2e043-commandes button[aria-pressed="true"] { border-color: var(--gold-bright); color: var(--gold-bright); }
.v2e043-commandes button:focus-visible,
.v2e043-legend [tabindex="0"]:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.v2e043-noeuds-lisibles .const-sun::after,
.v2e043-noeuds-lisibles .const-planet::after,
.v2e043-noeuds-lisibles .const-moon::after { color: var(--ink-soft); font-size: 10px; text-shadow: 0 1px 2px rgba(0, 0, 0, .9); }
@media (prefers-reduced-motion: reduce) {
  .v2e043-legend, .v2e043-commandes button { transition: none!important; }
}
`;

register('E043', (ctx) => {
  if (!ctx || !ctx.layout || ctx.layout.nodeType !== 1
      || typeof ctx.layout.querySelectorAll !== 'function'
      || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument;
  if (!doc || typeof doc.createElement !== 'function') return;
  const make = typeof ctx.el === 'function' ? ctx.el : null;
  const legend = layout.querySelector('.constellation-legend');
  if (!legend || typeof legend.setAttribute !== 'function'
      || typeof legend.insertBefore !== 'function') return;

  /* Fabrique un nœud une seule fois, retrouvé par son identifiant si présent. */
  const creer = (tag, className, texte, id) => {
    let n = id && typeof doc.getElementById === 'function'
      ? doc.getElementById(id) : null;
    if (n) return n;
    n = make ? make(tag, className, texte || '') : doc.createElement(tag);
    if (!make) {
      if (className) n.className = className;
      if (texte) n.textContent = texte;
    }
    if (id) n.id = id;
    return n;
  };
  const cleEntree = (noeud) => ['legend-sun', 'legend-planet', 'legend-moon']
    .find((c) => noeud.classList && noeud.classList.contains(c));
  const PANNEAU = '#10151d';
  const TEINTES = {
    'legend-sun': '#e6b96f',
    'legend-planet': '#7f9cff',
    'legend-moon': '#b28bdd'
  };
  const SENS = {
    'legend-sun': 'Ère, disque doré',
    'legend-planet': 'Repère, carré bleu',
    'legend-moon': 'Point vérifié, anneau violet'
  };
  const LIBELLES = {
    'legend-sun': 'pastille or de l’ère',
    'legend-planet': 'pastille bleue du repère',
    'legend-moon': 'pastille violette du point vérifié',
    'texte renforcé': 'texte renforcé de la légende'
  };

  const entrees = Array.from(legend.querySelectorAll(
    'span.legend-sun, span.legend-planet, span.legend-moon'
  ));

  /* Région live partagée : toutes les annonces de la lentille y sont écrites. */
  const live = creer('p', 'v2e043-live', '', 'v2e043-live');
  if (!live.getAttribute('role')) {
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
  }
  if (!live.parentNode) legend.appendChild(live);
  const annoncer = (texte) => { live.textContent = texte; };
  legend.classList.add('v2e043-legend');

  /* E043-01 — Mesure WCAG des trois pastilles sur le fond du panneau :
     chaque teinte est recalculée depuis sa luminance, publiée en attribut
     avec son verdict, puis résumée dans la région live. */
  const ratios = {};
  entrees.forEach((entree) => {
    const cle = cleEntree(entree);
    if (!cle) return;
    const ratio = contrasteV2(TEINTES[cle], PANNEAU);
    ratios[cle] = ratio;
    entree.setAttribute('data-v2e043-ratio', formatV2(ratio));
    entree.setAttribute('data-v2e043-verdict', verdictV2(ratio));
  });
  layout.dataset.v2e043Pastilles = String(Object.keys(ratios).length);
  annoncer(`Mesure des pastilles terminée : ${Object.keys(ratios).length} teinte(s) évaluée(s) sur le panneau.`);

  /* E043-02 — Titre visible de la légende, relié par aria-labelledby :
     le groupe cesse d'être une suite de spans sans intitulé. */
  let titre = doc.getElementById('v2e043-titre');
  if (!titre) {
    titre = creer('p', 'v2e043-titre', 'Légende — couleurs et formes', 'v2e043-titre');
    legend.insertBefore(titre, legend.firstChild);
  }
  legend.setAttribute('role', 'group');
  legend.setAttribute('aria-labelledby', 'v2e043-titre');

  /* E043-03 — Numérotation ordinale : un repère « 1. », « 2. », « 3. »
     inséré avant chaque entrée, indépendant de la teinte et de la forme. */
  entrees.forEach((entree, index) => {
    const premier = entree.firstElementChild;
    if (premier && premier.classList && premier.classList.contains('v2e043-num')) return;
    const num = creer('b', 'v2e043-num', `${index + 1}.`, null);
    entree.insertBefore(num, entree.firstChild);
    entree.setAttribute('data-v2e043-ordinal', `${index + 1}.`);
    const ancien = entree.getAttribute('aria-label') || '';
    entree.setAttribute('aria-label',
      `${ancien}${ancien ? ' — ' : ''}entrée ${index + 1} sur ${entrees.length}`);
  });

  /* E043-04 — Renfort des étiquettes de nœuds : les libellés des soleils,
     repères et points (8 px, 7 px, couleur atténuée) gagnent une couleur
     franche et une ombre portée, sans modifier styles.css. */
  const field = layout.querySelector('.constellation-field');
  if (field) {
    field.classList.add('v2e043-noeuds-lisibles');
    layout.dataset.v2e043Noeuds = 'renforces';
  }

  /* E043-05 — Simulateur de vision en niveaux de gris : une bascule
     indépendante applique un filtre local à la légende pour vérifier que
     la forme et le texte suffisent sans la couleur. */
  const commandes = creer('div', 'v2e043-commandes', '', 'v2e043-commandes');
  if (!commandes.parentNode) legend.appendChild(commandes);
  const boutonGris = creer('button', '', 'Simuler niveaux de gris', 'v2e043-gris');
  boutonGris.setAttribute('type', 'button');
  boutonGris.setAttribute('aria-pressed', 'false');
  boutonGris.setAttribute('aria-label',
    'Simuler une vision en niveaux de gris sur la légende');
  if (!boutonGris.parentNode) commandes.appendChild(boutonGris);
  if (!boutonGris.dataset.v2e043Lie) {
    boutonGris.dataset.v2e043Lie = 'oui';
    boutonGris.addEventListener('click', () => {
      const actif = legend.classList.toggle('v2e043-gris');
      boutonGris.setAttribute('aria-pressed', actif ? 'true' : 'false');
      boutonGris.textContent = actif ? 'Rétablir les couleurs' : 'Simuler niveaux de gris';
      layout.dataset.v2e043Gris = actif ? 'on' : 'off';
      annoncer(actif
        ? 'Simulation en niveaux de gris active : les formes et les textes restent lisibles.'
        : 'Couleurs d’origine rétablies dans la légende.');
    });
  }

  /* E043-06 — Agrandissement progressif du corps : deux boutons − et +
     parcourent quatre paliers de 11 à 14 px, bornés et annoncés. */
  const PALIERS = [11, 12, 13, 14];
  const depart = PALIERS.indexOf(Number(layout.dataset.v2e043Corps));
  let palier = depart < 0 ? 1 : depart;
  const appliquerCorps = () => {
    legend.style.fontSize = `${PALIERS[palier]}px`;
    legend.style.lineHeight = '1.5';
    layout.dataset.v2e043Corps = String(PALIERS[palier]);
  };
  const moins = creer('button', '', '−', 'v2e043-moins');
  moins.setAttribute('type', 'button');
  moins.setAttribute('aria-label', 'Réduire la taille du texte de la légende');
  const plus = creer('button', '', '+', 'v2e043-plus');
  plus.setAttribute('type', 'button');
  plus.setAttribute('aria-label', 'Agrandir la taille du texte de la légende');
  if (!moins.parentNode) commandes.appendChild(moins);
  if (!plus.parentNode) commandes.appendChild(plus);
  if (!moins.dataset.v2e043Lie) {
    moins.dataset.v2e043Lie = 'oui';
    moins.addEventListener('click', () => {
      palier = Math.max(0, palier - 1);
      appliquerCorps();
      annoncer(`Taille du texte de la légende : ${PALIERS[palier]} pixels.`);
    });
  }
  if (!plus.dataset.v2e043Lie) {
    plus.dataset.v2e043Lie = 'oui';
    plus.addEventListener('click', () => {
      palier = Math.min(PALIERS.length - 1, palier + 1);
      appliquerCorps();
      annoncer(`Taille du texte de la légende : ${PALIERS[palier]} pixels.`);
    });
  }
  appliquerCorps();

  /* E043-07 — Séparateurs visuels entre entrées : un liseré vertical
     structurant posé sur les entrées 2 et 3, indépendant de la couleur. */
  entrees.forEach((entree, index) => {
    if (index > 0) entree.setAttribute('data-v2e043-sep', 'vrai');
  });
  legend.classList.add('v2e043-separes');
  layout.dataset.v2e043Separateurs = 'on';

  /* E043-08 — Focusabilité et annonce des entrées : chaque entrée devient
     atteignable au clavier et décrit son sens et son contraste au focus. */
  entrees.forEach((entree) => {
    const cle = cleEntree(entree);
    if (cle) entree.setAttribute('tabindex', '0');
  });
  if (!legend.dataset.v2e043Focus) {
    legend.dataset.v2e043Focus = 'oui';
    legend.addEventListener('focusin', (event) => {
      const cible = event && event.target;
      const entree = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('span.legend-sun, span.legend-planet, span.legend-moon') : null;
      if (!entree || !legend.contains(entree)) return;
      const cle = cleEntree(entree);
      if (!cle) return;
      const ratio = contrasteV2(TEINTES[cle], PANNEAU);
      annoncer(`${SENS[cle]} — contraste ${formatV2(ratio)}, ${verdictV2(ratio)}.`);
    });
  }

  /* E043-09 — Indicateur du ratio minimal garanti : le plus faible des
     contrastes mesurés est nommé et chiffré en texte, jamais par la couleur. */
  const mesures = Object.assign({}, ratios, {
    'texte renforcé': contrasteV2('#d7d1c6', PANNEAU)
  });
  let pireNom = null;
  let pire = null;
  Object.keys(mesures).forEach((nom) => {
    const r = mesures[nom];
    if (r === null) return;
    if (pire === null || r < pire) { pire = r; pireNom = nom; }
  });
  layout.dataset.v2e043MinRatio = formatV2(pire);
  const faible = creer('p', 'v2e043-faible', '', 'v2e043-faible');
  faible.textContent = `Maillon le plus faible : ${LIBELLES[pireNom] || pireNom}, `
    + `${formatV2(pire)} — ${verdictV2(pire)}.`;
  if (!faible.parentNode) legend.appendChild(faible);

  /* E043-10 — Réinitialisation des réglages V2 : un bouton ramène le corps,
     le filtre et les séparateurs à leur état initial, avec annonce live. */
  const reset = creer('button', '', 'Réinitialiser', 'v2e043-reset');
  reset.setAttribute('type', 'button');
  reset.setAttribute('aria-label',
    'Réinitialiser les réglages de contraste de la légende');
  if (!reset.parentNode) commandes.appendChild(reset);
  if (!reset.dataset.v2e043Lie) {
    reset.dataset.v2e043Lie = 'oui';
    reset.addEventListener('click', () => {
      palier = 1;
      appliquerCorps();
      legend.classList.remove('v2e043-gris');
      boutonGris.setAttribute('aria-pressed', 'false');
      boutonGris.textContent = 'Simuler niveaux de gris';
      layout.dataset.v2e043Gris = 'off';
      legend.classList.remove('v2e043-separes');
      layout.dataset.v2e043Separateurs = 'off';
      annoncer('Réglages de contraste de la légende réinitialisés.');
    });
  }

  /* Feuille de style unique, installée une seule fois par cssOnce. */
  css(CSS_ID, CSS);
});
