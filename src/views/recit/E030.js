import { register } from './registry.js';

/*
 * E030 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers indépendants, tous dérivés du DOM réellement rendu :
 *  01 couverture des sources du jeu de données (constantes de domaine) ;
 *  02 distribution des certitudes du repère (data-confidence du fil) ;
 *  03 distribution des types de points (data-kind du fil) ;
 *  04 badge de traçabilité du point affiché (trace vs. sans-source) ;
 *  05 puces d'identifiants de source extraits de la trace locale ;
 *  06 indice de complétude de la fiche du point courant ;
 *  07 empreinte déterministe du point (hachage local, aucun aléa) ;
 *  08 accès direct clavier à la traçabilité ;
 *  09 indice de fiabilité déclarée du repère ;
 *  10 note méthodologique sur l'origine des mesures.
 *
 * Un seul register, un seul css, toutes les classes en recit-e030-,
 * tous les identifiants en e030-. Aucun appel réseau, aucune console,
 * aucune valeur aléatoire. Enrichissement purement additif : sans ce module,
 * le récit d'origine reste intégralement lisible.
 */

const STYLE_ID = 'recit-e030';
const PANEL_ID = 'e030-provenance';

/* Constantes de domaine fournies par le jeu de données (non inventées). */
const TOTAL_POINTS = 901;
const SANS_SOURCE = 587;

const CONF_ORDRE = ['vérifié', 'certain', 'probable', 'disputed'];
const CONF_LIBELLE = {
  'vérifié': 'Vérifié',
  'certain': 'Certain',
  'probable': 'Probable',
  'disputed': 'Contesté',
};
const KIND_ORDRE = ['récit', 'figure', 'lieu', 'audit'];

const CSS = `
.recit-e030-panel{margin-top:18px;padding:12px;border:1px solid var(--line-strong,#3a3f4a);border-radius:10px;background:rgba(230,185,111,.04)}
.recit-e030-titre{margin:0 0 4px;color:var(--gold-bright,#e6b96f);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.recit-e030-intro{margin:0 0 12px;color:var(--muted,#9aa3b2);font-size:9px;line-height:1.5}
.recit-e030-section{padding-top:8px;border-top:1px solid var(--line,#2b3038)}
.recit-e030-h{margin:0 0 5px;color:var(--ink,#e7e9ee);font-size:10px;font-weight:600}
.recit-e030-msg{margin:0;color:var(--ink-soft,#c8cdd6);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-e030-bar{height:4px;margin-top:5px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.recit-e030-bar>span{display:block;height:100%;background:var(--gold,#e6b96f)}
.recit-e030-anime .recit-e030-bar>span{transition:width 300ms ease}
.recit-e030-list{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 0;padding:0;list-style:none}
.recit-e030-chip{display:inline-block;padding:2px 7px;border:1px solid var(--line,#2b3038);border-radius:999px;color:var(--muted,#9aa3b2);font-size:9px;white-space:nowrap}
.recit-e030-jump{min-height:36px;margin-top:6px;padding:4px 10px;border:1px solid var(--line-strong,#3a3f4a);border-radius:8px;background:transparent;color:var(--gold-bright,#e6b96f);font:inherit;font-size:9px;cursor:pointer}
.recit-e030-jump:hover{border-color:var(--gold,#e6b96f)}
.recit-e030-jump:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
.recit-e030-note{color:var(--muted,#9aa3b2);font-style:italic}
.recit-e030-flash{animation:recit-e030-clignote 900ms ease-out 1}
@keyframes recit-e030-clignote{0%{background:rgba(230,185,111,.22)}100%{background:transparent}}
@media(prefers-reduced-motion:reduce){.recit-e030-flash{animation:none}.recit-e030-anime .recit-e030-bar>span{transition:none}}
@media(max-width:620px){.recit-e030-panel{padding:10px}}
`;

