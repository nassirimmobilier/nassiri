# Nassiri Real Estate — journal des modifications V5

Base de travail : V4. Nouveauté principale : la vente **et** la location (longue durée et
courte durée), avec un système de « Coup de cœur » sur l'accueil, inspiré de ce qui marche
chez d'autres agences marocaines (badges vente/location, mise en avant émotionnelle d'un bien,
mention « Prix sur demande »).

## Idée directrice

> « On ne vend pas un bien, on vend une émotion. »

Chaque bien a maintenant un type de **transaction** : `vente`, `location-longue` (location
longue durée, loyer mensuel) ou `location-courte` (location saisonnière, prix par nuit).
Un bien peut aussi être marqué **Coup de cœur** (mis en avant dans une section dédiée de
l'accueil) et/ou **Prix sur demande** (le prix est masqué côté public).

## Fichiers modifiés

| Fichier | Modifications |
|---|---|
| `apps-script/Code.gs` (et sa copie exacte `assets/js/demo/code-serveur.js`) | Ajout des colonnes `transaction`, `prix_sur_demande`, `coup_de_coeur` à l'onglet BIENS ; nouvelle liste `TRANSACTIONS_BIEN` ; validation du champ `transaction` ; ces 3 champs sont désormais publics (`CHAMPS_PUBLICS`) et renvoyés par `ADMIN.donnees()` (`listes.transactionsBien`) ; un bien créé est « vente » par défaut. |
| `assets/js/api.js` | **Correctif important** : la fonction `normaliser()` qui prépare les données reçues du serveur pour le site public ne laissait passer qu'une liste figée de champs — les nouveaux champs `transaction`, `prix_sur_demande`, `coup_de_coeur` y ont été ajoutés, sans quoi ils auraient été silencieusement supprimés dès la connexion au vrai Google Sheets (le mode démonstration ne l'aurait pas révélé). |
| `assets/js/app.js` | Nouvelles fonctions `A.prixAffiche(b)` (« 18 000 DH / mois », « 1 200 DH / nuit », « Prix sur demande » ou le prix normal) et `A.libelleTransaction(b)` ; la carte d'un bien (`A.carte`) affiche désormais un badge « À louer » / « À louer — courte durée » et un badge « Coup de cœur ». |
| `assets/css/style.css` | Nouveaux styles : badges `.badge-location` / `.badge-coeur`, bouton segmenté `.filtre-transaction` (Tous / Acheter / Louer), section `.section-coeur` et ses sous-éléments pour la mise en avant « Coup de cœur » sur l'accueil. |
| `assets/js/catalogue.js` | Nouveau filtre « Acheter / Louer » (`etat.transaction`), conservé dans l'URL comme les autres filtres ; titres et compteurs de résultats adaptés (« Nos biens à vendre » / « à louer » / « à vendre et à louer »). |
| `biens.html` | Ajout des boutons de filtre Acheter/Louer juste au-dessus des filtres existants ; titre et sous-titre de la page mis à jour pour mentionner aussi la location. |
| `index.html` | Nouvelle section « Coup de cœur » (cachée automatiquement si aucun bien n'est marqué comme tel). |
| `assets/js/accueil.js` | Sélection du bien « Coup de cœur » le plus récent et remplissage de la nouvelle section. |
| `assets/js/bien.js` | La fiche d'un bien affiche désormais les mêmes badges (location / coup de cœur), le prix au bon format (`A.prixAffiche`), le prix au m² seulement pour une vente, et un titre/méta-description qui disent « à louer » quand c'est le cas. |
| `assets/js/admin.js` (Espace Pro) | Formulaire d'un bien : nouveau champ « Transaction » (menu déroulant), et deux nouvelles cases « Coup de cœur » et « Prix sur demande » dans le bloc « Mise en avant ». Liste des biens : badges transaction/coup de cœur, bouton de bascule rapide « Coup de cœur » (à côté de celui « À la une »), prix masqué si « Prix sur demande ». |
| `assets/js/demo/demo-donnees.js` | Jeu de données d'exemple mis à jour : 3 biens fictifs en location (2 en longue durée, 1 en courte durée avec un prix par nuit), 1 bien marqué « Prix sur demande », et la Villa Palmeraie (NR-0001) marquée « Coup de cœur ». |

## Correctifs de fond (mode démonstration)

Pendant les tests de cette version, deux bugs préexistants — sans lien avec les nouveaux
champs — empêchaient tout simplement le mode démonstration de fonctionner (aucune annonce ne
s'affichait). Ils ont été corrigés :

- `assets/js/demo/demo-donnees.js` : `ATLAS_DEMO.serveur` (l'objet que le site utilise pour
  parler au faux serveur) n'était jamais créé. Ajout d'un pont vers les fonctions internes du
  vrai code serveur.
- `assets/js/demo/demo-google.js` : les simulations des services Google (`SpreadsheetApp`,
  `DriveApp`, `PropertiesService`, etc.) n'étaient jamais rendues accessibles globalement,
  alors que le vrai code serveur (copie exacte de `Code.gs`) s'attend à les trouver comme en
  environnement Google Apps Script réel.

Ces deux correctifs ne concernent que le mode démonstration (fichiers du dossier
`assets/js/demo/`) : **aucune ligne de `apps-script/Code.gs` n'a été modifiée** par ces
correctifs, et le vrai Google Sheets n'est donc pas concerné.

## Important : mise à jour de votre Google Apps Script

Si vous avez déjà copié-collé `Code.gs` dans votre projet Google Apps Script pour passer en
mode réel, il faut remplacer son contenu par la nouvelle version (ci-joint) pour bénéficier des
3 nouvelles colonnes. C'est une mise à jour **non destructrice** :

1. Ouvrez votre Google Sheet → Extensions → Apps Script.
2. Remplacez tout le contenu de `Code.gs` par le nouveau fichier.
3. Enregistrez, puis redéployez (Déployer → Gérer les déploiements → crayon → Nouvelle version).
4. Dans le Google Sheet, menu « Nassiri Real Estate » → « 1. Installer / vérifier les onglets »
   — cela ajoute les 3 nouvelles colonnes à l'onglet BIENS sans toucher aux biens déjà saisis.

## Vérifié avant livraison

- Filtre Acheter/Louer sur le catalogue (compte, titres, URL, badges).
- Section « Coup de cœur » sur l'accueil (bien choisi, prix, lien).
- Fiche d'un bien en location longue durée (prix par mois), courte durée (prix par nuit) et
  « Prix sur demande ».
- Espace Pro : nouveau champ Transaction, cases Coup de cœur / Prix sur demande, bascule rapide
  dans la liste des biens.
- Aucune erreur dans la console du navigateur sur l'ensemble de ces parcours.
