import { register } from './registry.js';

/* Lentille E060 — Données, traçabilité et provenance (vue Récit).
   Dix chantiers additifs et distincts (E060-01 … E060-10). Tout est déduit du
   DOM réellement rendu par la vue : aucune donnée historique n'est inventée,
   aucun texte existant n'est supprimé ou réécrit, aucun attribut préexistant
   n'est écrasé. Sans JavaScript, la vue Récit reste intégralement lisible.
   Chaque chantier est isolé : une défaillance locale ne casse jamais le rendu. */

const STYLE_ID = 'recit-e060';

/* Une seule feuille de styles, unique, cadrée par la racine posée sur
   .recit-layout. Les transitions ne sont actives que si l'utilisateur les
   accepte (reducedMotion()). */
function regles(transition) {
  return `
.recit-e060-racine .recit-e060-fiche{margin:8px 0 6px;padding:8px 10px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025)}
.recit-e060-racine .recit-e060-fiche-titre{margin:0 0 5px;color:var(--gold-bright,#f5e9d0);font-size:10px;letter-spacing:.06em;text-transform:uppercase}
.recit-e060-racine .recit-e060-fiche-ligne{margin:2px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.45}
.recit-e060-racine .recit-e060-fiche-label{color:var(--gold-bright,#f5e9d0);font-weight:600}
.recit-e060-racine .recit-e060-badge{display:inline-block;margin-left:6px;padding:1px 7px;border:1px solid var(--line,#35405a);border-radius:999px;font-size:8px;white-space:nowrap;vertical-align:middle}
.recit-e060-racine .recit-e060-badge--source{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f5e9d0)}
.recit-e060-racine .recit-e060-badge--vide{border-style:dashed;color:var(--muted-2,#7c8699)}
.recit-e060-racine .recit-e060-refs{margin-top:8px;padding-top:6px;border-top:1px dashed var(--line,#35405a)}
.recit-e060-racine .recit-e060-refs-titre{margin:0 0 4px;color:var(--muted-2,#7c8699);font-size:9px}
.recit-e060-racine .recit-e060-refs-liste{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none}
.recit-e060-racine .recit-e060-ref{display:inline-block;padding:2px 6px;border:1px solid var(--line,#35405a);border-radius:5px;color:var(--gold-bright,#f5e9d0);font-size:9px;overflow-wrap:anywhere}
.recit-e060-racine .recit-e060-empreinte{color:var(--muted-2,#7c8699);font-variant-numeric:tabular-nums}
.recit-e060-racine .recit-e060-chaine{margin:4px 0 8px;color:var(--muted-2,#7c8699);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.recit-e060-racine .recit-e060-sans-source{padding-left:8px;border-left:3px dashed var(--muted-2,#7c8699)}
.recit-e060-racine .recit-e060-avec-source>summary{color:var(--gold-bright,#f5e9d0)}
.recit-e060-racine .recit-e060-legende-provenance{margin-top:6px;color:var(--muted-2,#7c8699)}
.recit-e060-racine .recit-e060-fil-source{border-left:3px solid var(--gold,#e6b96f)}
.recit-e060-racine .recit-e060-fil-sans-source{border-left:3px dashed var(--muted-2,#7c8699)}
.recit-e060-racine .recit-e060-citation{margin:10px 0 0;padding:8px 10px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);${transition}}
.recit-e060-racine .recit-e060-citation--masquee{display:none}
.recit-e060-racine .recit-e060-citation-texte{margin:0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.6;overflow-wrap:anywhere}
.recit-e060-racine .recit-e060-citer{min-height:36px;padding:4px 10px;border:1px solid var(--line,#35405a);border-radius:8px;background:transparent;color:var(--gold-bright,#f5e9d0);font-size:9px;cursor:pointer}
.recit-e060-racine .recit-e060-citer[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.recit-e060-racine .recit-e060-citer:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.recit-e060-racine .recit-e060-citation{transition:none}}
@media (max-width:620px){.recit-e060-racine .recit-e060-fiche-ligne,.recit-e060-racine .recit-e060-chaine,.recit-e060-racine .recit-e060-citation-texte{font-size:10px}}
`;
}

