import { register } from './registry.js';

/* V2 lentille E060 — Tableau de bord de traçabilité du repère (complément de la
   passe 1). La passe 1 dressait la fiche de provenance du POINT courant ; la V2
   propose dix chantiers neufs, distincts, centrés sur la COMPOSITION du REPÈRE :
   décomptes des types et des certitudes lus dans les attributs réels du fil,
   part affichée, datation, attributs machine, contrôle de cohérence, légende,
   profil des items, signature déterministe et rapport repliable.
   Tous les chiffres sont dérivés du DOM réellement rendu, jamais inventés.
   Préfixes : classes recit-v2-e060-, ids DOM v2-e060- (jamais e060- de la passe 1,
   qui tourne sur le même DOM). Non destructif : sans ce module la vue reste
   intégralement lisible. Zéro réseau, zéro console, zéro aléa. */

const CSS = `
/* E060-01 — Tableau de bord de traçabilité du repère. */
.recit-v2-e060-racine .recit-v2-e060-tableau{margin:10px 0 6px;padding:9px 11px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025)}
.recit-v2-e060-racine .recit-v2-e060-tableau-titre{margin:0 0 6px;color:var(--gold-bright,#f5e9d0);font-size:10px;letter-spacing:.06em;text-transform:uppercase}
.recit-v2-e060-racine .recit-v2-e060-ligne{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.recit-v2-e060-racine .recit-v2-e060-label{color:var(--gold-bright,#f5e9d0);font-weight:600}

/* E060-02 — Répartition des types du repère. */
.recit-v2-e060-racine .recit-v2-e060-types{font-variant-numeric:tabular-nums}

/* E060-03 — Répartition des certitudes du repère. */
.recit-v2-e060-racine .recit-v2-e060-cert{font-variant-numeric:tabular-nums}

/* E060-04 — Part du repère affichée. */
.recit-v2-e060-racine .recit-v2-e060-part{font-variant-numeric:tabular-nums}

/* E060-05 — Datation du repère (siècle). */
.recit-v2-e060-racine .recit-v2-e060-siecle{font-variant-numeric:tabular-nums}

/* E060-06 — Attributs machine de composition posés sur le fil. */
.recit-v2-e060-racine .recit-thread[data-v2-e060-signature]{border-top:1px dashed var(--line,#35405a)}

/* E060-07 — Contrôle de cohérence certitude point / fil. */
.recit-v2-e060-racine .recit-v2-e060-coherence--ok{padding-left:8px;border-left:3px solid var(--gold,#e6b96f)}
.recit-v2-e060-racine .recit-v2-e060-coherence--divergence{padding-left:8px;border-left:3px solid #d98a6a}

/* E060-08 — Légende des conventions de composition. */
.recit-v2-e060-racine .recit-v2-e060-legende{margin-top:6px;color:var(--muted-2,#7c8699);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E060-09 — Profil de certitude des items du fil. */
.recit-v2-e060-racine .recit-thread-item[class*="recit-v2-e060-conf--"]{box-shadow:inset 3px 0 0 var(--line-strong,#46506a)}

/* E060-10 — Rapport de traçabilité repliable et mouvement réduit. */
.recit-v2-e060-racine .recit-v2-e060-rapport{margin:8px 0 0;padding:8px 10px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);transition:opacity .18s linear}
.recit-v2-e060-racine .recit-v2-e060-rapport--masquee{display:none}
.recit-v2-e060-racine .recit-v2-e060-rapport p{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.recit-v2-e060-racine .recit-v2-e060-rapport-btn{min-height:36px;padding:4px 10px;border:1px solid var(--line,#35405a);border-radius:8px;background:transparent;color:var(--gold-bright,#f5e9d0);font-size:9px;cursor:pointer}
.recit-v2-e060-racine .recit-v2-e060-rapport-btn[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.recit-v2-e060-racine .recit-v2-e060-rapport-btn:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.recit-v2-e060-racine[data-v2-e060-motion="reduce"] .recit-v2-e060-rapport{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e060-racine .recit-v2-e060-rapport{transition:none}}
@media (max-width:620px){.recit-v2-e060-racine .recit-v2-e060-ligne,.recit-v2-e060-racine .recit-v2-e060-rapport p{font-size:10px}}
`;

/* --- Utilitaires non destructifs et sans exception. --- */

