import { register } from './registry.js';

/* Lentille E041 — Lisibilité et mesure de lecture (vue Récit).
   Dix chantiers indépendants et distincts (E041-01 … E041-10) : mesure de
   ligne, interlignage, équilibre du titre, chiffres tabulaires, compteur de
   mots, avancement en pourcentage, temps de lecture du repère, mode confort,
   coupure des identifiants de traçabilité et transparence de l'estimation.

   Aucune donnée historique n'est inventée : chaque chiffre est recalculé
   depuis le texte réellement rendu par la vue (titre du point, libellé
   « Étape i / n », libellés aria des items du fil). L'enrichissement est
   strictement additif : aucun attribut existant n'est écrasé, aucun texte
   n'est supprimé. Une défaillance locale est neutralisée sans jamais
   interrompre le rendu ; sans JavaScript, la vue reste intégralement lisible. */

const RULES = `
.recit-e041-mesure{max-width:68ch}
.recit-e041-interligne{line-height:1.68}
.recit-e041-titre{text-wrap:balance;overflow-wrap:anywhere;hyphens:auto}
.recit-e041-chiffres{font-variant-numeric:tabular-nums}
.recit-e041-chip{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;margin-left:6px;border:1px solid var(--line,rgba(255,255,255,.18));border-radius:999px;color:var(--muted,#9aa6b8);font-size:9px;white-space:nowrap;vertical-align:middle}
.recit-e041-avancement{display:inline-block;margin:2px 0 6px;color:var(--muted,#9aa6b8);font-size:9px;line-height:1.4}
.recit-e041-note{margin:4px 0 0;color:var(--muted-2,#8c8d91);font-size:9px;line-height:1.5}
.recit-e041-trace{overflow-wrap:anywhere;word-break:break-word}
.recit-e041-bouton{min-height:36px;padding:4px 10px;border:1px solid var(--line,rgba(255,255,255,.18));border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font-size:9px;white-space:nowrap;cursor:pointer}
.recit-e041-bouton[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.recit-e041-bouton:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
html[data-e041-confort="on"] .recit-e041-mesure{max-width:60ch}
html[data-e041-confort="on"] .recit-e041-interligne{font-size:1.06em;line-height:1.85}
@media (max-width:620px){
  .recit-e041-mesure{max-width:none}
  .recit-e041-bouton{min-height:40px}
}
@media (prefers-reduced-motion:reduce){.recit-e041-bouton{transition:none}}
`;

/* Pose un attribut seulement s'il est absent : l'enrichissement reste non
   destructif, même si une autre lentille est passée avant la nôtre. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants (ici aria-describedby) sans écraser
   les valeurs déjà présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token) return;
  const tokens = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (tokens.includes(token)) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Comptage de mots : même découpage que la vue (recit.js:57), sans aléa. */
function mots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

/* Estimation en secondes : exactement la formule de la vue, bornée à 4–12 s. */
function secondesLecture(texte) {
  return Math.max(4, Math.min(12, Math.ceil(mots(texte) / 3)));
}

/* Position lue depuis le libellé réel « Étape i / n · kind », avec repli sur
   le nombre d'items du fil si le libellé venait à changer. */
