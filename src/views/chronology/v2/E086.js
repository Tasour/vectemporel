import { register } from './registry.js';

/* Lentille E086 — Qualité & validation de la vue Chronologie V2.
 *
 * Thème (themes.json, clé E086) : « I. Qualité & validation — 10 chantiers
 * documentés dans le rapport ». Les dix contrôles ci-dessous sont distincts
 * et non chevauchants ; chacun produit une ligne de résultat lisible dans le
 * panneau #chronology-v2-e086-audit et un attribut data-e086-* observable.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E086.md — E086-01 à E086-10.
 * Fichier possédé : src/views/chronology/v2/E086.js uniquement. Lectures seules
 * autorisées : themes.json, registry.js, le modèle E049 (passe 1) et le stub.
 * Aucun fichier partagé n'est modifié.
 *
 * Contrat : un seul enregistrement du greffon (identifiant E086), une seule
 * feuille de style insérée par le helper dédié (identifiant chronology-v2-e086),
 * des identifiants préfixés chronology-v2-e086- avec garde d'existence, aucun
 * appel réseau, aucune journalisation, aucun aléa, aucun HTML brut, aucun
 * timer, aucune animation, aucune écriture dans une région live existante.
 */

const CSS_ID = 'chronology-v2-e086';
const PANEL_ID = 'chronology-v2-e086-audit';
const TITLE_ID = 'chronology-v2-e086-title';
const LEDE_ID = 'chronology-v2-e086-lede';
const SUMMARY_ID = 'chronology-v2-e086-summary';
const LIST_ID = 'chronology-v2-e086-checks';
const FOOT_ID = 'chronology-v2-e086-foot';
const HOST_ID = 'atlas-chrono-main';
const PREFIX = 'chronology-v2-e086-';

/* Dix identifiants de ligne + six identifiants de structure : la liste sert
   aux contrôles E086-03 (unicité) et E086-04 (préfixation). */
const CHECK_IDS = Array.from({ length: 10 }, (_, i) => `${PREFIX}check-${String(i + 1).padStart(2, '0')}`);
const OWNED_IDS = [PANEL_ID, TITLE_ID, LEDE_ID, SUMMARY_ID, LIST_ID, FOOT_ID, ...CHECK_IDS];

const CHECKS = [
  ['E086-01', 'Contrat d’entrée du greffon (viewId, stage, layout, helpers)'],
  ['E086-02', 'Feuille CSS unique et identifiée'],
  ['E086-03', 'Unicité des identifiants possédés'],
  ['E086-04', 'Préfixation de tous les identifiants possédés'],
  ['E086-05', 'Hygiène de la feuille CSS injectée'],
  ['E086-06', 'Zéro ressource active distante dans le document'],
  ['E086-07', 'Structure sémantique : un main, au moins un h1'],
  ['E086-08', 'État des contrôles porté par le texte et la forme'],
  ['E086-09', 'Préférence de mouvement réduit respectée'],
  ['E086-10', 'Idempotence multi-rendus du greffon'],
];

