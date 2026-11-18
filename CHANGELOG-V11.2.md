# V11.2 — Import d'annonce IA pour les agents

- Espace Agent : bouton « Importer une annonce » (ZIP annonce + photos, JSON ou texte collé), consigne à copier pour n'importe quelle IA (sans commission).
- Plusieurs fichiers à la fois : chaque annonce est relue (aperçu, contrôles, doublons) puis envoyée l'une après l'autre.
- Le bien arrive toujours au nom de l'agent, en brouillon ou « en attente de validation » : jamais publié directement ; pas de commission ni d'options réservées à l'admin.
- Limite : 10 imports par heure et par agent ; l'admin peut lever la limite agent par agent (fiche agent > « Import d'annonces sans limite »).
- Code.gs : build « V11.2 - import annonce agents » ; nouvelle colonne `import_illimite` dans l'onglet AGENTS (créée automatiquement).
- Nouveau fichier : assets/js/import-annonce.js (lecture du JSON/ZIP, partagé).
- Tests : 24 vérifications V11.2 + 62 vérifications V11 (non-régression) en mode démonstration.
