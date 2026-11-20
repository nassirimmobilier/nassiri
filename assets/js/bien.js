/* NASSIRI REAL ESTATE — Fiche détaillée d'un bien */
(function () {
  "use strict";
  var A = window.ATLAS, photos = [], courant = 0;

  function carac(icone, valeur, libelle) { return valeur ? "<li>" + A.icone(icone) + "<div><strong>" + valeur + "</strong><span>" + libelle + "</span></div></li>" : ""; }

  function galerie(b) {
    var t = "(min-width: 900px) 62vw, 100vw", alt = b.titre + " — " + b.ville;
    if (!photos.length) return '<div class="galerie galerie-1"><div class="galerie-grande">' + A.photo("", t, alt) + "</div></div>";
    var n = Math.min(photos.length, 3);
    var h = '<div class="galerie galerie-' + n + '">';
    photos.slice(0, n).forEach(function (u, i) {
      h += '<button type="button" class="' + (i === 0 ? "galerie-grande" : "galerie-petite") + '" data-photo="' + i + '" aria-label="Agrandir la photo ' + (i + 1) + " sur " + photos.length + '">' +
        A.photo(u, i === 0 ? t : "(min-width: 900px) 30vw, 50vw", alt + " (photo " + (i + 1) + ")", i === 0) +
        (i === n - 1 && photos.length > n ? '<span class="galerie-plus">+ ' + (photos.length - n) + " photos</span>" : "") + "</button>";
    });
    h += (A.estIllustration(photos[0]) ? '<span class="mention-demo">Visuels d’illustration</span>' : "") +
      '<button type="button" class="galerie-toutes" data-photo="0">' + A.icone("photo") + " " + photos.length + (photos.length > 1 ? " photos" : " photo") + "</button></div>";
    return h;
  }

  function visionneuse(i) {
    var v = document.getElementById("visionneuse");
    courant = (i + photos.length) % photos.length;
    v.innerHTML = '<button type="button" class="vis-fermer" data-vis-fermer aria-label="Fermer">' + A.icone("fermer") + "</button>" +
      (photos.length > 1 ? '<button type="button" class="vis-nav vis-prec" data-vis="-1" aria-label="Photo précédente">' + A.icone("gauche") + "</button>" : "") +
      '<div class="vis-image">' + A.photo(photos[courant], "100vw", "Photo " + (courant + 1), true) + "</div>" +
      (photos.length > 1 ? '<button type="button" class="vis-nav vis-suiv" data-vis="1" aria-label="Photo suivante">' + A.icone("droite") + "</button>" : "") +
      '<p class="vis-compte">' + (courant + 1) + " / " + photos.length + "</p>";
    if (v.hidden) retourFocus = document.activeElement;
    v.hidden = false; document.documentElement.classList.add("menu-ouvert");
    v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true"); v.setAttribute("aria-label", "Photographies du bien");
    v.querySelector(".vis-fermer").focus();
  }
  var retourFocus = null;
  function fermerVisionneuse() {
    document.getElementById("visionneuse").hidden = true; document.documentElement.classList.remove("menu-ouvert");
    if (retourFocus && retourFocus.focus) retourFocus.focus();
  }
  function allerFormulaire(onglet) {
    var o = document.querySelector('[data-onglet="' + onglet + '"]');
    if (o) o.click();
    var carte = document.querySelector(".fiche-contact-carte");
    if (carte) carte.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  /* Bandeau de contact fixe (téléphone) : masqué dès que le formulaire est visible ou qu'un champ est actif */
  function barreContact(b) {
    var barre = document.createElement("div"); barre.className = "barre-contact"; barre.setAttribute("role", "region"); barre.setAttribute("aria-label", "Contacter l’agence");
    barre.innerHTML = '<a class="btn btn-wa" href="#" data-whatsapp="Bonjour, je suis intéressé(e) par le bien ' + A.esc(b.id) + " — " + A.esc(b.titre) + '.">' + A.icoWA + "<span>WhatsApp</span></a>" +
      '<button type="button" class="btn btn-ligne" data-aller-form="visite">' + A.icone("calendrier") + "<span>Visite</span></button>" +
      '<button type="button" class="btn btn-vert" data-aller-form="infos">' + A.icone("courrier") + "<span>Contacter</span></button>";
    document.body.appendChild(barre); document.body.classList.add("avec-barre-contact");
    var carte = document.querySelector(".fiche-contact-carte"), visible = false, champ = false;
    var maj = function () { barre.classList.toggle("est-masquee", visible || champ); };
    if ("IntersectionObserver" in window && carte) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; maj(); }, { threshold: 0.15 }).observe(carte);
    document.addEventListener("focusin", function (e) { champ = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); maj(); });
    document.addEventListener("focusout", function () { champ = false; maj(); });
  }

  function formulaires(b) {
    var commun = '<input class="piege" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="bien_id" value="' + A.esc(b.id) + '">' +
      '<div class="plein"><label for="{p}-nom">Nom *</label><input id="{p}-nom" name="nom" autocomplete="name" required></div>' +
      '<div><label for="{p}-tel">Téléphone *</label><input id="{p}-tel" name="telephone" type="tel" autocomplete="tel" inputmode="tel"></div>' +
      '<div><label for="{p}-mail">E-mail</label><input id="{p}-mail" name="email" type="email" autocomplete="email"></div>';
    var demain = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    return '<div class="onglets" role="tablist"><button type="button" role="tab" class="est-actif" aria-selected="true" data-onglet="infos">Renseignements</button>' +
      '<button type="button" role="tab" aria-selected="false" data-onglet="visite">Demander une visite</button></div>' +
      '<form class="formulaire formulaire-compact" data-demande="contact" data-panneau="infos" novalidate>' + commun.replace(/\{p\}/g, "i") +
        '<div class="plein"><label for="i-msg">Message</label><textarea id="i-msg" name="message">Bonjour, je souhaite recevoir des renseignements sur ce bien (réf. ' + A.esc(b.id) + ").</textarea></div>" +
        '<div class="plein"><button class="btn btn-vert" type="submit">Envoyer ma demande</button></div><p class="plein retour" data-retour role="status" hidden></p><small class="plein note-donnees">Vos coordonnées servent uniquement à répondre à votre demande. <a href="confidentialite.html">Confidentialité</a></small></form>' +
      '<form class="formulaire formulaire-compact" data-demande="visite" data-panneau="visite" hidden novalidate>' + commun.replace(/\{p\}/g, "v") +
        '<div><label for="v-date">Date souhaitée</label><input id="v-date" name="date_souhaitee" type="date" min="' + demain + '"></div>' +
        '<div><label for="v-creneau">Créneau</label><select id="v-creneau" name="creneau"><option>Matin</option><option>Après-midi</option><option>Fin de journée</option><option>Indifférent</option></select></div>' +
        '<div class="plein"><label for="v-msg">Précisions</label><textarea id="v-msg" name="message" style="min-height:80px"></textarea></div>' +
        '<div class="plein"><button class="btn btn-vert" type="submit">' + A.icone("calendrier") + ' Demander une visite</button></div><p class="plein retour" data-retour role="status" hidden></p><small class="plein note-donnees">Vos coordonnées servent uniquement à répondre à votre demande. <a href="confidentialite.html">Confidentialité</a></small></form>';
  }

  function rendre(b) {
    photos = b.photos.slice();
    var fav = A.favoris.contient(b.id), badges = '<span class="badge badge-type">' + A.esc(b.type) + "</span>";
    if (b.transaction === "location-longue" || b.transaction === "location-courte") badges += '<span class="badge badge-location">' + A.esc(A.libelleTransaction(b)) + "</span>";
    if (b.coup_de_coeur === "oui") badges += '<span class="badge badge-coeur">' + A.icone("coeur") + " Coup de cœur</span>";
    if (b.statut === "sous-offre") badges += '<span class="badge badge-offre">Sous offre</span>';
    else if (b.exclusivite) badges += '<span class="badge badge-or">Exclusivité</span>';
    else if (A.estNouveau(b)) badges += '<span class="badge badge-or">Nouveau</span>';
    var similaires = A.disponibles().filter(function (x) { return x.id !== b.id; })
      .map(function (x) { return { b: x, s: (x.type === b.type ? 2 : 0) + (x.ville === b.ville ? 2 : 0) + (Math.abs(A.prixDH(x) - A.prixDH(b)) < A.prixDH(b) * 0.5 ? 1 : 0) }; })
      .sort(function (x, y) { return y.s - x.s; }).slice(0, 3).map(function (x) { return x.b; });

    document.getElementById("page-titre").textContent = b.titre;
    document.getElementById("page-sous").textContent = [b.ville, b.quartier].filter(Boolean).join(" · ");
    document.getElementById("fil-ref").textContent = "Réf. " + b.id;
    var verbe = (b.transaction === "location-longue" || b.transaction === "location-courte") ? "à louer" : "à vendre";
    document.title = b.titre + " — " + b.type + " " + verbe + " à " + b.ville + (b.quartier ? " (" + b.quartier + ")" : "") + " — Nassiri Real Estate";
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = b.type + " " + verbe + " à " + b.ville + (b.quartier ? ", " + b.quartier : "") + " : " + (b.surface ? b.surface + " m², " : "") + (b.chambres ? b.chambres + " chambres, " : "") + A.prixAffiche(b) + ". Réf. " + b.id + ".";
    var ld = document.createElement("script"); ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "RealEstateListing", name: b.titre, url: location.href, datePosted: b.date || undefined,
      description: b.description.slice(0, 300), offers: { "@type": "Offer", price: b.prix, priceCurrency: b.devise === "EUR" ? "EUR" : "MAD", businessFunction: verbe === "à louer" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell" },
      about: { "@type": "Residence", address: { "@type": "PostalAddress", addressLocality: b.ville, addressRegion: b.quartier, addressCountry: "MA" } } });
    document.head.appendChild(ld);

    var el = document.getElementById("fiche");
    el.removeAttribute("data-chargement");
    el.innerHTML = galerie(b) +
      '<div class="fiche-colonnes"><div class="fiche-contenu">' +
        '<div class="fiche-badges">' + badges + "</div>" +
        '<p class="carte-lieu">' + A.esc([b.ville, b.quartier].filter(Boolean).join(" · ")) + "</p>" +
        '<h2 class="fiche-titre">' + A.esc(b.titre) + "</h2>" +
        '<p class="fiche-prix">' + A.prixAffiche(b) + "</p>" + (A.prixEquiv(b) ? '<p class="fiche-prix-equiv">' + A.prixEquiv(b) + " <small>(équivalent indicatif, 1 € = " + String(A.tauxEuro()).replace(".", ",") + " DH ; le prix de référence est celui indiqué ci-dessus)</small></p>" : "") +
        ((b.transaction || "vente") === "vente" && b.prix && (b.surface || b.terrain) ? '<p class="fiche-prix-m2">soit ' + A.nombre(Math.round(b.prix / (b.surface || b.terrain))) + "\u00a0" + (b.devise === "EUR" ? "€" : "DH") + "/m² " + (b.surface ? "habitable" : "de terrain") + "</p>" : "") +
        '<p class="fiche-partage"><button type="button" class="btn btn-ligne btn-partager" data-partager="' + A.esc(b.id) + '" data-avec-image>' + A.icoPartage + " Partager ce bien</button></p>" +
        '<ul class="fiche-carac">' + carac("surface", b.surface ? A.nombre(b.surface) + " m²" : "", "Surface habitable") + carac("boussole", b.terrain ? A.nombre(b.terrain) + " m²" : "", "Terrain") +
          carac("lit", b.chambres, b.chambres > 1 ? "Chambres" : "Chambre") + carac("bain", b.sdb, b.sdb > 1 ? "Salles de bains" : "Salle de bains") + carac("maison", A.esc(b.type), "Type de bien") + "</ul>" +
        (b.description ? '<h3 class="fiche-sous-titre">Description</h3><div class="fiche-description">' + A.esc(b.description).split(/\n{2,}/).map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("") + "</div>" : "") +
        (b.equipements.length ? '<h3 class="fiche-sous-titre">Équipements</h3><ul class="fiche-equipements">' + b.equipements.map(function (e) { return "<li>" + A.icone("coche") + A.esc(e) + "</li>"; }).join("") + "</ul>" : "") +
        '<h3 class="fiche-sous-titre">Informations</h3><dl class="fiche-infos">' +
          "<div><dt>Référence</dt><dd>" + A.esc(b.id) + "</dd></div>" +
          "<div><dt>Localisation</dt><dd>" + A.esc([b.ville, b.quartier].filter(Boolean).join(", ")) + " <small>(approximative — l’adresse exacte est communiquée lors de la visite)</small></dd></div>" +
          "<div><dt>Situation juridique</dt><dd>" + (b.juridique ? A.esc(b.juridique) + (b.juridiqueVerifie ? ' <span class="verifie">' + A.icone("bouclier") + " Vérifiée par l’agence</span>" : " <small>(information déclarée, vérification en cours)</small>") : "<small>Communiquée sur demande</small>") + "</dd></div>" +
        "</dl>" +
      '</div><aside class="fiche-contact"><div class="fiche-contact-carte">' +
        '<div class="fiche-contact-haut"><div><p class="fiche-contact-prix">' + A.prixAffiche(b) + '</p><p class="carte-ref">Réf. ' + A.esc(b.id) + "</p></div>" +
        '<div class="fiche-contact-boutons"><button class="coeur coeur-fiche' + (fav ? " est-actif" : "") + '" type="button" data-favori="' + A.esc(b.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Retirer des favoris" : "Ajouter aux favoris") + '">' + A.icone("coeur") + '</button><button class="coeur coeur-fiche" type="button" data-partager="' + A.esc(b.titre) + '" aria-label="Partager ce bien">' + A.icone("partage") + "</button></div></div>" +
        formulaires(b) +
        '<a class="btn btn-wa btn-whatsapp" href="#" data-whatsapp="Bonjour, je suis intéressé(e) par le bien ' + A.esc(b.id) + " — " + A.esc(b.titre) + '.">' + A.icoWA + " Échanger sur WhatsApp</a>" +
      "</div></aside></div>" +
      (similaires.length ? '<section class="similaires"><h2 class="titre">Biens similaires</h2><div class="grille" style="margin-top:26px">' + similaires.map(A.carte).join("") + "</div></section>" : "");

    barreContact(b);
    A.preparerPartage(b);
    A.evenement("view_item", { item_id: b.id, item_name: b.titre, item_category: b.type });
    /* Statistique de consultation : une seule fois par session et par bien */
    try { if (!sessionStorage.getItem("vu_" + b.id)) { sessionStorage.setItem("vu_" + b.id, "1"); A.api("vue", { bien_id: b.id }).catch(function () {}); } } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    var id = new URLSearchParams(location.search).get("id");
    A.pret.then(function () {
      var b = A.disponibles().filter(function (x) { return x.id === id; })[0];
      if (b) return rendre(b);
      var el = document.getElementById("fiche"); el.removeAttribute("data-chargement");
      document.getElementById("page-titre").textContent = "Bien indisponible";
      el.innerHTML = '<div class="vide">' + A.icone("boussole") + "<h2>Ce bien n’est plus disponible</h2><p>Il a peut-être été vendu ou retiré. Découvrez nos autres biens.</p><a class=\"btn btn-vert\" href=\"biens.html\">Voir tous les biens</a></div>";
    });
    document.addEventListener("click", function (e) {
      var p = e.target.closest("[data-photo]"); if (p) return visionneuse(+p.dataset.photo);
      var n = e.target.closest("[data-vis]"); if (n) return visionneuse(courant + +n.dataset.vis);
      if (e.target.closest("[data-vis-fermer]") || e.target.id === "visionneuse") return fermerVisionneuse();
      var af = e.target.closest("[data-aller-form]"); if (af) return allerFormulaire(af.dataset.allerForm);
      var o = e.target.closest("[data-onglet]");
      if (o) {
        document.querySelectorAll("[data-onglet]").forEach(function (b) { var a = b === o; b.classList.toggle("est-actif", a); b.setAttribute("aria-selected", a); });
        document.querySelectorAll("[data-panneau]").forEach(function (f) { f.hidden = f.dataset.panneau !== o.dataset.onglet; });
      }
    });
    document.addEventListener("keydown", function (e) {
      if (document.getElementById("visionneuse").hidden) return;
      if (e.key === "Escape") fermerVisionneuse();
      if (e.key === "ArrowRight") visionneuse(courant + 1);
      if (e.key === "ArrowLeft") visionneuse(courant - 1);
    });
    /* Balayage tactile dans la visionneuse */
    var x0 = null, v = document.getElementById("visionneuse");
    v.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    v.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50 && photos.length > 1) visionneuse(courant + (dx < 0 ? 1 : -1)); });
  });
})();