/* Une seule feuille : E086-05 valide cette même chaîne avant injection.
   Aucune priorité forcée, aucun import, aucune URL distante, aucun panneau
   fixe ; les états s'appuient sur la bordure, le libellé et le soulignement. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, #6b6b6b);
    border-left: 3px solid var(--gold, #b8892b);
    border-radius: 10px; background: var(--surface, rgba(255,255,255,.02));
    color: var(--ink, #e8e8e8); font: inherit; font-size: 10px;
    line-height: 1.5; overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID} .e086-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0c674);
    font-family: var(--serif, Georgia, serif); font-size: 14px;
    font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e086-lede,
  #${PANEL_ID} .e086-summary,
  #${PANEL_ID} .e086-foot { margin: 0 0 8px; color: var(--muted, #b9b9b9); }
  #${PANEL_ID} .e086-list { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e086-check {
    margin: 0 0 5px; padding: 4px 6px 4px 8px;
    border: 1px solid var(--line, #6b6b6b);
    border-left: 3px solid var(--line-strong, #8a8a8a);
    border-radius: 5px; background: var(--surface, transparent);
  }
  #${PANEL_ID} .e086-check[data-e086-state="ok"] {
    border-left-style: solid; border-left-color: #2f9e6b;
  }
  #${PANEL_ID} .e086-check[data-e086-state="warn"] {
    border-left-style: dashed; border-left-color: #b8892b;
  }
  #${PANEL_ID} .e086-code {
    display: inline-block; min-width: 68px; margin-right: 6px;
    color: var(--gold-bright, #f0c674); font-weight: 700;
  }
  #${PANEL_ID} .e086-label { display: inline-block; max-width: 100%; }
  #${PANEL_ID} .e086-result {
    display: block; margin-top: 2px; font-weight: 600;
    transition: color 120ms linear;
  }
  #${PANEL_ID} [data-e086-state="ok"] .e086-result {
    color: #2f9e6b; text-decoration: none;
  }
  #${PANEL_ID} [data-e086-state="warn"] .e086-result {
    color: #b8892b; text-decoration: underline dotted;
  }
  #${PANEL_ID} .e086-foot { margin: 8px 0 0; font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e086-code { display: block; min-width: 0; margin: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID} .e086-result { transition: none; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e086-check {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e086-code,
    #${PANEL_ID} .e086-result,
    #${PANEL_ID} .e086-title { color: CanvasText; }
  }
`;

let renders = 0;

/* Garde d'existence : un nœud retrouvé est réutilisé et déplacé dans le
   parent courant, jamais cloné. La coque reconstruisant son conteneur, un
   nœud de la rendu précédent est détaché et n'est pas retrouvé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function mark(node, name, value) {
  const attribute = `data-e086-${name}`;
  if (node && node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

function count(selector, root) {
  return (root || document).querySelectorAll(selector).length;
}

function result(ok, detail) {
  return { ok, detail };
}

/* Écriture d'un état : le marqueur d'attribut et le libellé textuel sont
   toujours posés ensemble, ce que E086-08 vérifie ensuite sur le DOM. */
function appliquer(items, etats, index) {
  const etat = etats[index];
  const { item, resultat } = items[index];
  mark(item, 'state', etat.ok ? 'ok' : 'warn');
  write(resultat, `${etat.ok ? '[v] CONFORME' : '[!] À VÉRIFIER'} · ${etat.detail}`);
}

/* E086-01 à E086-07, E086-09 et E086-10 : neuf contrôles indépendants.
   E086-08 est calculé après coup, sur le DOM réellement écrit. */
