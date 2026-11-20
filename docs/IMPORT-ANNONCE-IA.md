# Importer une annonce IA — notice

## Principe
Vous donnez à Claude ou ChatGPT les informations et les photos d'un bien. L'IA vous rend un **ZIP** (annonce + photos) ou un **texte JSON**. Dans l'Espace Pro : **Biens → Importer une annonce IA**, vous choisissez le fichier (ou collez le texte), vous contrôlez l'aperçu, puis **Valider et publier**.

## Installation (une seule fois)
La V9 ne modifie pas Google Apps Script : **aucun redéploiement**. Supprimez les anciens fichiers du site sur GitHub, déposez le contenu du zip V9, attendez la mise en ligne, puis faites Ctrl+F5 (ou rechargez sur iPhone).

## Utilisation
1. Espace Pro → **Biens** → **Importer une annonce IA**.
2. **Choisir un fichier ZIP ou JSON** (iPhone/iPad : application Fichiers) — ou coller le texte JSON puis « Analyser ».
3. Lisez les **contrôles** (rouge = bloquant, jaune = à vérifier, doublon = bien déjà présent) et l'**aperçu**.
4. Corrigez les champs si besoin ; réglez l'ordre des photos (flèches) et la photo principale (étoile).
5. **Valider et publier** (le bien est créé, les photos envoyées sur Google Drive, puis publié) ou **Enregistrer en brouillon** (vous arrivez dans la fiche habituelle pour terminer).
6. Confirmation avec le lien vers l'annonce publiée.

Sécurité de l'opération : l'annonce est d'abord créée en **brouillon** ; elle n'est publiée qu'après l'envoi réussi de toutes les photos. Si une photo échoue (quota, réseau), l'import est **annulé** et le brouillon supprimé : pas de publication partielle.

## Format du fichier
`annonce.json` (à la racine du ZIP) + dossier `photos/`. Les champs correspondent exactement aux colonnes de la feuille BIENS ; aucun champ n'a été ajouté.

| Champ | Colonne | Remarque |
|---|---|---|
| titre | titre | obligatoire |
| type | type | Villa, Appartement, Riad, Maison ou Terrain |
| transaction | transaction | vente, location-longue, location-courte |
| prix, prix_sur_demande | prix, prix_sur_demande | en DH ; « 4 000 000 » accepté |
| ville, quartier | ville, quartier | le quartier est public |
| surface | surface | surface construite en m² |
| terrain | terrain | m² |
| chambres, sdb | chambres, sdb | |
| description | description | paragraphes séparés par une ligne vide |
| equipements | equipements | liste ; les équipements hors liste sont acceptés |
| juridique | juridique | statut foncier, affiché au public |
| adresse_privee, notes_privees | idem | jamais publics |
| exclusivite, a_la_une, coup_de_coeur, juridique_verifie | idem | optionnels (oui/non) |
| photos | table PHOTOS | liste ordonnée `{ "fichier": "photos/01.jpg", "principale": true }` |
| a_verifier | — | pas stocké : affiché comme alertes dans l'aperçu |

Notes : le statut du fichier est ignoré (toujours brouillon avant validation) ; « autorisations », « description courte », « vidéos » n'existent pas sur le site : l'information va dans la description ou les équipements ; une devise autre que le dirham déclenche une alerte.
Modèle : `docs/exemples-import/annonce-modele.json`. Exemple complet (Dar Louka, **photos factices d'exemple**) : `docs/exemples-import/dar-louka-exemple.zip`.

## Consigne à donner à l'IA (aussi copiable depuis l'écran d'import)
```
Tu prépares une annonce pour mon site immobilier Nassiri Real Estate (Maroc). Je te donne les informations du bien et des photos.
RÈGLES : n'invente RIEN. Une information absente reste vide ("" ou null) et tu la listes dans "a_verifier". Rédige en français, ton professionnel et sobre.
LIVRABLE : un fichier ZIP contenant annonce.json et un dossier photos/ (JPEG, 1600 px max, nommés 01.jpg, 02.jpg…). Si tu ne peux pas créer de ZIP, donne-moi uniquement le JSON ci-dessous, dans un bloc de code.
FORMAT annonce.json :
{
  "format": "nassiri-annonce", "version": 1,
  "bien": {
    "titre": "", "type": "Villa|Appartement|Riad|Maison|Terrain", "transaction": "vente|location-longue|location-courte",
    "prix": 0, "devise": "DH|EUR", "prix_sur_demande": false, "ville": "", "quartier": "",
    "surface": 0, "terrain": 0, "chambres": 0, "sdb": 0,
    "description": "", "equipements": ["Piscine"], "juridique": "",
    "adresse_privee": "", "notes_privees": ""
  },
  "photos": [ { "fichier": "photos/01.jpg", "principale": true } ],
  "a_verifier": ["…"]
}
Notes : prix dans la devise indiquée par "devise" (DH par défaut, ou EUR si le prix est en euros), nombres sans espaces ; surface = surface construite en m² ; terrain en m² ; adresse_privee et notes_privees ne sont jamais affichées au public ; l'ordre de "photos" est l'ordre d'affichage.
```

## Limites et photos
- 40 photos maximum par annonce, ZIP de 120 Mo maximum ; formats JPEG, PNG, WebP, HEIC (si l'appareil sait le lire).
- Chaque photo est réduite à 1 800 px (qualité web) avant envoi vers Google Drive (lien public « toute personne disposant du lien »). **Les originaux ne sont pas conservés par le site** : gardez-les sur votre appareil.
- Quotas gratuits de Google Apps Script/Drive : en cas de dépassement, un message explicite s'affiche et l'import est annulé proprement.
- Vidéos : non prises en charge (trop lourdes pour Apps Script) ; mettez un lien dans la description.

## Procédure de test
1. Ouvrir l'Espace Pro, importer `docs/exemples-import/dar-louka-exemple.zip`.
2. Vérifier : 4 photos, photo principale, aperçu (4 000 000 DH, 297 m², terrain 10 000 m², 5 chambres, Titré), alertes « à vérifier ».
3. Changer l'ordre des photos, corriger le titre, choisir le type.
4. **Enregistrer en brouillon**, vérifier la fiche, puis **Enregistrer et publier**. Ouvrir le lien : le bien et ses photos doivent s'afficher.
5. Réimporter le même ZIP : l'alerte **Doublon** doit apparaître et bloquer tant que la case n'est pas cochée.
6. Supprimer le bien de test (Biens → corbeille).
7. Refaire 2 à 4 depuis l'iPhone (Safari) avec Fichiers.
