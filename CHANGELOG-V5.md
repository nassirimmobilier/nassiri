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

## Mise à jour : lancement actif tant qu'il n'y a aucun bien publié

Sur l'accueil (et uniquement l'accueil — la page « Nos biens » reste honnête et affiche
« Aucun bien » tant que le catalogue est vide) :

- Tant qu'aucun vrai bien n'est marqué « Coup de cœur », la section correspondante affiche
  automatiquement un exemple du **style** de bien recherché pour les clients (surtitre
  « Le style de bien que nous recherchons pour nos clients », étiquette « Style recherché »,
  mention « Photo d'illustration », pas de prix, bouton « Confier ma recherche » vers la page
  de recherche). Dès qu'un vrai bien est marqué Coup de cœur, l'affichage bascule
  automatiquement sur ce vrai bien — rien à changer à la main.
- Tant qu'aucun vrai bien n'est publié, le bloc « Notre sélection de biens » affiche de la
  même façon 3 exemples permanents (« Le style de biens que nous recherchons pour nos
  clients »), avec la même étiquette « Style recherché » / « Photo d'illustration », sans
  prix ni cœur favoris, et un bouton « Confier ma recherche » vers la page de recherche au
  lieu d'une fiche de bien. Dès qu'un premier vrai bien est publié, la section redevient
  automatiquement « Notre sélection de biens » avec les vraies annonces.
- Ces exemples (`assets/js/exemples.js`) sont indépendants du Google Sheets et du mode
  démonstration : ils ne disparaissent pas une fois le site connecté à votre vrai classeur,
  contrairement aux mentions « Mode démonstration » qui, elles, disparaissent bien dès que
  le site est connecté à un vrai classeur Google Sheets.
- Correction de cohérence : la photo du Coup de cœur de démonstration montrait une vue mer
  (incohérente pour Marrakech, qui n'a pas d'accès à la mer) ; le Coup de cœur de démo pointe
  désormais vers une photo cohérente (villa sans vue mer). Aucune ligne de `apps-script/Code.gs`
  n'a été touchée par cette mise à jour — votre vrai classeur Google Sheets n'est pas concerné.

### Fichier ajouté
- `assets/js/exemples.js` — les 3 exemples de style (villa, riad, maison), permanents.

### Fichiers modifiés
- `index.html` — identifiants ajoutés sur le Coup de cœur et la sélection pour permettre le
  basculement automatique ; suppression de la phrase « On ne vend pas un bien, on vend une
  émotion » affichée en dur (l'idée reste la ligne directrice du ton du site, pas un slogan
  imprimé).
- `assets/js/accueil.js` — logique de basculement automatique (vrai bien ↔ exemple de style).
- `assets/js/demo/demo-donnees.js` — en mode démonstration, le Coup de cœur pointe maintenant
  sur une villa à photo cohérente plutôt que sur la villa à vue mer.

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

## Nouveau : Espace Agent (apporteurs d'affaires)

Chaque agent / apporteur d'affaires dispose maintenant de son propre accès, séparé de
l'Espace Pro, sur une nouvelle page **`agent.html`**.

- **Connexion dédiée** : e-mail + mot de passe propres à chaque agent (créés depuis l'Espace
  Pro → menu « Agents »). Session totalement séparée de celle de l'administrateur (même
  navigateur, même onglet : les deux accès ne se mélangent jamais).
- **Chacun ne voit que ses propres biens** dans son espace. Il peut créer un bien, le modifier
  tant qu'il est en brouillon / en attente / refusé, ajouter des photos, puis le **soumettre**
  à l'agence. Il ne peut jamais le publier lui-même, ni voir ou modifier la commission, ni
  changer les réglages réservés au staff (vérification juridique, à la une, coup de cœur).
- **Validation par le staff obligatoire** : tant qu'un bien soumis par un agent n'a pas été
  validé depuis l'Espace Pro, il reste invisible du site public. Depuis l'Espace Pro (liste des
  biens, filtre « À valider », ou directement sur la fiche du bien), deux boutons : **Valider et
  publier**, ou **Refuser** avec un commentaire libre et des motifs préenregistrés en un clic
  (eux-mêmes modifiables/ajoutables depuis Paramètres → « Motifs de refus »). Dans les deux cas,
  l'agent reçoit un e-mail automatique.
