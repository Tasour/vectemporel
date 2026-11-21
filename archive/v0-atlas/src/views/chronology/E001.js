/* Pont d'intégration : le stub E001 est importé par index.js. On y charge la
   lentille E01 (vague CHRONOLOGIE) dont l'implémentation canonique réside dans
   E01.js. Les ES modules dédupliquent l'import : register('E01') n'est appelé
   qu'une fois, même si le maître ajoute aussi un import direct de E01.js. */
import './E01.js';
