# V9.4 — Rafraîchir la page affiche enfin les nouveaux biens
- Cause : le catalogue public était gardé 5 minutes dans l'onglet ouvert ; F5 le réutilisait.
- Correctif (assets/js/api.js uniquement) : un rafraîchissement ignore ce cache ; durée du cache réduite à 1 minute pour la navigation normale entre pages.
- Code.gs inchangé (rien à refaire dans Apps Script).
