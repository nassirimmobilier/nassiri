# V11.2.1 — envoi fiable des photos, actualisation automatique, mesure d'audience

Base : V11.2. À déployer en deux temps : le site (zip) ET le backend (`Code-V11.2.1.gs`, puis « Nouvelle version » dans Apps Script). Vérifiez ensuite que l'adresse `/exec` affiche `"build":"V11.2.1 - envoi fiable des photos"`.

## Photos (import d'annonce par un agent)
- L'annonce importée est créée en **brouillon** et n'est **soumise à l'agence qu'une fois toutes les photos envoyées**. L'e-mail d'alerte part à ce moment-là, une seule fois, avec le nombre de photos reçues.
- Compteur « Envoi de la photo X sur N… » pendant l'envoi ; avertissement si l'agent essaie de quitter la page.
- **3 essais par photo** (pauses de 1,5 s puis 4 s). Une photo envoyée deux fois (réponse perdue) n'est pas dupliquée (clé d'envoi côté serveur).
- Si une photo échoue : rien n'est perdu ni transmis. Un encadré « Envoi des photos interrompu » apparaît, avec **« Renvoyer les photos manquantes (N) »**, **« Terminer sans ces photos »** et **« Abandonner cette annonce »** (supprime le brouillon créé).
- **Envoi rapide** (case à cocher, si plus de 3 photos) : l'agence reçoit l'annonce après 3 photos, les autres suivent sur la même annonce. L'e-mail indique « 3 reçues sur N prévues ».
- **Option A** : un agent peut **ajouter des photos à un bien déjà publié** (fiche du bien) ; elles sont en ligne tout de suite. Retirer ou réordonner les photos d'un bien publié reste réservé à l'agence. Maximum 40 photos par bien ; plus de photo sur un bien vendu ou archivé.
- Photos réduites à **1600 px** (au lieu de 1800).

## Actualisation automatique (Admin, Agent, Partenaire)
- Toutes les 60 s, si la page est visible, sur les vues de liste, sans fenêtre ouverte ni saisie en cours. La page n'est redessinée que si les données ont changé. Pas pour le site public (cache de 60 s inchangé).

## Mesure d'audience
- `agent.html`, `partenaire.html` et `espace-pro.html` ne sont plus mesurés (comme `admin.html`).
- Liens marqués : voir `docs/LIENS-UTM.md`.

## Fichiers modifiés
`apps-script/Code.gs` (= `assets/js/demo/code-serveur.js`, identiques), `assets/js/agent.js`, `api.js`, `app.js`, `admin.js`, `partenaire.js`, `import-annonce.js`, pages HTML (numéros de version des scripts), `docs/IMPORT-ANNONCE-IA.md`.
Nouvelle action serveur : `bienFinaliserAgent`. Les actions `photoAjouterAgent` et `bienImporterAgent` changent de comportement : le site et `Code.gs` doivent être déployés ensemble.

## Tests (mode démonstration)
30 vérifications automatiques : envoi normal de 25 photos (brouillon pendant tout l'envoi, un seul e-mail), panne simulée sur une photo puis reprise sans doublon, réponse perdue, envoi rapide, ajout de photos sur un bien publié, actualisation automatique, mesure d'audience par page. Le comportement réel d'Apps Script, de Drive et des e-mails n'est pas testable depuis l'environnement de Claude : à vérifier après déploiement avec un vrai import.