/* Pose un attribut seulement s'il n'existe pas déjà : l'enrichissement reste
   non destructif, même si une autre lentille est passée avant la nôtre. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Isoler chaque chantier : une erreur locale est neutralisée, les neuf autres
   continuent et le rendu de la vue n'est jamais interrompu. */
function safe(fn) {
  try { return fn(); }
  catch { return undefined; }
}

/* Texte visible normalisé d'un nœud, sans jamais lever d'exception. */
function texte(node) {
  if (!node || node.nodeType !== 1) return '';
  return String(node.textContent || '').replace(/\s+/g, ' ').trim();
}

/* Lecture des valeurs réellement affichées par la vue. */
function lireKicker(body) {
  const found = texte(body.querySelector('.view-kicker')).match(/Étape\s+(\d+)\s*\/\s*(\d+)(?:\s*·\s*(.+))?/);
  if (!found) return { index: 0, total: 0, kind: '' };
  return { index: Number(found[1]), total: Number(found[2]), kind: (found[3] || '').trim() };
}

function lireRepere(body) {
  const parts = texte(body.querySelector('.recit-meta')).split('·').map((s) => s.trim()).filter(Boolean);
  return { titre: parts[0] || '', annee: parts[1] || '' };
}

function lireRefs(body) {
  const trace = body.querySelector('.recit-trace');
  if (!trace) return 0;
  const found = texte(trace.querySelector('summary')).match(/(\d+)\s*référence/i);
  return found ? Number(found[1]) : 0;
}

function lireIdentifiants(body) {
  const raw = texte(body.querySelector('.recit-trace p'));
  if (!raw) return [];
  let found = raw.match(/^Identifiants\s*:\s*(.+?)\.\s*Titres/i);
  if (!found) found = raw.match(/^Identifiants\s*:\s*(.+)/i);
  if (!found) return [];
  return found[1].split(',').map((part) => part.trim().replace(/\.$/, '')).filter(Boolean);
}

function lireLecture(body) {
  const found = texte(body.querySelector('.recit-timing')).match(/≈\s*(\d+)\s*s/);
  return found ? `${found[1]} s` : '';
}

/* Empreinte FNV-1a déterministe du texte affiché : aucun aléa, aucune graine,
   aucune dépendance réseau. Deux rendus du même texte donnent la même valeur. */
function empreinte(valeur) {
  let h = 2166136261;
  const chaine = String(valeur || '');
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
}

function collecter(body) {
  const titre = texte(body.querySelector('#recit-point-title')) || texte(body.querySelector('.recit-title'));
  const donnees = {
    ...lireKicker(body),
    titre,
    confiance: texte(body.querySelector('.recit-conf')) || 'non précisée',
    lecture: lireLecture(body),
    repere: lireRepere(body),
  };
  donnees.refs = lireRefs(body);
  donnees.identifiants = lireIdentifiants(body);
  donnees.empreinte = empreinte(donnees.titre);
  return donnees;
}

/* E060-01 — Fiche de provenance consolidée du point courant. */
function ch01(body, el, d) {
  if (body.querySelector('#e060-fiche')) return;
  const timing = body.querySelector('.recit-timing');
  if (!timing) return;
  const fiche = el('aside', 'recit-e060-fiche');
  fiche.id = 'e060-fiche';
  fiche.setAttribute('aria-label', 'Fiche de provenance du point courant');
  fiche.appendChild(el('h2', 'recit-e060-fiche-titre', 'Provenance de ce point'));
  const lignes = [
    ['Type de donnée', d.kind || 'non précisé'],
    ['Certitude', d.confiance],
    ['Références locales', d.refs ? `${d.refs} référence(s)` : 'aucune'],
    ['Lecture estimée', d.lecture || 'non calculée'],
    ['Empreinte du texte', d.empreinte],
  ];
  lignes.forEach(([libelle, valeur]) => {
    const ligne = el('p', 'recit-e060-fiche-ligne');
    ligne.appendChild(el('strong', 'recit-e060-fiche-label', `${libelle} : `));
    ligne.appendChild(document.createTextNode(valeur));
    fiche.appendChild(ligne);
  });
  body.insertBefore(fiche, timing.nextSibling);
}

/* E060-02 — Badge « sourcé / sans source » à côté de la pastille de certitude.
   Rend visible, au niveau du point, la réalité des points non référencés. */
