/* NASSIRI REAL ESTATE — Page d'accueil : sélection à la une + destinations */
(function () {
  "use strict";
  var A = window.ATLAS;
  document.addEventListener("DOMContentLoaded", function () { A.pret.then(function () {
    var dispo = A.disponibles();

    /* Notre sélection : biens « à la une » d'abord, complétés par les plus récents */
    var une = dispo.filter(function (b) { return b.aLaUne; });
    var reste = dispo.filter(function (b) { return !b.aLaUne; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var selection = une.concat(reste).slice(0, 6);
    var grille = document.getElementById("selection-grille");
    if (grille) grille.innerHTML = selection.map(A.carte).join("");

    /* Destinations : nombre réel de biens disponibles par ville */
    document.querySelectorAll("[data-ville-compte]").forEach(function (el) {
      var n = dispo.filter(function (b) { return b.ville === el.dataset.villeCompte; }).length;
      el.textContent = n === 0 ? "Prochainement" : n + (n > 1 ? " biens" : " bien");
    });
  }); });
})();
