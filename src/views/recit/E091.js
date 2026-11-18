import { register } from './registry.js';

/* Lentille E091 — Lisibilité et mesure de lecture (vue Récit).
   Dix chantiers indépendants, tous non destructifs : sans ce module la vue
   reste intégralement lisible. Les règles sont regroupées dans un unique
   appel à la fonction css dédiée à cette lentille, les sélecteurs sont
   préfixés recit-e091-, les ancres DOM e091- sont uniques. Zéro réseau,
   zéro aléa, zéro sortie de débogage. */

const CSS = `
/* E091-01 — orphelins, veuves et retours à la ligne soignés. */
.recit-e091-paragraphs{orphans:3;widows:3;text-wrap:pretty}

/* E091-02 — marge de lecture latérale généreuse, repliée sur mobile. */
.recit-e091-marge{padding-inline:clamp(28px,5vw,64px)}
@media (max-width:620px){.recit-e091-marge{padding-inline:16px}}

/* E091-03 — sélection de texte contrastée. */
.recit-e091-selection::selection,
.recit-e091-selection ::selection{background:rgba(230,185,111,.36);color:var(--ink)}

/* E091-04 — légendes et crédits lisibles sur fond d'image. */
.recit-e091-legende::after{content:"";position:absolute;left:0;right:0;bottom:0;height:76px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.62));pointer-events:none}
.recit-e091-legende .media-caption,
.recit-e091-legende .recit-media-credit{z-index:1;color:#fff;text-shadow:0 1px 3px #000,0 0 7px #000}

/* E091-05 à E091-07 — panneau de mesures de lecture. */
.recit-e091-metrics{margin:6px 0 0;padding:8px 11px;list-style:none;border-left:2px solid var(--gold);border-radius:0 8px 8px 0;background:rgba(230,185,111,.05)}
.recit-e091-metric{margin:2px 0;color:var(--ink-soft);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}

/* E091-08 — repère textuel de progression. */
.recit-e091-progress-note{margin:4px 0 8px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E091-09 — charge de lecture du fil. */
.recit-e091-load{margin:4px 0 8px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E091-10 — bascule « caractères agrandis ». */
.recit-layout.recit-e091-large .recit-title{font-size:clamp(32px,4.4vw,58px)}
.recit-layout.recit-e091-large .recit-context{font-size:15px;line-height:1.75}
.recit-layout.recit-e091-large .recit-timing,
.recit-layout.recit-e091-large .c3a-status,
.recit-layout.recit-e091-large .recit-legend{font-size:11px}
.recit-e091-btn{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.recit-e091-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-e091-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E091-10 (compagnon) — mouvement réduit de la bascule. */
.recit-layout[data-e091-motion="reduce"] .recit-e091-btn{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e091-btn{transition:none}}
`;

/* Le réglage survit aux reconstructions du DOM opérées par la coque. */
let agrandi = false;
const RYTHME = 200; /* mots par minute, référence affichée au lecteur */
const MESURE = 70;  /* caractères par ligne, référence affichée au lecteur */

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function compteMots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

function compteLettres(texte) {
  return String(texte || '').replace(/\s+/g, '').length;
}

function virgule(value) {
  return String(value).replace('.', ',');
}

function assure(parent, id, tag, classe, apres) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (noeud && noeud.parentElement !== parent && noeud.parentNode) {
    noeud.parentNode.removeChild(noeud); /* évite tout id en double. */
    noeud = null;
  }
  if (!noeud) {
    noeud = el(tag, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) {
    const suivant = apres && apres.parentElement === parent ? apres.nextSibling : null;
    parent.insertBefore(noeud, suivant);
  }
  return noeud;
}

function libelleBouton() {
  return agrandi ? 'Caractères agrandis : désactiver' : 'Caractères agrandis : activer';
}

function synchroniseBouton(bouton) {
  if (!bouton) return;
  const libelle = libelleBouton();
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', agrandi ? 'true' : 'false');
}

