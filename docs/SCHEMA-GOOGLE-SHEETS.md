# Schéma du classeur Google Sheets

Les onglets sont créés par le menu **Nassiri Real Estate > Installer**. Toutes les cellules sont au
format texte. Vous pouvez consulter le classeur ; modifiez-le de préférence depuis l'Espace Pro.

| Onglet | Colonnes |
|---|---|
| **BIENS** | id (ex. NR-0001, stable) · statut (brouillon, publie, sous-offre, vendu, archive) · titre · type · ville · quartier · prix · surface · terrain · chambres · sdb · description · equipements (séparés par \|) · juridique · juridique_verifie · exclusivite · a_la_une · date_creation · date_publication · date_maj · vues · **adresse_privee** · **notes_privees** |
| **PHOTOS** | id · bien_id · url · drive_id · ordre (1 = photo principale) |
| **PROSPECTS** | id · date_creation · nom · telephone · email · budget · type_recherche · ville_recherche · statut (Nouveau → Contacté → Qualifié → Visite → Offre → Vente) · notes · date_relance · source · date_maj |
| **HISTORIQUE** | id · prospect_id · date · type (Demande, Appel, E-mail, WhatsApp, Visite, Note, Statut) · note |
| **VISITES** | id · date · prospect_id · bien_id · date_souhaitee · creneau · message · statut (À confirmer, Confirmée, Effectuée, Annulée) |
| **PROPOSITIONS** | id · date · prospect_id · ville · type · prix_souhaite · surface · description · commentaires · photos · statut (Nouveau, À l’étude, Accepté, Refusé) |
| **FAVORIS** | date · bien_id · action (+1 / -1) — statistique anonyme, aucun identifiant de visiteur |
| **ALERTES** | id · date · type (contact, visite, confier) · prospect_id · bien_id · resume · lu · email_envoye |
| **PARAMETRES** | cle · valeur — email_alertes, whatsapp, telephone, email_contact |

Deux onglets ont été ajoutés à votre liste initiale : **HISTORIQUE** (historique des contacts d'un
prospect) et **PROPOSITIONS** (formulaire « Confier mon bien »).

En gras : colonnes jamais transmises au site public.
Le mot de passe (haché) et l'identifiant du dossier Drive des photos sont dans les propriétés du
script, pas dans le classeur.
