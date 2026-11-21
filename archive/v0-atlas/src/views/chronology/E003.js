/* Pont d'intégration : le stub E003 est importé par index.js. On y charge la
   lentille E03 (vague CHRONOLOGIE) dont l'implémentation canonique réside dans
   E03.js. Les ES modules dédupliquent l'import : register('E03') n'est appelé
   qu'une fois, même si le maître ajoute aussi un import direct de E03.js. */
import './E03.js';
