import { register } from './registry.js';

/* V2 lentille E030 — Données, traçabilité et provenance (complément de la passe 1).
   La passe 1 traite déjà : couverture globale du jeu, distribution des certitudes,
   distribution des types, badge de traçabilité, puces d'identifiants, complétude
   de la fiche, empreinte du point, saut clavier vers la trace, fiabilité déclarée
   et note méthodologique. La V2 propose donc DIX chantiers neufs et distincts,
   tous centrés sur la provenance des données affichées et tous dérivés du DOM
   réellement rendu (textContent, attributs aria-* et data-*, style.width) — aucun
   chiffre inventé, aucune constante de domaine figée.
   Préfixes : classes recit-v2-e030-, ids DOM v2-e030- (jamais les ids e030- de
   la passe 1, qui tourne sur le MÊME DOM). Un seul register, un seul css.
   Zéro réseau, zéro console, zéro aléa. Enrichissement purement additif : sans
   ce module, la vue Récit d'origine reste intégralement lisible. */

const PANEL_ID = 'v2-e030-panel';

const CSS = `
/* E030-01 — Registre des filtres actifs (provenance de la sélection). */
.recit-v2-e030-panel{margin-top:18px;padding:12px;border:1px solid var(--line-strong,#3a3f4a);border-radius:10px;background:rgba(230,185,111,.035)}
.recit-v2-e030-titre{margin:0 0 4px;color:var(--gold-bright,#e6b96f);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.recit-v2-e030-intro{margin:0 0 12px;color:var(--muted,#9aa3b2);font-size:9px;line-height:1.5}
.recit-v2-e030-list{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 0;padding:0;list-style:none}
.recit-v2-e030-chip{display:inline-block;padding:2px 7px;border:1px solid var(--line,#2b3038);border-radius:999px;color:var(--ink-soft,#c8cdd6);font-size:9px;white-space:nowrap}

/* E030-02 — Couverture du fil affiché (affichés / masqués). */
.recit-v2-e030-section{padding-top:9px;border-top:1px solid var(--line,#2b3038)}
.recit-v2-e030-h{margin:0 0 5px;color:var(--ink,#e7e9ee);font-size:10px;font-weight:600}
.recit-v2-e030-msg{margin:0;color:var(--ink-soft,#c8cdd6);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-v2-e030-bar{height:4px;margin-top:5px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.recit-v2-e030-bar>span{display:block;height:100%;background:var(--gold,#e6b96f)}
.recit-v2-e030-anime .recit-v2-e030-bar>span{transition:width 300ms ease}

/* E030-03 — Cohérence de la traçabilité (déclaré vs compté). */
.recit-v2-e030-ok{color:var(--gold-bright,#e6b96f);font-weight:600}
.recit-v2-e030-warn{color:var(--ink,#e7e9ee);font-weight:600}

/* E030-04 — Provenance de l'année du repère. */
.recit-v2-e030-annee{font-variant-numeric:tabular-nums}

/* E030-05 — Intégrité de l'étiquette accessible du point courant. */
.recit-v2-e030-code{color:var(--muted,#9aa3b2);font-style:italic;word-break:break-word}

/* E030-06 — Glossaire de la certitude affichée. */
.recit-v2-e030-glosse{color:var(--muted,#9aa3b2)}

/* E030-07 — Traçabilité des contrôles de filtrage. */
.recit-v2-e030-controls{color:var(--ink-soft,#c8cdd6)}

/* E030-08 — Signature déterministe du fil affiché. */
.recit-v2-e030-signature{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em}

/* E030-09 — Cohérence étape / progression. */
.recit-v2-e030-progress{color:var(--ink-soft,#c8cdd6)}

/* E030-10 — Complétude des attributs de données du fil. */
.recit-v2-e030-note{color:var(--muted,#9aa3b2);font-style:italic}
@media(prefers-reduced-motion:reduce){.recit-v2-e030-anime .recit-v2-e030-bar>span{transition:none}}
@media(max-width:620px){.recit-v2-e030-panel{padding:10px}}
`;

