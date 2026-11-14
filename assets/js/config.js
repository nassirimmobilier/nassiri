/* ==========================================================================
   NASSIRI REAL ESTATE — Configuration du site
   --------------------------------------------------------------------------
   apiUrl : adresse de l'application web Google Apps Script (elle se termine par /exec).
            Laissez vide pour rester en MODE DÉMONSTRATION (données fictives, sur l'appareil).
   Aucun mot de passe ni aucune clé secrète ne doit figurer dans ce fichier : il est public.
   ========================================================================== */
window.ATLAS = window.ATLAS || {};
ATLAS.config = {
  apiUrl: "https://script.google.com/macros/s/AKfycbwe-CEaMwcJD17raFUrAA6jPHZ8trybwF6Hf0JTgmNgnwY7pp3ME7caW8Dj-3AWInui/exec",
  /* Mesure d'audience Google Analytics 4 : identifiant du type "G-XXXXXXXXXX" (public, sans danger).
     Laissez vide pour ne rien mesurer. Sans effet en mode démonstration et dans l'Espace Pro. */
  analyticsId: "",
  /* Contacts WhatsApp affichés tant que le paramètre « whatsapp » de l'Espace Pro est vide.
     Format : "Nom:numéro international sans +", séparés par une virgule. Numéros publics, pas de secret. */
  whatsapp: "Khaled Nassiri:33667407214, Mohamed Nassiri:33641078018",
  parPage: 6,          // biens chargés à chaque « Afficher plus »
  nouveauJours: 14     // un bien est « Nouveau » pendant N jours après sa publication
};
ATLAS.types = ["Villa", "Appartement", "Riad", "Maison", "Terrain"];
ATLAS.villes = ["Marrakech", "Casablanca", "Rabat", "Tanger", "Agadir"];
ATLAS.equipements = ["Piscine", "Jardin", "Terrasse", "Patio", "Climatisation", "Chauffage", "Cheminée", "Cuisine équipée", "Ascenseur", "Parking", "Garage", "Bassin", "Hammam", "Vue dégagée", "Meublé", "Sécurité / gardiennage"];
