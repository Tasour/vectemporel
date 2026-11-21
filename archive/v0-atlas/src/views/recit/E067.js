import { register } from './registry.js';

/* Lentille E067 — Contraste et perception (vue Récit).
   Dix chantiers indépendants, tous non destructifs : sans ce module, la vue
   reste intégralement lisible. Un seul register, un seul bloc CSS préfixé
   recit-e067-, une seule ancre DOM (e067-contrast-btn), zéro réseau, zéro
   journalisation, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E067 — socle : jetons de contraste réutilisables par tous les chantiers. */
.recit-e067-root{
  --e067-ink-lu:#e9e4da;
  --e067-ink-dim:#c9c3b7;
  --e067-gold-net:#ffdd9a;
  --e067-ligne:rgba(255,255,255,.28);
  --e067-fond:rgba(255,255,255,.07);
}

/* E067-01 — contraste du texte courant (visée AA sur fond sombre). */
.recit-e067-text .recit-context,
.recit-e067-text .recit-timing,
.recit-e067-text .recit-sources,
.recit-e067-text .recit-legend,
.recit-e067-text .recit-legend p,
.recit-e067-text .recit-trace,
.recit-e067-text .recit-trace p,
.recit-e067-text .recit-thread-item:not(.is-current){color:var(--e067-ink-lu)}
.recit-e067-text .recit-meta{color:var(--e067-gold-net)}

