import { register } from './registry.js';

/* Lentille E061 — Lisibilité et mesure de lecture (vue Récit).
 *
 * Dix chantiers indépendants et complémentaires, tous non destructifs : sans
 * ce module la vue reste intégralement lisible. Un seul register, un seul bloc
 * CSS (id `recit-e061`), toutes les classes créées préfixées `recit-e061-`,
 * tous les ids DOM préfixés `e061-` et uniques. Zéro réseau, zéro console,
 * zéro aléa, aucun fichier partagé modifié. Les chantiers E061-07 à E061-09
 * dérivent leurs chiffres du texte réellement affiché, jamais de valeurs
 * inventées. Voir UNIFIED_AUDIT/RECIT/views/E061.md pour le détail.
 */

const CSS = `
/* Socle : tout est porté par .recit-e061-root, posée sur la layout à chaque rendu. */
.recit-e061-root{--e061-ligne:70ch}

/* E061-01 — police de lecture fluide et interlignage généreux. */
.recit-e061-root .recit-e061-texte{
  font-size:clamp(15px,1.15vw,18px);
  line-height:1.72;
  letter-spacing:.005em;
}

/* E061-02 — longueur de ligne bornée sur les textes secondaires. */
.recit-e061-root .recit-e061-ligne{max-width:var(--e061-ligne)}

/* E061-03 — rythme vertical des paragraphes secondaires. */
.recit-e061-root .recit-e061-ligne{margin:0 0 .55em;line-height:1.62}
.recit-e061-root .recit-e061-ligne:last-child{margin-bottom:0}

/* E061-04 — surtitre d'étape hiérarchisé : ordinal fort, genre atténué. */
.recit-e061-root .recit-e061-kicker{
  display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:.55em;
  font-variant-numeric:tabular-nums;
}
.recit-e061-root .recit-e061-etape{font-weight:700;letter-spacing:.06em}
.recit-e061-root .recit-e061-genre{opacity:.8}

/* E061-05 — panneau de lecture : fond de lecture à dégradé doux et filet. */
.recit-e061-root .recit-e061-panneau{
  padding:.7em 0 .7em 1em;
  border-left:3px solid var(--gold);
  border-radius:0 10px 10px 0;
  background:linear-gradient(90deg,rgba(230,185,111,.09),rgba(230,185,111,0));
  transition:background-color .25s linear,border-color .25s linear;
}

/* E061-06 — cibles tactiles et focus des commandes de lecture. */
.recit-e061-root .recit-e061-commandes button{min-height:44px;padding:0 12px}
.recit-e061-root .recit-e061-commandes button:focus-visible{
  outline:3px solid var(--gold-bright);
  outline-offset:3px;
}

/* E061-07 / E061-08 — mesures de lecture chiffrées. */
.recit-e061-root .recit-e061-metric{
  margin:.28em 0 0;color:var(--ink-soft);font-size:11px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E061-09 — progression textuelle en clair, à côté de la jauge. */
.recit-e061-root .recit-e061-progress{
  margin:0 0 8px;color:var(--muted);font-size:10px;
  font-variant-numeric:tabular-nums;
}

/* E061-10 — confort : mouvement réduit. */
.recit-e061-root[data-e061-motion="reduce"] .recit-e061-panneau,
.recit-e061-root[data-e061-motion="reduce"] .recit-e061-commandes button{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e061-root .recit-e061-panneau,
  .recit-e061-root .recit-e061-commandes button{transition:none}
}
@media (max-width:620px){
  .recit-e061-root .recit-e061-texte{font-size:clamp(15px,4vw,17px)}
}
`;

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function') {
    noeud.classList.add(nom);
  }
}

/* Pose un attribut sans jamais levée d'erreur. */
function attribut(noeud, nom, valeur) {
  try {
    if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
  } catch { /* attributs facultatifs */ }
}

/* Exécute un chantier isolé : une défaillance n'affecte pas les autres.
   La valeur de retour est transmise quand le chantier en produit une. */
function sansRisque(fn) {
  try { return fn(); } catch { return undefined; /* rendu préservé coûte que coûte */ }
}

/* Compte les mots d'un texte réel (séquences de non-blancs). */
function compteMots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

/* Nombre de lettres et chiffres d'un texte, pour l'indice de densité. */
function compteLettres(texte) {
  const value = String(texte || '').replace(/[^a-zA-ZÀ-ÿ0-9]/g, '');
  return value.length;
}

/* Lit « Étape X / Y » dans le surtitre, sans rien inventer. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const trouvé = texte.match(/(\d+)\s*\/\s*(\d+)/);
  if (!trouvé) return null;
  return { etape: Number(trouvé[1]), total: Number(trouvé[2]) };
}

/* Insère un nœud juste après une référence, ou en fin de parent. */
function insereApres(noeud, reference, parentFallback) {
  if (!noeud) return;
  const parent = reference && reference.parentNode ? reference.parentNode : parentFallback;
  if (!parent || typeof parent.insertBefore !== 'function') return;
  parent.insertBefore(noeud, reference && reference.parentNode === parent ? reference.nextSibling : null);
}

/* Trouve un nœud déjà présent dans la layout, sans toucher aux autres vues. */
function dansLayout(root, selecteur, idFallback) {
  let noeud = root.querySelector(selecteur);
  if (noeud) return noeud;
  if (typeof document !== 'undefined' && idFallback) {
    const candidat = document.getElementById(idFallback);
    if (candidat && root.contains(candidat)) return candidat;
  }
  return null;
}

