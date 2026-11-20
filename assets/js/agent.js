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
  var etat = { imp: null, vue: "biens", id: null, filtreBien: "", recherche: "", edition: null, occupe: "" };
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
  function aller(vue, id) { if (vue !== "import") etat.imp = null; etat.vue = vue; etat.id = id || null; etat.edition = null; etat.recherche = ""; rendre(); window.scrollTo(0, 0); }

  /* ====================================================================== CONNEXION */
  function vueConnexion(erreur) {
    return '<div class="a-connexion"><form class="a-connexion-carte" id="form-connexion">' +
      '<img class="a-connexion-logo" src="assets/img/logo/logo-nassiri-440.png" width="440" height="302" alt="Nassiri Real Estate">' +
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
      /* V11.2.1 (option A) : sur un bien publié, l'agent peut AJOUTER des photos ; elles sont en ligne tout de suite */
      var enLigne = b.statut === "publie" || b.statut === "sous-offre", phl = photosDe(etat.id);
      return '<section class="a-bloc"><h2>' + e(b.titre) + "</h2>" + badgeStatut(b.statut) +
        '<p class="a-aide">Ce bien est déjà validé par l’agence : ses informations ne peuvent plus être modifiées depuis l’Espace Agent. Contactez l’agence pour toute mise à jour.</p></section>' +
        (enLigne ? '<section class="a-bloc"><h2>Photos (' + phl.length + ")</h2><p class=\"a-aide\">Vous pouvez ajouter des photos : <strong>elles sont mises en ligne tout de suite</strong> (au plus 40 photos par bien). Pour en retirer ou changer l’ordre, contactez l’agence.</p>" +
          '<div class="a-photos">' + phl.map(function (p, i) { return '<div class="a-photo' + (i === 0 ? " est-principale" : "") + '">' + A.photo(p.url, "200px", "Photo " + (i + 1)) + (i === 0 ? '<span class="a-photo-etiquette">' + ico("etoile") + " Principale</span>" : "") + "</div>"; }).join("") +
          '<label class="a-photo a-photo-ajout" for="f-photos">' + ico("plus") + "<span>Ajouter des photos</span></label></div>" +
          '<input class="sr" id="f-photos" type="file" accept="image/*" multiple><p class="a-aide" id="a-envoi" hidden></p></section>' : "") +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="aller" data-vue="biens">Retour à mes biens</button></div>';
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
    var garde = function (ev) { ev.preventDefault(); ev.returnValue = ""; };
    window.addEventListener("beforeunload", garde);
    return debut.then(function () {
      var liste = Array.prototype.slice.call(fichiers), fait = 0, echecs = 0, id = etat.id, lot = "m" + Date.now().toString(36);
      var pause = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
      var envoyer = function (ph, cle, tentative) {
        return A.apiAgent("photoAjouterAgent", { bien_id: id, cle: cle, photo: { nom: ph.nom, mime: ph.mime, donnees: ph.donnees } }).catch(function (err) {
          if (err.code === "AUTH" || err.code === "INTERDIT" || err.code === "LIMITE" || tentative >= 2) throw err;
          return pause(tentative ? 4000 : 1500).then(function () { return envoyer(ph, cle, tentative + 1); });
        });
      };
      return liste.reduce(function (p, f, i) {
        return p.then(function () {
          info("Envoi de la photo " + (fait + 1) + " sur " + liste.length + "…");
          return A.preparerPhoto(f).then(function (ph) { return envoyer(ph, lot + "-" + i, 0); })
            .then(function () { fait++; }, function (err) { echecs++; fait++; if (err.code === "AUTH") throw err; });
        });
      }, Promise.resolve()).then(function () { lireFormBien(); return charger(); }).then(function () {
        window.removeEventListener("beforeunload", garde);
        var b = bien(id), enLigne = b && (b.statut === "publie" || b.statut === "sous-offre");
        rendre(); A.message(echecs ? echecs + " photo(s) n’ont pas pu être ajoutées : réessayez avec ces photos." : liste.length + (liste.length > 1 ? " photos ajoutées" : " photo ajoutée") + (enLigne ? " et déjà en ligne." : "."));
      }, function (err) { window.removeEventListener("beforeunload", garde); throw err; });
    });
  }
  function ordonnerPhotos(idPhoto, mouvement) {
    var ids = photosDe(etat.id).map(function (p) { return p.id; }), i = ids.indexOf(idPhoto);
    ids.splice(i, 1);
    ids.splice(mouvement === "debut" ? 0 : Math.max(0, i + mouvement), 0, idPhoto);
    lireFormBien();
    return faire("photosOrdonnerAgent", { bien_id: etat.id, ids: ids }, "Ordre des photos mis à jour.").then(rendre);
  }


  /* ====================================================================== V11.2 : IMPORT D'ANNONCE PRÉPARÉE PAR UNE IA */
  var IA = function () { return A.importAnnonce; };
  function normT(x) { return IA().norm(x); }
  function copierTexte(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; });
    return new Promise(function (ok) {
      var z = document.createElement("textarea"); z.value = t; z.setAttribute("readonly", ""); z.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(z); z.select(); var r = false; try { r = document.execCommand("copy"); } catch (x) {} z.remove(); ok(r);
    });
  }
  function infoImp(t) { var i = document.getElementById("a-imp-progres"); if (i) { i.textContent = t; i.hidden = !t; } }
  function limiteImpHtml() {
    var L = D.import_annonce || {};
    if (L.illimite) return '<p class="a-aide">Import sans limite activé par l’agence.</p>';
    return '<p class="a-aide">Vous pouvez importer jusqu’à ' + (L.limite || 10) + ' annonces par heure. Il vous en reste ' + (L.restant === null || L.restant === undefined ? (L.limite || 10) : L.restant) + ' pour cette heure.</p>';
  }
  function controlerImp() {
    var I = etat.imp, b = I.bien, al = [], p = n(b.prix), s = n(b.surface), te = n(b.terrain);
    if (!b.titre) al.push({ niveau: "bloquant", texte: "Le titre est obligatoire." });
    if (!b.type) al.push({ niveau: "bloquant", texte: "Choisissez le type de bien." });
    if (!p && b.prix_sur_demande !== "oui") al.push({ niveau: "publier", texte: "Prix manquant : indiquez-le ou cochez « Prix sur demande » pour pouvoir soumettre l’annonce à l’agence." });
    if (b.transaction === "vente" && p && p < 100000) al.push({ niveau: "attention", texte: "Prix de vente très bas (" + A.prix(p) + ") : vérifiez qu’il est bien en dirhams." });
    if (b.transaction === "vente" && p > 200000000) al.push({ niveau: "attention", texte: "Prix très élevé (" + A.prix(p) + ") : vérifiez les zéros." });
    if (b.transaction === "location-longue" && p > 1000000) al.push({ niveau: "attention", texte: "Loyer mensuel très élevé : vérifiez le montant." });
    if (s && te && s > te) al.push({ niveau: "attention", texte: "La surface construite (" + s + " m²) dépasse celle du terrain (" + te + " m²)." });
    if (n(b.chambres) > 30) al.push({ niveau: "attention", texte: "Nombre de chambres inhabituel : vérifiez." });
    if (!b.ville) al.push({ niveau: "attention", texte: "Ville non renseignée." });
    if (!b.description) al.push({ niveau: "attention", texte: "Aucune description." });
    if (!I.photos.length) al.push({ niveau: "attention", texte: "Aucune photo : vous pourrez en ajouter ensuite depuis la fiche du bien." });
    var tn = normT(b.titre).replace(/[^a-z0-9]/g, ""), mref = String(b.notes_privees || "").match(/Réf\. externe : (\S+)/), cref = mref ? "Réf. externe : " + mref[1] : "";
    var dbl = D.biens.filter(function (x) { return (cref && String(x.notes_privees || "").indexOf(cref) !== -1) || (tn && normT(x.titre).replace(/[^a-z0-9]/g, "") === tn) || (n(x.prix) && n(x.prix) === p && normT(x.ville) === normT(b.ville) && n(x.terrain) === te && n(x.surface) === s); })[0];
    I.doublon = dbl || null;
    if (dbl) al.push({ niveau: "doublon", texte: "Doublon possible : vous avez déjà « " + dbl.titre + " » (réf. " + dbl.id + "). Cochez la case de confirmation pour créer quand même." });
    return I.alertesFixes.concat(al);
  }
  function preparerPhotosImp(fichiers, alertes) {
    var I = etat.imp, fait = 0;
    return fichiers.reduce(function (p, f) {
      return p.then(function () {
        infoImp("Préparation de la photo " + (fait + 1) + " sur " + fichiers.length + "…");
        return A.preparerPhoto(f.fichier).then(function (ph) { ph.principale = f.principale; ph.uid = "p" + (I.compteur = (I.compteur || 0) + 1); ph.envoye = false; I.photos.push(ph); },
          function (err) { alertes.push({ niveau: "attention", texte: "Photo ignorée — " + err.message }); });
      }).then(function () { fait++; });
    }, Promise.resolve()).then(function () {
      var i = -1; I.photos.forEach(function (ph, k) { if (ph.principale && i === -1) i = k; });
      if (i > 0) I.photos.unshift(I.photos.splice(i, 1)[0]);
    });
  }
  function demarrerImp(lu) {
    var res = IA().normaliser(lu.brut), fixes = res.alertes.concat(lu.alertes || []), file = etat.imp && etat.imp.file ? etat.imp.file : null;
    etat.imp = { etape: "apercu", source: lu.source, bien: res.bien, photos: [], alertesFixes: fixes, doublon: null, confirmeDoublon: false, occupe: false, resultat: null, file: file,
      id: null, cle: "i" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), finalise: false, soumettre: false, rapide: false, erreur: "" };
    return preparerPhotosImp(lu.fichiers || [], fixes).then(function () { rendre(); window.scrollTo(0, 0); });
  }
  function importerTexte() {
    var ta = document.getElementById("a-imp-texte"), brut;
    try { brut = IA().lireJson(ta ? ta.value : ""); } catch (x) { A.message(x.message); return Promise.resolve(); }
    etat.imp = null;
    return demarrerImp({ brut: brut, fichiers: [], alertes: [], source: "texte" }).catch(function (x) { A.message(x.message); });
  }
  /* Un ou plusieurs fichiers (ZIP ou JSON) : traités l'un après l'autre, chacun avec son aperçu */
  function importerFichiers(liste) {
    var fichiers = Array.prototype.slice.call(liste);
    if (!fichiers.length) return Promise.resolve();
    if (fichiers.length > 30) { A.message("Trente fichiers au maximum à la fois."); return Promise.resolve(); }
    etat.imp = { file: { fichiers: fichiers, i: 0, ok: 0 } };
    return annonceSuivante();
  }
  function annonceSuivante() {
    var F = etat.imp && etat.imp.file; if (!F) return Promise.resolve();
    if (F.i >= F.fichiers.length) { var ok = F.ok; etat.imp = null; aller("biens"); A.message(ok ? ok + (ok > 1 ? " annonces envoyées." : " annonce envoyée.") : "Import terminé."); return Promise.resolve(); }
    var f = F.fichiers[F.i];
    infoImp("Lecture de « " + f.name + " »…");
    return IA().lireFichier(f, infoImp).then(function (lu) { return demarrerImp(lu); }).catch(function (x) {
      infoImp(""); A.message("« " + f.name + " » : " + (x.message || "lecture impossible.")); F.i++; return annonceSuivante();
    });
  }
  function lireFormImp() {
    var f = document.getElementById("form-import"), I = etat.imp; if (!f || !I || !I.bien) return;
    var b = I.bien;
    IA().CHAMPS_TEXTE.concat(IA().CHAMPS_NOMBRE).forEach(function (k) { if (f.elements[k]) b[k] = f.elements[k].value.trim(); });
    if (f.elements.prix_sur_demande) b.prix_sur_demande = f.elements.prix_sur_demande.checked ? "oui" : "non";
    b.equipements = Array.prototype.filter.call(f.querySelectorAll('[name="equipement"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }).join("|");
    var d = document.querySelector('[name="confirme_doublon"]'); if (d) I.confirmeDoublon = d.checked;
  }
  function apercuImp() {
    var I = etat.imp, b = I.bien, ph = I.photos, p = n(b.prix);
    var suffixe = b.transaction === "location-longue" ? " / mois" : b.transaction === "location-courte" ? " / nuit" : "";
    var prix = b.prix_sur_demande === "oui" ? "Prix sur demande" : p ? A.prix(p) + suffixe : "Prix à renseigner";
    var chips = [];
    if (n(b.surface)) chips.push(n(b.surface) + " m² construits");
    if (n(b.terrain)) chips.push(n(b.terrain) + " m² de terrain");
    if (n(b.chambres)) chips.push(n(b.chambres) + " chambre" + (n(b.chambres) > 1 ? "s" : ""));
    if (n(b.sdb)) chips.push(n(b.sdb) + " salle" + (n(b.sdb) > 1 ? "s" : "") + " de bain");
    var eq = String(b.equipements || "").split("|").filter(Boolean);
    return '<div class="a-apercu">' +
      (ph[0] ? '<img class="a-apercu-photo" src="' + ph[0].apercu + '" alt="Photo principale">' : '<div class="a-apercu-photo a-apercu-vide">Aucune photo</div>') +
      (ph.length > 1 ? '<div class="a-apercu-bande">' + ph.slice(1, 7).map(function (x, i) { return '<img src="' + x.apercu + '" alt="Photo ' + (i + 2) + '">'; }).join("") + (ph.length > 7 ? "<span>+" + (ph.length - 7) + "</span>" : "") + "</div>" : "") +
      '<div class="a-apercu-corps"><p class="a-apercu-lieu">' + e([b.type, b.ville, b.quartier].filter(Boolean).join(" · ") || "Type · Ville") + "</p>" +
      "<h3>" + e(b.titre || "Titre de l’annonce") + '</h3><p class="a-apercu-prix">' + e(prix) + "</p>" +
      (chips.length ? '<ul class="a-apercu-chips">' + chips.map(function (c) { return "<li>" + e(c) + "</li>"; }).join("") + "</ul>" : "") +
      (b.juridique ? '<p class="a-apercu-jur"><strong>Situation :</strong> ' + e(b.juridique) + "</p>" : "") +
      (b.description ? b.description.split(/\n{2,}/).map(function (x) { return "<p>" + e(x).replace(/\n/g, "<br>") + "</p>"; }).join("") : '<p class="a-aide">Pas de description.</p>') +
      (eq.length ? '<ul class="a-apercu-chips a-apercu-eq">' + eq.map(function (x) { return "<li>" + e(x) + "</li>"; }).join("") + "</ul>" : "") + "</div></div>";
  }
  function alertesImpHtml() {
    var al = controlerImp(), ico2 = { bloquant: "fermer", publier: "info", attention: "info", doublon: "info", info: "info" };
    var ordre = { bloquant: 0, doublon: 1, publier: 2, attention: 3, info: 4 };
    al.sort(function (x, y) { return ordre[x.niveau] - ordre[y.niveau]; });
    if (!al.length) return '<p class="a-imp-ok">' + ico("coche") + " Aucune anomalie détectée. Relisez tout de même l’aperçu avant d’envoyer.</p>";
    return '<ul class="a-imp-alertes">' + al.map(function (a) { return '<li class="a-imp-' + a.niveau + '">' + ico(ico2[a.niveau]) + "<span>" + e(a.texte) + "</span></li>"; }).join("") + "</ul>" +
      (etat.imp.doublon ? '<label class="a-case a-imp-doublon"><input type="checkbox" name="confirme_doublon" data-action-change="imp-maj"' + (etat.imp.confirmeDoublon ? " checked" : "") + "><span>Créer quand même cette annonce</span></label>" : "");
  }
  function photosImpHtml() {
    var ph = etat.imp.photos;
    return '<div class="a-photos">' + ph.map(function (p, i) {
      return '<div class="a-photo' + (i === 0 ? " est-principale" : "") + '"><img src="' + p.apercu + '" alt="Photo ' + (i + 1) + '">' + (i === 0 ? '<span class="a-photo-etiquette">' + ico("etoile") + " Principale</span>" : "") +
        (etat.imp.id ? (p.envoye ? '<span class="a-photo-etiquette">' + ico("coche") + " Envoyée</span>" : "") : '<div class="a-photo-actions">') + (etat.imp.id ? "" : (i > 0 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="gauche" title="Déplacer vers la gauche">' + ico("gauche") + "</button>" : "")) +
        (etat.imp.id ? "" : (i > 0 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="principale" title="Définir comme photo principale">' + ico("etoile") + "</button>" : "") +
        (i < ph.length - 1 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="droite" title="Déplacer vers la droite">' + ico("droite") + "</button>" : "") +
        '<button type="button" class="est-danger" data-action="imp-photo" data-i="' + i + '" data-m="retirer" title="Retirer cette photo">' + ico("corbeille") + "</button></div>") + "</div>";
    }).join("") + "</div>";
  }
  function majApercuImp() {
    if (etat.vue !== "import" || !etat.imp || etat.imp.etape !== "apercu") return;
    var a = document.getElementById("a-imp-apercu"), l = document.getElementById("a-imp-alertes"), p = document.getElementById("a-imp-photos");
    if (a) a.innerHTML = apercuImp(); if (l) l.innerHTML = alertesImpHtml(); if (p) p.innerHTML = photosImpHtml();
  }
  function vueImport() {
    var I = etat.imp;
    if (!I || !I.etape) {
      return '<section class="a-bloc"><h2>1. Choisir l’annonce préparée par l’IA</h2><p class="a-aide">Importez le fichier <strong>ZIP</strong> reçu (annonce + photos), ou collez simplement le texte JSON de l’annonce. Vous pouvez choisir <strong>plusieurs fichiers à la fois</strong> : vous relirez chaque annonce l’une après l’autre. Rien n’est envoyé à cette étape.</p>' +
        '<div class="a-imp-choix"><label class="btn btn-vert a-imp-fichier" for="a-imp-fichier">' + ico("plus") + " Choisir un ou plusieurs fichiers (ZIP ou JSON)</label>" +
        '<input class="sr" id="a-imp-fichier" type="file" multiple accept=".zip,.json,.txt,application/zip,application/json,text/plain"></div>' +
        '<p class="a-aide" id="a-imp-progres" role="status" hidden></p>' + limiteImpHtml() + "</section>" +
        '<section class="a-bloc"><h2>…ou coller le texte de l’annonce</h2><label class="sr" for="a-imp-texte">Texte JSON de l’annonce</label>' +
        '<textarea id="a-imp-texte" rows="8" placeholder="Collez ici le JSON fourni par votre IA" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>' +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="imp-analyser">Analyser le texte collé</button></div>' +
        '<p class="a-aide">Avec le texte seul, les photos s’ajoutent ensuite depuis la fiche du bien.</p></section>' +
        '<section class="a-bloc"><h2>Consigne à donner à l’IA</h2><p class="a-aide">Copiez cette consigne dans ChatGPT, Claude ou l’IA de votre choix, avec les informations et les photos du bien : elle vous rendra un fichier prêt à importer ici.</p>' +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="imp-copier-consigne">Copier la consigne</button></div></section>';
    }
    if (I.etape === "fini") {
      var r = I.resultat;
      return '<section class="a-bloc a-imp-fin"><h2>' + ico("coche") + (r.soumis ? " Annonce envoyée à l’agence" : " Brouillon enregistré") + "</h2><p><strong>" + e(r.titre) + "</strong> · " + r.photos + " photo" + (r.photos > 1 ? "s" : "") + (r.manquantes ? " (" + r.manquantes + " non envoyée" + (r.manquantes > 1 ? "s" : "") + " : ajoutez-les depuis la fiche du bien)" : "") + ".</p>" +
        '<p class="a-aide">' + (r.soumis ? "L’agence va la relire avant de la mettre en ligne. Vous pouvez suivre son statut dans « Mes biens »." : "Retrouvez-la dans « Mes biens » pour la compléter, puis soumettez-la à l’agence.") + "</p>" +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="aller" data-vue="bien" data-id="' + e(r.id) + '">Ouvrir ce bien</button><button type="button" class="btn btn-vert" data-action="imp-suite">' + (I.file && I.file.i < I.file.fichiers.length ? "Annonce suivante" : "Importer une autre annonce") + "</button></div></section>";
    }
    var b = I.bien, F = I.file, eq = String(b.equipements || "").split("|").filter(Boolean), tous = A.equipements.concat(eq.filter(function (x) { return A.equipements.indexOf(x) === -1; }));
    var ch = function (nom, lib, val, attrs, cls) { return champ(nom, lib, val, 'data-action-change="imp-maj" ' + (attrs || ""), cls); };
    return (F && F.fichiers.length > 1 ? '<p class="a-aide a-bloc">Annonce ' + (F.i + 1) + " sur " + F.fichiers.length + " — fichier « " + e(F.fichiers[F.i].name) + " ».</p>" : "") +
      '<section class="a-bloc"><h2>2. Contrôles</h2><div id="a-imp-alertes">' + alertesImpHtml() + "</div></section>" +
      '<section class="a-bloc"><h2>3. Aperçu de l’annonce</h2><p class="a-aide">Mise en forme simplifiée : le site affichera la même annonce avec son habillage habituel.</p><div id="a-imp-apercu">' + apercuImp() + "</div></section>" +
      '<section class="a-bloc"><h2>Photos (' + I.photos.length + ')</h2><p class="a-aide">La première photo est la photo principale. Flèches : changer l’ordre. Corbeille : retirer.</p><div id="a-imp-photos">' + photosImpHtml() + "</div></section>" +
      '<form id="form-import" class="a-form" novalidate><section class="a-bloc"><h2>4. Corriger si besoin</h2><div class="a-grille">' +
        ch("titre", "Titre de l’annonce *", b.titre, "required", "plein") +
        '<div><label for="f-type">Type de bien</label><select id="f-type" name="type" data-action-change="imp-maj"><option value="">— Choisir —</option>' + A.types.map(function (t) { return option(t, t, b.type); }).join("") + "</select></div>" +
        '<div><label for="f-transaction">Transaction</label><select id="f-transaction" name="transaction" data-action-change="imp-maj">' + (D.listes.transactionsBien || ["vente", "location-longue", "location-courte"]).map(function (t) { return option(t, LIB_TRANSACTION[t] || t, b.transaction || "vente"); }).join("") + "</select></div>" +
        ch("prix", "Prix (DH)", b.prix, 'inputmode="numeric"') + '<div><label class="a-case" style="margin-top:28px"><input type="checkbox" name="prix_sur_demande" data-action-change="imp-maj"' + (b.prix_sur_demande === "oui" ? " checked" : "") + "><span>Prix sur demande</span></label></div>" +
        ch("ville", "Ville", b.ville, "") + ch("quartier", "Quartier (affiché au public)", b.quartier, "") + "</div>" +
        '<div class="a-grille a-grille-4" style="margin-top:14px">' + ch("surface", "Surface habitable (m²)", b.surface, 'inputmode="numeric"') + ch("terrain", "Terrain (m²)", b.terrain, 'inputmode="numeric"') + ch("chambres", "Chambres", b.chambres, 'inputmode="numeric"') + ch("sdb", "Salles de bains", b.sdb, 'inputmode="numeric"') + "</div>" +
        '<label class="a-etiquette">Équipements</label><div class="a-cases">' + tous.map(function (x) { return '<label class="a-case"><input type="checkbox" name="equipement" value="' + e(x) + '" data-action-change="imp-maj"' + (eq.indexOf(x) !== -1 ? " checked" : "") + "><span>" + e(x) + "</span></label>"; }).join("") + "</div>" +
        '<div class="plein" style="margin-top:14px"><label for="f-description">Description</label><textarea id="f-description" name="description" rows="8" data-action-change="imp-maj">' + e(b.description || "") + "</textarea></div>" +
        '<div class="a-grille" style="margin-top:14px">' + ch("juridique", "Situation juridique (le cas échéant)", b.juridique, "", "plein") + ch("adresse_privee", "Adresse exacte / propriétaire (privé, jamais affiché au public)", b.adresse_privee, "", "plein") +
        '<div class="plein"><label for="f-notes_privees">Notes pour l’agence (privées)</label><textarea id="f-notes_privees" name="notes_privees" rows="3" data-action-change="imp-maj">' + e(b.notes_privees || "") + "</textarea></div></div></section>" +
      repriseImpHtml() +
      '<div class="a-barre"><div class="a-barre-statut"><span class="a-statut a-statut-' + (I.finalise ? "en_attente" : "brouillon") + '">' + (I.finalise ? "En attente de validation" : "Brouillon") + '</span><small id="a-imp-progres" role="status" hidden></small></div><div class="a-barre-actions">' +
        '<button type="button" class="btn btn-ligne" data-action="imp-annuler">' + (I.id ? "Abandonner cette annonce" : F && F.fichiers.length > 1 ? "Passer cette annonce" : "Annuler l’import") + "</button>" +
        (I.id ? '<button type="button" class="btn btn-ligne" data-action="imp-terminer">Terminer sans ces photos</button><button type="button" class="btn btn-vert" data-action="imp-renvoyer">Renvoyer les photos manquantes (' + photosManquantes() + ")</button>"
          : '<button type="button" class="btn btn-ligne" data-action="imp-creer" data-soumettre="0">Enregistrer en brouillon</button><button type="button" class="btn btn-vert" data-action="imp-creer" data-soumettre="1">Envoyer à l’agence</button>') + "</div></div></form>";
  }
  /* V11.2.1 : l'annonce reste en BROUILLON tant que toutes les photos ne sont pas arrivées. Chaque photo a 3 essais ;
     si l'une échoue, rien n'est perdu ni transmis à l'agence : « Renvoyer les photos manquantes » reprend là où l'envoi s'est arrêté.
     L'alerte e-mail à l'agence ne part qu'à la fin (ou après 3 photos en « envoi rapide »). */
  var NB_RAPIDE = 3;
  function photosManquantes() { return etat.imp ? etat.imp.photos.filter(function (p) { return !p.envoye; }).length : 0; }
  function repriseImpHtml() {
    var I = etat.imp, m = photosManquantes();
    if (!I.id) return I.photos.length > NB_RAPIDE ? '<section class="a-bloc"><label class="a-case"><input type="checkbox" name="envoi_rapide"><span><strong>Envoi rapide</strong> : l’agence reçoit l’annonce après les ' + NB_RAPIDE + ' premières photos, les ' + (I.photos.length - NB_RAPIDE) + ' autres suivent sur la même annonce.</span></label></section>' : "";
    if (!m) return "";
    return '<section class="a-bloc a-imp-reprise"><h2>' + ico("info") + " Envoi des photos interrompu</h2><p>" + (I.erreur ? e(I.erreur) + " " : "") + "L’annonce « " + e(I.bien.titre) + " » est créée avec " + (I.photos.length - m) + " photo" + (I.photos.length - m > 1 ? "s" : "") + " sur " + I.photos.length + ". " +
      (I.finalise ? "Elle est déjà transmise à l’agence." : "Elle reste en brouillon : rien n’est transmis à l’agence et aucune alerte n’est envoyée tant que l’envoi n’est pas terminé.") + "</p></section>";
  }
  function boutonsImp(actif) { document.querySelectorAll('[data-action="imp-creer"],[data-action="imp-annuler"],[data-action="imp-renvoyer"],[data-action="imp-terminer"]').forEach(function (x) { x.disabled = !actif; }); }
  function creerImp(soumettre) {
    var I = etat.imp; if (!I || I.occupe) return Promise.resolve();
    lireFormImp();
    var al = controlerImp(), bloq = al.filter(function (a) { return a.niveau === "bloquant"; })[0];
    if (bloq) { A.message(bloq.texte); return Promise.resolve(); }
    if (soumettre) { var pb = al.filter(function (a) { return a.niveau === "publier"; })[0]; if (pb) { A.message(pb.texte); return Promise.resolve(); } }
    if (I.doublon && !I.confirmeDoublon) { A.message("Doublon possible : cochez « Créer quand même cette annonce » pour continuer."); return Promise.resolve(); }
    var rap = document.querySelector('[name="envoi_rapide"]');
    I.soumettre = !!soumettre; I.rapide = !!(rap && rap.checked && soumettre && I.photos.length > NB_RAPIDE);
    return envoiImp();
  }
  function envoiImp() {
    var I = etat.imp; if (!I || I.occupe) return Promise.resolve();
    I.occupe = true; I.erreur = "";
    var total = I.photos.length, garde = function (ev) { ev.preventDefault(); ev.returnValue = ""; };
    window.addEventListener("beforeunload", garde);
    boutonsImp(false);
    var pause = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
    var envoyer = function (ph, tentative) {
      return A.apiAgent("photoAjouterAgent", { bien_id: I.id, cle: I.cle + "-" + ph.uid, photo: { nom: ph.nom, mime: ph.mime, donnees: ph.donnees } }).catch(function (err) {
        if (err.code === "AUTH" || err.code === "INTERDIT" || err.code === "LIMITE" || tentative >= 2) throw err;
        return pause(tentative ? 4000 : 1500).then(function () { return envoyer(ph, tentative + 1); });
      });
    };
    var finaliser = function (prevues) {
      return A.apiAgent("bienFinaliserAgent", { id: I.id, soumettre: true, photos_prevues: prevues || 0 }).then(function () { I.finalise = true; });
    };
    var depart = Promise.resolve();
    if (!I.id) {
      infoImp("Création de l’annonce…");
      var b = Object.assign({}, I.bien, { statut: "brouillon" });
      ["a_la_une", "coup_de_coeur", "exclusivite", "juridique_verifie"].forEach(function (k) { delete b[k]; });
      depart = A.apiAgent("bienImporterAgent", { bien: b }).then(function (r) { I.id = r.bien.id; });
    }
    return depart.then(function () {
      return I.photos.reduce(function (p, ph) {
        if (ph.envoye) return p;
        return p.then(function () {
          var faites = I.photos.filter(function (x) { return x.envoye; }).length;
          infoImp("Envoi de la photo " + (faites + 1) + " sur " + total + "…");
          return envoyer(ph, 0).then(function () {
            ph.envoye = true;
            if (I.rapide && I.soumettre && !I.finalise && faites + 1 === NB_RAPIDE) { infoImp("Transmission à l’agence…"); return finaliser(total); }
          });
        });
      }, Promise.resolve());
    }).then(function () {
      if (I.soumettre && !I.finalise) { infoImp("Transmission à l’agence…"); return finaliser(0); }
    }).then(function () { return terminerImp(); }, function (err) {
      window.removeEventListener("beforeunload", garde);
      I.occupe = false; infoImp("");
      if (err.code === "AUTH") { A.jetonAgent.ecrire(""); D = null; rendre(); A.message(err.message); return; }
      if (!I.id) { boutonsImp(true); A.message("Import interrompu : " + err.message + " Rien n’a été créé, vous pouvez réessayer."); return; }
      var restantes = photosManquantes(), rang = total - restantes + 1;
      I.erreur = "La photo " + rang + " sur " + total + " n’a pas pu être envoyée (" + err.message + ").";
      return charger().then(rendre, rendre).then(function () { A.message(I.erreur + " Cliquez sur « Renvoyer les photos manquantes »."); });
    }).then(function (x) { window.removeEventListener("beforeunload", garde); return x; });
  }
  function terminerImp() {
    var I = etat.imp, envoyees = I.photos.filter(function (p) { return p.envoye; }).length;
    return charger().then(function () {
      I.occupe = false; I.resultat = { id: I.id, titre: I.bien.titre, soumis: I.finalise, photos: envoyees, manquantes: I.photos.length - envoyees };
      if (I.file) { I.file.ok++; I.file.i++; }
      I.etape = "fini"; rendre(); window.scrollTo(0, 0);
      A.message(I.finalise ? "Annonce envoyée à l’agence." : "Brouillon enregistré.");
    });
  }

  /* ====================================================================== GABARIT */
  var MENU = [["biens", "Mes biens", "maison"]];
  function rendre() {
    if (!D) { racine.innerHTML = vueConnexion(); return; }
    var v = etat.vue, section = v === "bien" ? "biens" : v;
    var titres = { biens: "Mes biens", bien: etat.id ? "Modifier le bien" : "Proposer un bien", import: "Importer une annonce" };
    var corps = { biens: vueBiens, bien: vueBien, import: vueImport }[v]();
    var action = v === "biens" ? '<div class="a-entete-btns"><button class="btn btn-ligne" data-action="imp-ouvrir">' + ico("plus") + ' Importer une annonce</button><button class="btn btn-or" data-action="aller" data-vue="bien">' + ico("plus") + " Proposer un bien</button></div>" : "";
    var retour = v === "bien" || v === "import" ? "biens" : "";
    racine.innerHTML = '<div class="a-app"><aside class="a-menu"><a class="a-menu-logo" href="index.html" title="Voir le site"><img src="assets/img/logo/logo-nassiri-440.png" width="440" height="302" alt="Nassiri Real Estate"></a><nav aria-label="Espace Agent">' +
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
    "imp-ouvrir": function () { etat.imp = null; aller("import"); },
    "imp-suite": function () { var F = etat.imp && etat.imp.file; if (F && F.i < F.fichiers.length) { etat.imp = { file: F }; rendre(); annonceSuivante(); } else { etat.imp = null; rendre(); } },
    "imp-renvoyer": function () { envoiImp(); },
    "imp-terminer": function () {
      var I = etat.imp; if (!I || I.occupe) return;
      confirmer("Terminer sans ces photos ?", photosManquantes() + " photo(s) ne seront pas envoyées. Vous pourrez les ajouter depuis la fiche du bien.", "Terminer").then(function (ok) {
        if (!ok) return;
        I.occupe = true; boutonsImp(false);
        (I.soumettre && !I.finalise ? A.apiAgent("bienFinaliserAgent", { id: I.id, soumettre: true, photos_prevues: 0 }).then(function () { I.finalise = true; }) : Promise.resolve())
          .then(terminerImp, function (err) { I.occupe = false; boutonsImp(true); A.message(err.message); });
      });
    },
    "imp-annuler": function () {
      var F = etat.imp && etat.imp.file;
      if (etat.imp && etat.imp.id) {
        var I0 = etat.imp;
        return confirmer("Abandonner cette annonce ?", "L’annonce déjà créée en brouillon (" + I0.id + ") et ses photos seront supprimées.", "Abandonner et supprimer").then(function (ok) {
          if (!ok) return;
          A.apiAgent("bienSupprimerAgent", { id: I0.id }).then(function () { return true; }, function () { return false; }).then(function (sup) {
            if (!sup) { A.message("Suppression impossible : retirez le brouillon depuis « Mes biens »."); }
            if (F && F.fichiers.length > 1) { F.i++; etat.imp = { file: F }; charger().then(annonceSuivante, annonceSuivante); return; }
            etat.imp = null; charger().then(rendre, rendre);
          });
        });
      }
      if (F && F.fichiers.length > 1) { F.i++; etat.imp = { file: F }; annonceSuivante(); return; }
      confirmer("Annuler l’import ?", "L’annonce préparée ne sera pas enregistrée.", "Annuler l’import").then(function (ok) { if (ok) { etat.imp = null; rendre(); } });
    },
    "imp-analyser": function () { importerTexte(); },
    "imp-copier-consigne": function () { copierTexte(IA().consigne).then(function (ok) { A.message(ok ? "Consigne copiée : collez-la dans votre IA." : "Copie impossible sur cet appareil."); }); },
    "imp-photo": function (b) {
      if (etat.imp.id) { A.message("Les photos sont déjà en cours d’envoi : elles ne peuvent plus être modifiées ici."); return; }
      var ph = etat.imp.photos, i = parseInt(b.dataset.i, 10), m = b.dataset.m;
      if (m === "retirer") ph.splice(i, 1);
      else if (m === "gauche" && i > 0) ph.splice(i - 1, 0, ph.splice(i, 1)[0]);
      else if (m === "droite" && i < ph.length - 1) ph.splice(i + 1, 0, ph.splice(i, 1)[0]);
      else if (m === "principale") ph.unshift(ph.splice(i, 1)[0]);
      lireFormImp(); majApercuImp();
    },
    "imp-creer": function (b) { creerImp(b.dataset.soumettre === "1"); },
    "filtre-bien": function (b) { etat.filtreBien = b.dataset.v; rendre(); },
    deconnexion: function () { A.apiAgent("deconnexionAgent").catch(function () {}).then(function () { A.jetonAgent.ecrire(""); D = null; etat.vue = "biens"; window.location.href = "espace-pro.html?role=agent"; }); },
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
      if (ev.target.id === "a-imp-fichier" && ev.target.files.length) { var fi = Array.prototype.slice.call(ev.target.files); ev.target.value = ""; importerFichiers(fi); return; }
      if (ev.target.matches("[data-action-change=\"imp-maj\"]")) { lireFormImp(); majApercuImp(); }
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
    /* V11.2.1 : liste « Mes biens » actualisée toutes les 60 s (statuts, photos), sans gêner une saisie ni un envoi en cours */
    A.actualisationAuto({ pret: function () { return D && etat.vue === "biens" && !etat.imp && !etat.occupe; }, donnees: function () { return D; }, lire: function () { return A.apiAgent("donneesAgent"); }, ecrire: function (r) { D = r; }, rendre: rendre });
    /* Session existante : on tente de reprendre directement */
    if (A.jetonAgent.lire()) { racine.innerHTML = '<p class="a-chargement">Chargement…</p>'; charger().then(rendre, function () { A.jetonAgent.ecrire(""); D = null; window.location.replace("espace-pro.html?role=agent"); }); }
    else window.location.replace("espace-pro.html?role=agent");
  });
})();
