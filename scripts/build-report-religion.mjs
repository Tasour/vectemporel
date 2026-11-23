#!/usr/bin/env node
/* Génère le rapport « Catholicisme » : histoire de la religion sourcée
 * (Wikipédia FR + Grokipedia) relevée aux années de la fenêtre Chronas.
 * Aucune prose copiée : chaque paragraphe est composé depuis des faits sourcés. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIKI = 'https://fr.wikipedia.org/wiki/Catholicisme';
const GROK = 'https://grokipedia.com/page/Catholicism';
const yearText = (y) => y < 0 ? `${-y} av. J.-C.` : `${y} apr. J.-C.`;

/* 27 jalons : années de la donnée Chronas (868 → 2000) choisies pour porter
 * un repère historique sourcé. Les faits antérieurs à 868 sont du contexte. */
const jalonsSpec = [
  [868, 'La fenêtre des données', [
    'Le catholicisme est déjà une tradition bimillénaire quand Chronas commence à l’enregistrer.',
    'Le mot vient du grec katholikos, « universel », et désigne d’abord la communion de toutes les Églises locales.',
    'Les origines remontent au Ier siècle : ministère de Jésus, Pentecôte, prédication de Pierre et de Paul.',
  ], 'contexte'],
  [900, 'L’héritage patristique', [
    'Les Pères de l’Église ont fixé les grands cadres doctrinaux entre le IIe et le VIIIe siècle.',
    'Ignace d’Antioche (vers 107) liait l’unité de l’Église à l’évêque, successeur des apôtres.',
    'Grégoire le Grand (590–604) réorganisa l’administration ecclésiale et réforma la liturgie.',
  ], 'grokipedia'],
  [1000, 'Une chrétienté organisée', [
    'Le christianisme nicéen du premier millénaire s’organise en pentarchie.',
    'Le symbole de Nicée professe une Église « une, sainte, catholique et apostolique ».',
    'L’évêque de Rome y est reconnu comme successeur de Pierre et chef visible de l’Église universelle.',
  ], 'commun'],
  [1122, 'Le concordat de Worms', [
    'La querelle des Investitures opposait papauté et souverains laïcs sur la nomination des évêques.',
    'Le concordat de Worms (1122) affirma la primauté pontificale sur l’investiture spirituelle.',
    'Cet accord renforça l’autonomie institutionnelle de l’Église face aux pouvoirs temporels.',
  ], 'grokipedia'],
  [1209, 'Les ordres mendiants', [
    'François d’Assise fonda les Franciscains vers 1209, sur un idéal de pauvreté et de prédication.',
    'Ces ordres répondaient au besoin de renouvellement de la piété urbaine et de lutte contre les hérésies.',
    'Ils complétèrent l’organisation ecclésiale sans la remplacer, avec l’approbation papale.',
  ], 'grokipedia'],
  [1215, 'Le quatrième concile du Latran', [
    'Innocent III (1198–1216) porta la papauté à son apogée de puissance temporelle.',
    'Le concile de 1215 imposa la confession et la communion annuelles aux laïcs.',
    'Il condamna l’albigensianisme et renforça la discipline du clergé.',
  ], 'grokipedia'],
  [1216, 'Les Dominicains', [
    'Dominique de Guzman fonda l’ordre des Prêcheurs en 1216.',
    'Les Dominicains se consacrèrent à la prédication et à la défense intellectuelle de la foi.',
    'Avec les Franciscains, ils incarnent le tournant mendiant du XIIIe siècle.',
  ], 'grokipedia'],
  [1274, 'La synthèse scolastique', [
    'Les universités de Paris et de Bologne développèrent la scolastique, mariage de la logique aristotélicienne et de la théologie.',
    'La Somme théologique de Thomas d’Aquin (1265–1274) systématisa cette méthode.',
    'L’ouvrage devint une référence durable de la théologie catholique.',
  ], 'grokipedia'],
  [1300, 'Une Église centralisée', [
    'Le XIVe siècle hérite d’une Église fortement centralisée autour de la papauté.',
    'Les décrets des conciles précédents structurent la vie paroissiale et la discipline cléricale.',
    'Cette institutionalisation accompagne l’extension du réseau des diocèses.',
  ], 'grokipedia'],
  [1400, 'La Chrétienté latine', [
    'À la fin du Moyen Âge, l’Église latine est présente dans toute l’Europe occidentale.',
    'Les ordres mendiants et les universités ont laissé une infrastructure intellectuelle durable.',
    'La religion catholique est alors le cadre de référence dominant de la vie publique et privée.',
  ], 'grokipedia'],
  [1500, 'Sur le seuil de la Réforme', [
    'À l’aube du XVIe siècle, la pluralité confessionnelle n’existe pas encore en Occident latin.',
    'L’usage du terme « catholique » renvoie à l’universalité de l’Église, non à une confession concurrente.',
    'Les abus dénoncés plus tard — dont la vente des indulgences — sont déjà présents.',
  ], 'commun'],
  [1517, 'La rupture luthérienne', [
    'Martin Luther attaque la vente des indulgences et propose la justification par la foi seule.',
    'Jean Calvin développe ensuite la notion de sola scriptura et conteste la vénération des images.',
    'La Réforme provoque des schismes durables et oblige l’Église à répondre.',
  ], 'grokipedia'],
  [1540, 'La Compagnie de Jésus', [
    'Ignace de Loyola fonde les Jésuites, approuvés en 1540 par le pape Paul III.',
    'L’ordre mise sur l’éducation, la prédication et l’obéissance au pape.',
    'Il devient un acteur majeur de la reconquête catholique et des missions.',
  ], 'grokipedia'],
  [1545, 'L’ouverture de Trente', [
    'Le concile de Trente s’ouvre en 1545 pour répondre à la Réforme et réformer l’Église.',
    'Il réaffirme les sept sacrements comme canaux de la grâce.',
    'Il précise que la justification associe la foi et les œuvres.',
  ], 'commun'],
  [1563, 'La clôture de Trente', [
    'Le concile se termine en 1563 avec des décrets sur la discipline et la formation du clergé.',
    'La simonie est interdite et la résidence des évêques imposée.',
    'Des séminaires sont créés pour améliorer la formation sacerdotale.',
  ], 'grokipedia'],
  [1595, 'Le nom « catholicisme »', [
    'Le substantif « catholicisme » apparaît chez le polémiste Pierre Charron en 1595.',
    'Un emploi est signalé en 1598 pour désigner la religion des chrétiens en communion avec le pape.',
    'Le mot s’impose parce que l’universalité de l’Église est désormais contestée par les confessions protestantes.',
  ], 'wikipedia'],
  [1600, 'Baroque et missions', [
    'L’art baroque, patronné par l’Église, cherche à susciter une dévotion émotionnelle.',
    'Les missionnaires jésuites étendent la présence catholique en Amérique et en Asie.',
    'L’École de Salamanca pose les bases du droit international et des droits des peuples autochtones.',
  ], 'grokipedia'],
  [1700, 'Une religion globale', [
    'Au XVIIIe siècle, le catholicisme est implanté sur plusieurs continents.',
    'Les missions accompagnent les expansions coloniales, parfois en tension avec elles.',
    'La centralisation romaine reste le principe d’unité de cette dispersion.',
  ], 'grokipedia'],
  [1800, 'L’épreuve des révolutions', [
    'La Révolution française et les idéaux libéraux remettent en cause l’ordre confessionnel établi.',
    'La question de la séparation de l’Église et de l’État devient centrale.',
    'Le catholicisme doit se redéfinir dans un monde d’États-nations.',
  ], 'grokipedia'],
  [1864, 'Le Syllabus of Errors', [
    'Pie IX publie Quanta Cura et le Syllabus of Errors en 1864.',
    'Le texte condamne les propositions associées au rationalisme, au libéralisme et à la séparation de l’Église et de l’État.',
    'Il marque une opposition ferme aux transformations politiques du siècle.',
  ], 'grokipedia'],
  [1869, 'Le premier concile du Vatican', [
    'Pie IX convoque le concile du Vatican en 1869.',
    'Les travaux portent sur la nature de l’Église et sur l’autorité pontificale.',
    'La définition de l’infallibilité est adoptée l’année suivante.',
  ], 'grokipedia'],
  [1870, 'L’infallibilité pontificale', [
    'Le concile affirme que le pape parle sans erreur ex cathedra sur la foi et les mœurs.',
    'Cette définition renforce la centralisation de l’autorité dans l’Église.',
    'Elle devient un trait distinctif du catholicisme romain contemporain.',
  ], 'grokipedia'],
  [1900, 'L’expansion missionnaire', [
    'Au tournant du XXe siècle, le catholicisme continue de s’étendre hors d’Europe.',
    'Les effectifs croissent dans les colonies et dans les pays d’immigration.',
    'La question sociale devient un champ d’intervention croissant pour l’Église.',
  ], 'commun'],
  [1949, 'Le refus du communisme', [
    'Pie XII excommunie en 1949 les catholiques qui professent ou défendent le communisme matérialiste.',
    'Le contexte est celui de la Guerre froide et des régimes athées d’Europe orientale.',
    'Jean-Paul II jouera plus tard un rôle moral dans la transition des pays communistes.',
  ], 'grokipedia'],
  [1962, 'L’ouverture de Vatican II', [
    'Le deuxième concile du Vatican s’ouvre en 1962 sous Jean XXIII.',
    'Il engage une réforme liturgique et doctrinale de grande ampleur.',
    'Les langues vernaculaires remplacent progressivement le latin dans la liturgie.',
  ], 'commun'],
  [1965, 'La clôture de Vatican II', [
    'Le concile achève ses travaux en 1965 sous Paul VI.',
    'Il promeut l’œcuménisme et le dialogue avec les autres religions.',
    'L’Église catholique se présente désormais comme une communauté ouverte sur le monde moderne.',
  ], 'commun'],
  [2000, 'Un centre de gravité déplacé', [
    'Le catholicisme compte environ 1,4 milliard de baptisés en 2023.',
    'C’est la première dénomination chrétienne mondiale.',
    'La croissance se concentre désormais en Afrique et en Asie tandis que l’Occident recule.',
  ], 'commun'],
];

