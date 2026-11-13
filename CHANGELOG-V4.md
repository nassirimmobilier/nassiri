# Nassiri Real Estate — journal des modifications V4

Base de travail : V3. Aucune reconstruction : mêmes pages, mêmes styles, mêmes scripts, complétés.

## Strictement inchangés (vérifié par empreinte SHA-256)
- `assets/img/logo/` : les 6 fichiers du logo et des icônes.
- `apps-script/Code.gs` et `apps-script/appsscript.json` : aucune modification du serveur n'était nécessaire.
- `assets/js/demo/code-serveur.js` : toujours la copie exacte de `Code.gs`.
- Toutes les photographies, les références des biens (`NR-0001`…), les données de démonstration,
  l'authentification, les actions serveur, `window.ATLAS` et ses méthodes existantes.

## Fichiers créés
| Fichier | Rôle |
|---|---|
| `recherche.html` | Page « Confiez-nous votre recherche » |
| `assets/js/recherche.js` | Mise en forme des critères et envoi par l'action `contact` |
| `mentions-legales.html` | Mentions légales avec emplacements « à compléter » |
| `confidentialite.html` | Information sur les données personnelles, à compléter |
| `sitemap.xml`, `robots.txt` | Référencement (adresse du site à renseigner) |
| `docs/REFERENCEMENT-ET-DONNEES.md` | Indexation des annonces, loi 09-08, RGPD |
| `CHANGELOG-V4.md`, `TESTS-V4.md`, `PUBLICATION.md` | Documentation de livraison |

## Fichiers modifiés
| Fichier | Modifications |
|---|---|
| `index.html` | Menu à 6 entrées ; 3 accès dans le hero (biens, recherche, vente) ; critère « Chambres » dans le moteur ; section « Quel est votre projet ? » ; contacts directs WhatsApp / appel ; mention données sous le formulaire |
| `biens.html` | Bouton « Confiez-nous votre recherche » quand aucun bien ne correspond (critères repris) ; encart en bas de liste ; bouton de filtres mobile plus visible ; titre de liste pour les lecteurs d'écran |
| `bien.html` | Menu, pied de page, lien d'évitement (le contenu vient de `bien.js`) |
| `vendre.html` | Formulaire en 3 étapes ; contacts directs ; mention données |
| `admin.html` | Inchangé fonctionnellement (régénéré à l'identique) |
| `assets/css/style.css` | Bloc « VERSION 4 » ajouté en fin de fichier ; règles V3 conservées |
| `assets/css/admin.css` | 1 règle : retours à la ligne conservés dans l'historique d'un prospect |
| `assets/js/app.js` | Contacts WhatsApp (un ou plusieurs), choix de l'interlocuteur, blocs de contact ; adresse canonique ; focus du menu mobile ; champs en erreur signalés (`aria-invalid`, `role="alert"`) ; vérification du format de l'e-mail |
| `assets/js/config.js` | Nouvelle clé `whatsapp` (numéros publics, aucun secret) ; `apiUrl` toujours vide |
| `assets/js/catalogue.js` | Lien vers la recherche avec les critères choisis |
| `assets/js/bien.js` | Prix au m² ; bandeau de contact mobile ; message WhatsApp avec la référence ; gestion du focus dans la visionneuse ; mention données |
| `assets/js/admin.js` | Libellé du paramètre WhatsApp (format `Nom:numéro`) |
| `docs/GUIDE-ESPACE-PRO.md`, `README.md` | Mises à jour |

## Fonctionnalités ajoutées
1. **Recherche personnalisée** : projet, type, ville, quartier, budgets, surface, chambres, équipements,
   coordonnées. Transmise par l'action `contact` existante ; le budget, le type et la ville remplissent
   la fiche du prospect ; le message structuré apparaît dans les demandes et l'historique.
2. **WhatsApp immédiat** : bouton flottant, menu mobile, rubrique Contact, fiche d'un bien, page de
   recherche. Avec deux interlocuteurs, le visiteur choisit Khaled Nassiri ou Mohamed Nassiri.
   Le message est prérempli (référence du bien, ou critères de recherche). Bouton « Appeler » associé.
3. **Bandeau de contact sur téléphone** (fiche d'un bien) : WhatsApp, Visite, Contacter. Il se retire
   quand le formulaire est visible ou qu'un champ est en cours de saisie.
4. **Pages légales** provisoires et mention d'information sous chaque formulaire.
5. **Référencement** : titres et descriptions, adresse canonique calculée, sitemap, robots.

## Fonctionnalités conservées
Catalogue, filtres, tris, favoris, fiches, galerie, formulaires de contact et de visite, formulaire
« Confier mon bien » (jamais publié automatiquement), Espace Pro complet, mode démonstration,
compatibilité GitHub Pages et Google Apps Script, absence de compilation.

## Corrections techniques
- Contraste des petits textes dorés et gris relevé (lisibilité).
- Vert des boutons WhatsApp assombri pour un contraste suffisant du texte blanc.
- Libellé accessible du lien des favoris ; ordre des titres du catalogue.
- Sur tablette portrait et téléphone, le formulaire passe avant le texte explicatif.

## Écarts assumés par rapport au cahier des charges
- Menu : libellé court « Votre recherche » (le libellé complet est dans le menu mobile et sur les boutons) ;
  l'entrée « Conseils » est retirée, la section reste sur l'accueil.
- Les annonces restent générées dans le navigateur : voir `docs/REFERENCEMENT-ET-DONNEES.md`.
- Une demande envoyée par WhatsApp n'est pas enregistrée dans l'Espace Pro (elle arrive dans WhatsApp).
