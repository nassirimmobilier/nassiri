/* ==========================================================================
   NASSIRI REAL ESTATE — Liaison avec le serveur (Google Apps Script) ou mode démonstration
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS;
  A.demo = !A.config.apiUrl;
  var CLE_JETON = "nassiri_jeton";

  function script(src) {
    return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error("Chargement impossible : " + src)); }; document.head.appendChild(s); });
  }
  var demoPret;
  function chargerDemo() {
    if (!demoPret) demoPret = script("assets/js/demo/demo-google.js")
      .then(function () { return script("assets/js/demo/code-serveur.js"); })
      .then(function () { return script("assets/js/demo/demo-donnees.js"); })
      .then(function () { if (!ATLAS_DEMO.initialise()) ATLAS_DEMO.semer(ATLAS_DEMO.serveur); });
    return demoPret;
  }

  A.jeton = {
    lire: function () { try { return sessionStorage.getItem(CLE_JETON) || ""; } catch (e) { return A.jeton._m || ""; } },
    ecrire: function (j) { A.jeton._m = j; try { j ? sessionStorage.setItem(CLE_JETON, j) : sessionStorage.removeItem(CLE_JETON); } catch (e) {} }
  };
  /* Session distincte pour l'Espace Agent : jamais mélangée avec la session admin, même onglet, même origine. */
  var CLE_JETON_AGENT = "nassiri_jeton_agent";
  A.jetonAgent = {
    lire: function () { try { return sessionStorage.getItem(CLE_JETON_AGENT) || ""; } catch (e) { return A.jetonAgent._m || ""; } },
    ecrire: function (j) { A.jetonAgent._m = j; try { j ? sessionStorage.setItem(CLE_JETON_AGENT, j) : sessionStorage.removeItem(CLE_JETON_AGENT); } catch (e) {} }
  };

  /* Appelle une action du serveur. Rejette avec une erreur lisible (err.code = AUTH, LIMITE…). */
  A.api = function (action, donnees) {
    var corps = Object.assign({ action: action, jeton: A.jeton.lire() }, donnees || {});
    var p = A.demo
      ? chargerDemo().then(function () { return JSON.parse(ATLAS_DEMO.serveur.doPost({ postData: { contents: JSON.stringify(corps) } }).getContent()); })
      /* text/plain évite la pré-requête CORS, qu'Apps Script ne gère pas */
      : fetch(A.config.apiUrl, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corps) })
          .then(function (r) { if (!r.ok) throw new Error("Le serveur ne répond pas (" + r.status + ")."); return r.json(); });
    return p.then(function (r) {
      if (r && r.ok) return r;
      var e = new Error((r && r.erreur) || "Erreur inconnue."); e.code = r && r.code; e.detail = r && r.detail; throw e;
    }, function (err) {
      if (err.code) throw err;
      var e = new Error(navigator.onLine === false ? "Vous êtes hors connexion." : "Connexion au serveur impossible. Réessayez."); e.code = "RESEAU"; e.detail = String(err.message || err); throw e;
    });
  };

  /* Identique à A.api, mais pour l'Espace Agent (jeton et session séparés de l'admin). */
  A.apiAgent = function (action, donnees) {
    var corps = Object.assign({ action: action, jeton: A.jetonAgent.lire() }, donnees || {});
    var p = A.demo
      ? chargerDemo().then(function () { return JSON.parse(ATLAS_DEMO.serveur.doPost({ postData: { contents: JSON.stringify(corps) } }).getContent()); })
      : fetch(A.config.apiUrl, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corps) })
          .then(function (r) { if (!r.ok) throw new Error("Le serveur ne répond pas (" + r.status + ")."); return r.json(); });
    return p.then(function (r) {
      if (r && r.ok) return r;
      var e = new Error((r && r.erreur) || "Erreur inconnue."); e.code = r && r.code; e.detail = r && r.detail; throw e;
    }, function (err) {
      if (err.code) throw err;
      var e = new Error(navigator.onLine === false ? "Vous êtes hors connexion." : "Connexion au serveur impossible. Réessayez."); e.code = "RESEAU"; e.detail = String(err.message || err); throw e;
    });
  };

  /* Catalogue public, conservé 1 minute pour une navigation rapide (ignoré lors d’un rafraîchissement) */
  var CLE_CAT = "nassiri_catalogue", catalogue;
  function normaliser(b) {
    var n = function (v) { return parseFloat(v) || 0; };
    return { id: b.id, statut: b.statut, titre: b.titre, type: b.type, ville: b.ville, quartier: b.quartier, prix: n(b.prix), surface: n(b.surface), terrain: n(b.terrain),
      chambres: n(b.chambres), sdb: n(b.sdb), description: b.description || "", equipements: (b.equipements || "").split("|").filter(Boolean),
      juridique: b.juridique || "", juridiqueVerifie: b.juridique_verifie === "oui", exclusivite: b.exclusivite === "oui", aLaUne: b.a_la_une === "oui",
      transaction: b.transaction || "vente", prix_sur_demande: b.prix_sur_demande === "oui" ? "oui" : "non", coup_de_coeur: b.coup_de_coeur === "oui" ? "oui" : "non",
      date: b.date_publication || "", photos: b.photos || [] };
  }
  A.charger = function (forcer) {
    if (catalogue && !forcer) return catalogue;
    var cache = null;
    /* Un rafraîchissement (F5 / tirer pour actualiser) doit toujours montrer les biens à jour */
    var actualisation = false;
    try { var nav = performance.getEntriesByType("navigation")[0]; actualisation = !!nav && nav.type === "reload"; } catch (e) {}
    if (!forcer && !actualisation && !A.demo) { try { cache = JSON.parse(sessionStorage.getItem(CLE_CAT)); } catch (e) {} }
    catalogue = (cache && Date.now() - cache.t < 6e4 ? Promise.resolve(cache.r) : A.api("catalogue").then(function (r) {
      if (!A.demo) { try { sessionStorage.setItem(CLE_CAT, JSON.stringify({ t: Date.now(), r: r })); } catch (e) {} }
      return r;
    })).then(function (r) {
      A.biens = r.biens.map(normaliser);
      A.agence = r.config || {};
      return A.biens;
    });
    return catalogue;
  };

  /* Redimensionne une photo dans le navigateur avant l'envoi (plus rapide, moins lourd) */
  A.preparerPhoto = function (fichier, cote) {
    cote = cote || (A.demo ? 1100 : 1800);
    return new Promise(function (ok, ko) {
      if (!/^image\//.test(fichier.type)) return ko(new Error("« " + fichier.name + " » n’est pas une image."));
      var url = URL.createObjectURL(fichier), img = new Image();
      img.onload = function () {
        var k = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var data = c.toDataURL("image/jpeg", A.demo ? 0.72 : 0.84);
        ok({ nom: fichier.name.replace(/\.[^.]+$/, "") + ".jpg", mime: "image/jpeg", donnees: data.split(",")[1], apercu: data });
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Impossible de lire « " + fichier.name + " » (format non pris en charge par ce navigateur).")); };
      img.src = url;
    });
  };
})();