function txt(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function pct(numerateur, denominateur) {
  if (!denominateur) return 0;
  return Math.round((numerateur / denominateur) * 100);
}

/* Hachage djb2 déterministe : même fil => même signature, sans aléa. */
function empreinte(texte) {
  let h = 5381;
  for (let i = 0; i < texte.length; i += 1) {
    h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
}

function barre(el, pourcent) {
  const enveloppe = el('div', 'recit-v2-e030-bar');
  const remplissage = el('span');
  remplissage.style.width = `${Math.max(0, Math.min(100, pourcent))}%`;
  enveloppe.appendChild(remplissage);
  return enveloppe;
}

function section(el, titre, id) {
  const bloc = el('section', 'recit-v2-e030-section');
  if (id) bloc.id = id;
  bloc.appendChild(el('h2', 'recit-v2-e030-h', titre));
  return bloc;
}

function marqueur(el, conforme) {
  return el('span', conforme ? 'recit-v2-e030-ok' : 'recit-v2-e030-warn',
    conforme ? '✓ cohérent' : '⚠ écart');
}

register('E030', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined') return;
    if (!layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e030', CSS); /* un seul appel, toutes les règles du module. */
    if (document.getElementById(PANEL_ID)) return; /* idempotent. */

    const corps = document.querySelector('.recit-body') || layout.querySelector('.recit-body');
    if (!corps) return;

    /* Lectures uniques du DOM courant. */
    const items = Array.from(document.querySelectorAll('.recit-thread .recit-thread-item'));
    const statut = document.getElementById('c3a-status');
    const statutTexte = txt(statut);
    const kicker = corps.querySelector('.view-kicker');
    const remplissage = corps.querySelector('.recit-progress > span');
    const meta = corps.querySelector('.recit-meta');
    const conf = corps.querySelector('.recit-conf');
    const courant = corps.querySelector('.recit-thread-item.is-current')
      || corps.querySelector('.recit-thread-item[aria-current="step"]');
    const trace = document.querySelector('.recit-trace');
    const traceSummary = trace ? trace.querySelector('summary') : null;
    const traceP = trace ? trace.querySelector('p') : null;

    /* Compteurs issus du statut réel (X affiché(s) sur Y). */
    const comptes = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/.exec(statutTexte);
    const affiches = comptes ? parseInt(comptes[1], 10) : items.length;
    const total = comptes ? parseInt(comptes[2], 10) : affiches;
    const masques = Math.max(0, total - affiches);

    const panel = el('section', 'recit-v2-e030-panel');
    panel.id = PANEL_ID;
    if (!reducedMotion || typeof reducedMotion !== 'function' || !reducedMotion()) {
      panel.classList.add('recit-v2-e030-anime');
    }
    panel.appendChild(el('p', 'recit-v2-e030-titre', 'Données, traçabilité et provenance · V2'));
    panel.appendChild(el('p', 'recit-v2-e030-intro',
      'Contrôles de cohérence calculés localement depuis le rendu courant (statut, fil, métadonnées, attributs), sans modifier le récit.'));

    /* E030-01 — Registre des filtres actifs (provenance de la sélection). */
    const criteres = [];
    const q = /recherche\s*:\s*«\s*([^»]+?)\s*»/.exec(statutTexte);
    const ty = /type\s*:\s*([^·]+?)\s*(?:·|$)/.exec(statutTexte);
    const cf = /certitude\s*:\s*([^·]+?)\s*(?:·|$)/.exec(statutTexte);
    if (q) criteres.push(`recherche « ${q[1]} »`);
    if (ty) criteres.push(`type ${ty[1]}`);
    if (cf) criteres.push(`certitude ${cf[1]}`);
    const s01 = section(el, '01 · Registre des filtres actifs', 'v2-e030-filters');
    if (criteres.length) {
      s01.appendChild(el('p', 'recit-v2-e030-msg',
        `La sélection affichée résulte de ${criteres.length} critère(s) cumulé(s), lus dans le statut du fil :`));
      const liste = el('ul', 'recit-v2-e030-list');
      criteres.forEach((critere) => liste.appendChild(el('li', 'recit-v2-e030-chip', critere)));
      s01.appendChild(liste);
    } else {
      s01.appendChild(el('p', 'recit-v2-e030-msg',
        'Aucun filtre actif : l’intégralité du repère est affichée (statut du fil lu tel quel).'));
    }
    panel.appendChild(s01);

    /* E030-02 — Couverture du fil affiché (affichés / masqués). */
    const s02 = section(el, '02 · Couverture du fil affiché', 'v2-e030-coverage');
    s02.appendChild(el('p', 'recit-v2-e030-msg',
      `Fil : ${affiches} point(s) affiché(s) sur ${total} (${pct(affiches, total)} %) · ${masques} masqué(s) (${pct(masques, total)} %). Chiffres extraits du statut réel du fil, non d’une constante.`));
    s02.appendChild(barre(el, pct(affiches, total)));
    panel.appendChild(s02);

    /* E030-03 — Cohérence de la traçabilité (déclaré vs compté). */
    const s03 = section(el, '03 · Cohérence de la traçabilité', 'v2-e030-trace-coherence');
    if (trace && traceSummary) {
      const decl = /(\d+)\s*référence\(s\)/.exec(txt(traceSummary));
      const declarees = decl ? parseInt(decl[1], 10) : null;
      const contenu = traceP ? txt(traceP) : '';
      const seg = /Identifiants\s*:\s*([^.]+)/.exec(contenu);
      const reels = seg ? seg[1].split(',').map((p) => p.trim()).filter(Boolean).length : 0;
      const coherent = declarees !== null && declarees === reels;
      const corpus = el('p', 'recit-v2-e030-msg', '');
      corpus.appendChild(document.createTextNode(
        `Références déclarées : ${declarees === null ? 'non lues' : declarees} · identifiants effectivement listés : ${reels} · `));
      corpus.appendChild(marqueur(el, coherent));
      corpus.appendChild(document.createTextNode('.'));
      s03.appendChild(corpus);
    } else {
      s03.appendChild(el('p', 'recit-v2-e030-msg',
        'Trace détaillée absente pour ce rendu : aucun compte de références à confronter.'));
    }
    panel.appendChild(s03);

    /* E030-04 — Provenance de l'année du repère. */
    const s04 = section(el, '04 · Provenance de l’année du repère', 'v2-e030-year');
    const an = meta ? /\b(\d{4})\b/.exec(txt(meta)) : null;
    if (an) {
      s04.appendChild(el('p', 'recit-v2-e030-msg recit-v2-e030-annee',
        `Année déclarée du repère : ${an[1]} — extraite des métadonnées affichées (.recit-meta).`));
    } else {
      s04.appendChild(el('p', 'recit-v2-e030-msg',
        'Aucune année lisible dans les métadonnées affichées de ce point.'));
    }
    panel.appendChild(s04);

    /* E030-05 — Intégrité de l'étiquette accessible du point courant. */
    const s05 = section(el, '05 · Intégrité de l’étiquette accessible', 'v2-e030-aria-label');
    const etiquette = courant && typeof courant.getAttribute === 'function'
      ? courant.getAttribute('aria-label') : '';
    if (etiquette) {
      const modele = /^Point\s+(\d+)\s+sur\s+(\d+),\s*([^:]+):\s*(.+)$/.exec(etiquette);
      const corps5 = el('p', 'recit-v2-e030-msg', '');
      corps5.appendChild(document.createTextNode(
        `Étiquette accessible du point courant : ${modele ? `conforme (point ${modele[1]} sur ${modele[2]}, type « ${modele[3].trim()} »)` : 'présente mais hors modèle'}. `));
      corps5.appendChild(marqueur(el, !!modele));
      corps5.appendChild(document.createTextNode(' '));
      corps5.appendChild(el('span', 'recit-v2-e030-code', `« ${etiquette} »`));
      s05.appendChild(corps5);
    } else {
      s05.appendChild(el('p', 'recit-v2-e030-msg',
        'Aucune étiquette accessible (aria-label) sur le point courant : information non disponible.'));
    }
    panel.appendChild(s05);

    /* E030-06 — Glossaire de la certitude affichée. */
    const s06 = section(el, '06 · Glossaire de la certitude affichée', 'v2-e030-conf-gloss');
    const libelleConf = txt(conf);
    const glossConf = conf && typeof conf.getAttribute === 'function'
      ? (conf.getAttribute('title') || '') : '';
    if (libelleConf) {
      s06.appendChild(el('p', 'recit-v2-e030-msg',
        `Certitude affichée : ${libelleConf}.`));
      s06.appendChild(el('p', 'recit-v2-e030-msg recit-v2-e030-glosse',
        glossConf ? `Définition associée (attribut title de la pastille) : « ${glossConf} ».`
                  : 'Aucune définition associée à la pastille de certitude dans ce rendu.'));
    } else {
      s06.appendChild(el('p', 'recit-v2-e030-msg',
        'Aucune pastille de certitude exploitable dans les métadonnées affichées.'));
    }
    panel.appendChild(s06);

    /* E030-07 — Traçabilité des contrôles de filtrage. */
    const s07 = section(el, '07 · Traçabilité des contrôles de filtrage', 'v2-e030-controls');
    const boutonsFiltre = Array.from(document.querySelectorAll('.c3a-filter'));
    const pilotes = boutonsFiltre.filter((b) => b && typeof b.getAttribute === 'function'
      && b.getAttribute('aria-controls') === 'c3a-thread');
    const cible = document.getElementById('c3a-thread');
    const coherents = boutonsFiltre.length > 0 && pilotes.length === boutonsFiltre.length && !!cible;
    const corps7 = el('p', 'recit-v2-e030-msg recit-v2-e030-controls', '');
    corps7.appendChild(document.createTextNode(
      `Contrôles de filtrage : ${pilotes.length}/${boutonsFiltre.length} bouton(s) déclarent aria-controls vers « c3a-thread », cible présente : ${cible ? 'oui' : 'non'}. `));
    corps7.appendChild(marqueur(el, coherents));
    corps7.appendChild(document.createTextNode('.'));
    s07.appendChild(corps7);
    panel.appendChild(s07);

    /* E030-08 — Signature déterministe du fil affiché. */
    const s08 = section(el, '08 · Signature du fil affiché', 'v2-e030-signature');
    const noyau = items.map((it) => `${it.dataset.kind || ''}|${it.dataset.confidence || ''}`).join(';');
    const signature = empreinte(noyau);
    s08.appendChild(el('p', 'recit-v2-e030-msg',
      `Signature : `));
    const msg08 = s08.querySelector('.recit-v2-e030-msg');
    msg08.appendChild(el('span', 'recit-v2-e030-signature', signature));
    msg08.appendChild(document.createTextNode(
      ` — empreinte déterministe (djb2) des ${items.length} point(s) affiché(s), calculée depuis leurs types et certitudes : elle identifie cette sélection sans valeur aléatoire ni persistance.`));
    panel.appendChild(s08);

    /* E030-09 — Cohérence étape / progression. */
    const s09 = section(el, '09 · Cohérence étape / progression', 'v2-e030-progress');
    const etape = kicker ? /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(txt(kicker)) : null;
    if (etape) {
      const courante = parseInt(etape[1], 10);
      const nbEtapes = parseInt(etape[2], 10);
      const largeur = remplissage && remplissage.style && remplissage.style.width
        ? Math.round(parseFloat((/(\d+(?:\.\d+)?)\s*%/.exec(remplissage.style.width) || [])[1] || '0'))
        : null;
      const attendu = pct(courante, nbEtapes);
      const meme = largeur === null ? false : largeur === attendu;
      const corps9 = el('p', 'recit-v2-e030-msg recit-v2-e030-progress', '');
      corps9.appendChild(document.createTextNode(
        `Étape ${courante} / ${nbEtapes} · barre à ${largeur === null ? 'largeur non lue' : `${largeur} %`} · attendu ${attendu} % · `));
      corps9.appendChild(marqueur(el, meme));
      corps9.appendChild(document.createTextNode('.'));
      s09.appendChild(corps9);
    } else {
      s09.appendChild(el('p', 'recit-v2-e030-msg',
        'Repère d’étape absent du rendu : aucune cohérence à contrôler.'));
    }
    panel.appendChild(s09);

    /* E030-10 — Complétude des attributs de données du fil. */
    const s10 = section(el, '10 · Complétude des attributs de données du fil', 'v2-e030-attrs');
    const avecKind = items.filter((it) => it.dataset && it.dataset.kind).length;
    const avecConf = items.filter((it) => it.dataset && it.dataset.confidence).length;
    s10.appendChild(el('p', 'recit-v2-e030-msg recit-v2-e030-note',
      `Sur ${items.length} point(s) affiché(s) : ${avecKind} portent un type (data-kind), ${avecConf} une certitude renseignée (data-confidence). Mesure du renseignement des attributs de données du fil, lue sur les boutons eux-mêmes ; aucun appel réseau, aucune valeur aléatoire. Sans JavaScript, le récit et sa légende restent intégralement lisibles.`));
    panel.appendChild(s10);

    corps.appendChild(panel);
  } catch {
    /* Lentille facilitatrice : neutralisée sans jamais interrompre le rendu. */
  }
});
