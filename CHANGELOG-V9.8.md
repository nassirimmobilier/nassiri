# V9.8 — Message neutre + repère de version du script
- Le message en cas d'échec de création du code PIN ne contient plus aucune consigne technique (Apps Script, déploiement…) : « Une erreur est survenue. Réessayez… prévenez l'administrateur. »
- Un volet replié « Détails techniques (administrateur) » indique la version du script en ligne (ou « version sans repère (ancienne) »).
- Code.gs : ajout de BUILD = 'V9.8 - PIN automatique'. En ouvrant l'adresse du script (…/exec) dans un navigateur, on voit "build": "V9.8 - PIN automatique" si la bonne version est en ligne.
- Code.gs et assets/js/demo/code-serveur.js identiques.
