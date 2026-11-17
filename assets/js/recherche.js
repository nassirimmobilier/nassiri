/* NASSIRI REAL ESTATE — « Confiez-nous votre recherche »
   Les critères sont transformés en message structuré et transmis par l'action serveur « contact »
   existante : la demande rejoint les prospects et l'historique comme toute autre demande. */
(function () {
  "use strict";
  var A = window.ATLAS;
  function dh(v) { return A.nombre(+v) + " DH"; }

  function criteres(form) {
    var v = A.valeurs(form), l = [];
    var projet = (form.querySelector('[name="projet"]:checked') || {}).value || "Achat";
    var equip = Array.prototype.filter.call(form.querySelectorAll('[name="equipement"]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
    l.push("Projet : " + projet);
    l.push("Type : " + (v.type || "Indifférent"));
    if (v.ville) l.push("Ville : " + v.ville);
    if (v.quartier) l.push("Quartier : " + v.quartier);
    if (v.bmin) l.push("Budget minimum : " + dh(v.bmin));
    l.push("Budget maximum : " + (v.bmax ? dh(v.bmax) : "à préciser"));
    if (v.surface) { var selS = form.elements.surface; l.push("Surface : " + selS.options[selS.selectedIndex].text); }
    if (v.chambres) l.push("Chambres : " + v.chambres + " et plus");
    if (equip.length) l.push("Équipements : " + equip.join(", "));
    var texte = "RECHERCHE IMMOBILIÈRE PERSONNALISÉE\n\n" + l.join("\n") + (v.commentaire ? "\n\nCommentaire : " + v.commentaire : "");
    var budget = v.bmin && v.bmax ? dh(v.bmin) + " à " + dh(v.bmax) : v.bmax ? "Jusqu’à " + dh(v.bmax) : v.bmin ? "À partir de " + dh(v.bmin) : "";
    return { v: v, texte: texte.slice(0, 1900), budget: budget, projet: projet };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("form-recherche");
    if (!form) return;

    /* Pré-remplissage depuis le catalogue : uniquement des critères, jamais de coordonnées */
    var p = new URLSearchParams(location.search);
    ["type", "bmin", "bmax", "surface", "chambres"].forEach(function (c) {
      var el = form.elements[c], val = p.get(c);
      if (el && val && Array.prototype.some.call(el.options, function (o) { return o.value === val; })) el.value = val;
    });
    if (p.get("ville")) form.elements.ville.value = p.get("ville").slice(0, 60);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = criteres(form);
      A.envoyerDemande(form, "contact", {
        site: c.v.site, nom: c.v.nom, telephone: c.v.telephone, email: c.v.email, message: c.texte,
        budget: c.budget, type_recherche: c.v.type || (c.projet === "Investissement" ? "Investissement" : ""), ville_recherche: c.v.ville
      });
    });

    /* Variante immédiate : le même récapitulatif, envoyé par WhatsApp (non enregistré dans le suivi de l'agence) */
    form.querySelector("[data-recherche-whatsapp]").addEventListener("click", function () {
      var c = criteres(form);
      A.ouvrirWhatsApp("Bonjour, je vous confie ma recherche immobilière.\n\n" + c.texte.replace("RECHERCHE IMMOBILIÈRE PERSONNALISÉE\n\n", "") + (c.v.nom ? "\n\n" + c.v.nom : ""));
    });
  });
})();