/* E067-02 — pastille de certitude : forme + couleur, jamais la couleur seule. */
.recit-e067-conf .recit-conf[data-e067-conf]{border-left-width:3px;border-left-style:solid;padding-left:7px}
.recit-e067-conf .recit-conf[data-e067-conf="verifie"]{border-left-color:var(--e067-gold-net);color:var(--e067-gold-net)}
.recit-e067-conf .recit-conf[data-e067-conf="certain"]{border-left-style:double;border-left-color:var(--ink)}
.recit-e067-conf .recit-conf[data-e067-conf="probable"]{border-left-style:dashed;border-left-color:var(--e067-ink-dim)}
.recit-e067-conf .recit-conf[data-e067-conf="conteste"]{border-left-style:dotted;border-left-color:var(--red);color:#ffb3ab}

/* E067-03 — fil : la certitude se lit aussi à la forme du bord gauche. */
.recit-e067-thread .recit-thread-item[data-e067-conf]{border-left-width:3px;border-left-style:solid}
.recit-e067-thread .recit-thread-item[data-e067-conf="verifie"]{border-left-color:var(--e067-gold-net)}
.recit-e067-thread .recit-thread-item[data-e067-conf="certain"]{border-left-style:double;border-left-color:var(--ink)}
.recit-e067-thread .recit-thread-item[data-e067-conf="probable"]{border-left-style:dashed;border-left-color:var(--e067-ink-dim)}
.recit-e067-thread .recit-thread-item[data-e067-conf="conteste"]{border-left-style:dotted;border-left-color:var(--red);font-weight:600}

/* E067-04 — anneau de focus à contraste maximal (clavier). */
.recit-e067-focus .recit-actions button:focus-visible,
.recit-e067-focus .recit-thread-item:focus-visible,
.recit-e067-focus .recit-trace summary:focus-visible,
.recit-e067-focus .recit-e067-btn:focus-visible{
  outline:3px solid var(--e067-gold-net);
  outline-offset:2px;
  box-shadow:0 0 0 5px rgba(255,221,154,.18)
}

/* E067-05 — barre de progression contrastée et graduée. */
.recit-e067-root .recit-e067-progress{
  background-color:var(--e067-ligne);
  background-image:repeating-linear-gradient(90deg,transparent 0,transparent calc(5% - 1px),rgba(0,0,0,.5) calc(5% - 1px),rgba(0,0,0,.5) 5%)
}
.recit-e067-root .recit-e067-progress>span{background:var(--e067-gold-net);box-shadow:0 0 8px rgba(255,221,154,.45)}

/* E067-06 — mode « contraste élevé » (bascule) et son bouton. */
.recit-e067-btn{
  min-height:36px;padding:0 12px;border:1px solid var(--e067-ligne);border-radius:8px;
  background:var(--e067-fond);color:var(--e067-ink-lu);font-size:11px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear
}
.recit-e067-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--e067-gold-net);background:rgba(230,185,111,.16)}
.recit-e067-hi .recit-body{background:#05070a}
.recit-e067-hi .recit-title{color:#ffffff}
.recit-e067-hi .recit-conf,
.recit-e067-hi .recit-timing,
.recit-e067-hi .recit-meta,
.recit-e067-hi .recit-trace summary{color:#ffffff}
.recit-e067-hi .recit-thread-item{border-color:var(--e067-ligne)}

/* E067-07 — légende : corps lisible et repères de ligne. */
.recit-e067-legend .recit-legend{font-size:11px;color:var(--e067-ink-dim);line-height:1.7}
.recit-e067-legend .recit-legend p{position:relative;padding-left:14px;margin:5px 0}
.recit-e067-legend .recit-legend p::before{content:"›";position:absolute;left:0;color:var(--gold)}

/* E067-08 — chiffres et mesures : chiffres tabulaires et pastille de lecture. */
.recit-e067-numbers .recit-timing,
.recit-e067-numbers .recit-meta,
.recit-e067-numbers .view-kicker{font-variant-numeric:tabular-nums}
.recit-e067-numbers .recit-timing{
  display:inline-block;padding:3px 9px;border:1px solid var(--line);border-radius:6px;background:var(--e067-fond)
}
.recit-e067-numbers .view-kicker{letter-spacing:.1em}

/* E067-09 — absence de source : signal par la forme, pas par la couleur. */
.recit-e067-source .recit-sources{
  padding:8px 11px;border:1px dashed var(--e067-ligne);border-left:3px solid var(--e067-gold-net);
  border-radius:6px;background:var(--e067-fond);color:var(--e067-ink-lu)
}
.recit-e067-source .recit-sources::before{content:"ⓘ";margin-right:7px;color:var(--gold)}
.recit-e067-source .recit-trace summary{color:var(--e067-ink-lu)}

/* E067-10 — préférences système : contraste renforcé, mouvement apaisé. */
.recit-e067-root[data-e067-motion="reduce"] .recit-e067-btn{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e067-btn{transition:none}}
@media (prefers-contrast:more){
  .recit-e067-root{
    --e067-ink-lu:#ffffff;
    --e067-ink-dim:#f2ede3;
    --e067-ligne:rgba(255,255,255,.7);
    --e067-fond:rgba(255,255,255,.16)
  }
}
`;

/* L'état de la bascule survit aux reconstructions du DOM de la coque. */
let contrasteEleve = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function jetonCertitude(texte) {
  const t = String(texte || '');
  if (t.includes('Vérifié')) return 'verifie';
  if (t.includes('Certain')) return 'certain';
  if (t.includes('Probable')) return 'probable';
  if (t.includes('Contesté')) return 'conteste';
  return 'autre';
}

function jetonDepuisDonnee(valeur) {
  if (valeur === 'vérifié') return 'verifie';
  if (valeur === 'certain') return 'certain';
  if (valeur === 'probable') return 'probable';
  if (valeur === 'disputed') return 'conteste';
  return 'autre';
}

function libelleBouton() {
  return contrasteEleve ? 'Contraste élevé : désactiver' : 'Contraste élevé : activer';
}

function synchroniseBouton(bouton) {
  if (!bouton) return;
  const libelle = libelleBouton();
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', contrasteEleve ? 'true' : 'false');
}

register('E067', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e067', CSS); /* un seul appel, toutes les règles du module. */

    /* Socle et jetons (communs à tous les chantiers). */
    ajouteClasse(layout, 'recit-e067-root');

    /* E067-01 — contraste du texte courant. */
    ajouteClasse(layout, 'recit-e067-text');

    /* E067-02 — pastille de certitude : double encodage forme + couleur. */
    ajouteClasse(layout, 'recit-e067-conf');
    const pastille = layout.querySelector('.recit-conf');
    if (pastille && pastille.setAttribute) {
      pastille.setAttribute('data-e067-conf', jetonCertitude(pastille.textContent));
    }

    /* E067-03 — fil : certitude lisible par la forme du bord. */
    ajouteClasse(layout, 'recit-e067-thread');
    const items = layout.querySelectorAll('.recit-thread-item');
    if (items && typeof items.forEach === 'function') {
      items.forEach((item) => {
        if (item && item.setAttribute) {
          item.setAttribute('data-e067-conf', jetonDepuisDonnee(item.getAttribute('data-confidence')));
        }
      });
    }

    /* E067-04 — focus renforcé (purement CSS, cadré par la classe). */
    ajouteClasse(layout, 'recit-e067-focus');

    /* E067-05 — progression contrastée, graduée et sémantiquement lisible. */
    const progression = layout.querySelector('.recit-progress');
    if (progression && progression.setAttribute) {
      ajouteClasse(progression, 'recit-e067-progress');
      const remplissage = progression.querySelector('span');
      const largeur = remplissage ? parseInt(String(remplissage.style && remplissage.style.width), 10) : NaN;
      const pourcent = Number.isFinite(largeur) ? Math.max(0, Math.min(100, largeur)) : null;
      progression.setAttribute('role', 'progressbar');
      progression.setAttribute('aria-valuemin', '0');
      progression.setAttribute('aria-valuemax', '100');
      progression.setAttribute('aria-label', 'Progression dans le fil du récit');
      if (pourcent !== null) {
        progression.setAttribute('data-e067-pct', String(pourcent));
        progression.setAttribute('aria-valuenow', String(pourcent));
      }
    }

    /* E067-06 — bascule « contraste élevé ». */
    const actions = layout.querySelector('.recit-actions');
    if (actions && actions.appendChild) {
      let bouton = document.getElementById('e067-contrast-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e067-btn');
        bouton.id = 'e067-contrast-btn';
        bouton.type = 'button';
        actions.appendChild(bouton);
      }
      synchroniseBouton(bouton);
      if (bouton.getAttribute && bouton.getAttribute('data-e067-bound') !== '1') {
        bouton.setAttribute('data-e067-bound', '1');
        bouton.addEventListener('click', () => {
          contrasteEleve = !contrasteEleve;
          const cadre = document.querySelector('.recit-layout');
          if (cadre && cadre.classList) {
            if (contrasteEleve) cadre.classList.add('recit-e067-hi');
            else cadre.classList.remove('recit-e067-hi');
          }
          synchroniseBouton(document.getElementById('e067-contrast-btn'));
        });
      }
    }
    if (contrasteEleve) ajouteClasse(layout, 'recit-e067-hi');

    /* E067-07 — légende lisible. */
    ajouteClasse(layout, 'recit-e067-legend');

    /* E067-08 — chiffres tabulaires et pastille de lecture. */
    ajouteClasse(layout, 'recit-e067-numbers');

    /* E067-09 — signal non coloré de l'absence de source. */
    ajouteClasse(layout, 'recit-e067-source');
    const sansSource = layout.querySelector('.recit-sources');
    if (sansSource && sansSource.setAttribute) {
      sansSource.setAttribute('aria-label', 'Aucune source locale attachée à ce point');
    }

    /* E067-10 — préférences système, lues une seule fois par rendu. */
    const reduit = typeof reducedMotion === 'function' && reducedMotion();
    if (layout.setAttribute) layout.setAttribute('data-e067-motion', reduit ? 'reduce' : 'normal');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
