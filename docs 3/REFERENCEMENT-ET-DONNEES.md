# Référencement et données personnelles — points à connaître

## 1. Indexation des annonces
Les fiches (`bien.html?id=NR-0001`) sont construites dans le navigateur à partir des données du
serveur. Google exécute généralement le JavaScript, mais l'indexation est plus lente et moins sûre
que pour des pages statiques, et les autres moteurs le font peu.

Ce qui est en place en V4 : titre, description et données structurées propres à chaque fiche,
adresse canonique, liens internes vers les catégories et les villes, `sitemap.xml` des pages fixes.

Solution réaliste pour aller plus loin, compatible GitHub Pages et sans rien changer au site :
une **action GitHub planifiée** (par exemple chaque nuit) qui lit le catalogue public de l'API,
génère une page HTML par bien et met à jour le sitemap. Elle n'est pas incluse dans la V4 : elle
ne peut être écrite et testée qu'une fois le dépôt et l'API Google en service.

## 2. Adresse du site
`sitemap.xml` et `robots.txt` contiennent le texte `ADRESSE-DU-SITE` : remplacez-le par l'adresse
réelle (voir `PUBLICATION.md`). Si le site est publié dans un sous-dossier
(`https://compte.github.io/depot/`), le `robots.txt` n'est pas lu par les moteurs : il ne compte
que sur un nom de domaine propre. Déclarez alors le sitemap dans Google Search Console.

## 3. Loi marocaine 09-08 et CNDP
Le site collecte des coordonnées de prospects : c'est un traitement de données à caractère personnel.
À faire par l'agence (non réalisable par le site) :
- déclarer le traitement auprès de la CNDP avant la mise en service ;
- vérifier si l'enregistrement chez Google (serveurs hors du Maroc) relève d'une demande
  d'autorisation de transfert ;
- compléter `confidentialite.html` (responsable, durée de conservation, contact, numéro CNDP).

Le site affiche une information sous chaque formulaire. Si la CNDP ou votre conseil exige un
consentement explicite, une case à cocher obligatoire peut être ajoutée en quelques lignes.

## 4. RGPD
Le site s'adresse aussi à des acheteurs français et européens. Dans ce cas, le RGPD peut s'appliquer
même à une entreprise établie au Maroc (offre de services à des personnes situées dans l'Union).
Conséquences possibles : information complète des personnes, respect de leurs droits, et désignation
éventuelle d'un représentant dans l'Union. À faire confirmer par un juriste.

Ces éléments sont une aide à la préparation, pas un avis juridique. Les pages légales fournies sont
provisoires.
