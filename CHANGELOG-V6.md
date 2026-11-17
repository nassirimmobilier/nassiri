# Nassiri Real Estate — V6 (site complet)

*15/11/2026. Ce dossier contient **tous les fichiers du site**. Vous pouvez supprimer l'ancien contenu de votre dépôt GitHub (la V5) et le remplacer par celui-ci. Gardez votre `nassiri-real-estate-v5.zip` : c'est votre retour en arrière.*

## Nouveautés

### 1. Bouton « Partager »
- **Fiche d'un bien** : bouton « Partager ce bien » sous le prix.
- **Catalogue et accueil** : petite icône de partage sur chaque carte, sous le cœur des favoris.
- **Sur téléphone** : la feuille de partage s'ouvre (WhatsApp, Messages…). Sur la fiche, la **photo du bien est jointe** si elle a pu être préparée ; sinon le message part avec le lien seul.
- **Sur ordinateur** : une petite fenêtre propose WhatsApp, e-mail ou « Copier le lien ».
- **Message type** (modifiable dans `assets/js/app.js`, fonction `A.texteBien`) :
  *« Regarde ce bien à Marrakech : Villa contemporaine avec piscine (520 m², 5 chambres) — 12 500 000 DH. Détails et photos : [lien] »*

### 2. Statistiques de visite (Google Analytics 4)
- **Désactivées tant que `analyticsId` est vide** dans `assets/js/config.js` (c'est le cas dans ce dossier).
- Une fois activées : visiteurs, pays, appareil, provenance, pages vues, et ces actions : fiche consultée, clic WhatsApp, appel, e-mail, partage, favori, formulaire envoyé.
- **Avec l'accord du visiteur uniquement** : bandeau « Accepter / Refuser ». Rien n'est envoyé avant « Accepter » (ni si le navigateur indique « ne pas suivre »).
- Jamais en mode démonstration, jamais dans l'Espace Pro.
- `confidentialite.html` est complétée (section « Mesure d'audience »).

## Ce qui n'a pas changé
- `Code.gs` (dossier `apps-script`) : **aucune modification, aucun redéploiement Apps Script.**
- 
## Installation
1. **Sauvegarde** : gardez le zip V5.
2. Dans votre dépôt GitHub, supprimez les anciens fichiers du site et déposez tout le contenu de ce dossier (le dossier `assets` inclus), à la racine.
3. Validez (commit) et patientez 1 à 2 minutes. Rechargez le site avec Ctrl+F5.
4. Vérifiez : le site s'affiche, le catalogue se charge (vos vrais biens), l'icône de partage apparaît sur les cartes, l'Espace Pro s'ouvre.

## Activer les statistiques (quand vous voudrez)
1. Créez une propriété Google Analytics 4 (analytics.google.com), flux de données « Web » avec l'adresse de votre site.
2. Copiez l'**ID de mesure** (forme `G-XXXXXXXXXX`).
3. Dans `assets/js/config.js`, remplacez `analyticsId: "",` par `analyticsId: "G-XXXXXXXXXX",` puis publiez.
4. Ouvrez le site, cliquez « Accepter », et regardez « Temps réel » dans Analytics.

## Base utilisée
Cette V6 est construite **directement sur votre V5 en ligne** (le zip que vous m'avez envoyé le 15/11/2026) : location, coups de cœur, page agent, robots.txt, sitemap, dossier `apps-script` et documentation sont conservés tels quels. Votre adresse Apps Script est inchangée dans `assets/js/config.js`.

Dans `confidentialite.html`, les mentions « [À compléter] » de votre V5 sont toujours à remplir (nom de l'entreprise, contact, durée de conservation, numéro CNDP) : ce n'est pas nouveau.

## Vérifications faites
23 contrôles automatisés (navigateur simulé) sur le site complet en mode démonstration : boutons de partage sur les cartes et la fiche, fenêtre ordinateur, partage téléphone avec et sans photo, annulation, repli en cas d'erreur, bandeau de consentement (refus, acceptation, identifiant invalide), aucune donnée envoyée avant accord.

## Non testé ici
- Le partage sur un vrai téléphone et l'envoi réel de la photo depuis Google Drive : à essayer après publication. Si la photo ne se joint pas, le message part quand même avec le lien.
- Le chargement réel de Google Analytics (pas d'accès au réseau depuis mon environnement) et la connexion à votre vrai backend Apps Script.

## Limites connues
- Quelqu'un qui **colle l'adresse de la fiche** dans WhatsApp voit toujours l'aperçu générique : c'est le chantier « relais de partage », à faire ensuite.
- Le partage n'est compté que dans Google Analytics, pas dans le tableau de bord de l'Espace Pro (cela demanderait de modifier `Code.gs`).

## Fichiers modifiés par rapport à la V5
`assets/js/app.js`, `assets/js/bien.js`, `assets/css/style.css`, `confidentialite.html`, `assets/js/config.js` (ligne `analyticsId`) et nouveau fichier `assets/js/stats.js`. Tous les autres fichiers sont identiques à la V5.

## Retour en arrière
Remettez le contenu du zip V5 dans votre dépôt.
