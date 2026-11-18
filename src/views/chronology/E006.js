/* Alias de chargement : `index.js` importe les modules sur trois chiffres
   (E001.js … E100.js), tandis que la lentille est livrée sous son identifiant
   canonique `E06` (voir UNIFIED_AUDIT/CHRONOLOGIE/views/E06.md). L'import
   unique ci-dessous rend le greffon effectif sans dupliquer d'enregistrement. */
import './E06.js';
