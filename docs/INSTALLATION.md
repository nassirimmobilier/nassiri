# Installation — relier le site à Google et le publier

Durée : environ 20 minutes. Aucune ligne de code à écrire.

## 1. Créer le classeur Google Sheets
1. Sur https://sheets.new, créez un classeur et nommez-le « Nassiri Real Estate ».
2. Menu **Extensions > Apps Script**.
3. Supprimez le contenu affiché, collez tout le fichier `apps-script/Code.gs`, enregistrez.
4. (Recommandé) Roue dentée **Paramètres du projet** > cochez « Afficher le fichier manifeste
   appsscript.json », puis remplacez son contenu par `apps-script/appsscript.json`.
5. Rechargez le classeur : un menu **Nassiri Real Estate** apparaît.

## 2. Initialiser
Dans le classeur, menu **Nassiri Real Estate** :
1. **Installer / vérifier les onglets** — Google demande une autorisation la première fois
   (accès au classeur, à Drive pour les photos, à l'envoi d'e-mails). Acceptez avec votre compte.
2. Onglet **PARAMETRES** : en face de `email_alertes`, saisissez l'adresse qui recevra les demandes.
3. **Définir le mot de passe administrateur** (10 caractères minimum). Il est haché et stocké
   dans les propriétés du script ; il n'apparaît ni dans le classeur ni dans le site.
4. **Envoyer un e-mail de test** pour vérifier les alertes.

## 3. Déployer l'API
Dans l'éditeur Apps Script : **Déployer > Nouveau déploiement > Application Web**
- Exécuter en tant que : **Moi**
- Qui a accès : **Tout le monde**

Copiez l'URL qui se termine par `/exec`.
À chaque modification future du code : **Déployer > Gérer les déploiements > Modifier > Nouvelle version**
(l'URL reste la même).

## 4. Relier le site
Dans `assets/js/config.js`, collez l'URL :

    apiUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",

Le site quitte alors le mode démonstration. Le classeur est vide : ajoutez vos biens depuis l'Espace Pro.

## 5. Publier sur GitHub Pages
1. Créez un dépôt GitHub (public) et envoyez-y le contenu de ce dossier.
2. **Settings > Pages > Source : Deploy from a branch > main / (root)**.
3. Le site est disponible sous `https://<compte>.github.io/<depot>/`.
4. Nom de domaine personnalisé : même écran, champ « Custom domain ».

## 6. Vérifications après installation (à faire une fois)
Ces points n'ont pas pu être testés sans accès à vos comptes :
- [ ] Connexion à l'Espace Pro avec votre mot de passe
- [ ] Ajout d'un bien avec 2 photos, publication, affichage sur le site
- [ ] Envoi d'une demande depuis une fiche : ligne dans PROSPECTS et e-mail reçu
- [ ] Formulaire « Confier mon bien » avec photo
- [ ] Affichage des photos sur iPad et iPhone

## Sécurité : ce qui est réellement en place
- Le mot de passe est vérifié **par Google Apps Script**, jamais par le navigateur. Le code public
  ne contient ni mot de passe ni clé.
- Après connexion, le serveur délivre un jeton de session aléatoire (6 h, prolongé à chaque action).
  Chaque action d'administration est refusée sans jeton valide.
- 5 erreurs de mot de passe bloquent toute connexion pendant 15 minutes.
- Le site public ne reçoit que les biens publiés et leurs champs publics. Adresse privée, notes,
  prospects et paramètres ne sortent que par les actions d'administration.
- Les saisies des visiteurs sont nettoyées (formules de tableur neutralisées, texte échappé à l'affichage).

## Limites de Google Apps Script à connaître
1. **Pas d'adresse IP visible** : le blocage après 5 échecs est global. Un tiers pourrait donc
   vous empêcher de vous connecter pendant 15 minutes en saisissant de faux mots de passe.
   Solution plus sûre si besoin : connexion « Se connecter avec Google » (vérification du compte
   côté serveur). Cela demande de créer un identifiant OAuth dans Google Cloud ; je peux l'ajouter.
2. **Un seul compte administrateur** (un mot de passe partagé). Plusieurs utilisateurs nominatifs
   demandent la solution Google ci-dessus.
3. **Lenteur** : chaque action prend 1 à 3 secondes. Le catalogue public est gardé 5 minutes en
   mémoire par le navigateur du visiteur.
4. **Quotas** : environ 100 e-mails par jour avec un compte Gmail gratuit ; au-delà, les demandes
   restent enregistrées mais l'e-mail n'est pas envoyé (colonne `email_envoye` de l'onglet ALERTES).
5. **Photos sur Google Drive** : elles sont affichées par l'adresse `lh3.googleusercontent.com/d/…`,
   qui fonctionne mais n'est pas un service d'hébergement garanti par Google (ralentissements ou
   blocages possibles en cas de trafic important). Convient pour démarrer. Au-delà de quelques
   centaines de visites par jour, je recommande un hébergeur d'images (Cloudinary, offre gratuite) :
   seule la fonction `stockerPhoto_` est à adapter, le reste de l'architecture ne change pas.
6. **Robots** : les formulaires ont un champ piège et une limite de 120 demandes par heure, pas de CAPTCHA.
7. **Référencement** : les fiches sont générées dans le navigateur (adresses `bien.html?id=NR-0001`).
   Google les indexe en général, mais moins bien que des pages statiques. Amélioration possible plus
   tard : générer une page par bien à chaque publication.
