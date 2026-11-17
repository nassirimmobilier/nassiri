# Nassiri Real Estate — V7 : suivi des prospects (Espace Pro)

*15/11/2026. Site complet. Base : V6.1 (partage + statistiques Google Analytics `G-02FLJQQTDN`).*
*Gardez votre zip V6.1 : c'est votre retour en arrière.*

## Ce qui change (Espace Pro uniquement)

Votre Espace Pro gérait déjà les statuts, la date de relance, les notes et l'historique. La V7 ajoute ce qui manquait pour s'en servir au quotidien :

1. **Fiche prospect, bloc « Suivi »**
   - Boutons de relance rapide : demain, 3 jours, 1 semaine, 2 semaines, ou aucune. La date est enregistrée tout de suite.
   - **Message WhatsApp** : 4 modèles (premier contact, relance, proposer une visite, après une visite). Le texte est modifiable avant l'envoi. Le bouton ouvre WhatsApp avec le message prêt et **ajoute l'échange à l'historique** du prospect.
   - Les numéros marocains saisis en `06…` / `07…` sont convertis au format international (`212…`) : le bouton WhatsApp existant de la fiche ne fonctionnait pas avec ces numéros.
2. **Filtre « À relancer »** dans la liste des prospects (relance prévue aujourd'hui ou en retard, triées par date) et une **tuile « À relancer »** sur le tableau de bord.
3. **« Prospects intéressés » sur la fiche d'un bien** : liste des prospects dont les critères (ville, type de bien, budget) correspondent au bien, avec un bouton **WhatsApp** qui envoie le bien (titre, prix, lien) et le note dans l'historique. Le nombre de prospects correspondants s'affiche aussi sur chaque carte de la liste des biens.
   - Règles : biens **à vendre** (publiés, sous offre ou brouillon) uniquement ; prospects déjà « Vente » exclus ; prospects sans aucun critère ignorés ; budget accepté avec une marge de 10 %.
   - Le budget est lu tel qu'il est saisi : « 4 à 6 M DH », « Jusqu'à 3 000 000 DH », « À partir de 1 500 000 DH », ou un seul nombre (considéré comme maximum).

## Ce qui n'a PAS changé
- **`Code.gs` : aucune modification, aucun redéploiement Apps Script.**
- Le site public, `config.js` (adresse Apps Script et identifiant Analytics), les mentions légales.

## Déjà en place dans votre site (donc non refait)
- « Être prévenu » : la page **Votre recherche** enregistre déjà les critères du visiteur comme prospect, et le catalogue y renvoie les filtres déjà remplis.
- Statuts, historique, notes, alertes par e-mail à l'agence.

## Installation
1. Gardez le zip V6.1.
2. Dans le dépôt GitHub, remplacez les fichiers par ceux de ce dossier. Seuls trois fichiers changent : `assets/js/admin.js`, `assets/css/admin.css` et ce journal.
3. Validez, attendez 1 à 2 minutes, ouvrez l'Espace Pro avec Ctrl+F5.

## Comment vérifier
- Tableau de bord : une tuile « À relancer » apparaît.
- Prospects : une puce « À relancer (N) » apparaît au-dessus des statuts.
- Ouvrez un prospect : le bloc « Suivi » est en haut à droite. Essayez « Relancer dans 3 jours » puis « Ouvrir dans WhatsApp ».
- Ouvrez un bien à vendre : « Prospects intéressés » apparaît au-dessus du formulaire.

## Vérifications faites
21 contrôles automatisés (navigateur simulé, mode démonstration) réussis : tuile, filtre, relance rapide, modèles, ouverture WhatsApp avec numéro international, historique, correspondances sur les biens, absence d'erreur JavaScript ; plus des tests unitaires sur l'analyse des budgets et des numéros.

## Non testé ici
- L'ouverture réelle de WhatsApp et l'enregistrement dans votre vrai Google Sheets (j'ai testé en mode démonstration).
- Les correspondances avec vos vrais prospects : elles dépendent de la façon dont les critères ont été saisis.

## Limites connues
- Pas d'e-mail automatique d'alerte aux prospects (chantier suivant).
- Les locations ne sont pas rapprochées des prospects (la recherche d'un prospect ne dit pas s'il veut acheter ou louer).
- Si vous modifiez le formulaire du prospect sans l'enregistrer, puis cliquez sur « Ouvrir dans WhatsApp », la fiche se recharge et ces modifications sont perdues : enregistrez d'abord.
