/* NASSIRI REAL ESTATE — Jeu de données FICTIF du mode démonstration (annonces et prospects d'exemple) */
(function () {
  "use strict";
  var D = window.ATLAS_DEMO;
  var jour = function (n) { var d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 16); };
  /* Colonnes : id, statut, titre, type, ville, quartier, prix, surface, terrain, chambres, sdb, exclusivite, aLaUne, joursEcoules, photos, transaction, prixSurDemande, coupDeCoeur */
  var B = [
    ["NR-0001", "publie", "Villa contemporaine avec piscine", "Villa", "Marrakech", "Palmeraie", 12500000, 520, 2400, 5, 5, 1, 1, 6, ["villa-palmeraie", "appartement-hivernage", "appartement-gueliz"], "vente", 0, 0],
    ["NR-0002", "publie", "Appartement panoramique dernier étage", "Appartement", "Marrakech", "Hivernage", 18000, 185, 0, 3, 2, 0, 1, 3, ["appartement-hivernage", "appartement-gueliz"], "location-longue", 0, 0],
    ["NR-0003", "publie", "Riad de caractère avec patio", "Riad", "Marrakech", "Médina", 6800000, 340, 0, 6, 6, 0, 1, 40, ["riad-medina"], "vente", 0, 0],
    ["NR-0004", "sous-offre", "Villa d'architecte sur golf", "Villa", "Marrakech", "Amelkis", 9900000, 430, 1500, 4, 4, 0, 0, 55, ["villa-amelkis"], "vente", 0, 1],
    ["NR-0005", "publie", "Appartement lumineux proche commerces", "Appartement", "Marrakech", "Guéliz", 6500, 92, 0, 2, 1, 0, 0, 2, ["appartement-gueliz"], "location-longue", 0, 0],
    ["NR-0006", "publie", "Maison familiale avec jardin", "Maison", "Marrakech", "Route de l'Ourika", 3400000, 260, 900, 4, 3, 0, 1, 75, ["maison-ourika"], "vente", 0, 0],
    ["NR-0007", "publie", "Maison moderne en résidence fermée", "Maison", "Marrakech", "Agdal", 2750000, 210, 320, 3, 3, 0, 0, 22, ["maison-agdal"], "vente", 0, 0],
    ["NR-0008", "vendu", "Villa blanche avec bassin de nage", "Villa", "Marrakech", "Targa", 5600000, 380, 1000, 4, 4, 0, 0, 150, ["villa-targa"], "vente", 0, 0],
    ["NR-0009", "publie", "Terrain constructible", "Terrain", "Marrakech", "Route de Fès", 1900000, 0, 5000, 0, 0, 0, 0, 14, [], "vente", 0, 0],
    ["NR-0010", "publie", "Appartement de standing en résidence", "Appartement", "Casablanca", "Anfa", 3100000, 140, 0, 3, 2, 0, 0, 43, ["residence-anfa"], "vente", 0, 0],
    ["NR-0011", "publie", "Villa de maître avec piscine", "Villa", "Rabat", "Souissi", 8200000, 460, 1200, 5, 4, 1, 1, 31, ["villa-souissi"], "vente", 0, 0],
    ["NR-0012", "publie", "Appartement vue mer avec terrasse", "Appartement", "Tanger", "Malabata", 1200, 120, 0, 2, 2, 0, 0, 11, ["appartement-marina"], "location-courte", 0, 0],
    ["NR-0013", "publie", "Villa face à l'océan", "Villa", "Agadir", "Taghazout", 7400000, 350, 800, 4, 4, 0, 1, 68, ["villa-ocean"], "vente", 1, 0],
    ["NR-0014", "brouillon", "Appartement à compléter", "Appartement", "Marrakech", "Guéliz", 0, 0, 0, 0, 0, 0, 0, 0, [], "vente", 0, 0]
  ];
  var EQUIP = { Villa: "Piscine|Jardin|Climatisation|Garage|Cuisine équipée|Terrasse", Appartement: "Ascenseur|Climatisation|Parking|Terrasse|Cuisine équipée",
    Riad: "Patio|Terrasse|Bassin|Cheminée", Maison: "Jardin|Climatisation|Parking|Cuisine équipée", Terrain: "" };
  var vues = [48, 31, 27, 19, 22, 9, 12, 60, 5, 8, 14, 11, 16, 0];

  /* Pont entre les noms publics attendus ici et les fonctions internes (suffixées « _ ») du vrai code serveur
     (code-serveur.js, copie exacte de Code.gs), désormais chargé à ce stade. */
  D.serveur = { installer: installer_, definirMotDePasse: definirMotDePasse_, doPost: doPost, ONGLETS: ONGLETS };

  D.semer = function (serveur) {
    serveur.installer();
    serveur.definirMotDePasse("nassiri-demo");            // mot de passe du mode démonstration uniquement
    var O = serveur.ONGLETS, ligne = function (onglet, o) { D.ajouterLigne(onglet, O[onglet].map(function (c) { return o[c] === undefined ? "" : o[c]; })); };
    var np = 0;
    B.forEach(function (b, i) {
      ligne("BIENS", { id: b[0], statut: b[1], titre: b[2], type: b[3], ville: b[4], quartier: b[5], prix: b[6] || "", surface: b[7] || "", terrain: b[8] || "",
        chambres: b[9] || "", sdb: b[10] || "",
        description: "Annonce fictive de démonstration.\n\n" + b[2] + " situé(e) à " + b[4] + ", secteur " + b[5] + ". Ce texte illustre la présentation d’une description : volumes, orientation, prestations, environnement et points forts du bien.\n\nIl sera remplacé par la description réelle saisie depuis l’Espace Pro.",
        equipements: EQUIP[b[3]], juridique: b[3] === "Riad" ? "" : "Exemple : bien titré", juridique_verifie: "non",
        exclusivite: b[11] ? "oui" : "non", a_la_une: b[12] ? "oui" : "non", date_creation: jour(b[13] + 2), date_publication: b[1] === "brouillon" ? "" : jour(b[13]),
        date_maj: jour(b[13]), vues: vues[i], adresse_privee: "", notes_privees: "",
        transaction: b[15] || "vente", prix_sur_demande: b[16] ? "oui" : "non", coup_de_coeur: b[17] ? "oui" : "non" });
      b[14].forEach(function (ph, k) { ligne("PHOTOS", { id: "PH-D" + (++np), bien_id: b[0], url: "assets/img/biens/" + ph, drive_id: "", ordre: k + 1 }); });
    });
    [["P-EX1", "Exemple — Prospect A", "+212 600 000 001", "exemple.a@example.com", "4 à 6 M DH", "Villa", "Marrakech", "Nouveau", 0, ""],
     ["P-EX2", "Exemple — Prospect B", "+33 6 00 00 00 02", "exemple.b@example.com", "1,5 à 3 M DH", "Appartement", "Marrakech", "Qualifié", 4, jour(-2).slice(0, 10)],
     ["P-EX3", "Exemple — Prospect C", "+212 600 000 003", "", "8 à 12 M DH", "Villa", "Rabat", "Visite", 9, jour(1).slice(0, 10)]
    ].forEach(function (p) {
      ligne("PROSPECTS", { id: p[0], date_creation: jour(p[8]), nom: p[1], telephone: p[2], email: p[3], budget: p[4], type_recherche: p[5], ville_recherche: p[6],
        statut: p[7], notes: "Fiche d’exemple du mode démonstration.", date_relance: p[9], source: "Exemple", date_maj: jour(p[8]) });
    });
    ligne("HISTORIQUE", { id: "H-EX1", prospect_id: "P-EX1", date: jour(0), type: "Demande", note: "Demande de renseignements — NR-0001 Villa contemporaine avec piscine" });
    ligne("HISTORIQUE", { id: "H-EX2", prospect_id: "P-EX2", date: jour(4), type: "Demande", note: "Demande de renseignements — NR-0002" });
    ligne("HISTORIQUE", { id: "H-EX3", prospect_id: "P-EX2", date: jour(3), type: "Appel", note: "Exemple : premier échange téléphonique, projet confirmé." });
    ligne("HISTORIQUE", { id: "H-EX4", prospect_id: "P-EX3", date: jour(9), type: "Demande", note: "Demande de visite — NR-0011" });
    ligne("VISITES", { id: "V-EX1", date: jour(9), prospect_id: "P-EX3", bien_id: "NR-0011", date_souhaitee: jour(-3).slice(0, 10), creneau: "Matin", message: "Exemple de demande de visite.", statut: "À confirmer" });
    ligne("ALERTES", { id: "A-EX1", date: jour(0), type: "contact", prospect_id: "P-EX1", bien_id: "NR-0001", resume: "Exemple : « Bonjour, ce bien est-il toujours disponible ? »", lu: "non", email_envoye: "non" });
    ligne("ALERTES", { id: "A-EX2", date: jour(9), type: "visite", prospect_id: "P-EX3", bien_id: "NR-0011", resume: "Visite souhaitée — Matin", lu: "oui", email_envoye: "non" });
    [["NR-0001", 5], ["NR-0003", 3], ["NR-0002", 2], ["NR-0013", 1]].forEach(function (f) { for (var i = 0; i < f[1]; i++) ligne("FAVORIS", { date: jour(i), bien_id: f[0], action: "1" }); });
    D.marquerPret();
  };
})();
