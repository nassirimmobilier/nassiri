# V8 — Code PIN automatique des agents + carnet de Samsar

## Agents
- Création : plus de mot de passe à inventer. Un code PIN à 6 chiffres est généré et affiché une seule fois, avec un message de bienvenue WhatsApp (lien agent.html, identifiant, code) à envoyer ou copier.
- Fiche agent : boutons **Nouveau code** (invalide l'ancien, lève un éventuel blocage) et **Désactiver / Réactiver l'accès** (effet immédiat, même sur une session ouverte).
- Les codes sont hachés (jamais en clair) : pas de liste des codes ; on en génère un nouveau.
- Les agents existants gardent leur mot de passe jusqu'à un « Nouveau code ».

## Samsar
- Nouvel onglet : carnet de samsar (annuaire, statuts, relances, WhatsApp), relances dans « À faire ».
- Nouvel onglet Google Sheets **SAMSAR**, créé automatiquement (rien à faire à la main).

## Mise à jour (à faire dans cet ordre)
1. Sur GitHub : supprimer les anciens fichiers du site, déposer le contenu du zip V8 (`assets/js/config.js` contient votre apiUrl et votre ID Analytics).
2. Apps Script : remplacer tout le contenu de `Code.gs` par `apps-script/Code.gs` du zip, enregistrer.
3. Déployer → Gérer les déploiements → crayon → Version : **Nouvelle version** → Déployer. **Même URL**, ne pas créer un nouveau déploiement.
4. Actualiser l'Espace Pro (Ctrl+F5) : l'onglet Samsar apparaît.