function progression(body) {
  const kicker = body.querySelector('.view-kicker');
  const found = kicker && String(kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  if (found) return { now: Number(found[1]), max: Number(found[2]) };
  const count = body.querySelectorAll('.recit-thread-item').length;
  return { now: count ? 1 : 0, max: count };
}

/* Formulation lisible d'une durée : secondes en dessous de 90 s, sinon minutes. */
function duree(secondes) {
  if (secondes < 90) return `≈ ${secondes} s`;
  return `≈ ${Math.max(1, Math.round(secondes / 60))} min`;
}

/* E041-01 — mesure de ligne : le texte narratif ne dépasse pas ~68 caractères. */
function chantier01(body) {
  ['.recit-context', '.recit-timing', '.recit-legend', '.recit-meta'].forEach((selecteur) => {
    const noeud = body.querySelector(selecteur);
    if (noeud) noeud.classList.add('recit-e041-mesure');
  });
}

/* E041-02 — interlignage de confort pour les paragraphes de lecture. */
function chantier02(body) {
  ['.recit-context', '.recit-legend'].forEach((selecteur) => {
    const noeud = body.querySelector(selecteur);
    if (noeud) noeud.classList.add('recit-e041-interligne');
  });
}

/* E041-03 — équilibre du titre : retours à la ligne maîtrisés, mots longs
   cassés proprement sur écran étroit. */
function chantier03(body) {
  const titre = body.querySelector('#recit-point-title') || document.getElementById('recit-point-title');
  if (titre) titre.classList.add('recit-e041-titre');
}

/* E041-04 — chiffres tabulaires : les nombres (étape, timing, rangs du fil)
   s'alignent et se comparent plus facilement. */
function chantier04(body) {
  ['.view-kicker', '.recit-timing', '.recit-legend', '.recit-thread-list'].forEach((selecteur) => {
    const noeud = body.querySelector(selecteur);
    if (noeud) noeud.classList.add('recit-e041-chiffres');
  });
}

/* E041-05 — compteur de mots du point courant, calculé depuis son titre. */
function chantier05(body, el) {
  if (body.querySelector('#e041-compteur-mots')) return;
  const timing = body.querySelector('.recit-timing');
  const titre = document.getElementById('recit-point-title');
  if (!timing || !titre) return;
  const chip = el('span', 'recit-e041-chip', `${mots(titre.textContent)} mots`);
  chip.id = 'e041-compteur-mots';
  timing.appendChild(chip);
}

/* E041-06 — avancement en pourcentage, relu depuis le libellé d'étape. */
function chantier06(body, el) {
  if (body.querySelector('#e041-avancement')) return;
  const barre = body.querySelector('.recit-progress');
  if (!barre) return;
  const { now, max } = progression(body);
  const pct = max ? Math.round((Math.min(Math.max(now, 0), max) / max) * 100) : 0;
  const ligne = el('p', 'recit-e041-avancement recit-e041-chiffres',
    max ? `Avancement : ${pct} % · point ${now} sur ${max}` : 'Avancement : aucun point à parcourir');
  ligne.id = 'e041-avancement';
  ligne.setAttribute('role', 'status');
  ligne.setAttribute('aria-live', 'polite');
  const parent = barre.parentNode;
  if (parent) parent.insertBefore(ligne, barre.nextSibling);
  else body.appendChild(ligne);
}

/* Le texte complet d'un item du fil est dans son aria-label
   (« Point i sur n, kind : texte ») ; le texte visible est tronqué. */
function textePoint(item) {
  const aria = String(item.getAttribute('aria-label') || '');
  const coupe = aria.indexOf(' : ');
  if (coupe >= 0) return aria.slice(coupe + 3).trim();
  return String(item.textContent || '').trim();
}

/* E041-07 — temps de lecture estimé pour le repère entier, somme des
   estimations de chaque point ; repli sur le point courant si le fil est vide. */
function chantier07(body, el) {
  if (body.querySelector('#e041-temps-repere')) return;
  const meta = body.querySelector('.recit-meta');
  if (!meta) return;
  let secondes = 0;
  let compte = 0;
  Array.prototype.forEach.call(body.querySelectorAll('.recit-thread-item'), (item) => {
    const texte = textePoint(item);
    if (!texte) return;
    secondes += secondesLecture(texte);
    compte += 1;
  });
  if (!compte) {
    const titre = document.getElementById('recit-point-title');
    if (!titre) return;
    secondes = secondesLecture(titre.textContent);
    compte = 1;
  }
  const chip = el('span', 'recit-e041-chip recit-e041-chiffres',
    `Repère : ${duree(secondes)} · ${compte} point(s)`);
  chip.id = 'e041-temps-repere';
  meta.appendChild(chip);
}

/* Préférence de confort : survit aux reconstructions complètes du DOM. */
let confort = false;
function appliquerConfort() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.e041Confort = confort ? 'on' : 'off';
}

/* E041-08 — bascule « Texte confort » : agrandit corps et interlignage. */
function chantier08(body, el) {
  appliquerConfort();
  const actions = body.querySelector('.recit-actions');
  if (!actions || document.getElementById('e041-confort')) return;
  const bouton = el('button', 'recit-e041-bouton',
    confort ? 'Texte confort : activé' : 'Texte confort : désactivé');
  bouton.id = 'e041-confort';
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(confort));
  bouton.title = 'Agrandit le texte et l’interlignage du récit';
  bouton.addEventListener('click', () => {
    confort = !confort;
    appliquerConfort();
    bouton.setAttribute('aria-pressed', String(confort));
    bouton.textContent = confort ? 'Texte confort : activé' : 'Texte confort : désactivé';
  });
  actions.insertBefore(bouton, actions.firstChild);
}

/* E041-09 — traçabilité : les longs identifiants se coupent sans déborder. */
function chantier09(body) {
  Array.prototype.forEach.call(
    body.querySelectorAll('.recit-trace, .recit-sources'),
    (noeud) => noeud.classList.add('recit-e041-trace')
  );
}

/* E041-10 — transparence de la mesure : une note reliée au timing explique
   comment l'estimation est calculée, sans inventer de donnée historique. */
function chantier10(body, el) {
  if (body.querySelector('#e041-note-mesure')) return;
  const timing = body.querySelector('.recit-timing');
  if (!timing) return;
  const note = el('p', 'recit-e041-note',
    'Estimation calculée à environ 3 mots par seconde à partir du texte affiché : elle indique un volume de lecture, non la compréhension.');
  note.id = 'e041-note-mesure';
  addToken(timing, 'aria-describedby', 'e041-note-mesure');
  const parent = timing.parentNode;
  if (parent) parent.insertBefore(note, timing.nextSibling);
  else body.appendChild(note);
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E041', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !stage || !layout) return;
  const body = typeof layout.querySelector === 'function'
    ? layout.querySelector('.recit-body') : null;
  if (!body) return;

  safe(() => css('recit-e041', RULES));

  /* Le mouvement réduit est réévalué à chaque rendu et publié dans le document. */
  safe(() => {
    let reduce = false;
    try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduce = false; }
    document.documentElement.dataset.e041Motion = reduce ? 'reduce' : 'full';
  });

  safe(() => chantier01(body));
  safe(() => chantier02(body));
  safe(() => chantier03(body));
  safe(() => chantier04(body));
  safe(() => chantier05(body, el));
  safe(() => chantier06(body, el));
  safe(() => chantier07(body, el));
  safe(() => chantier08(body, el));
  safe(() => chantier09(body));
  safe(() => chantier10(body, el));
});