function ch02(body, el, d) {
  if (body.querySelector('#e060-badge-source')) return;
  const meta = body.querySelector('.recit-meta');
  if (!meta) return;
  const badge = el('span', 'recit-e060-badge', d.refs ? `${d.refs} référence(s) locale(s)` : 'Sans source référencée');
  badge.id = 'e060-badge-source';
  badge.classList.add(d.refs ? 'recit-e060-badge--source' : 'recit-e060-badge--vide');
  badge.title = d.refs
    ? 'Ce point s’appuie sur des identifiants du registre local'
    : 'Aucun identifiant de source n’est attaché à ce point dans le jeu de données';
  meta.appendChild(badge);
}

/* E060-03 — Registre des références locales : les identifiants déjà présents
   dans la traçabilité sont présentés un par un, sans toucher au paragraphe
   d'origine. */
function ch03(body, el, d) {
  if (body.querySelector('#e060-refs')) return;
  const trace = body.querySelector('.recit-trace');
  if (!trace || !d.identifiants.length) return;
  const bloc = el('div', 'recit-e060-refs');
  bloc.id = 'e060-refs';
  bloc.appendChild(el('p', 'recit-e060-refs-titre', `Registre des références locales (${d.identifiants.length}) :`));
  const liste = el('ol', 'recit-e060-refs-liste');
  d.identifiants.forEach((identifiant, i) => {
    const item = el('li', 'recit-e060-refs-item');
    const code = el('code', 'recit-e060-ref', identifiant);
    code.title = `Identifiant de source local n° ${i + 1}`;
    item.appendChild(code);
    liste.appendChild(item);
  });
  bloc.appendChild(liste);
  trace.appendChild(bloc);
}

/* E060-04 — Empreinte déterministe du texte, affichée dans la ligne de
   lecture estimée : un repère d'intégrité stable d'un rendu à l'autre. */
function ch04(body, el, d) {
  if (body.querySelector('#e060-empreinte')) return;
  const timing = body.querySelector('.recit-timing');
  if (!timing) return;
  const empreinteNode = el('span', 'recit-e060-empreinte', ` · Empreinte déterministe du texte : ${d.empreinte}`);
  empreinteNode.id = 'e060-empreinte';
  empreinteNode.title = 'Empreinte calculée uniquement à partir du texte affiché, identique d’un rendu à l’autre';
  timing.appendChild(empreinteNode);
}

/* E060-05 — Chaîne de provenance : ascendance repère → point → type →
   certitude, présentée comme un fil d'Audit en texte réel. */
function ch05(body, el, d) {
  if (body.querySelector('#e060-chaine')) return;
  const kicker = body.querySelector('.view-kicker');
  if (!kicker) return;
  const chaine = el('p', 'recit-e060-chaine');
  chaine.id = 'e060-chaine';
  chaine.setAttribute('aria-label', 'Chaîne de provenance du point');
  const repere = d.repere.titre || 'repère';
  const annee = d.repere.annee ? ` (${d.repere.annee})` : '';
  chaine.appendChild(document.createTextNode(
    `Repère « ${repere}${annee} » › point ${d.index || 1} sur ${d.total || 1} › ${d.kind || 'point'} › ${d.confiance}`
  ));
  body.insertBefore(chaine, kicker.nextSibling);
}

/* E060-06 — Métadonnées de provenance lisibles par machine sur le corps :
   aucun impact visuel, mais exploitables par un audit ou un outil externe. */
function ch06(body, d) {
  if (!body || body.nodeType !== 1) return;
  setOnce(body, 'data-e060-kind', d.kind || 'inconnu');
  setOnce(body, 'data-e060-confidence', d.confiance);
  setOnce(body, 'data-e060-sourced', d.refs ? '1' : '0');
  setOnce(body, 'data-e060-refs', String(d.refs));
  setOnce(body, 'data-e060-empreinte', d.empreinte);
}

/* E060-07 — Qualité de la donnée : le bloc « sans source » et le bloc de
   traçabilité reçoivent un traitement visuel et un nom accessible distincts. */
