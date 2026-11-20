# V11.2.9 — Prix en euros ou en dirhams

- Chaque bien a sa devise : dirhams (DH, par défaut) ou euros (€), au choix dans les formulaires (Espace Pro, Espace Agent, import).
- Le site affiche le prix dans la devise du bien, avec l'équivalent indicatif dans l'autre devise (« ≈ … ») sur les cartes et les fiches.
- Taux de change : réglable dans Espace Pro > Paramètres (« Taux de change indicatif », dirhams pour 1 €). Vide = 10,6 par défaut (config.js, tauxEuro).
- Filtres de budget, tri par prix et biens similaires : comparés en dirhams (conversion automatique).
- Import ZIP/JSON : champ "devise": "DH" ou "EUR" accepté.
- Backend (Code-V11.2.9.gs) : colonne « devise » ajoutée automatiquement à l'onglet BIENS, paramètre « taux_eur » (validé entre 5 et 20).
- À déployer ensemble : site + Code-V11.2.9.gs (Déployer > Gérer les déploiements > Nouvelle version).
