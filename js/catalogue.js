/* NASSIRI REAL ESTATE — Catalogue : filtres dynamiques, tri, favoris, chargement progressif */
(function () {
  "use strict";
  var A = window.ATLAS;
  var CHAMPS = ["ville", "type", "bmin", "bmax", "surface", "chambres", "tri", "favoris"];
  var affiches = 0;

  function lireUrl() {
    var p = new URLSearchParams(location.search), e = {};
    CHAMPS.forEach(function (c) { e[c] = p.get(c) || ""; });
    /* Compatibilité avec le moteur de la page d'accueil : budget=min-max */
    var b = p.get("budget");
    if (b) { var m = b.split("-"); e.bmin = m[0] || ""; e.bmax = m[1] || ""; }
    if (!e.tri) e.tri = "recent";
    return e;
  }
  function ecrireUrl(e) {
    var p = new URLSearchParams();
    CHAMPS.forEach(function (c) { if (e[c] && !(c === "tri" && e[c] === "recent")) p.set(c, e[c]); });
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
  }

  function filtrer(e) {
    var favs = A.favoris.lire();
    var l = A.disponibles().filter(function (b) {
      if (e.favoris && favs.indexOf(b.id) === -1) return false;
      if (e.ville && b.ville !== e.ville) return false;
      if (e.type && b.type !== e.type) return false;
      if (e.bmin && b.prix < +e.bmin) return false;
      if (e.bmax && b.prix > +e.bmax) return false;
      if (e.surface && Math.max(b.surface, b.type === "Terrain" ? b.terrain : 0) < +e.surface) return false;
      if (e.chambres && b.chambres < +e.chambres) return false;
      return true;
    });
    var tris = {
      recent: function (a, b) { return new Date(b.date) - new Date(a.date); },
      "prix-asc": function (a, b) { return a.prix - b.prix; },
      "prix-desc": function (a, b) { return b.prix - a.prix; }
    };
    return l.sort(tris[e.tri] || tris.recent);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("filtres");
    var grille = document.getElementById("catalogue-grille");
    var compteur = document.getElementById("resultats-compte");
    var plus = document.getElementById("afficher-plus");
    var vide = document.getElementById("aucun-resultat");
    var titre = document.getElementById("catalogue-titre");
    if (!form || !grille) return;
    var etat = lireUrl();

    /* Options des listes à partir des données réelles */
    remplir(form.ville, A.villes, "Toutes les villes");
    function remplir(sel, valeurs, defaut) {
      sel.innerHTML = '<option value="">' + defaut + "</option>" +
        valeurs.map(function (v) { return '<option value="' + A.esc(v) + '">' + A.esc(v) + "</option>"; }).join("");
    }

    function versFormulaire() {
      ["ville", "bmin", "bmax", "surface", "chambres", "tri"].forEach(function (c) {
        if (form[c]) form[c].value = etat[c];
        if (form[c] && form[c].value !== etat[c]) etat[c] = form[c].value; /* valeur inconnue → ignorée */
      });
      document.querySelectorAll("[data-type]").forEach(function (b) {
        var actif = b.dataset.type === etat.type;
        b.classList.toggle("est-actif", actif); b.setAttribute("aria-pressed", actif);
      });
      var f = document.getElementById("filtre-favoris");
      f.classList.toggle("est-actif", !!etat.favoris); f.setAttribute("aria-pressed", !!etat.favoris);
    }

    function rendre(reinitialiser) {
      var l = filtrer(etat);
      if (reinitialiser) affiches = A.config.parPage;
      affiches = Math.max(affiches, A.config.parPage);
      grille.innerHTML = l.slice(0, affiches).map(A.carte).join("");
      compteur.textContent = l.length + (l.length > 1 ? " biens disponibles" : " bien disponible");
      plus.hidden = affiches >= l.length;
      plus.querySelector("span").textContent = "Afficher plus de biens (" + Math.max(l.length - affiches, 0) + ")";
      vide.hidden = l.length > 0;
      vide.querySelector("p").textContent = etat.favoris && A.favoris.lire().length === 0
        ? "Vous n’avez pas encore de favoris. Touchez le cœur d’un bien pour l’enregistrer sur cet appareil."
        : "Aucun bien ne correspond à ces critères pour le moment. Élargissez votre recherche ou réinitialisez les filtres.";
      titre.textContent = etat.favoris ? "Mes favoris" : "Nos biens à vendre";
      document.title = (etat.favoris ? "Mes favoris" : "Biens à vendre" + (etat.ville ? " à " + etat.ville : " au Maroc")) + " — Nassiri Real Estate";
      var actifs = ["ville", "type", "bmin", "bmax", "surface", "chambres", "favoris"].filter(function (c) { return etat[c]; }).length;
      document.querySelectorAll("[data-filtres-actifs]").forEach(function (el) { el.textContent = actifs ? " (" + actifs + ")" : ""; });
      /* Lien vers « Confiez-nous votre recherche » avec les critères déjà choisis (aucune donnée personnelle) */
      var q = new URLSearchParams();
      ["ville", "type", "bmin", "bmax", "surface", "chambres"].forEach(function (c) { if (etat[c]) q.set(c, etat[c]); });
      document.querySelectorAll("[data-lien-recherche]").forEach(function (a) { a.href = "recherche.html" + (q.toString() ? "?" + q.toString() : ""); });
      ecrireUrl(etat);
    }

    function surChangement() {
      ["ville", "bmin", "bmax", "surface", "chambres", "tri"].forEach(function (c) { etat[c] = form[c].value; });
      /* Cohérence budget minimum / maximum */
      if (etat.bmin && etat.bmax && +etat.bmin > +etat.bmax) { etat.bmax = ""; form.bmax.value = ""; }
      rendre(true);
    }
    form.addEventListener("change", surChangement);
    form.tri.addEventListener("change", surChangement); /* le tri est placé hors du formulaire */
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-type]");
      if (t) { etat.type = t.dataset.type; versFormulaire(); rendre(true); return; }
      if (e.target.closest("#filtre-favoris")) { etat.favoris = etat.favoris ? "" : "1"; versFormulaire(); rendre(true); return; }
      if (e.target.closest("[data-reinitialiser]")) {
        etat = { ville: "", type: "", bmin: "", bmax: "", surface: "", chambres: "", tri: "recent", favoris: "" };
        versFormulaire(); rendre(true); return;
      }
      if (e.target.closest("#afficher-plus")) { affiches += A.config.parPage; rendre(false); return; }
      if (e.target.closest("[data-filtres-basculer]")) {
        var ouvert = form.classList.toggle("est-ouvert");
        e.target.closest("[data-filtres-basculer]").setAttribute("aria-expanded", ouvert);
      }
    });
    /* En vue « Mes favoris », retirer un cœur met la liste à jour */
    document.addEventListener("atlas:favoris", function () { if (etat.favoris) rendre(false); });

    A.pret.then(function () { versFormulaire(); rendre(true); });
  });
})();
