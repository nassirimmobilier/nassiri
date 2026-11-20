# Nassiri Real Estate — version 4

Site public + Espace Pro (administration, CRM) + API Google Apps Script.
Versions précédentes conservées : v1 et v2 (ancien nom Atlas Signature), v3 (Nassiri Real Estate). La v4 ajoute la recherche personnalisée, les contacts WhatsApp, les pages légales et des optimisations mobile, accessibilité et référencement : voir `CHANGELOG-V4.md`.

## État réel de cette version
| Élément | État |
|---|---|
| Site public (accueil, catalogue, fiche, favoris, formulaires) | Développé et testé dans Chrome |
| Espace Pro (biens, photos, prospects, demandes, paramètres) | Développé et testé dans Chrome, en **mode démonstration** |
| Code Google Apps Script (`apps-script/Code.gs`) | Écrit ; sa logique est exécutée par les tests via un simulateur de Google Sheets. **Jamais exécuté chez Google** : à valider lors de l'installation |
| Connexion Google Sheets / Drive / e-mails | **Non active** tant que `docs/INSTALLATION.md` n'a pas été suivi |
| Publication GitHub Pages | **Non faite** (aucun déploiement sans votre accord) |

## Mode démonstration
Tant que `apiUrl` est vide dans `assets/js/config.js`, le site utilise des données fictives
enregistrées sur l'appareil. L'Espace Pro s'ouvre avec le mot de passe `nassiri-demo` et
**n'est pas protégé** dans ce mode. Aucun e-mail n'est envoyé.

## Essayer
    python3 -m http.server 8000      puis http://localhost:8000

## Dossiers
    index.html · biens.html · bien.html · vendre.html     Site public
    admin.html                                            Espace Pro
    assets/js/config.js       Adresse de l'API (seul fichier à modifier pour relier Google)
    assets/js/api.js          Liaison serveur / mode démonstration
    assets/js/demo/           Simulateur du mode démonstration (copie du code serveur)
    apps-script/Code.gs       Code à coller dans Google Apps Script
    docs/                     Installation, guide d'utilisation, schéma du classeur, tests
    captures/                 Captures réelles (Chrome)

## Photographies
Les visuels fournis sont provisoires (dépôts GitHub publics de démonstration, licence non
vérifiée, certains probablement générés par IA). Remplacez-les par vos photos avant toute mise
en ligne : image du hero dans `assets/img/hero-*`, photos des biens depuis l'Espace Pro.
