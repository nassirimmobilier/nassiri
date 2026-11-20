# Nassiri Real Estate — tests de la V4

Tests exécutés le 13 novembre 2026 dans Google Chrome (pilotage automatique), sur le site servi localement en **mode démonstration**.

## Résumé
- 101 vérifications automatiques : 101 réussies, 0 échec.
- 7 pages publiques × 8 largeurs (375, 390, 430, 768, 1024, 1366, 1440, 1920 px) : aucun débordement horizontal, aucune image manquante, aucune erreur JavaScript.
- Espace Pro vérifié à 390, 1024 et 1366 px : aucun débordement.
- Logo et code Apps Script : empreintes SHA-256 identiques à la V3.

## Lighthouse (mobile, exécuté réellement, en local)
| Page | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Accueil | 94 | 100 | 100 | 100 |
| Catalogue | 91 | 100 | 100 | 100 |
| Fiche d'un bien | 90 | 100 | 100 | 100 |
| Recherche | 92 | 100 | 100 | 100 |

Ces scores sont mesurés sur un serveur local, en mode démonstration. Ils varieront sur GitHub Pages et avec l'API Google (plus lente). Remarques restantes de Lighthouse : CSS et JavaScript non minifiés (choix assumé : pas de compilation).

## Non testé (impossible sans accès à vos comptes)
- Publication réelle sur GitHub Pages.
- Google Sheets, Google Drive, Google Apps Script en conditions réelles.
- Envoi réel d'e-mails d'alerte.
- Ouverture effective de WhatsApp sur un téléphone : les liens `wa.me` et leur texte sont vérifiés, pas l'application.
- iPhone, iPad et Android physiques : les tests utilisent Chrome aux dimensions de ces appareils, pas Safari.
- Lecteur d'écran (VoiceOver, TalkBack).

## Correspondance avec les 10 tests demandés
| Test | Résultat |
|---|---|
| 1. Accueil | Réussi |
| 2. Catalogue (filtres, tris, favoris) | Réussi |
| 3. Fiches (photos, informations, formulaires) | Réussi |
| 4. Recherche personnalisée (action contact, enregistrement) | Réussi |
| 5. Vendeur (proposition avec photos) | Réussi |
| 6. Administration (connexion de démonstration, fonctions essentielles) | Réussi |
| 7. Mobile (menus, formulaires, boutons, fiches) | Réussi dans Chrome ; appareils réels non testés |
| 8. JavaScript (erreurs, références manquantes) | Réussi : aucune erreur |
| 9. Liens internes et ressources | Réussi : 169 liens sur 7 pages |
| 10. Structure de l'archive | Réussi : voir fin de document |

## Détail — nouveautés V4 (39)
- [x] logo (6 fichiers) et code Apps Script strictement identiques à la V3 (empreintes SHA-256)
- [x] copie du serveur de démonstration identique à Code.gs
- [x] menu : Accueil · Nos biens · Votre recherche · Vendre · Notre agence · Contact
- [x] logo affiché (image chargée)
- [x] accueil : 3 accès dans le hero + 3 parcours
- [x] adresse canonique absolue
- [x] contact : 2 interlocuteurs, liens ['https://wa.me/33667407214', 'https://wa.me/33641078018'] ['tel:+33667407214', 'tel:+33641078018']
- [x] bouton WhatsApp → choix ['Khaled Nassiri', 'Mohamed Nassiri']
- [x] choix WhatsApp fermé au clavier (Échap)
- [x] moteur accueil : critère Chambres transmis au catalogue
- [x] aucun résultat : bouton « Confiez-nous votre recherche » + réinitialisation (recherche.html?ville=Agadir&bmax=1500000&chambres=5)
- [x] page recherche préremplie (ville, budget, chambres)
- [x] recherche : envoi vide refusé avec message
- [x] recherche : e-mail invalide signalé
- [x] recherche → WhatsApp : message prérempli avec les critères
- [x] recherche : confirmation, sans prétendre qu’un e-mail est parti en démonstration
- [x] aucune coordonnée dans l’URL
- [x] demande enregistrée par l’action « contact » : prospect + alerte + historique
- [x] message structuré dans le suivi
- [x] fiche prospect renseignée (budget, type, ville) : ['Jusqu’à 3\u202f000\u202f000 DH', 'Villa', 'Marrakech']
- [x] Espace Pro : demande lisible ligne par ligne, balise HTML neutralisée
- [x] sans numéro configuré : boutons WhatsApp masqués, formulaire toujours accessible
- [x] numéro saisi dans l’Espace Pro prioritaire sur config.js
- [x] 169 liens internes valides sur 7 pages []
- [x] sitemap.xml et robots.txt présents
- [x] aucun mot de passe dans les pages publiques
- [x] clavier : lien « Aller au contenu » en premier
- [x] focus clavier visible (contour solid 2px)
- [x] menu mobile : 7 entrées dont « Confiez-nous votre recherche » + WhatsApp
- [x] fiche mobile : bandeau WhatsApp / Visite / Contacter visible
- [x] fiche → WhatsApp avec la référence du bien
- [x] « Visite » ouvre le formulaire de visite et le bandeau se retire
- [x] le bandeau ne recouvre pas le champ en cours de saisie
- [x] prix au m² affiché
- [x] catalogue mobile : filtres ouverts d’un geste
- [x] catalogue mobile : filtres refermés
- [x] zones tactiles ≥ 40 px []
- [x] prefers-reduced-motion respecté (aucune transition)
- [x] aucune erreur JavaScript []

