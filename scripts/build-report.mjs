#!/usr/bin/env node
/* Génère le rapport Dauphiné : faits Chronas + convergence Wikipédia/Grokipedia.
 * Aucune prose copiée : les paragraphes sont composés depuis des faits sourcés. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { CHRONAS_LABELS } from '../src/data/chronas-labels.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const file = PROVINCE_CHUNKS['Dauphiné'];
const mod = await import(`../src/data/province-timelines/${file}`);
const t = mod.PROVINCE_TIMELINES['Dauphiné'];
const at = (series, year) => {
  let value = null;
  for (const [start, entry] of series || []) { if (start <= year) value = entry; else break; }
  return value;
};
const label = (field, code) => CHRONAS_LABELS.names[field]?.[code] || code || 'non renseigné';
const yearText = (y) => y < 0 ? `${-y} av. J.-C.` : y === 0 ? 'an 0' : `${y} apr. J.-C.`;

const WIKI = 'https://fr.wikipedia.org/wiki/Dauphin%C3%A9';
const GROK = 'https://grokipedia.com/page/Dauphin%C3%A9';
const CHECK = 'https://fr.wikipedia.org/wiki/Humbert_II_de_Viennois';

/* Années retenues : births, transitions majeures, repères convergents. */
const years = [
  [-2000, 'Des origines lointaines'], [-122, 'Le monde gaulois'], [0, 'L’ordre romain'],
  [100, 'Vienne, métropole romaine'], [396, 'Une province chrétienne'], [444, 'Les royaumes successeurs'],
  [535, 'L’héritage burgonde'], [700, 'Les temps carolingiens'], [900, 'La principauté en formation'],
  [934, 'Les comtes d’Albon'], [1000, 'Dauphiné de Viennois'], [1041, 'L’État delphinal'],
  [1100, 'Le titre de dauphin'], [1200, 'L’extension territoriale'], [1349, 'Le traité de Romans'],
  [1400, 'Le statut delphinal'], [1500, 'L’intégration progressive'], [1561, 'Les guerres de Religion'],
  [1600, 'Les tensions confessionnelles'], [1687, 'La révocation'], [1793, 'La fin de la province'],
  [1800, 'Le département'], [1871, 'La nation'], [1900, 'L’ère industrielle'],
  [1944, 'Le Vercors'], [1968, 'Les Jeux olympiques'], [2000, 'L’héritage vivant'],
];

const convergences = {
  '-122': ['Les Allobroges occupent le territoire avant la conquête romaine.', 'Vienne est leur capitale.', 'La région passe sous contrôle romain après 121 av. J.-C.'],
  '100': ['Vienne devient une colonie romaine.', 'C’est le principal centre urbain du Viennois.', 'Le temple d’Auguste et de Livie en témoigne.'],
  '396': ['Les premières communautés chrétiennes apparaissent au IIe siècle.', 'Elles sont d’abord concentrées à Vienne.', 'Elles s’étendent à la fin de l’Antiquité.'],
  '1000': ['Le Dauphiné de Viennois relève du Saint-Empire.', 'Les comtes d’Albon portent le titre de dauphin.', 'La région reste une principauté autonome.'],
  '1349': ['Le traité de Romans est signé le 30 mars 1349.', 'Humbert II cède la principauté au royaume de France.', 'Les sources divergent sur le montant de la vente.'],
  '1400': ['Le statut delphinal maintient des privilèges fiscaux.', 'Le Parlement du Dauphiné siège à Grenoble.', 'Les États provinciaux conservent un rôle consultatif.'],
  '1561': ['Les guerres de Religion touchent la province.', 'Protestants et catholiques s’affrontent.', 'La paix revient progressivement avec Lesdiguières.'],
  '1793': ['La province est divisée en trois départements en 1790.', 'Grenoble devient le chef-lieu de l’Isère.', 'Le statut delphinal disparaît.'],
  '1944': ['Le maquis du Vercors se développe à partir de 1942.', 'Une république est proclamée en juillet 1944.', 'La répression allemande est sévère.'],
  '2000': ['Les trois départements gardent une identité dauphinoise.', 'La langue arpitanne et la gastronomie persistent.', 'Grenoble reste le pôle universitaire et industriel.'],
};

const jalons = years.map(([year, title]) => {
  const ruler = at(t.ruler, year);
  const culture = at(t.culture, year);
  const religion = at(t.religion, year);
  const capital = at(t.capital, year);
  const population = at(t.population, year);
  const facts = convergences[String(year)] || [
    `Souverain enregistré pour cette année : ${label('ruler', ruler)}.`,
    `Culture dominante : ${label('culture', culture)}.`,
    `Population estimée par Chronas : ${population ? Number(population).toLocaleString('fr-FR') : 'non renseignée'} habitants.`,
  ];
  const narrative = `En ${yearText(year)}, le Dauphiné apparaît dans les séries Chronas sous le souverain ${label('ruler', ruler)}. ${facts[0]} La culture dominante y est ${label('culture', culture)}, la religion ${label('religion', religion)} et la capitale enregistrée ${capital || 'non renseignée'}. ${facts[1]} Ces données locales ne sont pas une validation historique indépendante : elles décrivent l'état reconstitué d'une province à une année donnée. ${facts[2]} La population estimée par Chronas s'élève à ${population ? Number(population).toLocaleString('fr-FR') : 'une valeur non renseignée'} habitants. Cette mesure permet de suivre les mutations du territoire sur la longue durée, sans prétendre restituer un recensement. ${convergences[String(year)] ? 'Les deux encyclopédies consultées convergent sur ce repère ; les divergences éventuelles sont documentées dans la fiche de convergence locale.' : 'Aucun récit encyclopédique n’a été rattaché à cette année : seul le relevé Chronas est affirmé ici.'}`;
  return {
    year,
    title,
    narrative,
    facts,
    population: population ? Number(population) : null,
    sources: convergences[String(year)] ? [WIKI, GROK] : [],
    verification: year === 1349 ? CHECK : null,
    kind: convergences[String(year)] ? ' convergent' : 'extrait Chronas',
  };
});

const payload = {
  meta: {
    item: 'Dauphiné',
    title: 'Dauphiné — lignée d’une province',
    convergence: 'docs/sources/dauphine/convergence.md',
    type: 'province',
    source: 'Chronas CC BY-SA 4.0 + Wikipédia FR + Grokipedia',
    metric: 'population',
    metricLabel: 'Population estimée',
    metricUnit: 'habitants',
    proofFigures: '<strong>27</strong> jalons · <strong>4 001 ans</strong> · <strong>900 mm</strong> de précipitations annuelles et <strong>25 %</strong> de territoire forestier (Grokipedia).',
    firstYear: years[0][0],
    lastYear: years.at(-1)[0],
    count: jalons.length,
    generatedAt: '2026-11-23',
  },
  jalons,
};
const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
payload.meta.sha256 = hash;
fs.writeFileSync(path.join(ROOT, 'src/data/reports/dauphine.json'), JSON.stringify(payload));
console.log(`dauphine.json : ${jalons.length} jalons, ${hash.slice(0, 12)}`);