function setOnce(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function texte(noeud) {
  if (!noeud || noeud.nodeType !== 1) return '';
  return String(noeud.textContent || '').replace(/\s+/g, ' ').trim();
}

/* Empreinte FNV-1a déterministe (Math.imul = arithmétique, aucun aléa). */
function empreinte(valeur) {
  let h = 2166136261;
  const chaine = String(valeur || '');
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

const LIBELLES_CONF = {
  'vérifié': 'Vérifié',
  'certain': 'Certain',
  'probable': 'Probable',
  'disputed': 'Contesté',
};

const SLUGS_CONF = {
  'vérifié': 'verifie',
  'certain': 'certain',
  'probable': 'probable',
  'disputed': 'disputed',
};

function libelleConf(valeur) {
  const cle = String(valeur || '').trim();
  return LIBELLES_CONF[cle] || cle || 'non précisée';
}

function slugConf(valeur) {
  const cle = String(valeur || '').trim();
  if (SLUGS_CONF[cle]) return SLUGS_CONF[cle];
  return cle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'inconnu';
}

function parserAnnee(brute) {
  const chaine = String(brute || '').trim();
  const av = chaine.match(/(\d+)\s*av\.\s*J\.-C\./i);
  if (av) return { brute: chaine, valeur: -Number(av[1]) };
  const ap = chaine.match(/(\d{1,4})/);
  return { brute: chaine, valeur: ap ? Number(ap[1]) : null };
}

function siecleDe(valeur) {
  if (valeur === null || !Number.isFinite(valeur)) return '';
  const avant = valeur < 0;
  const rang = Math.max(1, Math.ceil(Math.abs(valeur) / 100));
  const suffixe = rang === 1 ? 'er' : 'e';
  return avant ? `${rang}${suffixe} siècle av. J.-C.` : `${rang}${suffixe} siècle`;
}

function compter(items, attribut) {
  const resultat = new Map();
  items.forEach((item) => {
    const cle = (item.getAttribute(attribut) || 'point').trim();
    resultat.set(cle, (resultat.get(cle) || 0) + 1);
  });
  return resultat;
}

function formatCompte(compte, formater) {
  return Array.from(compte).map(([valeur, nombre]) => `${formater(valeur)} ×${nombre}`).join(' · ');
}

/* Lecture unique de toutes les grandeurs affichées par la vue. */
function collecter(corps) {
  const kicker = texte(corps.querySelector('.view-kicker'));
  const found = kicker.match(/Étape\s+(\d+)\s*\/\s*(\d+)(?:\s*·\s*(.+))?/i);
  const index = found ? Number(found[1]) : 0;
  const total = found ? Number(found[2]) : 0;
  const kind = found && found[3] ? found[3].trim() : '';

  const parties = texte(corps.querySelector('.recit-meta')).split('·').map((s) => s.trim()).filter(Boolean);
  const repere = parties[0] || '';
  const annee = parserAnnee(parties[1] || '');
  annee.siecle = siecleDe(annee.valeur);

  const conf = texte(corps.querySelector('.recit-conf'));
  const items = Array.from(corps.querySelectorAll('.recit-thread-item'));
  const types = compter(items, 'data-kind');
  const certitudes = compter(items, 'data-confidence');
  const courant = corps.querySelector('.recit-thread-item.is-current')
    || corps.querySelector('.recit-thread-item[aria-current="step"]');
  const confCourante = courant ? (courant.getAttribute('data-confidence') || '').trim() : '';

  const trace = corps.querySelector('.recit-trace');
  const refsFound = texte(trace && trace.querySelector('summary')).match(/(\d+)\s*référence/i);
  const refs = refsFound ? Number(refsFound[1]) : 0;

  const cleSignature = [formatCompte(types, (v) => v), formatCompte(certitudes, (v) => v),
    annee.brute, String(total), String(index)].join('|');

  return {
    index, total, kind, repere, annee, conf, items, types, certitudes,
    confCourante, refs, courant, signature: empreinte(cleSignature),
  };
}

/* Dépose une ligne de synthèse visible dans le tableau, réutilisée par id. */
function ligneTableau(tableau, el, id, classe, libelle, valeur) {
  if (!tableau) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e060-ligne ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = '';
  noeud.appendChild(el('strong', 'recit-v2-e060-label', `${libelle} : `));
  noeud.appendChild(document.createTextNode(valeur));
  tableau.appendChild(noeud);
  return noeud;
}

/* E060-01 — Tableau de bord de traçabilité du repère, inséré après le statut. */
function ch01(corps, el, d) {
  let tableau = document.getElementById('v2-e060-tableau');
  if (!tableau) {
    tableau = el('aside', 'recit-v2-e060-tableau');
    tableau.id = 'v2-e060-tableau';
  }
  setOnce(tableau, 'aria-label', 'Tableau de bord de traçabilité du repère');
  tableau.textContent = '';
  tableau.appendChild(el('h2', 'recit-v2-e060-tableau-titre', 'Traçabilité du repère'));

  const ancre = corps.querySelector('.c3a-status') || corps.querySelector('.view-kicker');
  const cible = ancre && ancre.parentNode === corps ? ancre.nextSibling : null;
  if (cible) {
    if (tableau.parentNode !== corps || tableau.nextSibling !== cible) corps.insertBefore(tableau, cible);
  } else if (tableau.parentNode !== corps) {
    corps.appendChild(tableau);
  }

  ligneTableau(tableau, el, 'v2-e060-entete', 'recit-v2-e060-entete', 'Repère',
    `« ${d.repere || 'sans titre'} » · ${d.annee.brute || 'année non précisée'} · ${d.total} point(s) · références locales sur ce point : ${d.refs} · signature : ${d.signature}`);
  return tableau;
}

/* E060-02 — Répartition des types, lue dans data-kind des boutons du fil. */
function ch02(tableau, el, d) {
  const valeur = d.items.length
    ? formatCompte(d.types, (v) => v)
    : 'aucun point affiché dans le fil';
  ligneTableau(tableau, el, 'v2-e060-types', 'recit-v2-e060-types', 'Types du repère', valeur);
}

/* E060-03 — Répartition des certitudes, lue dans data-confidence du fil. */
function ch03(tableau, el, d) {
  const valeur = d.items.length
    ? formatCompte(d.certitudes, libelleConf)
    : 'aucun point affiché dans le fil';
  ligneTableau(tableau, el, 'v2-e060-cert', 'recit-v2-e060-cert', 'Certitudes du repère', valeur);
}

/* E060-04 — Part du repère affichée, recomposée depuis le fil et le kicker. */
function ch04(tableau, el, d) {
  if (!d.total) return;
  const pourcentage = Math.round((d.items.length / d.total) * 100);
  const etat = d.items.length < d.total ? ' (vue filtrée)' : '';
  ligneTableau(tableau, el, 'v2-e060-part', 'recit-v2-e060-part', 'Part affichée',
    `${pourcentage} % · ${d.items.length} point(s) sur ${d.total}${etat}`);
}

/* E060-05 — Datation du repère : siècle déduit de l'année réellement affichée. */
function ch05(tableau, el, d) {
  const valeur = d.annee.siecle
    ? `${d.annee.brute} · ${d.annee.siecle}`
    : 'année non précisée dans la vue';
  ligneTableau(tableau, el, 'v2-e060-siecle', 'recit-v2-e060-siecle', 'Datation', valeur);
}

/* E060-06 — Attributs machine de composition posés sur la nav du fil. */
function ch06(corps, d) {
  const fil = document.getElementById('c3a-thread');
  const nav = (fil && typeof fil.closest === 'function' && fil.closest('nav.recit-thread'))
    || corps.querySelector('.recit-thread');
  if (!nav) return;
  setOnce(nav, 'data-v2-e060-points', String(d.items.length));
  setOnce(nav, 'data-v2-e060-types', String(d.types.size));
  setOnce(nav, 'data-v2-e060-certitudes', String(d.certitudes.size));
  setOnce(nav, 'data-v2-e060-siecle', d.annee.siecle || 'inconnu');
  setOnce(nav, 'data-v2-e060-signature', d.signature);
}

/* E060-07 — Contrôle de cohérence entre la certitude du point et celle du fil. */
function ch07(tableau, el, d) {
  let valeur;
  let etat;
  if (!d.confCourante) {
    valeur = 'certitude du fil non renseignée sur l’item courant : contrôle non effectué';
    etat = 'divergence';
  } else {
    const attendu = libelleConf(d.confCourante);
    const concordant = d.conf.toLowerCase().indexOf(attendu.toLowerCase()) !== -1;
    valeur = concordant
      ? `point « ${d.conf} » cohérent avec la certitude déclarée dans le fil (${attendu})`
      : `divergence : point « ${d.conf} » versus certitude déclarée dans le fil (${attendu})`;
    etat = concordant ? 'ok' : 'divergence';
  }
  const noeud = ligneTableau(tableau, el, 'v2-e060-coherence', 'recit-v2-e060-coherence', 'Cohérence', valeur);
  if (!noeud) return;
  noeud.classList.remove('recit-v2-e060-coherence--ok', 'recit-v2-e060-coherence--divergence');
  noeud.classList.add(etat === 'ok' ? 'recit-v2-e060-coherence--ok' : 'recit-v2-e060-coherence--divergence');
}

/* E060-08 — Légende des conventions de composition, ajoutée sans toucher aux
   paragraphes de légende existants. */
function ch08(corps, el) {
  const legende = corps.querySelector('.recit-legend');
  if (!legende) return;
  let paragraphe = document.getElementById('v2-e060-legende');
  if (!paragraphe) {
    paragraphe = el('p', 'recit-v2-e060-legende');
    paragraphe.id = 'v2-e060-legende';
  }
  paragraphe.textContent = 'Composition du repère : les décomptes proviennent des attributs data-kind et data-confidence des boutons du fil ; le siècle est déduit de l’année affichée ; le contrôle de cohérence compare la certitude du point à celle déclarée dans le fil ; la signature identifie cette composition, sans lien externe.';
  legende.appendChild(paragraphe);
}

/* E060-09 — Profil de certitude de chaque item du fil : classe dédiée et
   titre informatif, sans changer le libellé ni l'aria-label du bouton. */
function ch09(d) {
  d.items.forEach((item) => {
    const brut = (item.getAttribute('data-confidence') || '').trim();
    if (!brut) return;
    ajouteClasse(item, `recit-v2-e060-conf--${slugConf(brut)}`);
    setOnce(item, 'title', `Certitude : ${libelleConf(brut)} — donnée déclarée dans le registre local, sans lien externe.`);
  });
}

/* E060-10 — Rapport de traçabilité repliable, bascule aria-pressed et
   mouvement réduit lu une seule fois par rendu. */
function ch10(corps, el, d, reducedMotion, layout) {
  const actions = corps.querySelector('.recit-actions');
  if (!actions) return;

  let rapport = document.getElementById('v2-e060-rapport');
  if (!rapport) {
    rapport = el('div', 'recit-v2-e060-rapport recit-v2-e060-rapport--masquee');
    rapport.id = 'v2-e060-rapport';
  }
  setOnce(rapport, 'aria-label', 'Rapport de traçabilité détaillé du repère');
  rapport.textContent = '';
  const lignes = [
    ['Repère', `« ${d.repere || 'sans titre'} » · ${d.annee.brute || 'année non précisée'} · ${d.total} point(s)`],
    ['Types', d.items.length ? formatCompte(d.types, (v) => v) : 'aucun point affiché'],
    ['Certitudes', d.items.length ? formatCompte(d.certitudes, libelleConf) : 'aucun point affiché'],
    ['Signature', d.signature],
  ];
  lignes.forEach(([libelle, valeur]) => {
    rapport.appendChild(el('p', '', `${libelle} : ${valeur}`));
  });
  if (actions.parentNode === corps && (rapport.parentNode !== corps || rapport.nextSibling !== actions)) {
    corps.insertBefore(rapport, actions);
  } else if (!rapport.parentNode) {
    corps.appendChild(rapport);
  }

  let bouton = document.getElementById('v2-e060-rapport-btn');
  if (!bouton) {
    bouton = el('button', 'recit-v2-e060-rapport-btn', 'Afficher le rapport de traçabilité');
    bouton.id = 'v2-e060-rapport-btn';
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', 'v2-e060-rapport');
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', String(ouvert));
      bouton.textContent = ouvert
        ? 'Masquer le rapport de traçabilité'
        : 'Afficher le rapport de traçabilité';
      rapport.classList.toggle('recit-v2-e060-rapport--masquee', !ouvert);
    });
  }
  if (bouton.parentNode !== actions) actions.appendChild(bouton);

  let reduit = false;
  try { reduit = Boolean(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  layout.setAttribute('data-v2-e060-motion', reduit ? 'reduce' : 'normal');
}

register('E060', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e060', CSS); /* un seul appel, toutes les règles du module. */
    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    ajouteClasse(layout, 'recit-v2-e060-racine');
    const d = collecter(corps);
    const tableau = ch01(corps, el, d);
    ch02(tableau, el, d);
    ch03(tableau, el, d);
    ch04(tableau, el, d);
    ch05(tableau, el, d);
    ch06(corps, d);
    ch07(tableau, el, d);
    ch08(corps, el);
    ch09(d);
    ch10(corps, el, d, reducedMotion, layout);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
