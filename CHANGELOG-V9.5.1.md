# V9.5.1 — Correctif logo sur ordinateur
- Cause : le navigateur du PC gardait l'ancien style.css en mémoire (le téléphone, non) → le logo carré chevauchait le texte d'accueil.
- Correctif 1 : tous les liens vers style.css portent maintenant "?v=9.5" pour forcer le rechargement.
- Correctif 2 : réglage supplémentaire pour les écrans 769–1100 px (tablette paysage / petite fenêtre) où le logo chevauchait aussi.
- Vérifié sans chevauchement à 1920, 1440, 1366, 1210, 1100, 1024, 820, 768, 430, 390, 360 px de large.
- Code.gs inchangé.
