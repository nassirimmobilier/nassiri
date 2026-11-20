/* NASSIRI REAL ESTATE — Formulaire « Confier mon bien » (demande privée, jamais publiée automatiquement) */
(function () {
  "use strict";
  var A = window.ATLAS, MAX = 5, photos = [];
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("form-confier"), champ = document.getElementById("v-photos"), zone = document.getElementById("v-apercus");
    function afficher() {
      zone.innerHTML = photos.map(function (p, i) { return '<div class="vignette"><img src="' + p.apercu + '" alt="Photo ' + (i + 1) + '"><button type="button" data-retirer="' + i + '" aria-label="Retirer la photo ' + (i + 1) + '">' + A.icone("fermer") + "</button></div>"; }).join("");
    }
    champ.addEventListener("change", function () {
      var fichiers = Array.prototype.slice.call(champ.files, 0, MAX - photos.length);
      if (champ.files.length > fichiers.length) A.message("5 photos maximum.");
      Promise.all(fichiers.map(function (f) { return A.preparerPhoto(f, 1600).catch(function (e) { A.message(e.message); return null; }); }))
        .then(function (r) { photos = photos.concat(r.filter(Boolean)); champ.value = ""; afficher(); });
    });
    zone.addEventListener("click", function (e) { var b = e.target.closest("[data-retirer]"); if (b) { photos.splice(+b.dataset.retirer, 1); afficher(); } });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = A.valeurs(form);
      d.type_recherche = "Vente"; d.ville_recherche = d.ville;
      d.photos = photos.map(function (p) { return { nom: p.nom, mime: p.mime, donnees: p.donnees }; });
      A.envoyerDemande(form, "confier", d).then(function (ok) { if (ok) { photos = []; afficher(); } });
    });
  });
})();
