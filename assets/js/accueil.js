/* NASSIRI REAL ESTATE — Page d'accueil : sélection à la une + destinations
   Tant qu'il n'y a aucun vrai bien publié, « Coup de cœur » et « Notre sélection de biens »
   affichent à la place des exemples du style de biens recherchés pour nos clients
   (assets/js/exemples.js), clairement annoncés comme tels. Dès qu'un vrai bien existe,
   tout redevient automatique — rien à changer à la main. */
(function () {
  "use strict";
  var A = window.ATLAS;
  var sizesCoeur = "(min-width: 900px) 46vw, 92vw";
  var sizesCarte = "(min-width: 1100px) 31vw, (min-width: 700px) 46vw, 92vw";

  function carteExemple(ex) {
    return '<article class="carte carte-exemple">' +
      '<div class="carte-visuel">' + A.photo(ex.photo, sizesCarte, ex.titre + " — exemple de style, " + ex.ville) +
        '<div class="carte-badges"><span class="badge badge-or">Style recherché</span></div>' +
        '<span class="mention-demo">Photo d’illustration</span>' +
      "</div>" +
      '<div class="carte-corps">' +
        '<p class="carte-lieu">' + A.esc([ex.ville, ex.quartier].filter(Boolean).join(" · ")) + "</p>" +
        '<h3 class="carte-titre">' + A.esc(ex.titre) + "</h3>" +
        "<p>" + A.esc(ex.description) + "</p>" +
        '<a class="btn btn-ligne" href="recherche.html?type=' + encodeURIComponent(ex.type) + '">Confier une recherche similaire</a>' +
      "</div></article>";
  }

  document.addEventListener("DOMContentLoaded", function () { A.pret.then(function () {
    var dispo = A.disponibles();
    var exemples = A.exemples || [];

    /* ---------- Coup de cœur : un vrai bien marqué comme tel, sinon un exemple de style ---------- */
    var coeurSection = document.getElementById("coup-de-coeur");
    if (coeurSection) {
      var coeur = dispo.filter(function (b) { return b.coup_de_coeur === "oui"; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
      var visuel = document.getElementById("coeur-visuel");
      var etiqTexte = document.getElementById("coeur-etiquette-texte");
      var etiqIco = document.getElementById("coeur-etiquette-ico");
      var prixEl = document.getElementById("coeur-prix");

      if (coeur) {
        visuel.insertAdjacentHTML("beforeend", A.image(coeur, sizesCoeur));
        etiqTexte.textContent = "Coup de cœur";
        etiqIco.innerHTML = '<use href="#i-coeur"/>';
        document.getElementById("coeur-surtitre").textContent = "Le coup de cœur de l’agence";
        document.getElementById("coeur-titre").textContent = coeur.titre;
        document.getElementById("coeur-lieu").textContent = coeur.ville + (coeur.quartier ? " · " + coeur.quartier : "");
        document.getElementById("coeur-desc").textContent = coeur.description;
        prixEl.textContent = A.prixAffiche(coeur);
        prixEl.hidden = false;
        document.getElementById("coeur-lien").href = "bien.html?id=" + encodeURIComponent(coeur.id);
        document.getElementById("coeur-lien").firstChild.textContent = "Découvrir ce bien ";
        coeurSection.hidden = false;
      } else if (exemples.length) {
        var ex = exemples[0];
        visuel.insertAdjacentHTML("beforeend", A.photo(ex.photo, sizesCoeur, ex.titre + " — exemple de style, " + ex.ville) +
          '<span class="mention-demo">Photo d’illustration</span>');
        etiqTexte.textContent = "Style recherché";
        etiqIco.innerHTML = '<use href="#i-loupe"/>';
        document.getElementById("coeur-surtitre").textContent = "Le style de bien que nous recherchons pour nos clients";
        document.getElementById("coeur-titre").textContent = ex.titre;
        document.getElementById("coeur-lieu").textContent = ex.ville + (ex.quartier ? " · " + ex.quartier : "");
        document.getElementById("coeur-desc").textContent = ex.description;
        prixEl.hidden = true;
        var lienCoeur = document.getElementById("coeur-lien");
        lienCoeur.href = "recherche.html?type=" + encodeURIComponent(ex.type);
        lienCoeur.firstChild.textContent = "Confier ma recherche ";
        coeurSection.hidden = false;
      }
    }

    /* ---------- Notre sélection : vrais biens, sinon des exemples de style recherché ---------- */
    var grille = document.getElementById("selection-grille");
    var titreEl = document.getElementById("selection-titre");
    var lienEl = document.getElementById("selection-lien");
    var noteEl = document.getElementById("selection-note");
    var noteTexteEl = document.getElementById("selection-note-texte");

    if (dispo.length) {
      var une = dispo.filter(function (b) { return b.aLaUne; });
      var reste = dispo.filter(function (b) { return !b.aLaUne; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      var selection = une.concat(reste).slice(0, 6);
      if (grille) grille.innerHTML = selection.map(A.carte).join("");
      if (titreEl) titreEl.textContent = "Notre sélection de biens";
      if (lienEl) { lienEl.href = "biens.html"; lienEl.firstChild.textContent = "Voir tous les biens "; }
      if (noteEl && noteTexteEl) {
        if (A.demo) { noteTexteEl.textContent = "Annonces fictives et visuels d’illustration, présentés pour valider le design. Ils ne correspondent à aucun bien commercialisé."; noteEl.hidden = false; }
        else noteEl.hidden = true;
      }
    } else if (exemples.length) {
      if (grille) grille.innerHTML = exemples.map(carteExemple).join("");
      if (titreEl) titreEl.textContent = "Le style de biens que nous recherchons pour nos clients";
      if (lienEl) { lienEl.href = "recherche.html"; lienEl.firstChild.textContent = "Confier ma recherche "; }
      if (noteEl && noteTexteEl) {
        noteTexteEl.textContent = "Exemples représentatifs du style recherché pour nos clients, à titre indicatif — ce ne sont pas des biens actuellement en portefeuille.";
        noteEl.hidden = false;
      }
    }

    /* ---------- Destinations : nombre réel de biens disponibles par ville ---------- */
    document.querySelectorAll("[data-ville-compte]").forEach(function (el) {
      var n = dispo.filter(function (b) { return b.ville === el.dataset.villeCompte; }).length;
      el.textContent = n === 0 ? "Prochainement" : n + (n > 1 ? " biens" : " bien");
    });
  }); });
})();
