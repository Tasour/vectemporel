import { register } from './registry.js';

/* Lentille E017 — Contraste et perception.
   Dix chantiers d'enrichissement non destructif de la vue Récit : aucun texte
   n'est retiré, aucun sélecteur de test n'est modifié, aucune donnée n'est
   inventée. Sans JS, la vue reste intacte et lisible (la feuille n'est injectée
   que depuis apply()). Aucune journalisation, aucun accès réseau, aucun tirage
   aléatoire, tout en français, et chaque accès au DOM est gardé pour ne jamais
   interrompre le rendu. */
register('E017', (ctx) => {
  const { stage, layout, css, el } = ctx;

  /* Feuille unique regroupant les dix chantiers, injectée une seule fois par
     cssOnce (le registre garantit l'idempotence sur l'identifiant). */
  css('recit-e017', `
/* E017-01 — Jalon courant du fil : renfort multicanal (fond + liseré + graisse),
   au-delà de la seule couleur, pour percevoir où l'on se trouve. */
.recit-layout .recit-thread-item.is-current{
  color:var(--gold-bright);
  background:rgba(230,185,111,.16);
  border-color:var(--gold);
  font-weight:700;
  box-shadow:inset 3px 0 0 var(--gold);
}

/* E017-02 — Degrés de confiance : une forme de bordure distincte s'ajoute au
   symbole et à la couleur, pour les lecteurs daltoniens. */
.recit-layout .recit-conf.recit-e017-conf[data-e017-conf="verifie"]{border-style:solid;border-color:var(--gold);color:var(--gold-bright)}
.recit-layout .recit-conf.recit-e017-conf[data-e017-conf="certain"]{border-style:solid;border-color:var(--ink-soft);color:var(--ink)}
.recit-layout .recit-conf.recit-e017-conf[data-e017-conf="probable"]{border-style:dashed;border-color:var(--muted);color:var(--ink-soft)}
.recit-layout .recit-conf.recit-e017-conf[data-e017-conf="conteste"]{border-style:dotted;border-color:var(--red,#d98b7a);color:var(--ink-soft)}

/* E017-03 — Progression : repère numérique lisible, en complément de la barre. */
.recit-e017-progress-note{margin:5px 0 0;color:var(--ink-soft);font-size:9px;letter-spacing:.05em;font-variant-numeric:tabular-nums;text-align:right}

/* E017-04 — Légende : taille et contraste remontés par rapport aux 8 px d'origine. */
.recit-layout .recit-legend{color:var(--ink-soft);font-size:10px;line-height:1.65}
.recit-layout .recit-legend p{margin:4px 0}

/* E017-05 — Crédit image : fond opaque pour un contraste stable sur toute image. */
.recit-layout .recit-media-credit{padding:3px 8px;border-radius:6px;background:rgba(7,10,14,.8);color:var(--ink-soft);text-shadow:none;font-size:9px}

/* E017-06 — Focus clavier : double anneau à fort contraste, toutes commandes. */
.recit-layout .recit-actions button:focus-visible,
.recit-layout .recit-thread-item:focus-visible,
.recit-layout .recit-trace summary:focus-visible,
.recit-layout .c3a-filter:focus-visible,
.recit-layout .c3a-search:focus-visible,
.recit-layout .c3a-reset:focus-visible{
  outline:2px solid var(--gold-bright);
  outline-offset:2px;
  box-shadow:0 0 0 4px rgba(230,185,111,.28);
}

/* E017-07 — Préférence système « contraste renforcé » : on durcit textes,
   bordures, piste de progression et contrôles désactivés. */
@media (prefers-contrast: more){
  .recit-layout .recit-thread-item{border-color:var(--muted);color:var(--ink)}
  .recit-layout .recit-timing,
  .recit-layout .recit-legend,
  .recit-layout .c3a-status{color:var(--ink-soft)}
  .recit-layout .recit-progress{background:rgba(255,255,255,.28)}
  .recit-layout .recit-actions button[disabled],
  .recit-layout .recit-thread-item[disabled]{opacity:.8}
}

/* E017-08 — Kicker d'étape : contraste relevé et accent de type (bordure gauche). */
.recit-layout .view-kicker.recit-e017-kicker{color:var(--ink-soft);font-size:10px;letter-spacing:.08em;border-left:2px solid var(--gold);padding-left:8px}
.recit-layout .view-kicker[data-e017-kind="figure"]{border-left-color:#8fd0c9}
.recit-layout .view-kicker[data-e017-kind="lieu"]{border-left-color:#9db8e6}
.recit-layout .view-kicker[data-e017-kind="audit"]{border-left-color:#d2a8e6}

/* E017-09 — Absence de source : signalétique contrastée, pas seulement grise. */
.recit-layout .recit-sources{padding:7px 10px;border:1px solid rgba(217,139,122,.32);border-radius:7px;color:var(--ink-soft)}
.recit-layout .recit-e017-signal{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-right:6px;border:1px solid var(--red,#d98b7a);border-radius:50%;background:rgba(217,139,122,.14);color:var(--ink);font-size:9px;font-weight:700;vertical-align:middle}

/* E017-10 — Titre du point : contraste maximal et mesure de lecture confortable. */
.recit-body .recit-title{color:var(--ink);font-weight:700;line-height:1.26;letter-spacing:-.01em;max-width:38ch;text-wrap:balance}
  `);

  /* Racine de recherche : la vue reconstruite à chaque rendu. Le registre
     réapplique la lentille après chaque reconstruction du stage. */
  const root = layout || stage || (typeof document !== 'undefined' ? document : null);
  if (!root || typeof root.querySelector !== 'function') return;

  /* E017-02 : annoter le chip de confiance d'une clé stable issue de son texte.
     Les libellés proviennent de la vue (Vérifié / Certain / Probable / Contesté,
     « disputed » en source) : aucune valeur n'est inventée. */
  try {
    const chip = root.querySelector('.recit-conf');
    if (chip) {
      const texte = String(chip.textContent || '').toLowerCase();
      let cle = '';
      if (texte.indexOf('vérifi') >= 0) cle = 'verifie';
      else if (texte.indexOf('certain') >= 0) cle = 'certain';
      else if (texte.indexOf('probable') >= 0) cle = 'probable';
      else if (texte.indexOf('contest') >= 0 || texte.indexOf('disputed') >= 0) cle = 'conteste';
      if (cle) {
        chip.classList.add('recit-e017-conf');
        chip.setAttribute('data-e017-conf', cle);
      }
    }
  } catch (_) { /* garde : jamais de throw */ }

  /* E017-03 : sémantique progressbar et repère numérique lisible. L'étape et le
     total sont lus dans le kicker réel (« Étape X / Y · … »), jamais devinés. */
  try {
    const progression = root.querySelector('.recit-progress');
    const kicker = root.querySelector('.view-kicker');
    if (progression && kicker && typeof document !== 'undefined') {
      const trouve = /(?:Étape|etape)\s+(\d+)\s*\/\s*(\d+)/i.exec(String(kicker.textContent || ''));
      if (trouve) {
        const courant = Number(trouve[1]);
        const total = Number(trouve[2]);
        progression.setAttribute('role', 'progressbar');
        progression.setAttribute('aria-valuemin', '0');
        progression.setAttribute('aria-valuemax', String(total));
        progression.setAttribute('aria-valuenow', String(courant));
        progression.setAttribute('aria-label', 'Progression du récit');
        const pourcent = total > 0 ? Math.round((courant / total) * 100) : 0;
        let note = root.querySelector('#e017-progress-label');
        if (!note) {
          note = el('p', 'recit-e017-progress-note');
          note.id = 'e017-progress-label';
          if (progression.parentNode) {
            progression.parentNode.insertBefore(note, progression.nextSibling);
          }
        }
        if (note) note.textContent = `Étape ${courant} sur ${total} · ${pourcent} % du repère`;
      }
    }
  } catch (_) { /* garde : jamais de throw */ }

  /* E017-08 : annoter le kicker du type de point (récit / figure / lieu / audit)
     tel qu'il apparaît déjà dans son texte, pour l'accent visuel de la règle CSS. */
  try {
    const kicker = root.querySelector('.view-kicker');
    if (kicker) {
      const morceaux = String(kicker.textContent || '').split('·');
      const brut = morceaux.length > 1 ? morceaux[morceaux.length - 1].trim().toLowerCase() : '';
      const types = { 'récit': 'recit', 'recit': 'recit', 'figure': 'figure', 'lieu': 'lieu', 'audit': 'audit' };
      const cle = types[brut];
      if (cle) {
        kicker.classList.add('recit-e017-kicker');
        kicker.setAttribute('data-e017-kind', cle);
      }
    }
  } catch (_) { /* garde : jamais de throw */ }

  /* E017-09 : signaler l'absence d'identifiant de source par un pastille contrastée,
     ajoutée en tête du paragraphe existant, sans en effacer le texte. */
  try {
    const sources = root.querySelector('.recit-sources');
    if (sources && !sources.querySelector('.recit-e017-signal')) {
      const pastille = el('span', 'recit-e017-signal', '!');
      pastille.setAttribute('aria-hidden', 'true');
      if (typeof sources.prepend === 'function') sources.prepend(pastille);
      else sources.insertBefore(pastille, sources.firstChild);
    }
  } catch (_) { /* garde : jamais de throw */ }
});
