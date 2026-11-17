/* ==========================================================================
   NASSIRI REAL ESTATE — Espace Agent (apporteurs d'affaires)
   Chaque agent ne voit et ne modifie que ses propres biens. Toute publication
   passe par une validation du staff (voir Espace Pro). Aucune information de
   commission n'est jamais envoyée à cet espace par le serveur.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, e = A.esc, ico = A.icone;
  var racine, D = null;
  var etat = { vue: "biens", id: null, filtreBien: "", recherche: "", edition: null, occupe: "" };
  var LIB_STATUT = { brouillon: "Brouillon", en_attente: "En attente de validation", publie: "Publié", "sous-offre": "Sous offre", vendu: "Vendu", archive: "Archivé", refuse: "À corriger" };
  var LIB_TRANSACTION = { vente: "Vente", "location-longue": "Location longue durée", "location-courte": "Location courte durée (saisonnière)" };

  /* ---------- Outils ---------- */
  function n(v) { return parseFloat(v) || 0; }
  function bien(id) { return D.biens.filter(function (b) { return b.id === id; })[0]; }
  function photosDe(id) { return D.photos.filter(function (p) { return p.bien_id === id; }).sort(function (a, b) { return n(a.ordre) - n(b.ordre); }); }
  function option(v, libelle, choisi) { return '<option value="' + e(v) + '"' + (v === choisi ? " selected" : "") + ">" + e(libelle) + "</option>"; }
  function champ(nom, libelle, valeur, attrs, cls) {
    return '<div class="' + (cls || "") + '"><label for="f-' + nom + '">' + libelle + '</label><input id="f-' + nom + '" name="' + nom + '" value="' + e(valeur || "") + '" ' + (attrs || "") + "></div>";
  }
  function badgeStatut(s) { return '<span class="a-statut a-statut-' + e(s) + '">' + e(LIB_STATUT[s] || s) + "</span>"; }

  function confirmer(titre, texte, bouton) {
    return new Promise(function (ok) {
      var m = document.createElement("div"); m.className = "a-modale";
      m.innerHTML = '<div class="a-modale-boite" role="alertdialog" aria-modal="true"><h2>' + e(titre) + "</h2><p>" + e(texte) + '</p><div class="a-modale-actions"><button class="btn btn-ligne" data-r="0">Annuler</button><button class="btn btn-danger" data-r="1">' + e(bouton) + "</button></div></div>";
      m.addEventListener("click", function (ev) { var b = ev.target.closest("[data-r]"); if (b || ev.target === m) { m.remove(); ok(!!b && b.dataset.r === "1"); } });
      document.body.appendChild(m); m.querySelector('[data-r="0"]').focus();
    });
  }

  /* Exécute une action serveur puis recharge les données */
  function faire(action, donnees, message, sansRecharger) {
    etat.occupe = "Enregistrement…"; indicateur();
    return A.apiAgent(action, donnees).then(function (r) {
      return (sansRecharger ? Promise.resolve() : charger()).then(function () { etat.occupe = ""; indicateur(); if (message) A.message(message); return r; });
    }).catch(function (err) {
      etat.occupe = ""; indicateur();
      if (err.code === "AUTH") { A.jetonAgent.ecrire(""); D = null; rendre(); A.message(err.message); }
      else A.message(err.message);
      throw err;
    });
  }
  function charger() { return A.apiAgent("donneesAgent").then(function (r) { D = r; }); }
  function indicateur() { var i = document.getElementById("a-occupe"); if (i) { i.textContent = etat.occupe; i.hidden = !etat.occupe; } }
  function aller(vue, id) { etat.vue = vue; etat.id = id || null; etat.edition = null; etat.recherche = ""; rendre(); window.scrollTo(0, 0); }

  /* ====================================================================== CONNEXION */
  function vueConnexion(erreur) {
    return '<div class="a-connexion"><form class="a-connexion-carte" id="form-connexion">' +
      '<img class="a-connexion-logo" src="assets/img/logo/logo-clair-440.png" width="440" height="302" alt="Nassiri Real Estate">' +
      "<h1>Espace Agent</h1><p>Accès réservé aux apporteurs d’affaires de l’agence.</p>" +
      (A.demo ? '<div class="a-note">' + ico("info") + "<div><strong>Mode démonstration</strong><br>Les données sont fictives, enregistrées sur cet appareil.<br>Identifiants de démonstration : <code>youssef.exemple@example.com</code> / <code>agent-demo</code></div></div>" : "") +
      '<label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="username" required>' +
      '<label for="f-mdp">Code PIN</label><input id="f-mdp" name="motDePasse" type="password" autocomplete="current-password" required>' +
      (erreur ? '<p class="retour est-erreur">' + e(erreur) + "</p>" : "") +
      '<button class="btn btn-vert" type="submit">Se connecter</button><a class="a-retour-site" href="index.html">← Retour au site</a></form></div>';
  }

  /* ====================================================================== MES BIENS */
  function ligneMotif(b) {
    if (b.statut !== "refuse" || !b.motif_refus) return "";
    return '<div class="a-refus"><strong>' + ico("info") + " À corriger : " + e(b.motif_refus) + "</strong>" + (b.commentaire_refus ? "<p>" + e(b.commentaire_refus) + "</p>" : "") + "</div>";
  }
  function vueBiens() {
    var q = etat.recherche.toLowerCase();
    var l = D.biens.filter(function (b) { return (!etat.filtreBien || b.statut === etat.filtreBien) && (!q || (b.titre + " " + b.ville + " " + b.quartier + " " + b.id).toLowerCase().indexOf(q) !== -1); })
      .sort(function (a, b) { return String(b.date_maj).localeCompare(String(a.date_maj)); });
    var puce = function (v, t) { var c = v ? D.biens.filter(function (b) { return b.statut === v; }).length : D.biens.length; return '<button class="puce' + (etat.filtreBien === v ? " est-actif" : "") + '" data-action="filtre-bien" data-v="' + v + '">' + t + " (" + c + ")</button>"; };
    return '<div class="a-outils"><div class="a-puces">' + puce("", "Tous") + puce("brouillon", "Brouillons") + puce("en_attente", "En attente") + puce("refuse", "À corriger") + puce("publie", "Publiés") + puce("sous-offre", "Sous offre") + puce("vendu", "Vendus") + "</div>" +
      '<input class="a-recherche" type="search" placeholder="Rechercher un bien…" value="' + e(etat.recherche) + '" data-recherche aria-label="Rechercher un bien"></div>' +
      (l.length ? '<div class="a-biens">' + l.map(function (b) {
        var ph = photosDe(b.id);
        return '<article class="a-bien"><button class="a-bien-photo" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '" aria-label="Modifier ' + e(b.titre) + '">' + A.photo(ph[0] && ph[0].url, "160px", "") + "</button>" +
          '<div class="a-bien-infos"><div class="a-bien-haut">' + badgeStatut(b.statut) + "</div>" +
          "<h3>" + e(b.titre) + "</h3><p>" + e(b.type) + " · " + e(b.ville) + (b.quartier ? " · " + e(b.quartier) : "") + " · Réf. " + e(b.id) + "</p>" +
          '<p class="a-bien-prix">' + (b.prix_sur_demande === "oui" ? "Prix sur demande" : n(b.prix) ? A.prix(n(b.prix)) : "Prix à renseigner") + '<span class="a-mesure">' + ico("photo") + " " + ph.length + "</span></p>" +
          ligneMotif(b) + "</div>" +
          '<div class="a-bien-actions"><button class="btn btn-vert" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '">' + ico("crayon") + " Modifier</button>" +
          (b.statut === "publie" || b.statut === "sous-offre" ? '<a class="a-icone" href="bien.html?id=' + encodeURIComponent(b.id) + '" target="_blank" rel="noopener" title="Voir sur le site">' + ico("oeil") + "</a>" : "") +
          (["brouillon", "en_attente", "refuse"].indexOf(b.statut) !== -1 ? '<button class="a-icone a-icone-danger" data-action="supprimer-bien" data-id="' + e(b.id) + '" title="Supprimer">' + ico("corbeille") + "</button>" : "") +
          "</div></article>";
      }).join("") + "</div>" : '<p class="a-vide a-bloc">Aucun bien dans cette liste.</p>');
  }

  function vueBien() {
    var nouveau = !etat.id, b = etat.edition || (etat.edition = nouveau ? { statut: "brouillon", type: "Villa", ville: "Marrakech", equipements: "" } : Object.assign({}, bien(etat.id)));
    if (!b) return '<p class="a-vide a-bloc">Bien introuvable.</p>';
    if (!nouveau && ["brouillon", "en_attente", "refuse"].indexOf(b.statut) === -1) {
      return '<section class="a-bloc"><h2>' + e(b.titre) + "</h2>" + badgeStatut(b.statut) +
        '<p class="a-aide">Ce bien est déjà validé par l’agence : il ne peut plus être modifié depuis l’Espace Agent. Contactez l’agence pour toute mise à jour.</p>' +
        '<button type="button" class="btn btn-ligne" data-action="aller" data-vue="biens">Retour à mes biens</button></section>';
    }
    var ph = nouveau ? [] : photosDe(etat.id), eq = String(b.equipements || "").split("|").filter(Boolean);
    var tous = A.equipements.concat(eq.filter(function (x) { return A.equipements.indexOf(x) === -1; }));
    return '<form id="form-bien" class="a-form" novalidate>' +
      (b.statut === "refuse" ? ligneMotif(b) : "") +
      '<section class="a-bloc"><h2>L’essentiel</h2><div class="a-grille">' +
        champ("titre", "Titre de l’annonce *", b.titre, 'placeholder="ex. Villa contemporaine avec piscine" required', "plein") +
        '<div><label for="f-type">Type de bien</label><select id="f-type" name="type">' + A.types.map(function (t) { return option(t, t, b.type); }).join("") + "</select></div>" +
        '<div><label for="f-transaction">Transaction</label><select id="f-transaction" name="transaction">' + (D.listes.transactionsBien || ["vente", "location-longue", "location-courte"]).map(function (t) { return option(t, LIB_TRANSACTION[t] || t, b.transaction || "vente"); }).join("") + "</select></div>" +
        champ("prix", "Prix (DH)" + ((b.transaction === "location-longue") ? " — par mois" : (b.transaction === "location-courte") ? " — par nuit" : ""), b.prix, 'inputmode="numeric" placeholder="ex. 4200000"') +
        champ("ville", "Ville", b.ville, 'list="l-villes"') + '<datalist id="l-villes">' + A.villes.map(function (v) { return '<option value="' + v + '">'; }).join("") + "</datalist>" +
        champ("quartier", "Quartier (affiché au public)", b.quartier, 'placeholder="ex. Palmeraie"') +
      '</div></section>' +
      '<section class="a-bloc"><h2>Photos</h2><p class="a-aide">La première photo est la photo principale. ' + (nouveau ? "Le bien sera enregistré en brouillon dès l’ajout de la première photo." : "") + "</p>" +
        '<div class="a-photos">' + ph.map(function (p, i) {
          return '<div class="a-photo' + (i === 0 ? " est-principale" : "") + '">' + A.photo(p.url, "200px", "Photo " + (i + 1)) + (i === 0 ? '<span class="a-photo-etiquette">' + ico("etoile") + " Principale</span>" : "") +
            '<div class="a-photo-actions">' + (i > 0 ? '<button type="button" data-action="photo-gauche" data-id="' + e(p.id) + '" title="Déplacer vers la gauche">' + ico("gauche") + "</button>" : "") +
            (i > 0 ? '<button type="button" data-action="photo-principale" data-id="' + e(p.id) + '" title="Définir comme photo principale">' + ico("etoile") + "</button>" : "") +
            (i < ph.length - 1 ? '<button type="button" data-action="photo-droite" data-id="' + e(p.id) + '" title="Déplacer vers la droite">' + ico("droite") + "</button>" : "") +
            '<button type="button" class="est-danger" data-action="photo-supprimer" data-id="' + e(p.id) + '" title="Supprimer la photo">' + ico("corbeille") + "</button></div></div>";
        }).join("") + '<label class="a-photo a-photo-ajout" for="f-photos">' + ico("plus") + "<span>Ajouter des photos</span></label></div>" +
        '<input class="sr" id="f-photos" type="file" accept="image/*" multiple><p class="a-aide" id="a-envoi" hidden></p></section>' +
      '<section class="a-bloc"><h2>Caractéristiques</h2><div class="a-grille a-grille-4">' +
        champ("surface", "Surface habitable (m²)", b.surface, 'inputmode="numeric"') + champ("terrain", "Surface du terrain (m²)", b.terrain, 'inputmode="numeric"') +
        champ("chambres", "Chambres", b.chambres, 'inputmode="numeric"') + champ("sdb", "Salles de bains", b.sdb, 'inputmode="numeric"') + "</div>" +
        '<label class="a-etiquette">Équipements</label><div class="a-cases">' + tous.map(function (x) { return '<label class="a-case"><input type="checkbox" name="equipement" value="' + e(x) + '"' + (eq.indexOf(x) !== -1 ? " checked" : "") + "><span>" + e(x) + "</span></label>"; }).join("") + "</div></section>" +
      '<section class="a-bloc"><h2>Description</h2><label class="sr" for="f-description">Description</label><textarea id="f-description" name="description" rows="8" placeholder="Présentez le bien : volumes, prestations, environnement…">' + e(b.description || "") + "</textarea></section>" +
      '<section class="a-bloc"><h2>Situation juridique</h2><p class="a-aide">La vérification des documents est effectuée par l’agence avant publication.</p><div class="a-grille">' + champ("juridique", "Situation (le cas échéant)", b.juridique, 'placeholder="ex. Titré, melkia, VNA…"', "plein") + "</div></section>" +
      '<div class="a-barre"><div class="a-barre-statut">' + badgeStatut(b.statut || "brouillon") + (nouveau ? "" : "<small>Réf. " + e(b.id) + "</small>") + "</div>" +
        '<div class="a-barre-actions"><button type="button" class="btn btn-ligne" data-action="aller" data-vue="biens">Retour</button>' +
        '<button type="submit" class="btn btn-ligne" data-soumettre="0">Enregistrer le brouillon</button>' +
        '<button type="submit" class="btn btn-vert" data-soumettre="1">Soumettre à l’agence</button></div></div></form>';
  }
  function lireFormBien() {
    var f = document.getElementById("form-bien"); if (!f || !etat.edition) return;
    var b = etat.edition;
    ["titre", "type", "transaction", "prix", "ville", "quartier", "surface", "terrain", "chambres", "sdb", "description", "juridique"].forEach(function (k) { b[k] = f.elements[k].value.trim(); });
    b.equipements = Array.prototype.filter.call(f.querySelectorAll('[name="equipement"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }).join("|");
  }
  function enregistrerBien(soumettre, silencieux) {
    lireFormBien();
    var b = Object.assign({}, etat.edition);
    if (!b.titre && !silencieux) { A.message("Indiquez un titre pour l’annonce."); document.getElementById("f-titre").focus(); return Promise.reject(new Error("titre")); }
    if (soumettre) {
      if (!n(b.prix) && !silencieux) { A.message("Indiquez un prix avant de soumettre ce bien à l’agence."); document.getElementById("f-prix").focus(); return Promise.reject(new Error("prix")); }
      b.statut = "en_attente";
    }
    return faire("bienEnregistrerAgent", { bien: b }, silencieux ? "" : (soumettre ? "Bien soumis à l’agence pour validation." : "Brouillon enregistré.")).then(function (r) {
      etat.id = r.bien.id; etat.edition = Object.assign({}, bien(r.bien.id)); rendre(); return r.bien;
    });
  }
  function envoyerPhotos(fichiers) {
    var info = function (t) { var i = document.getElementById("a-envoi"); if (i) { i.textContent = t; i.hidden = !t; } };
    var debut = etat.id ? Promise.resolve() : enregistrerBien(false, true);
    return debut.then(function () {
      var liste = Array.prototype.slice.call(fichiers), fait = 0, echecs = 0, id = etat.id;
      return liste.reduce(function (p, f) {
        return p.then(function () {
          info("Envoi de la photo " + (fait + 1) + " sur " + liste.length + "…");
          return A.preparerPhoto(f).then(function (ph) { return faire("photoAjouterAgent", { bien_id: id, photo: { nom: ph.nom, mime: ph.mime, donnees: ph.donnees } }, "", true); })
            .then(function () { fait++; }, function (err) { echecs++; fait++; if (err.code === "AUTH") throw err; });
        });
      }, Promise.resolve()).then(function () { lireFormBien(); return charger(); }).then(function () {
        rendre(); A.message(echecs ? echecs + " photo(s) n’ont pas pu être ajoutées." : liste.length + (liste.length > 1 ? " photos ajoutées." : " photo ajoutée."));
      });
    });
  }
  function ordonnerPhotos(idPhoto, mouvement) {
    var ids = photosDe(etat.id).map(function (p) { return p.id; }), i = ids.indexOf(idPhoto);
    ids.splice(i, 1);
    ids.splice(mouvement === "debut" ? 0 : Math.max(0, i + mouvement), 0, idPhoto);
    lireFormBien();
    return faire("photosOrdonnerAgent", { bien_id: etat.id, ids: ids }, "Ordre des photos mis à jour.").then(rendre);
  }

  /* ====================================================================== GABARIT */
  var MENU = [["biens", "Mes biens", "maison"]];
  function rendre() {
    if (!D) { racine.innerHTML = vueConnexion(); return; }
    var v = etat.vue, section = v === "bien" ? "biens" : v;
    var titres = { biens: "Mes biens", bien: etat.id ? "Modifier le bien" : "Proposer un bien" };
    var corps = { biens: vueBiens, bien: vueBien }[v]();
    var action = v === "biens" ? '<button class="btn btn-or" data-action="aller" data-vue="bien">' + ico("plus") + " Proposer un bien</button>" : "";
    var retour = v === "bien" ? "biens" : "";
    racine.innerHTML = '<div class="a-app"><aside class="a-menu"><a class="a-menu-logo" href="index.html" title="Voir le site"><img src="assets/img/logo/logo-clair-440.png" width="440" height="302" alt="Nassiri Real Estate"></a><nav aria-label="Espace Agent">' +
      MENU.map(function (m) { return '<button class="' + (section === m[0] ? "est-actif" : "") + '" data-action="aller" data-vue="' + m[0] + '"' + (section === m[0] ? ' aria-current="page"' : "") + ">" + ico(m[2]) + "<span>" + m[1] + "</span>" + "</button>"; }).join("") +
      '</nav><div class="a-menu-bas"><a href="index.html" target="_blank" rel="noopener">' + ico("oeil") + '<span>Voir le site</span></a><button data-action="deconnexion">' + ico("sortie") + "<span>Déconnexion</span></button></div></aside>" +
      '<main class="a-principal">' + (A.demo ? '<p class="a-bandeau-demo">' + ico("info") + " Mode démonstration — données fictives enregistrées sur cet appareil.</p>" : "") +
      '<header class="a-entete"><div>' + (retour ? '<button class="a-fil-retour" data-action="aller" data-vue="' + retour + '">' + ico("gauche") + " " + titres[retour] + "</button>" : "") + "<h1>" + e(titres[v]) + "</h1></div>" + action + "</header>" +
      '<p class="a-aide" style="margin-bottom:16px">Bonjour ' + e(D.agent.nom.replace(/^Exemple — /, "")) + '. Chaque bien que vous soumettez est vérifié par l’agence avant sa mise en ligne.</p>' + corps + "</main></div>" +
      '<div id="a-occupe" class="a-occupe" role="status" hidden></div>';
  }

  /* ====================================================================== ÉVÉNEMENTS */
  var ACTIONS = {
    aller: function (b) { aller(b.dataset.vue, b.dataset.id); },
    "filtre-bien": function (b) { etat.filtreBien = b.dataset.v; rendre(); },
    deconnexion: function () { A.apiAgent("deconnexionAgent").catch(function () {}).then(function () { A.jetonAgent.ecrire(""); D = null; etat.vue = "biens"; rendre(); }); },
    "supprimer-bien": function (b) {
      var x = bien(b.dataset.id);
      confirmer("Supprimer ce bien ?", "« " + x.titre + " » et ses photos seront supprimés définitivement.", "Supprimer définitivement")
        .then(function (ok) { if (ok) faire("bienSupprimerAgent", { id: x.id }, "Bien supprimé.").then(function () { aller("biens"); }); });
    },
    "photo-supprimer": function (b) {
      confirmer("Supprimer cette photo ?", "Elle sera retirée de l’annonce.", "Supprimer").then(function (ok) { if (ok) { lireFormBien(); faire("photoSupprimerAgent", { id: b.dataset.id }, "Photo supprimée.").then(rendre); } });
    },
    "photo-gauche": function (b) { ordonnerPhotos(b.dataset.id, -1); },
    "photo-droite": function (b) { ordonnerPhotos(b.dataset.id, 1); },
    "photo-principale": function (b) { ordonnerPhotos(b.dataset.id, "debut"); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    racine = document.getElementById("agent");
    racine.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-action]");
      if (b && ACTIONS[b.dataset.action]) { ev.preventDefault(); ACTIONS[b.dataset.action](b); }
    });
    racine.addEventListener("change", function (ev) {
      if (ev.target.id === "f-photos" && ev.target.files.length) { var f = ev.target.files; envoyerPhotos(f).catch(function () {}); }
    });
    racine.addEventListener("input", function (ev) {
      if (ev.target.matches("[data-recherche]")) {
        etat.recherche = ev.target.value; var pos = ev.target.selectionStart; rendre();
        var c = racine.querySelector("[data-recherche]"); c.focus(); try { c.setSelectionRange(pos, pos); } catch (x) {}
      }
    });
    racine.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = ev.target;
      if (f.id === "form-connexion") {
        var v = A.valeurs(f), bouton = f.querySelector("button"); bouton.disabled = true; bouton.textContent = "Connexion…";
        A.apiAgent("connexionAgent", { email: v.email, motDePasse: v.motDePasse }).then(function (r) { A.jetonAgent.ecrire(r.jeton); return charger(); }).then(rendre, function (err) { D = null; racine.innerHTML = vueConnexion(err.message); document.getElementById("f-email").focus(); });
      } else if (f.id === "form-bien") {
        enregistrerBien(ev.submitter && ev.submitter.dataset.soumettre === "1").catch(function () {});
      }
    });
    /* Session existante : on tente de reprendre directement */
    if (A.jetonAgent.lire()) { racine.innerHTML = '<p class="a-chargement">Chargement…</p>'; charger().then(rendre, function () { A.jetonAgent.ecrire(""); D = null; rendre(); }); }
    else rendre();
  });
})();