- **Double notification sur une touche** : quand un visiteur contacte l'agence au sujet d'un
  bien apporté par un agent, l'agent **et** l'administrateur reçoivent chacun un e-mail (plus
  aucune touche manquée côté agent).
- **Commission** : renseignée bien par bien (texte libre : pourcentage ou montant négocié),
  visible et modifiable uniquement depuis la fiche du bien dans l'Espace Pro — jamais envoyée
  au navigateur de l'agent, jamais affichée sur le site public.
- **Vue d'ensemble pour l'administrateur** : la nouvelle section « Agents » de l'Espace Pro
  liste chaque agent avec le nombre de biens apportés et de demandes reçues sur ses biens, et
  donne accès à la fiche de chacun de ses biens.

### Fichiers ajoutés / modifiés

- `apps-script/Code.gs` : nouvel onglet `AGENTS`, nouvel onglet `MOTIFS_REFUS`, 5 nouvelles
  colonnes sur `BIENS` (`agent_id`, `commission`, `commission_statut`, `motif_refus`,
  `commentaire_refus`), nouveaux statuts de bien (`en_attente`, `refuse`), authentification
  agent complète, nouvelles actions `AGENT.*` et `ADMIN.bienValider` / `bienRefuser` /
  `agentEnregistrer` / `agentSupprimer` / `motifEnregistrer` / `motifSupprimer`.
- `agent.html` + `assets/js/agent.js` (nouveaux) : l'Espace Agent.
- `assets/js/api.js` : ajout de `A.apiAgent` / `A.jetonAgent`, une session distincte de
  l'Espace Pro.
- `assets/js/admin.js` + `assets/css/admin.css` : section « Agents », file de validation,
  panneau de refus, champ commission (visible seulement si le bien a un agent), gestion des
  motifs de refus dans Paramètres.
- `assets/js/demo/demo-donnees.js` : un agent et deux biens d'exemple (un en attente, un
  refusé) pour tester tout le circuit en mode démonstration sans backend réel. Identifiants de
  démonstration : `youssef.exemple@example.com` / `agent-demo`.

### Important : mise à jour de votre Google Apps Script (obligatoire)

Cette mise à jour ajoute des colonnes et des onglets : il faut impérativement remplacer votre
`Code.gs` et relancer l'installation, sinon l'Espace Agent ne fonctionnera pas :

1. Google Sheet → Extensions → Apps Script → remplacez tout le contenu de `Code.gs` par le
   nouveau fichier fourni.
2. Enregistrez, puis redéployez (Déployer → Gérer les déploiements → crayon → Nouvelle
   version).
3. Dans le Google Sheet, menu « Nassiri Real Estate » → « 1. Installer / vérifier les onglets »
   — cela crée les onglets `AGENTS` et `MOTIFS_REFUS`, ajoute les 5 nouvelles colonnes à `BIENS`
   et préremplit 3 motifs de refus par défaut, sans toucher aux biens déjà saisis.
4. Créez votre premier agent depuis l'Espace Pro → « Agents » → « Ajouter un agent », puis
   communiquez-lui l'adresse de `agent.html` sur votre site, son e-mail et son mot de passe.

## Vérifié avant livraison

- Filtre Acheter/Louer sur le catalogue (compte, titres, URL, badges).
- Section « Coup de cœur » sur l'accueil (bien choisi, prix, lien).
- Fiche d'un bien en location longue durée (prix par mois), courte durée (prix par nuit) et
  « Prix sur demande ».
- Espace Pro : nouveau champ Transaction, cases Coup de cœur / Prix sur demande, bascule rapide
  dans la liste des biens.
- Aucune erreur dans la console du navigateur sur l'ensemble de ces parcours.
- Espace Agent : connexion, création/édition d'un bien, soumission à l'agence, impossibilité
  de voir ou modifier un bien d'un autre agent, impossibilité de publier directement ou de
  s'attribuer une mise en avant/commission.
- Espace Pro : validation et refus (avec motif + commentaire) depuis la liste des biens et
  depuis la fiche d'un bien, double e-mail agent + administrateur sur une touche reçue pour un
  bien d'agent, création d'un agent, gestion des motifs de refus.
- Tout testé via le moteur réel (`Code.gs`, copie exacte servie en mode démonstration), pas
  seulement simulé côté interface.
