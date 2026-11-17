# Guide de l'Espace Pro

Accès : lien **Espace Pro** en haut du site, ou `admin.html`. Fonctionne sur iPad, iPhone et ordinateur.

## Ajouter une villa et la publier (2 à 3 minutes)
1. **Ajouter un bien**.
2. Saisissez le titre, le type, le prix, la ville et le quartier.
3. **Ajouter des photos** : choisissez-les dans votre photothèque. Elles sont allégées
   automatiquement puis envoyées une à une.
4. Complétez surfaces, chambres, équipements et description.
5. **Enregistrer et publier**. Le bien apparaît sur le site (sous 5 minutes pour un visiteur déjà présent).

## Importer une annonce préparée par l'IA
Biens → **Importer une annonce IA** : voir `IMPORT-ANNONCE-IA.md`.

## Photos
- La première photo est la photo principale (cadre doré).
- Étoile : définir comme principale. Flèches : déplacer. Corbeille : supprimer.

## Statuts d'un bien
| Statut | Visible sur le site |
|---|---|
| Brouillon | Non |
| Publié | Oui |
| Sous offre | Oui, avec le badge « Sous offre » |
| Vendu | Non (compté dans « Biens vendus ») |
| Archivé | Non (conservé) |

Le statut se change dans la liste **Biens** (menu déroulant) ou dans la fiche.
**À la une** (étoile) place le bien en tête de « Notre sélection » sur l'accueil.
**Supprimer** efface définitivement le bien et ses photos, après confirmation.

## Informations privées
« Adresse exacte / propriétaire » et « Notes internes » ne sont jamais envoyées au site public.
Le public voit uniquement la ville et le quartier.

## Demandes
- **Reçues** : chaque formulaire envoyé (renseignements, visite, bien proposé). Une ligne
  surlignée est non lue ; touchez-la pour ouvrir la fiche du prospect.
- **Visites** : passez chaque demande à Confirmée, Effectuée ou Annulée.
- **Biens proposés** : formulaire « Confier mon bien ». Rien n'est publié automatiquement.
  « Créer un brouillon d'annonce » prépare une annonce à compléter.

## Prospects (CRM)
- Une fiche est créée automatiquement à la première demande ; les demandes suivantes de la même
  personne (même e-mail ou même téléphone) s'ajoutent à sa fiche.
- Étapes : Nouveau → Contacté → Qualifié → Visite → Offre → Vente.
- **Date de relance** : à l'échéance, le prospect apparaît dans « Actions à effectuer ».
- **Historique** : notez chaque appel, e-mail, message ou visite.

## Agents : code PIN automatique
À la création d'un agent, un **code PIN à 6 chiffres** est généré. Une fenêtre affiche le code **une seule fois** avec un message de bienvenue prêt pour WhatsApp (lien, identifiant, code). Code perdu : fiche de l'agent → **Nouveau code** (l'ancien cesse de fonctionner). **Désactiver l'accès** coupe immédiatement la connexion ; **Réactiver** la rétablit. Les codes ne sont jamais stockés en clair : il n'existe donc pas de liste des codes.

## Samsar (carnet de réseau)
Onglet **Samsar** : un annuaire de vos intermédiaires (nom, téléphone, zone, spécialité, commission, statut, notes). Filtre par statut, recherche, relances programmables (apparaissent dans « À faire » du tableau de bord) et messages WhatsApp prêts à envoyer (premier contact, biens, relance, remerciement). Le samsar n'a pas de connexion.

**Importer des contacts** : bouton en haut de l'onglet. Fichier .vcf ou .csv exporté de Google Contacts / iCloud, ou numéros collés. Les doublons et numéros invalides sont signalés avant l'import.

## Tableau de bord
Biens actifs, biens vendus, prospects, demandes de visite, favoris, dernières demandes, biens les
plus consultés et actions à effectuer.
Les favoris sont comptés de façon anonyme : le site ne sait pas qui a ajouté un bien à ses favoris.

## Paramètres
E-mail des alertes, numéro WhatsApp (format international sans « + », ex. 2126…), téléphone,
e-mail de contact, changement de mot de passe.

**WhatsApp à plusieurs interlocuteurs** : saisissez `Nom:numéro, Nom:numéro` (exemple : `Khaled Nassiri:33667407214, Mohamed Nassiri:33641078018`). Tant que ce champ est vide, le site utilise les numéros inscrits dans `assets/js/config.js`. Pour retirer WhatsApp du site, videz les deux.
