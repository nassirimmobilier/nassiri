/* ==========================================================================
   NASSIRI REAL ESTATE — Fonctions communes (favoris, cartes, menu, images)
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS;
  var IMG = "assets/img/";
  var CLE_FAVORIS = "nassiri_favoris";

  /* ---------- Outils ---------- */
  A.prix = function (n) {
    return new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ") + " DH";
  };
  A.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  A.estNouveau = function (b) {
    if (!b.date) return false;
    return (Date.now() - new Date(b.date).getTime()) / 864e5 <= A.config.nouveauJours;
  };
  A.nombre = function (n) { return new Intl.NumberFormat("fr-FR").format(n); };
  A.dateFr = function (iso, avecHeure) {
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T12:00" : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) + (avecHeure && iso.length > 10 ? " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");
  };
  /* Biens visibles du public : ni vendus, ni brouillons, ni archivés */
  A.disponibles = function () {
    return (A.biens || []).filter(function (b) { return b.statut === "publie" || b.statut === "sous-offre"; });
  };
  A.icone = function (nom) {
    return '<svg class="ico" aria-hidden="true"><use href="#i-' + nom + '"/></svg>';
  };

  /* ---------- Favoris (conservés sur l'appareil, sans compte) ---------- */
  var memoire = [];
  A.favoris = {
    lire: function () {
      try { memoire = JSON.parse(localStorage.getItem(CLE_FAVORIS)) || []; } catch (e) { /* stockage indisponible */ }
      return memoire.slice();
    },
    ecrire: function (liste) {
      memoire = liste;
      try { localStorage.setItem(CLE_FAVORIS, JSON.stringify(liste)); } catch (e) { /* idem */ }
      A.favoris.rafraichir();
    },
    contient: function (id) { return A.favoris.lire().indexOf(id) !== -1; },
    basculer: function (id) {
      var l = A.favoris.lire(), i = l.indexOf(id);
      if (i === -1) l.push(id); else l.splice(i, 1);
      A.favoris.ecrire(l);
      return i === -1;
    },
    rafraichir: function () {
      var ids = A.disponibles().map(function (b) { return b.id; });
      var n = A.favoris.lire().filter(function (id) { return ids.indexOf(id) !== -1; }).length;
      document.querySelectorAll("[data-compteur-favoris]").forEach(function (el) { el.textContent = n; });
      document.querySelectorAll("[data-lien-favoris]").forEach(function (el) {
        el.classList.toggle("a-des-favoris", n > 0);
        el.setAttribute("aria-label", n + " — mes favoris");
      });
    }
  };

  /* ---------- Images : WebP + JPEG, plusieurs tailles, visuel de remplacement ---------- */
  var ABSENT = '<div class="visuel-absent" role="img" aria-label="Photographie à venir">' + '<svg class="ico" aria-hidden="true"><use href="#i-photo"/></svg>' + "<span>Photographie à venir</span></div>";
  /* Accepte : photo locale de démonstration, photo Google Drive, photo du mode démonstration, ou toute autre adresse */
  A.photo = function (url, sizes, alt, prioritaire) {
    if (!url) return ABSENT;
    var attrs = ' alt="' + A.esc(alt || "") + '"' + (prioritaire ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"');
    var L = [480, 800, 1200];
    if (/^assets\/img\/biens\/[\w-]+$/.test(url)) {
      var set = function (ext) { return L.map(function (w) { return url + "-" + w + "." + ext + " " + w + "w"; }).join(", "); };
      return '<picture><source type="image/webp" srcset="' + set("webp") + '" sizes="' + sizes + '"><img src="' + url + '-800.jpg" srcset="' + set("jpg") + '" sizes="' + sizes + '" width="800" height="600"' + attrs + "></picture>";
    }
    if (url.indexOf("demo-photo:") === 0) return '<img src="' + (window.ATLAS_DEMO ? ATLAS_DEMO.photo(url) : "") + '"' + attrs + ">";
    if (/^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(url)) {
      return '<img src="' + url + '=w1200" srcset="' + [480, 800, 1600].map(function (w) { return url + "=w" + w + " " + w + "w"; }).join(", ") + '" sizes="' + sizes + '" referrerpolicy="no-referrer"' + attrs + ">";
    }
    return /^https:\/\//.test(url) ? '<img src="' + A.esc(url) + '" referrerpolicy="no-referrer"' + attrs + ">" : ABSENT;
  };
  A.image = function (b, sizes) {
    return A.photo(b.photos && b.photos[0], sizes, b.titre + " — " + b.ville + ", " + b.quartier);
  };
  A.estIllustration = function (url) { return /^assets\/img\//.test(url || ""); };
  /* Si une image ne se charge pas, on affiche le visuel de remplacement */
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || img.dataset.remplace) return;
    img.dataset.remplace = "1";
    var p = img.closest("picture");
    if (p) p.querySelectorAll("source").forEach(function (s) { s.remove(); });
    img.removeAttribute("srcset");
    img.src = IMG + "visuel-absent.svg";
    img.classList.add("est-remplace");
  }, true);

  /* ---------- Carte d'un bien ---------- */
  A.carte = function (b) {
    var fav = A.favoris.contient(b.id);
    var badges = '<span class="badge badge-type">' + A.esc(b.type) + "</span>";
    if (b.statut === "vendu") badges += '<span class="badge badge-vendu">Vendu</span>';
    else if (b.statut === "sous-offre") badges += '<span class="badge badge-offre">Sous offre</span>';
    else if (b.exclusivite) badges += '<span class="badge badge-or">Exclusivité</span>';
    else if (A.estNouveau(b)) badges += '<span class="badge badge-or">Nouveau</span>';

    var carac = [];
    if (b.surface) carac.push("<li>" + A.icone("surface") + "<span>" + b.surface + " m²</span></li>");
    if (b.chambres) carac.push("<li>" + A.icone("lit") + "<span>" + b.chambres + " ch.</span></li>");
    if (b.sdb) carac.push("<li>" + A.icone("bain") + "<span>" + b.sdb + " sdb</span></li>");
    if (!b.surface && b.terrain) carac.push("<li>" + A.icone("surface") + "<span>Terrain " + new Intl.NumberFormat("fr-FR").format(b.terrain) + " m²</span></li>");

    var lien = "bien.html?id=" + encodeURIComponent(b.id);
    return '<article class="carte" data-id="' + b.id + '">' +
      '<div class="carte-visuel"><a class="carte-visuel-lien" href="' + lien + '" tabindex="-1" aria-hidden="true">' + A.image(b, "(min-width: 1100px) 31vw, (min-width: 700px) 46vw, 92vw") + "</a>" +
        '<div class="carte-badges">' + badges + "</div>" +
        '<button class="coeur' + (fav ? " est-actif" : "") + '" type="button" data-favori="' + b.id + '" aria-pressed="' + fav +
          '" aria-label="' + (fav ? "Retirer des favoris" : "Ajouter aux favoris") + ' : ' + A.esc(b.titre) + '">' + A.icone("coeur") + "</button>" +
        (A.estIllustration(b.photos[0]) ? '<span class="mention-demo">Visuel d’illustration</span>' : "") +
      "</div>" +
      '<div class="carte-corps">' +
        '<p class="carte-lieu">' + A.esc(b.ville) + " · " + A.esc(b.quartier) + "</p>" +
        '<h3 class="carte-titre">' + A.esc(b.titre) + "</h3>" +
        '<ul class="carte-carac">' + carac.join("") + "</ul>" +
        '<div class="carte-pied"><p class="carte-prix">' + A.prix(b.prix) + "</p>" +
        '<a class="carte-lien" href="bien.html?id=' + encodeURIComponent(b.id) + '" aria-label="Voir le bien : ' + A.esc(b.titre) + '">Voir le bien ' + A.icone("fleche") + "</a></div>" +
        '<p class="carte-ref">Réf. ' + b.id + "</p>" +
      "</div></article>";
  };

  /* ---------- Contacts WhatsApp ----------
     Source : paramètre « whatsapp » de l'Espace Pro, sinon ATLAS.config.whatsapp.
     Format : "Nom:numéro international, Nom:numéro" (ou un seul numéro). */
  A.icoWA = '<svg class="ico-wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5.100-1.300A10 10 0 1 0 12 2zm0 1.800a8.200 8.200 0 1 1-4.200 15.200l-.3-.2-3 .8.800-2.900-.2-.3A8.200 8.200 0 0 1 12 3.800zM8.500 7.300c-.2 0-.5 0-.7.300-.3.300-1 1-1 2.300s1 2.700 1.200 2.900c.1.200 2 3.100 4.900 4.200 2.400.9 2.900.8 3.400.7.500-.1 1.700-.7 1.900-1.300.2-.7.2-1.200.2-1.300-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.1-.7.200l-.9 1.100c-.2.2-.3.2-.6.1-.3-.2-1.200-.5-2.300-1.400-.9-.800-1.400-1.700-1.600-2-.2-.3 0-.5.100-.600l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.100c-.2-.5-.4-.5-.6-.5z"/></svg>';
  A.contacts = function () {
    var brut = (A.agence && A.agence.whatsapp) || A.config.whatsapp || "";
    return String(brut).split(/[,;\n]+/).map(function (x) {
      var m = x.split(":"), nom = m.length > 1 ? m[0].trim() : "";
      return { nom: nom, numero: (m.length > 1 ? m.slice(1).join("") : m[0]).replace(/\D/g, "") };
    }).filter(function (c) { return c.numero.length >= 8; });
  };
  A.numeroLisible = function (n) {
    var m = /^(33|212)(\d)(\d{8})$/.exec(n);
    return m ? "+" + m[1] + " " + m[2] + " " + m[3].replace(/(\d\d)(?=\d)/g, "$1 ") : "+" + n;
  };
  A.lienWhatsApp = function (numero, texte) {
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(texte || "Bonjour, je vous contacte depuis le site Nassiri Real Estate.");
  };
  var dernierFocus = null;
  function fermerChoix() { var c = document.querySelector(".wa-choix"); if (c) { c.remove(); if (dernierFocus && dernierFocus.focus) dernierFocus.focus(); } }
  A.ouvrirWhatsApp = function (texte) {
    var c = A.contacts();
    if (!c.length) { A.message("Numéro WhatsApp à renseigner dans l’Espace Pro (Paramètres)."); return; }
    if (c.length === 1) { window.open(A.lienWhatsApp(c[0].numero, texte), "_blank", "noopener"); return; }
    fermerChoix(); dernierFocus = document.activeElement;
    var d = document.createElement("div"); d.className = "wa-choix";
    d.innerHTML = '<div class="wa-choix-boite" role="dialog" aria-modal="true" aria-labelledby="wa-titre"><h2 id="wa-titre">Écrire sur WhatsApp</h2><p>Choisissez votre interlocuteur :</p>' +
      c.map(function (x) { return '<a class="wa-contact" href="' + A.lienWhatsApp(x.numero, texte) + '" target="_blank" rel="noopener">' + A.icoWA + "<span><strong>" + A.esc(x.nom || "Nassiri Real Estate") + "</strong><small>" + A.numeroLisible(x.numero) + "</small></span>" + A.icone("fleche") + "</a>"; }).join("") +
      '<button type="button" class="lien-discret" data-wa-fermer>Annuler</button></div>';
    document.body.appendChild(d); d.querySelector(".wa-contact").focus();
  };
  /* Blocs « contact direct » : WhatsApp et appel pour chaque interlocuteur */
  A.rendreContacts = function () {
    var c = A.contacts(), mail = (A.agence && A.agence.email_contact) || "";
    document.documentElement.classList.toggle("sans-whatsapp", !c.length);
    document.querySelectorAll("[data-contacts-directs]").forEach(function (el) {
      el.innerHTML = c.map(function (x) {
        return '<div class="contact-direct"><div class="contact-direct-nom"><strong>' + A.esc(x.nom || "Nassiri Real Estate") + "</strong><span>" + A.numeroLisible(x.numero) + "</span></div>" +
          '<a class="btn btn-wa" href="' + A.lienWhatsApp(x.numero, el.dataset.contactsDirects || "") + '" target="_blank" rel="noopener" aria-label="Écrire à ' + A.esc(x.nom || "l’agence") + ' sur WhatsApp">' + A.icoWA + " WhatsApp</a>" +
          '<a class="btn btn-appel" href="tel:+' + x.numero + '" aria-label="Appeler ' + A.esc(x.nom || "l’agence") + '">' + A.icone("telephone") + " Appeler</a></div>";
      }).join("") + (mail ? '<a class="contact-mail" href="mailto:' + A.esc(mail) + '">' + A.icone("courrier") + " " + A.esc(mail) + "</a>" : "");
      el.hidden = !c.length && !mail;
    });
  };

  /* ---------- Message discret ---------- */
  var minuteur;
  A.message = function (texte) {
    var t = document.getElementById("message");
    if (!t) { t = document.createElement("div"); t.id = "message"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = texte; t.classList.add("est-visible");
    clearTimeout(minuteur); minuteur = setTimeout(function () { t.classList.remove("est-visible"); }, 3600);
  };

  /* ---------- Interactions globales ---------- */
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-favori]");
    if (c) {
      e.preventDefault();
      var actif = A.favoris.basculer(c.dataset.favori);
      document.querySelectorAll('[data-favori="' + c.dataset.favori + '"]').forEach(function (el) {
        el.classList.toggle("est-actif", actif);
        el.setAttribute("aria-pressed", actif);
        el.setAttribute("aria-label", (actif ? "Retirer des favoris" : "Ajouter aux favoris"));
      });
      A.message(actif ? "Ajouté à vos favoris" : "Retiré de vos favoris");
      /* Statistique anonyme (aucune identité transmise) ; un échec n'empêche rien */
      A.api("favori", { bien_id: c.dataset.favori, retire: !actif }).catch(function () {});
      document.dispatchEvent(new CustomEvent("atlas:favoris"));
      return;
    }
    var wa = e.target.closest("[data-whatsapp]");
    if (wa) { e.preventDefault(); A.ouvrirWhatsApp(wa.dataset.whatsapp || ""); return; }
    if (e.target.closest("[data-wa-fermer]") || e.target.classList.contains("wa-choix")) { fermerChoix(); return; }
    if (e.target.closest(".wa-contact")) { setTimeout(fermerChoix, 50); }
    if (e.target.closest("[data-menu-ouvrir]")) { basculerMenu(true); return; }
    if (e.target.closest("[data-menu-fermer]") || e.target.closest(".menu-mobile a")) { basculerMenu(false); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { basculerMenu(false); fermerChoix(); } });

  function basculerMenu(ouvert) {
    var m = document.getElementById("menu-mobile");
    if (!m) return;
    m.classList.toggle("est-ouvert", ouvert);
    m.setAttribute("aria-hidden", !ouvert);
    document.documentElement.classList.toggle("menu-ouvert", ouvert);
    var b = document.querySelector("[data-menu-ouvrir]");
    if (b) b.setAttribute("aria-expanded", ouvert);
    if (ouvert) { var f = m.querySelector("[data-menu-fermer]"); if (f) f.focus(); } else if (b && m.contains(document.activeElement)) b.focus();
  }

  /* ---------- Formulaires de demande (contact, visite, confier mon bien) ---------- */
  A.valeurs = function (form) {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name && el.type !== "file" && el.type !== "submit") o[el.name] = el.type === "checkbox" ? el.checked : el.value.trim(); });
    return o;
  };
  A.envoyerDemande = function (form, action, donnees) {
    var bouton = form.querySelector('[type="submit"]'), retour = form.querySelector("[data-retour]"), libelle = bouton.innerHTML;
    var dire = function (texte, type) {
      if (!retour) return;
      retour.textContent = texte; retour.className = "retour " + (type || ""); retour.hidden = !texte;
      retour.setAttribute("role", type === "est-erreur" ? "alert" : "status");
      if (texte && retour.scrollIntoView) retour.scrollIntoView({ block: "nearest" });
    };
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) { el.removeAttribute("aria-invalid"); });
    var invalide = function (nom) { var el = form.elements[nom]; if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); } };
    if (donnees.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donnees.email)) { dire("Vérifiez l’adresse e-mail.", "est-erreur"); invalide("email"); return Promise.resolve(false); }
    if (!donnees.nom) { dire("Indiquez votre nom.", "est-erreur"); invalide("nom"); return Promise.resolve(false); }
    if (!donnees.telephone && !donnees.email) { dire("Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.", "est-erreur"); invalide("telephone"); return Promise.resolve(false); }
    bouton.disabled = true; bouton.textContent = "Envoi en cours…"; dire("");
    return A.api(action, donnees).then(function () {
      form.reset();
      dire("Merci, votre demande a bien été enregistrée. Nous revenons vers vous rapidement." + (A.demo ? " (Mode démonstration : aucun e-mail réel n’est envoyé.)" : ""), "est-succes");
      return true;
    }, function (err) { dire(err.message, "est-erreur"); return false; })
      .then(function (ok) { bouton.disabled = false; bouton.innerHTML = libelle; return ok; });
  };
  document.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-demande]");
    if (!f) return;
    e.preventDefault();
    A.envoyerDemande(f, f.dataset.demande, A.valeurs(f));
  });

  /* Apparition douce des sections */
  function animer() {
    var els = document.querySelectorAll("[data-apparait]");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(function (el) { el.classList.add("est-visible"); }); return;
    }
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("est-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    animer();
    if (A.demo) document.documentElement.classList.add("mode-demo");
    else document.querySelectorAll("[data-demo]").forEach(function (el) { el.remove(); });
    /* Adresse canonique absolue, sans connaître le domaine à l'avance */
    var canon = location.origin + location.pathname + (/bien\.html$/.test(location.pathname) && /[?&]id=/.test(location.search) ? "?id=" + encodeURIComponent(new URLSearchParams(location.search).get("id")) : "");
    if (/^https?:/.test(location.protocol)) {
      var lc = document.querySelector("[data-canonique]"), og = document.querySelector("[data-canonique-og]");
      if (lc) lc.href = canon; if (og) og.content = canon;
    }
    A.rendreContacts();
    A.pret = A.charger().then(function (biens) { A.favoris.rafraichir(); A.rendreContacts(); return biens; });
    A.pret.catch(function (err) {
      document.querySelectorAll("[data-chargement]").forEach(function (el) { el.innerHTML = '<div class="vide"><h2>Le catalogue est momentanément indisponible</h2><p>' + A.esc(err.message) + '</p><button class="btn btn-ligne" type="button" onclick="location.reload()">Réessayer</button></div>'; });
    });
    document.querySelectorAll("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });
})();