function txt(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function pct(numerateur, denominateur) {
  if (!denominateur) return 0;
  return Math.round((numerateur / denominateur) * 100);
}

/* Hachage djb2 déterministe : même point => même empreinte, sans aléa. */
function empreinte(texte) {
  let h = 5381;
  for (let i = 0; i < texte.length; i += 1) {
    h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
}

function identifiantsSource(trace) {
  const paragraphe = trace ? trace.querySelector('p') : null;
  const contenu = txt(paragraphe);
  const trouve = /Identifiants\s*:\s*([^.]+)/.exec(contenu);
  if (!trouve || !trouve[1]) return [];
  return trouve[1].split(',').map((part) => part.trim()).filter(Boolean);
}

function barre(el, pourcent) {
  const enveloppe = el('div', 'recit-e030-bar');
  const remplissage = el('span');
  remplissage.style.width = `${Math.max(0, Math.min(100, pourcent))}%`;
  enveloppe.appendChild(remplissage);
  return enveloppe;
}

function section(el, titre, id) {
  const bloc = el('section', 'recit-e030-section');
  if (id) bloc.id = id;
  bloc.appendChild(el('h2', 'recit-e030-h', titre));
  return bloc;
}

register('E030', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  void stage;
  void layout;
  try {
    css(STYLE_ID, CSS);
    if (typeof document === 'undefined') return;
    if (document.getElementById(PANEL_ID)) return;

    const body = document.querySelector('.recit-body')
      || (layout && layout.querySelector('.recit-body'));
    if (!body) return;

    /* Lectures uniques du DOM courant. */
    const items = Array.from(document.querySelectorAll('.recit-thread .recit-thread-item'));
    const trace = document.querySelector('.recit-trace');
    const sourcesP = document.querySelector('.recit-sources');
    const courant = document.querySelector('.recit-thread-item.is-current');
    const titreTexte = txt(document.querySelector('#recit-point-title'));
    const confTexte = txt(document.querySelector('.recit-conf'));
    const dureeTexte = txt(document.querySelector('.recit-timing'));
    const kindCourant = courant ? (courant.dataset.kind || '') : '';
    const aDesSources = !!trace;

    /* E030-02 / 09 : comptage des certitudes. */
    const confComptes = { 'vérifié': 0, 'certain': 0, 'probable': 0, 'disputed': 0 };
    let confTotal = 0;
    items.forEach((item) => {
      const valeur = item.dataset.confidence;
      if (valeur && Object.prototype.hasOwnProperty.call(confComptes, valeur)) {
        confComptes[valeur] += 1;
        confTotal += 1;
      }
    });

    /* E030-03 : comptage des types de points. */
    const kindComptes = { 'récit': 0, 'figure': 0, 'lieu': 0, 'audit': 0 };
    let kindTotal = 0;
    items.forEach((item) => {
      const valeur = item.dataset.kind;
      if (valeur && Object.prototype.hasOwnProperty.call(kindComptes, valeur)) {
        kindComptes[valeur] += 1;
        kindTotal += 1;
      }
    });

    const panel = el('section', 'recit-e030-panel');
    panel.id = PANEL_ID;
    if (!reducedMotion()) panel.classList.add('recit-e030-anime');
    panel.appendChild(el('p', 'recit-e030-titre', 'Données, traçabilité et provenance'));
    panel.appendChild(el('p', 'recit-e030-intro',
      'Indicateurs calculés localement depuis le rendu courant, sans modifier le contenu du récit.'));

    /* E030-01 — Couverture des sources du jeu de données. */
    const avecSource = Math.max(0, TOTAL_POINTS - SANS_SOURCE);
    const s01 = section(el, '01 · Couverture des sources du jeu de données', 'e030-coverage');
    s01.appendChild(el('p', 'recit-e030-msg',
      `Jeu de données local : ${TOTAL_POINTS} points · ${avecSource} avec identifiant de source (${pct(avecSource, TOTAL_POINTS)} %) · ${SANS_SOURCE} sans source (${pct(SANS_SOURCE, TOTAL_POINTS)} %).`));
    s01.appendChild(barre(el, pct(avecSource, TOTAL_POINTS)));
    panel.appendChild(s01);

    /* E030-02 — Distribution des certitudes du repère. */
    const s02 = section(el, '02 · Certitudes déclarées du repère', 'e030-conf-dist');
    if (confTotal) {
      s02.appendChild(el('p', 'recit-e030-msg',
        `Répartition sur ${confTotal} point(s) du fil affiché (mentions reprises des audits).`));
      const liste = el('ul', 'recit-e030-list');
      CONF_ORDRE.forEach((valeur) => {
        liste.appendChild(el('li', 'recit-e030-chip',
          `${CONF_LIBELLE[valeur]} ${confComptes[valeur]}`));
      });
      s02.appendChild(liste);
    } else {
      s02.appendChild(el('p', 'recit-e030-msg',
        'Aucune certitude exploitable sur le fil affiché.'));
    }
    panel.appendChild(s02);

    /* E030-03 — Distribution des types de points. */
    const s03 = section(el, '03 · Types de points du repère', 'e030-kind-dist');
    if (kindTotal) {
      s03.appendChild(el('p', 'recit-e030-msg',
        `Répartition sur ${kindTotal} point(s) du fil affiché.`));
      const liste = el('ul', 'recit-e030-list');
      KIND_ORDRE.forEach((valeur) => {
        liste.appendChild(el('li', 'recit-e030-chip', `${valeur} ${kindComptes[valeur]}`));
      });
      s03.appendChild(liste);
    } else {
      s03.appendChild(el('p', 'recit-e030-msg', 'Aucun type exploitable sur le fil affiché.'));
    }
    panel.appendChild(s03);

    /* E030-04 — Badge de traçabilité du point affiché. */
    const idsSource = identifiantsSource(trace);
    const s04 = section(el, '04 · Traçabilité du point affiché', 'e030-trace-badge');
    let message04;
    let symbole04;
    if (aDesSources) {
      symbole04 = '✓';
      message04 = `Source renseignée · ${idsSource.length || 'au moins une'} référence(s) locale(s)`;
    } else if (sourcesP) {
      symbole04 = '∅';
      message04 = 'Aucun identifiant de source attaché à ce point dans le jeu de données';
    } else {
      symbole04 = '?';
      message04 = 'Statut de traçabilité non déterminé pour ce rendu';
    }
    s04.appendChild(el('p', 'recit-e030-msg', `${symbole04} ${message04}.`));
    panel.appendChild(s04);

    /* E030-05 — Puces d'identifiants de source. */
    const s05 = section(el, '05 · Identifiants de source', 'e030-source-chips');
    if (idsSource.length) {
      s05.appendChild(el('p', 'recit-e030-msg',
        `Identifiants extraits de la trace locale (${idsSource.length}) :`));
      const liste = el('ul', 'recit-e030-list');
      idsSource.forEach((identifiant) => {
        liste.appendChild(el('li', 'recit-e030-chip', identifiant));
      });
      s05.appendChild(liste);
    } else {
      s05.appendChild(el('p', 'recit-e030-msg',
        'Aucun identifiant de source disponible pour ce point.'));
    }
    panel.appendChild(s05);

    /* E030-06 — Indice de complétude de la fiche. */
    const champs = [
      ['titre', !!titreTexte],
      ['certitude', !!confTexte],
      ['type', !!kindCourant],
      ['durée de lecture', !!dureeTexte],
      ['source', aDesSources],
    ];
    const remplis = champs.filter((entree) => entree[1]).length;
    const manquants = champs.filter((entree) => !entree[1]).map((entree) => entree[0]);
    const s06 = section(el, '06 · Complétude de la fiche du point', 'e030-completeness');
    s06.appendChild(el('p', 'recit-e030-msg',
      `Fiche du point : ${remplis}/5 champs renseignés (${pct(remplis, 5)} %). Champs manquants : ${manquants.length ? manquants.join(', ') : 'aucun'}.`));
    s06.appendChild(barre(el, pct(remplis, 5)));
    panel.appendChild(s06);

    /* E030-07 — Empreinte déterministe du point. */
    const empreintePoint = empreinte([titreTexte, confTexte, kindCourant].join('|'));
    const s07 = section(el, '07 · Empreinte locale du point', 'e030-fingerprint');
    s07.appendChild(el('p', 'recit-e030-msg',
      `Empreinte : ${empreintePoint}. Calculée de façon déterministe depuis le titre, la certitude et le type du point : elle identifie ce rendu sans recourir à une valeur aléatoire.`));
    panel.appendChild(s07);

    /* E030-08 — Accès direct clavier à la traçabilité. */
    const s08 = section(el, '08 · Accès direct à la traçabilité', 'e030-jump');
    const bouton = el('button', 'recit-e030-jump',
      aDesSources ? 'Ouvrir la traçabilité' : 'Voir le statut des sources');
    bouton.type = 'button';
    bouton.id = 'e030-trace-jump-btn';
    bouton.addEventListener('click', () => {
      try {
        if (trace) {
          trace.open = true;
          const resume = trace.querySelector('summary');
          if (resume && typeof resume.focus === 'function') resume.focus();
          if (typeof trace.scrollIntoView === 'function') trace.scrollIntoView({ block: 'nearest' });
          if (!reducedMotion()) trace.classList.add('recit-e030-flash');
        } else if (sourcesP) {
          if (!sourcesP.hasAttribute('tabindex')) sourcesP.setAttribute('tabindex', '-1');
          if (typeof sourcesP.focus === 'function') sourcesP.focus();
          if (typeof sourcesP.scrollIntoView === 'function') sourcesP.scrollIntoView({ block: 'nearest' });
        }
      } catch {
        /* Commande purement facilitatrice : un échec ne doit jamais casser le rendu. */
      }
    });
    s08.appendChild(bouton);
    panel.appendChild(s08);

    /* E030-09 — Indice de fiabilité déclarée du repère. */
    const fiables = confComptes['vérifié'] + confComptes['certain'];
    const fragiles = confComptes['probable'] + confComptes['disputed'];
    const s09 = section(el, '09 · Fiabilité déclarée du repère', 'e030-reliability');
    if (confTotal) {
      s09.appendChild(el('p', 'recit-e030-msg',
        `Fiabilité déclarée : ${fiables}/${confTotal} point(s) (${pct(fiables, confTotal)} %) à certitude vérifiée ou certaine · ${fragiles} à certitude probable ou contestée.`));
      s09.appendChild(barre(el, pct(fiables, confTotal)));
    } else {
      s09.appendChild(el('p', 'recit-e030-msg',
        'Fiabilité non calculable : aucune certitude renseignée sur le fil affiché.'));
    }
    panel.appendChild(s09);

    /* E030-10 — Note méthodologique de provenance. */
    const s10 = section(el, '10 · Origine des mesures', 'e030-method');
    s10.appendChild(el('p', 'recit-e030-msg recit-e030-note',
      `Tous les chiffres ci-dessus sont calculés localement depuis le fil affiché (${items.length} point(s)) et le point courant. Aucun appel réseau, aucune valeur aléatoire. Sans JavaScript, le récit et sa légende restent intégralement lisibles.`));
    panel.appendChild(s10);

    body.appendChild(panel);
  } catch {
    /* Lentille facilitatrice : neutralisée sans jamais interrompre le rendu. */
  }
});
