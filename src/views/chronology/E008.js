/* Pont d'intégration : le stub E008 est importé par index.js. On y charge la
   lentille E08 (vague CHRONOLOGIE) dont l'implémentation canonique réside dans
   E08.js. Les ES modules dédupliquent l'import : register('E08') n'est appelé
   qu'une fois, même si le maître ajoute aussi un import direct de E08.js.
   Même motif que E001.js → E01.js. */
import './E08.js';