## Détail — fiche, formulaires, sécurité, Espace Pro (39)
- [x] fiche : titre, prix, galerie 3 photos
- [x] fiche : 3 biens similaires
- [x] visionneuse ouverte
- [x] visionneuse photo suivante
- [x] formulaire vide refusé
- [x] demande de renseignements enregistrée
- [x] demande de visite enregistrée
- [x] bien vendu : fiche indisponible
- [x] brouillon : invisible du public
- [x] catalogue public sans champs privés ni brouillons/vendus
- [x] « Confier mon bien » avec 2 photos enregistré
- [x] proposition non publiée automatiquement
- [x] admin sans session refusé (AUTH)
- [x] faux jeton refusé
- [x] mauvais mot de passe refusé
- [x] écran de connexion : erreur affichée
- [x] tableau de bord : actifs/vendus/prospects/visites/favoris = ['12', '1', '5', '2', '11']
- [x] script injecté neutralisé (aucune alerte, texte échappé)
- [x] demandes reçues : 5
- [x] bien proposé visible avec 2 photos, formule neutralisée
- [x] brouillon créé depuis une proposition
- [x] prospect unique pour 2 demandes (même e-mail)
- [x] CRM : statut, relance, note, historique (4 entrées)
- [x] ajout : 3 photos importées, champs conservés
- [x] définir la photo principale
- [x] réorganiser les photos
- [x] supprimer une photo (avec confirmation)
- [x] publication : NR-0016 visible au catalogue avec 2 photos et équipement
- [x] fiche publique du nouveau bien avec photo importée
- [x] session conservée après rechargement
- [x] marquer vendu → retiré du catalogue
- [x] mise à la une
- [x] suppression annulable
- [x] suppression confirmée
- [x] alerte e-mail déclenchée vers l’agence (boîte simulée)
- [x] WhatsApp public mis à jour, e-mail d’alerte non exposé
- [x] déconnexion : session invalidée
- [x] blocage après 5 échecs (BLOQUE)
- [x] aucune erreur JavaScript []

## Détail — accueil, catalogue, favoris (23)
- [x] accueil : 6 cartes dans la sélection
- [x] recherche accueil → catalogue filtré (Villa, Marrakech, 6–10 M) : ["Villa d'architecte sur golf"]
- [x] filtres reportés dans le formulaire
- [x] réinitialisation : 12 biens disponibles
- [x] bien vendu absent du catalogue
- [x] chargement progressif : 6 puis 12
- [x] « Afficher plus » → 12 cartes
- [x] tri prix croissant
- [x] tri prix décroissant
- [x] catégorie Riad → 1 bien
- [x] chambres 5+ → 3 biens
- [x] ville Tanger → 1 bien
- [x] budget max 1,5 M → 1 bien
- [x] aucun résultat → message
- [x] compteur favoris = 2
- [x] favoris conservés sur une autre page
- [x] page « Mes favoris » : 2 biens
- [x] retrait d’un favori met la liste à jour
- [x] 33 liens internes valides []
- [x] photo introuvable → visuel de remplacement
- [x] menu tactile s’ouvre (iPad portrait)
- [x] menu tactile se ferme
- [x] zones tactiles ≥ 40 px []
