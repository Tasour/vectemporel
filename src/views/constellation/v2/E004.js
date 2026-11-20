import { register } from './registry.js';

/* Lentille V2 E004 — structure sémantique des soleils (ères) de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e004 (aucune collision avec la passe 1). */
register('E004', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  const el = ctx.el;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  /* Feuille unique de la lentille : toutes les règles sont ciblées sous nos
     identifiants et classes ; aucune ne vise planètes ni lunes. */
  css('constellation-v2-e004', `
.v2e004-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
#v2e004-block{margin:10px 0 0;padding:8px 10px;border:1px solid var(--line,#444);
  border-radius:8px;background:var(--surface-2,#222)}
#v2e004-title{margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.03em;
  color:var(--gold,#e6b96f)}
#v2e004-defs{margin:0;font-size:11px;line-height:1.45}
#v2e004-defs dt{margin:6px 0 1px;font-weight:600}
#v2e004-defs dd{margin:0 0 4px;padding-left:10px;color:var(--muted,#b9b9b9)}
#v2e004-defs dd[data-v2e004-active]{border-left:2px solid var(--gold,#e6b96f);
  padding-left:8px}
#v2e004-summary{margin:6px 0 0;font-size:10px;font-style:italic}
#v2e004-summary .v2e004-alert{font-weight:600;text-decoration:underline}
@media (max-width:620px){#v2e004-block{padding:6px 8px}}
`);

  const field = layout.querySelector('.constellation-field');
  const sunLayer = field ? field.querySelector('.const-layer-suns') : null;
  const suns = sunLayer && typeof sunLayer.querySelectorAll === 'function'
    ? Array.prototype.slice.call(sunLayer.querySelectorAll('button.const-sun')) : [];
  if (!sunLayer || !suns.length) return;
  const total = suns.length;

  /* Utilitaires déterministes, partagés par les chantiers qui suivent. */
  const libelle = sun => {
    if (!sun) return '';
    if (sun.dataset && sun.dataset.label) return String(sun.dataset.label).trim();
    return sun.getAttribute ? String(sun.getAttribute('title') || '').trim() : '';
  };
  const parseBorne = text => {
    const t = String(text == null ? '' : text).trim();
    let m = t.match(/^([\d.,]+)\s*av\.?\s*j\.?-?c\.?/i);
    if (m) return -parseFloat(m[1].replace(',', '.'));
    m = t.match(/^-?\d+(?:[.,]\d+)?/);
    return m ? parseFloat(m[0].replace(',', '.')) : NaN;
  };
  const bornes = sun => {
    const label = libelle(sun);
    const parts = label.split(' · ');
    const range = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const b = String(range || '').split(/\s*[–—]\s*/);
    return {
      nom: (parts[0] || label || 'Ère').trim(),
      start: parseBorne(b[0]),
      end: parseBorne(b.length > 1 ? b[1] : b[0])
    };
  };
  const ROMAIN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  const romain = n => {
    let reste = Math.max(1, Math.floor(n));
    let out = '';
    for (let i = 0; i < ROMAIN.length; i += 1) {
      while (reste >= ROMAIN[i][0]) { out += ROMAIN[i][1]; reste -= ROMAIN[i][0]; }
    }
    return out;
  };
  const siecle = year => {
    if (!Number.isFinite(year) || year === 0) return '';
    const s = Math.floor((Math.abs(year) - 1) / 100) + 1;
    return `${romain(s)}e siècle${year < 0 ? ' av. J.-C.' : ''}`;
  };

  const infos = suns.map(bornes);

  /* E004-01 — Grille de définitions <dl> : une paire nom/dates par ère,
     structure sémantique réelle, distincte du sommaire <ol> de la passe 1. */
  let block = layout.querySelector('#v2e004-block');
  let dl;
  let title;
  let summary;
  if (!block) {
    block = el('div', 'v2e004-block');
    block.id = 'v2e004-block';
    title = el('p', 'v2e004-title', 'Définitions des ères — nom, bornes et durée');
    title.id = 'v2e004-title';
    dl = el('dl', 'v2e004-defs');
    dl.id = 'v2e004-defs';
    summary = el('p', 'v2e004-summary', '');
    summary.id = 'v2e004-summary';
    block.appendChild(title);
    block.appendChild(dl);
    block.appendChild(summary);
    const caption = layout.querySelector('.constellation-caption');
    (caption || field || sunLayer).appendChild(block);
  } else {
    dl = block.querySelector('#v2e004-defs');
    title = block.querySelector('#v2e004-title');
    summary = block.querySelector('#v2e004-summary');
  }
  if (!dl) return;
  while (dl.firstChild) dl.removeChild(dl.firstChild);

  const dds = [];
  infos.forEach((info, i) => {
    const dt = el('dt', 'v2e004-dt', `${i + 1}. ${info.nom}`);
    const dd = el('dd', 'v2e004-dd', '');
    dd.id = `v2e004-def-${i}`;
    dds.push(dd);
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  /* E004-02 — Bornes et durée extraites du libellé, exposées en data-* et
     écrites dans la définition (durée = fin − début, jamais codée en dur). */
  infos.forEach((info, i) => {
    const sun = suns[i];
    const dd = dds[i];
    sun.dataset.v2e004Start = Number.isFinite(info.start) ? String(info.start) : '';
    sun.dataset.v2e004End = Number.isFinite(info.end) ? String(info.end) : '';
    const duree = info.end - info.start;
    const dureeOk = Number.isFinite(duree) && duree >= 0;
    sun.dataset.v2e004Duration = dureeOk ? String(duree) : '';
    const bornesTexte = `${Number.isFinite(info.start) ? info.start : '?'} – ${Number.isFinite(info.end) ? info.end : '?'}`;
    dd.textContent = `Bornes : ${bornesTexte}${dureeOk ? ` · durée ${duree} an${duree > 1 ? 's' : ''}` : ''}.`;
  });

  /* E004-03 — Siècle de début en chiffres romains, calculé depuis l'année
     de début déjà extraite ; aucun tirage, aucune table externe. */
  infos.forEach((info, i) => {
    const texte = siecle(info.start);
    suns[i].dataset.v2e004Century = texte;
    if (texte) dds[i].textContent += ` Début : ${texte}.`;
  });

  /* E004-04 — Relation de continuité entre ères consécutives : succède
     directement / après un écart / chevauchement, déduite des bornes. */
  infos.forEach((info, i) => {
    if (i === 0) { suns[i].dataset.v2e004Link = 'première'; return; }
    const prev = infos[i - 1];
    let lien;
    if (!Number.isFinite(info.start) || !Number.isFinite(prev.end)) lien = 'inconnu';
    else if (info.start === prev.end) lien = 'direct';
    else if (info.start > prev.end) lien = `ecart-${info.start - prev.end}`;
    else lien = `chevauchement-${prev.end - info.start}`;
    suns[i].dataset.v2e004Link = lien;
    const mots = lien === 'direct' ? 'succède directement à l’ère précédente'
      : lien === 'inconnu' ? 'relation avec l’ère précédente inconnue'
      : lien.indexOf('ecart-') === 0 ? `commence ${info.start - prev.end} ans après l’ère précédente`
      : `chevauche l’ère précédente de ${prev.end - info.start} an${(prev.end - info.start) > 1 ? 's' : ''}`;
    dds[i].textContent += ` ${mots.charAt(0).toUpperCase()}${mots.slice(1)}.`;
  });

  /* E004-05 — Résumé d'étendue temporelle : première borne et dernière borne,
     amplitude totale écrites en texte visible dans la légende. */
  const premiers = infos.filter(x => Number.isFinite(x.start)).map(x => x.start);
  const derniers = infos.filter(x => Number.isFinite(x.end)).map(x => x.end);
  const min = premiers.length ? Math.min.apply(null, premiers) : NaN;
  const max = derniers.length ? Math.max.apply(null, derniers) : NaN;
  if (summary) {
    summary.textContent = Number.isFinite(min) && Number.isFinite(max)
      ? `${total} ères couvrent de ${min} à ${max}, soit ${max - min} années au total.`
      : `${total} ères relevées, bornes partielles.`;
  }

  /* E004-06 — Description longue : chaque soleil pointe vers son <dd> via
     aria-describedby, en fusionnant avec une valeur existante. */
  suns.forEach((sun, i) => {
    const ids = String(sun.getAttribute('aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
    const ddId = dds[i].id;
    if (ids.indexOf(ddId) === -1) ids.push(ddId);
    sun.setAttribute('aria-describedby', ids.join(' '));
  });

  /* E004-07 — Relation riche : aria-details relie chaque soleil au bloc de
     définitions, distinct de la description courte du chantier 06. */
  suns.forEach(sun => sun.setAttribute('aria-details', dl.id));

  /* E004-08 — Contrôle d'intégrité chronologique : les débuts doivent être
     croissants ; sinon un avertissement textuel est ajouté au résumé. */
  let desordre = false;
  for (let i = 1; i < infos.length; i += 1) {
    if (Number.isFinite(infos[i].start) && Number.isFinite(infos[i - 1].start)
      && infos[i].start < infos[i - 1].start) { desordre = true; break; }
  }
  dl.dataset.v2e004Chrono = desordre ? 'anomalie' : 'croissant';
  if (desordre && summary) {
    const alert = el('span', 'v2e004-alert', ' Attention : ordre chronologique irrégulier.');
    summary.appendChild(alert);
  }

  /* E004-09 — Étiquetage du bloc : le titre visible nomme la grille et le
     décompte est exposé en données, sans surcharger le rôle natif de <dl>. */
  if (title) {
    dl.setAttribute('aria-labelledby', title.id);
    dl.dataset.v2e004Count = String(total);
  }

  /* E004-10 — Marqueur d'ère courante dans la grille : le <dd> de l'ère
     active est signalé en texte et en données, sans toucher au bouton ni
     au aria-current posé par la passe 1. */
  let actif = -1;
  for (let i = 0; i < suns.length; i += 1) {
    if (suns[i].classList.contains('is-active') || suns[i].getAttribute('aria-current') === 'true') {
      actif = i;
      break;
    }
  }
  dds.forEach((dd, i) => {
    if (i === actif) {
      dd.dataset.v2e004Active = '1';
      if (dd.textContent.indexOf('ère active') === -1) dd.textContent += ' Ère active.';
    } else {
      dd.removeAttribute('data-v2e004-active');
    }
  });
  dl.dataset.v2e004Active = actif >= 0 ? String(actif) : '';
});
