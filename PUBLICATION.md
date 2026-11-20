# Publier Nassiri Real Estate — guide simple

Ce guide est écrit pour une personne qui n'est pas développeuse et qui utilise surtout un iPad ou un iPhone.

## 1. Extraire le ZIP
- Sur iPad ou iPhone : ouvrez l'app **Fichiers**, touchez `nassiri-real-estate-v4-publication.zip`.
  Un dossier du même nom apparaît : il contient `index.html`, les autres pages et le dossier `assets`.
- Vous pouvez déjà regarder le site en mode démonstration une fois publié (étape 2).

## 2. Publier sur GitHub Pages
Il faut envoyer **tout le contenu du dossier** dans votre dépôt GitHub, en gardant les sous-dossiers.

**Depuis un iPad ou un iPhone, le site github.com ne sait pas envoyer des dossiers entiers.**
Trois solutions, de la plus simple à la moins simple :

1. **Laisser Claude envoyer les fichiers.** Autorisez votre dépôt sur
   https://github.com/apps/claude/installations/select_target (compte `formcom2016`, dépôt concerné),
   puis demandez-lui de publier la V4.
2. **Utiliser un ordinateur une seule fois.** Sur github.com, ouvrez le dépôt, « Add file » >
   « Upload files », glissez le contenu du dossier (100 fichiers maximum par envoi : faites-le en deux fois).
3. **Sur iPad, avec l'app Working Copy** (client Git pour iOS) : clonez le dépôt, importez le contenu
   du dossier, validez (« Commit ») puis envoyez (« Push »).

Ensuite, une seule fois : dans le dépôt, **Settings > Pages > Source : Deploy from a branch > main > / (root) > Save**.
Après une à deux minutes, le site est à l'adresse `https://<compte>.github.io/<depot>/`.

Puis ouvrez `sitemap.xml` et `robots.txt` (sur GitHub, icône crayon) et remplacez `ADRESSE-DU-SITE`
par cette adresse, sans barre à la fin.

## 3. Configurer Google Apps Script (environ 20 minutes)
Suivez `docs/INSTALLATION.md`, étapes 1 à 3. En résumé :
1. Créez un classeur Google Sheets, ouvrez **Extensions > Apps Script**, collez `apps-script/Code.gs`.
2. Dans le classeur, menu **Nassiri Real Estate** : installez les onglets, saisissez l'e-mail des
   alertes, définissez votre mot de passe.
3. **Déployer > Nouveau déploiement > Application Web** (exécuter en tant que : Moi ; accès : Tout le monde).
   Copiez l'adresse qui se termine par `/exec`.

Cette étape est plus confortable sur ordinateur, mais possible dans Safari sur iPad (affichage « version pour ordinateur »).

## 4. Passer du mode démonstration au fonctionnement réel
Sur GitHub, ouvrez `assets/js/config.js`, touchez le crayon et collez l'adresse entre les guillemets :

    apiUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",

Enregistrez (« Commit changes »). Deux minutes plus tard, le site utilise votre classeur, qui est vide :
ajoutez vos biens depuis l'Espace Pro.

N'écrivez jamais de mot de passe dans ce fichier : il est public.

## 5. Tester les formulaires
Depuis votre téléphone, sur le site publié :
- [ ] Connectez-vous à l'Espace Pro avec votre mot de passe.
- [ ] Ajoutez un bien avec deux photos et publiez-le ; vérifiez qu'il apparaît.
- [ ] Envoyez une demande depuis une fiche : elle doit apparaître dans **Demandes** et vous devez recevoir un e-mail.
- [ ] Envoyez une recherche depuis « Confiez-nous votre recherche » : le prospect doit avoir budget, type et ville.
- [ ] Envoyez un bien depuis « Vendre » avec une photo : il doit apparaître dans **Biens proposés**, sans être publié.
- [ ] Touchez un bouton WhatsApp : l'application doit s'ouvrir sur le bon interlocuteur, avec le message prérempli.

## À faire avant de communiquer l'adresse du site
- **Photos** : les visuels fournis sont provisoires (licence non vérifiée). Remplacez l'image d'accueil
  (`assets/img/hero-*`) et ajoutez vos biens avec vos photos.
- **Pages légales** : complétez les passages surlignés de `mentions-legales.html` et `confidentialite.html`,
  et faites-les relire.
- **CNDP** : déclarez le traitement des données (voir `docs/REFERENCEMENT-ET-DONNEES.md`).
- **WhatsApp** : les numéros sont dans `assets/js/config.js` et modifiables dans l'Espace Pro > Paramètres.