/* Comptage Chronas : provinces dont la religion enregistrée est « catholic » à l'année. */
const religionSeries = await Promise.all(Object.entries(PROVINCE_CHUNKS).map(async ([key, file]) => {
  const mod = await import(`../src/data/province-timelines/${file}`);
  return mod.PROVINCE_TIMELINES[key]?.religion || [];
}));
const code = (entry) => typeof entry === 'string' ? entry : entry?.code || entry?.value;
const presenceAt = (year) => {
  let count = 0;
  for (const series of religionSeries) {
    let value = null;
    for (const [start, entry] of series) { if (start <= year) value = entry; else break; }
    if (code(value) === 'catholic') count += 1;
  }
  return count;
};

const jalons = jalonsSpec.map(([year, title, facts, kind]) => {
  const presence = presenceAt(year);
  const sourceNote = kind === 'commun'
    ? 'Ces repères sont attestés par les deux encyclopédies consultées ; leurs divergences de détail sont documentées dans la fiche de convergence locale.'
    : kind === 'wikipedia'
      ? 'Ce repère est rapporté par Wikipédia FR ; Grokipedia situe la même période sans dater le mot.'
      : 'Ce repère est issu de Grokipedia et retenu par défaut, la page Wikipédia FR étant principalement thématique.';
  const narrative = `En ${yearText(year)}, ${title.toLowerCase()} : ${facts[0]} ${facts[1]} ${facts[2]} `
    + `Dans les séries Chronas, la religion catholique est enregistrée dans ${presence} provinces cette année-là. `
    + `Ce relevé mesure la présence de la confession dans le jeu de données local ; il ne prétend pas restituer l'étendue historique réelle de la chrétienté. `
    + `${sourceNote} Aucun paragraphe de source n'est reproduit : cette prose est originale.`;
  return {
    year, title, narrative, facts,
    metricValue: presence,
    population: null,
    sources: kind === 'commun' ? [WIKI, GROK] : kind === 'wikipedia' ? [WIKI] : [GROK],
    verification: null,
    kind: kind === 'commun' ? ' convergent' : ` ${kind}`,
  };
});