register('E061', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el, reducedMotion } = ctx;

  /* Un seul bloc CSS pour toute la lentille. */
  sansRisque(() => { if (typeof css === 'function') css('recit-e061', CSS); });

  const racine = layout;
  marquer(racine, 'recit-e061-root');

  /* E061-10 — préférence de mouvement lue une seule fois par rendu. */
  sansRisque(() => {
    const reduce = typeof reducedMotion === 'function' && reducedMotion();
    attribut(racine, 'data-e061-motion', reduce ? 'reduce' : 'normal');
  });

  const corps = racine.querySelector('.recit-body');
  const titre = dansLayout(racine, '#recit-point-title, .recit-title', 'recit-point-title');
  const contexte = dansLayout(racine, '#recit-context, .recit-context', 'recit-context');
  const timing = racine.querySelector('.recit-timing');
  const kicker = racine.querySelector('.view-kicker');
  const actions = racine.querySelector('.recit-actions');
  const jauge = racine.querySelector('.recit-progress');
  const secondaires = Array.prototype.slice.call(
    racine.querySelectorAll('.recit-legend p, .recit-sources, .recit-trace p, .c3a-status')
  );

  /* E061-01 — police de lecture fluide. */
  sansRisque(() => { marquer(contexte, 'recit-e061-texte'); });

  /* E061-02 / E061-03 — ligne bornée et rythme des textes secondaires. */
  sansRisque(() => { secondaires.forEach((noeud) => marquer(noeud, 'recit-e061-ligne')); });

  /* E061-04 — surtitre hiérarchisé, sans perdre un seul mot du libellé. */
  const etape = sansRisque(() => {
    if (!kicker) return null;
    const info = lireEtape(kicker);
    marquer(kicker, 'recit-e061-kicker');
    if (!info) return null;
    attribut(kicker, 'data-e061-ordinal', String(info.etape).padStart(2, '0'));
    attribut(kicker, 'data-e061-total', String(info.total));
    if (typeof el !== 'function' || !kicker.firstChild || kicker.childNodes.length !== 1
        || kicker.firstChild.nodeType !== 3) return info;
    const texte = String(kicker.firstChild.textContent || '');
    const motif = texte.match(/^(\s*Étape\s+)(\d+)(\s*\/\s*)(\d+)([\s\S]*)$/);
    if (!motif) return info;
    const fort = el('span', 'recit-e061-etape',
      `${motif[1]}${motif[2]}${motif[3]}${motif[4]}`.trim());
    kicker.textContent = '';
    kicker.appendChild(fort);
    const reste = motif[5] && motif[5].trim();
    if (reste) kicker.appendChild(el('span', 'recit-e061-genre', reste));
    return info;
  });

  /* E061-05 — panneau de lecture (fond + filet), décoratif et discret. */
  sansRisque(() => { marquer(contexte, 'recit-e061-panneau'); });

  /* E061-06 — cibles tactiles et focus des commandes. */
  sansRisque(() => { marquer(actions, 'recit-e061-commandes'); });

  /* E061-07 — durée de lecture normalisée à 200 mots/minute. */
  sansRisque(() => {
    const mots = compteMots((titre && titre.textContent || '') + ' ' + (contexte && contexte.textContent || ''));
    if (!mots) return;
    const secondes = Math.max(1, Math.round((mots / 200) * 60));
    const message = `Lecture : ${mots} mot${mots > 1 ? 's' : ''} · ≈ ${secondes} s à 200 mots/min.`;
    let metric = typeof document !== 'undefined' ? document.getElementById('e061-read-time') : null;
    if (!metric || !racine.contains(metric)) {
      if (typeof el !== 'function') return;
      metric = el('p', 'recit-e061-metric');
      metric.id = 'e061-read-time';
      insereApres(metric, timing, corps || racine);
    }
    metric.textContent = message;
    attribut(metric, 'aria-label', `Durée estimée de lecture : ${mots} mots, environ ${secondes} secondes à 200 mots par minute.`);
  });

  /* E061-08 — indice de densité lexicale (caractères par mot). */
  sansRisque(() => {
    const texte = (titre && titre.textContent || '') + ' ' + (contexte && contexte.textContent || '');
    const mots = compteMots(texte);
    if (!mots) return;
    const densite = compteLettres(texte) / mots;
    const message = `Densité du passage : ${densite.toFixed(1)} caractère${densite > 1 ? 's' : ''} par mot.`;
    let metric = typeof document !== 'undefined' ? document.getElementById('e061-density') : null;
    if (!metric || !racine.contains(metric)) {
      if (typeof el !== 'function') return;
      metric = el('p', 'recit-e061-metric');
      metric.id = 'e061-density';
      const precedent = (typeof document !== 'undefined' && document.getElementById('e061-read-time')) || timing;
      insereApres(metric, precedent && racine.contains(precedent) ? precedent : timing, corps || racine);
    }
    metric.textContent = message;
    attribut(metric, 'aria-label', `Longueur moyenne des mots : ${densite.toFixed(1)} caractères.`);
  });

  /* E061-09 — progression textuelle lisible, à côté de la jauge. */
  sansRisque(() => {
    const info = etape || lireEtape(kicker);
    if (!info || !info.total) return;
    const pourcent = Math.round((info.etape / info.total) * 100);
    const message = `Progression du repère : ${pourcent} % · point ${info.etape} sur ${info.total}.`;
    if (jauge) attribut(jauge, 'data-e061-pourcent', String(pourcent));
    let note = typeof document !== 'undefined' ? document.getElementById('e061-progress-note') : null;
    if (!note || !racine.contains(note)) {
      if (typeof el !== 'function') return;
      note = el('p', 'recit-e061-progress');
      note.id = 'e061-progress-note';
      insereApres(note, jauge, corps || racine);
    }
    note.textContent = message;
    attribut(note, 'aria-label', `Progression : ${pourcent} pour cent, point ${info.etape} sur ${info.total}.`);
  });
});
