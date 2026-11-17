# V9 — Importer une annonce IA

- Nouveau bouton **Importer une annonce IA** (Espace Pro → Biens) : import d'un ZIP (annonce.json + photos) ou collage d'un JSON.
- Contrôles : champs obligatoires, cohérence prix/surfaces, doublons, formats et taille des photos, texte nettoyé (aucun HTML exécuté), « à vérifier » de l'IA affichés.
- Aperçu de l'annonce, correction des champs, ordre des photos, photo principale.
- **Enregistrer en brouillon** / **Valider et publier** ; création en brouillon d'abord, publication seulement si toutes les photos sont envoyées ; sinon import annulé.
- Bibliothèque ZIP embarquée (JSZip, MIT) : `assets/js/vendor/jszip.min.js`.
- Docs : `docs/IMPORT-ANNONCE-IA.md`, exemple Dar Louka dans `docs/exemples-import/`.
- **Google Apps Script inchangé : aucun redéploiement.** Publier uniquement les fichiers du site.