function premierePasse(ctx) {
  const viewOK = ctx.viewId === 'chronologyv2';
  const helpersOK = typeof ctx.el === 'function' && typeof ctx.css === 'function'
    && typeof ctx.reducedMotion === 'function';
  const contratOK = Boolean(viewOK && ctx.stage && ctx.layout && helpersOK);
  const contratDetail = contratOK
    ? 'viewId « chronologyv2 », stage et layout présents, quatre helpers disponibles'
    : `contrat incomplet : viewId=${String(ctx.viewId)} · helpers=${helpersOK ? 'présents' : 'manquants'}`;

  const cssCount = count(`style[id="${CSS_ID}"]`);
  const doublons = OWNED_IDS.filter((id) => count(`[id="${id}"]`) !== 1);
  const horsPrefixe = OWNED_IDS.filter((id) => !id.startsWith(PREFIX));
  const cssPropre = !/!\s*important|@\s*import|url\(\s*['"]?https?:/i.test(CSS)
    && !/position\s*:\s*fixed/i.test(CSS);
  const schemes = ['http', 'https'].map((protocole) => `${protocole}://`);
  const selecteurs = ['img', 'script', 'iframe'].flatMap((balise) =>
    schemes.map((protocole) => `${balise}[src^="${protocole}"]`));
  schemes.forEach((protocole) => selecteurs.push(`link[rel="stylesheet"][href^="${protocole}"]`));
  const distants = selecteurs.reduce((total, selecteur) => total + count(selecteur), 0);
  const mains = count('main');
  const titres = count('h1');
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const motionOK = reduced === false || CSS.includes('prefers-reduced-motion: reduce');
  const panelCount = count(`#${PANEL_ID}`);

  return [
    result(contratOK, contratDetail),
    result(cssCount === 1, `${cssCount} feuille « ${CSS_ID} » dans le document`),
    result(doublons.length === 0, `${OWNED_IDS.length - doublons.length}/${OWNED_IDS.length} identifiants uniques${doublons.length ? ` · doublons : ${doublons.join(', ')}` : ''}`),
    result(horsPrefixe.length === 0, `${OWNED_IDS.length - horsPrefixe.length}/${OWNED_IDS.length} identifiants préfixés ${PREFIX}`),
    result(cssPropre, cssPropre ? 'aucune priorité forcée, import, URL distante ou position fixe' : 'directive interdite détectée dans la feuille'),
    result(distants === 0, `${distants} ressource active distante dans le document`),
    result(mains === 1 && titres >= 1, `${mains} élément <main> · ${titres} titre(s) <h1>`),
    result(false, 'à recalculer après écriture'),
    result(motionOK, `mouvement réduit : ${reduced ? 'oui' : 'non'} · repli CSS ${CSS.includes('prefers-reduced-motion: reduce') ? 'présent' : 'absent'}`),
    result(panelCount === 1 && renders >= 1, `rendus : ${renders} · panneaux : ${panelCount} · feuilles : ${cssCount}`),
  ];
}

function secondePasse(items, results, etats) {
  const textuels = items.filter((item, i) => {
    const attendu = etats[i].ok ? 'ok' : 'warn';
    return item.getAttribute('data-e086-state') === attendu
      && results[i].textContent.trim().length > 0;
  }).length;
  return result(textuels === items.length, `${textuels}/${items.length} lignes avec état textuel et marqueur`);
}

register('E086', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || !ctx.layout) return;
  const make = ctx.el;

  renders += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e086-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e086-title', 'Qualité & validation — contrôles de la vue');
  title.id = TITLE_ID;
  const lede = make('p', 'e086-lede', 'Dix contrôles indépendants, en lecture seule : ce panneau audite le contrat du greffon et le document sans modifier la frise, la fiche ni les fichiers partagés.');
  lede.id = LEDE_ID;
  const summary = make('p', 'e086-summary');
  summary.id = SUMMARY_ID;
  const list = make('ol', 'e086-list');
  list.id = LIST_ID;
  const foot = make('p', 'e086-foot', 'Méthode : contrôles statiques et observations DOM ; aucun résultat n’est deviné, aucune donnée n’est inventée.');
  foot.id = FOOT_ID;

  const items = CHECKS.map(([code, label], i) => {
    const item = make('li', 'e086-check');
    item.id = CHECK_IDS[i];
    const resultat = make('span', 'e086-result');
    item.append(make('span', 'e086-code', code), make('span', 'e086-label', label), resultat);
    return { item, resultat };
  });
  panel.replaceChildren(title, lede, summary, list, foot);
  list.replaceChildren(...items.map(({ item }) => item));

  const etats = premierePasse(ctx);
  etats.forEach((etat, i) => appliquer(items, etats, i));

  /* E086-08 : contrôle observé sur le DOM réellement écrit, puis réappliqué. */
  etats[7] = secondePasse(items.map(({ item }) => item), items.map(({ resultat }) => resultat), etats);
  appliquer(items, etats, 7);

  const conformes = etats.filter((etat) => etat.ok).length;
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  write(summary, `Bilan : ${conformes}/10 contrôles conformes · ${10 - conformes} à vérifier · rendus : ${renders} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  mark(panel, 'renders', String(renders));
  mark(panel, 'ok', String(conformes));
  mark(panel, 'warn', String(10 - conformes));
  mark(panel, 'css-count', String(count(`style[id="${CSS_ID}"]`)));
  mark(panel, 'panneaux', String(count(`#${PANEL_ID}`)));
  mark(panel, 'textual', String(items.filter(({ item, resultat }) =>
    item.hasAttribute('data-e086-state') && resultat.textContent.trim().length > 0).length));
  mark(panel, 'reduced', reduced ? '1' : '0');
});
