/* NASSIRI REAL ESTATE — Exemples de style de biens recherchés pour nos clients.
   Affichés UNIQUEMENT sur l'accueil, et UNIQUEMENT tant qu'aucun vrai bien n'est publié
   (voir assets/js/accueil.js). Volontairement indépendant du Google Sheets et du mode
   démonstration : ce jeu de données reste permanent, qu'on soit en mode démo ou connecté
   au vrai classeur. Jamais présenté comme un bien en vente/location — toujours avec la
   mention « Style recherché » / « Photo d'illustration » et sans prix. */
window.ATLAS = window.ATLAS || {};
ATLAS.exemples = [
  {
    type: "Villa",
    titre: "Villa contemporaine avec piscine",
    ville: "Marrakech",
    quartier: "Amelkis",
    photo: "assets/img/biens/villa-amelkis",
    description: "Architecture contemporaine, piscine à débordement, proche du golf — le type de villa que nous recherchons régulièrement pour nos clients."
  },
  {
    type: "Riad",
    titre: "Riad avec patio et terrasse",
    ville: "Marrakech",
    quartier: "Médina",
    photo: "assets/img/biens/riad-medina",
    description: "Patio planté, bassin et terrasse — le style de riad que recherchent nos clients en quête d'authenticité dans la médina."
  },
  {
    type: "Maison",
    titre: "Maison avec jardin et piscine",
    ville: "Marrakech",
    quartier: "Route de l'Ourika",
    photo: "assets/img/biens/maison-ourika",
    description: "Maison familiale avec grand jardin et piscine, en périphérie de Marrakech — un format très demandé pour une résidence secondaire."
  }
];