const payload = {
  meta: {
    item: 'Catholicisme',
    title: 'Catholicisme — lignée d’une religion',
    convergence: 'docs/sources/catholicisme/convergence.md',
    type: 'religion',
    code: 'catholic',
    source: 'Chronas CC BY-SA 4.0 + Wikipédia FR + Grokipedia',
    firstYear: jalons[0].year,
    lastYear: jalons.at(-1).year,
    count: jalons.length,
    metric: 'presence',
    metricLabel: 'Provinces catholiques enregistrées',
    metricUnit: 'provinces',
    proofFigures: '<strong>27</strong> jalons · <strong>1 133 ans</strong> · <strong>4 ans</strong> de concile (1962–1965) · <strong>1,4 milliard</strong> de baptisés, soit <strong>17,7 %</strong> de la population mondiale en 2019 (Wikipédia FR, Grokipedia, Chronas).',
    generatedAt: '2026-11-23',
  },
  jalons,
};
const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
payload.meta.sha256 = hash;
fs.writeFileSync(path.join(ROOT, 'src/data/reports/catholicisme.json'), JSON.stringify(payload));
console.log(`catholicisme.json : ${jalons.length} jalons, ${hash.slice(0, 12)}, présence ${jalons[0].metricValue} → ${jalons.at(-1).metricValue}`);