register('E091', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e091', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    const titre = document.getElementById('recit-point-title')
      || layout.querySelector('.recit-title')
      || (stage && stage.querySelector ? stage.querySelector('.recit-title') : null);
    const contexte = document.getElementById('recit-context')
      || layout.querySelector('.recit-context')
      || (stage && stage.querySelector ? stage.querySelector('.recit-context') : null);
    const timing = layout.querySelector('.recit-timing');
    const media = layout.querySelector('.recit-media');
    const actions = layout.querySelector('.recit-actions');
    const fil = layout.querySelector('.recit-thread');

    /* E091-01 — orphelins, veuves et retour à la ligne soignés. */
    ajouteClasse(contexte, 'recit-e091-paragraphs');

    /* E091-02 — marge de lecture latérale fluide. */
    ajouteClasse(corps, 'recit-e091-marge');

    /* E091-03 — sélection de texte contrastée, sans toucher au contenu. */
    ajouteClasse(corps, 'recit-e091-selection');

    /* E091-04 — voile discret sous les légendes posées sur l'image. */
    ajouteClasse(media, 'recit-e091-legende');

    /* E091-05, E091-06, E091-07 — mesures dérivées du texte réel affiché. */
    const texte = [titre && titre.textContent, contexte && contexte.textContent]
      .filter(Boolean).join(' ');
    const mots = compteMots(texte);
    const lettres = compteLettres(texte);
    if (mots > 0) {
      const mesures = assure(corps, 'e091-mesures', 'ul', 'recit-e091-metrics', timing);
      if (mesures) {
        mesures.setAttribute('aria-label', 'Mesures de lecture du point courant');
        const duree = assure(mesures, 'e091-duree', 'li', 'recit-e091-metric', null);
        const densite = assure(mesures, 'e091-densite', 'li', 'recit-e091-metric', duree);
        const lignes = assure(mesures, 'e091-lignes', 'li', 'recit-e091-metric', densite);
        const secondes = Math.max(1, Math.round((mots / RYTHME) * 60));
        if (duree) duree.textContent = `Durée au rythme de référence (${RYTHME} mots/min) : ≈ ${secondes} s pour ${mots} mots.`;
        if (densite) densite.textContent = `Densité lexicale : ${virgule((lettres / mots).toFixed(1))} caractère(s) par mot en moyenne.`;
        if (lignes) lignes.textContent = `Volume : ≈ ${Math.max(1, Math.ceil(lettres / MESURE))} ligne(s) à ${MESURE} caractères par ligne.`;
      }
    }

    /* E091-08 — repère textuel de progression, déduit de l'étape affichée. */
    const kicker = layout.querySelector('.view-kicker');
    const repere = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker ? kicker.textContent || '' : '');
    let progression = '';
    if (repere) {
      const etape = Number(repere[1]);
      const total = Number(repere[2]);
      const part = total > 0 ? etape / total : 0;
      const phase = part <= 1 / 3 ? 'début' : (part <= 2 / 3 ? 'milieu' : 'fin');
      progression = `Lecture · ${phase} du parcours (étape ${etape} sur ${total}).`;
    } else {
      const barre = layout.querySelector('.recit-progress > span');
      const pourcent = barre ? parseInt(barre.style.width || '', 10) : NaN;
      if (Number.isFinite(pourcent)) progression = `Lecture · ${pourcent} % du parcours parcouru.`;
    }
    if (progression) {
      const note = assure(corps, 'e091-progression', 'p', 'recit-e091-progress-note', kicker);
      if (note) note.textContent = progression;
    }

    /* E091-09 — charge de lecture cumulée du fil, depuis ses libellés complets. */
    const items = fil && fil.querySelectorAll ? Array.from(fil.querySelectorAll('.recit-thread-item')) : [];
    if (items.length) {
      const totalMots = items.reduce((somme, item) => somme + compteMots(
        item.getAttribute('aria-label') || item.textContent || ''
      ), 0);
      const minutes = Math.max(1, Math.ceil(totalMots / RYTHME));
      const charge = assure(fil, 'e091-charge', 'p', 'recit-e091-load', fil.querySelector('.recit-thread-title'));
      if (charge) charge.textContent = `Fil du repère : ${items.length} point(s), ${totalMots} mots, ≈ ${minutes} min de lecture cumulée à ${RYTHME} mots/min.`;
    }

    /* E091-10 — bascule « caractères agrandis », état conservé entre rendus. */
    if (actions) {
      let bouton = document.getElementById('e091-size-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e091-btn');
        bouton.id = 'e091-size-btn';
        bouton.type = 'button';
        actions.appendChild(bouton);
      }
      synchroniseBouton(bouton);
      if (bouton.getAttribute('data-e091-bound') !== '1') {
        bouton.setAttribute('data-e091-bound', '1');
        bouton.addEventListener('click', () => {
          agrandi = !agrandi;
          const cadre = document.querySelector('.recit-layout') || layout;
          if (cadre && cadre.classList) {
            if (agrandi) cadre.classList.add('recit-e091-large');
            else cadre.classList.remove('recit-e091-large');
          }
          synchroniseBouton(document.getElementById('e091-size-btn'));
        });
      }
      if (agrandi) ajouteClasse(layout, 'recit-e091-large');
      else if (layout.classList) layout.classList.remove('recit-e091-large');
    }

    /* E091-10 (compagnon) — préférence de mouvement lue une fois par rendu. */
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      if (!layout.hasAttribute('data-e091-motion')) layout.setAttribute('data-e091-motion', 'reduce');
    } else if (layout.setAttribute) {
      layout.setAttribute('data-e091-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