function ch07(body, d) {
  const sansSource = body.querySelector('.recit-sources');
  if (sansSource) {
    sansSource.classList.add('recit-e060-sans-source');
    setOnce(sansSource, 'role', 'note');
    setOnce(sansSource, 'aria-label', 'Donnée non référencée : aucun identifiant de source local');
  }
  const trace = body.querySelector('.recit-trace');
  if (!trace) return;
  trace.classList.add('recit-e060-avec-source');
  const summary = trace.querySelector('summary');
  if (summary) setOnce(summary, 'title', `Donnée étayée par ${d.refs} référence(s) locale(s), sans lien externe`);
}

/* E060-08 — Légende de provenance : explique le vocabulaire des données
   sans modifier les quatre paragraphes de légende existants. */
function ch08(body, el) {
  if (body.querySelector('#e060-legende-provenance')) return;
  const legend = body.querySelector('.recit-legend');
  if (!legend) return;
  const paragraphe = el('p', 'recit-e060-legende-provenance',
    'Provenance des données : chaque point provient des audits locaux ; une référence est un identifiant du registre local, sans lien externe ; l’empreinte identifie le texte affiché ; un point sans référence est signalé « sans source ».');
  paragraphe.id = 'e060-legende-provenance';
  legend.appendChild(paragraphe);
}

/* E060-09 — Statut de provenance de l'item courant dans le fil : une bordure
   et un titre distincts, sans changer le texte ni l'aria-label du bouton. */
function ch09(body, d) {
  const courant = body.querySelector('.recit-thread-item[aria-current="step"]')
    || body.querySelector('.recit-thread-item.is-current');
  if (!courant) return;
  courant.classList.add(d.refs ? 'recit-e060-fil-source' : 'recit-e060-fil-sans-source');
  setOnce(courant, 'data-e060-sourced', d.refs ? '1' : '0');
  setOnce(courant, 'title', d.refs
    ? `Ce point s’appuie sur ${d.refs} référence(s) locale(s)`
    : 'Ce point n’a aucune source référencée');
}

/* E060-10 — Citation de provenance reployable : un bloc de texte selecting
   et une bascule aria-pressed, sans presse-papiers ni réseau. */
function ch10(body, el, d) {
  if (body.querySelector('#e060-citation')) return;
  const actions = body.querySelector('.recit-actions');
  if (!actions) return;
  const bloc = el('blockquote', 'recit-e060-citation recit-e060-citation--masquee');
  bloc.id = 'e060-citation';
  const repere = d.repere.titre || 'sans titre';
  const annee = d.repere.annee ? ` (${d.repere.annee})` : '';
  const citation = `« ${d.titre || 'Point'} » — repère « ${repere}${annee} », point ${d.index || 1}/${d.total || 1}, type : ${d.kind || 'point'}, certitude : ${d.confiance}, références locales : ${d.refs}, empreinte du texte : ${d.empreinte}. Source : audits locaux du jeu de données, sans lien externe.`;
  bloc.appendChild(el('p', 'recit-e060-citation-texte', citation));

  const bouton = el('button', 'recit-e060-citer', 'Afficher la citation');
  bouton.id = 'e060-citer';
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', 'false');
  bouton.setAttribute('aria-controls', 'e060-citation');
  bouton.addEventListener('click', () => {
    const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
    bouton.setAttribute('aria-pressed', String(ouvert));
    bouton.textContent = ouvert ? 'Masquer la citation' : 'Afficher la citation';
    bloc.classList.toggle('recit-e060-citation--masquee', !ouvert);
  });

  body.insertBefore(bloc, actions);
  actions.appendChild(bouton);
}

register('E060', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
  const reduit = Boolean(safe(() => typeof reducedMotion === 'function' && reducedMotion()));
  safe(() => css(STYLE_ID, regles(reduit ? 'transition:none' : 'transition:opacity .18s ease')));
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  layout.classList.add('recit-e060-racine');
  const d = safe(() => collecter(body)) || {};
  safe(() => ch01(body, el, d));
  safe(() => ch02(body, el, d));
  safe(() => ch03(body, el, d));
  safe(() => ch04(body, el, d));
  safe(() => ch05(body, el, d));
  safe(() => ch06(body, d));
  safe(() => ch07(body, d));
  safe(() => ch08(body, el));
  safe(() => ch09(body, d));
  safe(() => ch10(body, el, d));
});
