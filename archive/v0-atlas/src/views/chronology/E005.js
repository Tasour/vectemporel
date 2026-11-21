/* Pont de chargement : l'index de la vue importe les modules E001…E100,
   tandis que la lentille E05 est implémentée dans E05.js (register('E05', …)).
   Ce simple import garantit son exécution au rendu sans dupliquer le register
   (les modules ES sont évalués une seule fois). */
import './E05.js';
