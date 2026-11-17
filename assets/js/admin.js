/* ==========================================================================
   NASSIRI REAL ESTATE — Espace Pro (administration)
   Toutes les actions passent par le serveur, qui vérifie la session à chaque appel.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, e = A.esc, ico = A.icone;
  var racine, D = null;
  var etat = { vue: "tableau", id: null, filtreBien: "", filtreProspect: "", filtreSamsar: "", imp: null, simp: null, recherche: "", sousVue: "recues", edition: null, occupe: "", refus: null };
  var LIB_STATUT = { brouillon: "Brouillon", en_attente: "En attente de validation", publie: "Publié", "sous-offre": "Sous offre", vendu: "Vendu", archive: "Archivé", refuse: "Refusé" };
  var LIB_TRANSACTION = { vente: "Vente", "location-longue": "Location longue durée", "location-courte": "Location courte durée (saisonnière)" };
  var LIB_ALERTE = { contact: "Renseignements", visite: "Demande de visite", confier: "Bien proposé" };
  var ICO_ALERTE = { contact: "courrier", visite: "calendrier", confier: "cle" };

  /* ---------- Outils ---------- */
  function n(v) { return parseFloat(v) || 0; }
  function prospect(id) { return D.prospects.filter(function (p) { return p.id === id; })[0]; }
  function bien(id) { return D.biens.filter(function (b) { return b.id === id; })[0]; }
  function photosDe(id) { return D.photos.filter(function (p) { return p.bien_id === id; }).sort(function (a, b) { return n(a.ordre) - n(b.ordre); }); }
  function recent(a, b) { return String(b.date || b.date_maj || "").localeCompare(String(a.date || a.date_maj || "")); }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function option(v, libelle, choisi) { return '<option value="' + e(v) + '"' + (v === choisi ? " selected" : "") + ">" + e(libelle) + "</option>"; }
  function champ(nom, libelle, valeur, attrs, cls) {
    return '<div class="' + (cls || "") + '"><label for="f-' + nom + '">' + libelle + '</label><input id="f-' + nom + '" name="' + nom + '" value="' + e(valeur || "") + '" ' + (attrs || "") + "></div>";
  }
  function badgeStatut(s) { return '<span class="a-statut a-statut-' + e(s) + '">' + e(LIB_STATUT[s] || s) + "</span>"; }
  function agent(id) { return D.agents.filter(function (a) { return a.id === id; })[0]; }

  /* ====================================================================== V7 : SUIVI DES PROSPECTS */
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
  /* Numéro au format WhatsApp (international, sans « + »). Un numéro marocain en 06… / 07… devient 212… */
  function numWa(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (/^00/.test(d)) d = d.slice(2);
    else if (/^0\d{9}$/.test(d)) d = "212" + d.slice(1);
    return d;
  }
  function relanceDue(p) { return !!p.date_relance && p.date_relance <= aujourdhui() && p.statut !== "Vente"; }
  function dansJours(j) { var d = new Date(); d.setDate(d.getDate() + j); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  /* Budget saisi librement ou issu de « Votre recherche » : « 3 à 5 M DH », « Jusqu’à 3 000 000 DH », « À partir de 1 000 000 DH »… */
  function bornesBudget(s) {
    var t = String(s || "").replace(/[  ]/g, " ");
    t = t.replace(/(\d)\s(?=\d{3}(\D|$))/g, "$1").replace(/(\d),(\d)/g, "$1.$2").replace(/(\d)\s(?=\d{3}(\D|$))/g, "$1");
    var nb = t.match(/\d+(\.\d+)?/g) || [], mult = /(^|\s)m(\s|$)|million/i.test(t) ? 1e6 : 1;
    nb = nb.map(function (x) { x = parseFloat(x); return x < 1000 ? x * mult : x; });
    if (!nb.length) return null;
    if (/partir|minimum|plus de/i.test(t)) return { min: nb[0], max: Infinity };
    if (nb.length >= 2) return { min: Math.min(nb[0], nb[1]), max: Math.max(nb[0], nb[1]) };
    return { min: 0, max: nb[0] };
  }
  /* Prospects dont les critères (ville, type, budget) correspondent à un bien à vendre. Les prospects sans aucun critère sont ignorés. */
  function correspondances(b) {
    if (!b || (b.transaction || "vente") !== "vente" || ["publie", "sous-offre", "brouillon"].indexOf(b.statut) === -1) return [];
    var prix = n(b.prix), lieu = norm(b.ville + " " + (b.quartier || "")), type = norm(b.type);
    return D.prospects.filter(function (p) {
      if (p.statut === "Vente") return false;
      var v = norm(p.ville_recherche), t = norm(p.type_recherche), bud = bornesBudget(p.budget), criteres = 0;
      if (v) { criteres++; if (lieu.indexOf(v) === -1 && !norm(b.ville).split(" ").some(function (m) { return m.length > 2 && v.indexOf(m) !== -1; })) return false; }
      if (t && t !== "investissement" && t !== "indifferent") { criteres++; if (type.indexOf(t) === -1 && t.indexOf(type) === -1) return false; }
      if (bud && prix) { criteres++; if (prix > bud.max * 1.1 || prix < bud.min * 0.9) return false; }
      return criteres > 0;
    });
  }
  var MODELES = [
    { id: "premier", nom: "Premier contact", texte: function (p) { return "Bonjour " + nomAffiche(p) + ", ici Nassiri Real Estate à Marrakech. Merci pour votre demande. Pouvons-nous en parler quelques minutes pour bien comprendre votre projet ?"; } },
    { id: "relance", nom: "Relance", texte: function (p) { return "Bonjour " + nomAffiche(p) + ", je reviens vers vous au sujet de votre projet immobilier. Avez-vous eu le temps d’y réfléchir ? Je reste à votre disposition."; } },
    { id: "visite", nom: "Proposer une visite", texte: function (p) { return "Bonjour " + nomAffiche(p) + ", souhaitez-vous que nous organisions une visite ? Dites-moi les jours et les horaires qui vous conviennent, nous nous adapterons."; } },
    { id: "apres-visite", nom: "Après une visite", texte: function (p) { return "Bonjour " + nomAffiche(p) + ", merci pour votre visite. Qu’en avez-vous pensé ? Je peux vous envoyer plus d’informations ou organiser une seconde visite."; } }
  ];
  function nomAffiche(p) { return String(p.nom || "").replace(/^Exemple — /, ""); }

  /* ====================================================================== V8 : CODE PIN DES AGENTS + CARNET DE SAMSAR */
  var LIEN_AGENT = function () { return new URL("agent.html", location.href).href; };
  function copierTexte(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; });
    return new Promise(function (ok) {
      var z = document.createElement("textarea"); z.value = t; z.setAttribute("readonly", ""); z.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(z); z.select(); var r = false; try { r = document.execCommand("copy"); } catch (x) {} z.remove(); ok(r);
    });
  }
  function messageAgent(ag, pin, nouveau) {
    var nom = String(ag.nom || "").replace(/^Exemple — /, "");
    return (nouveau
      ? "Bonjour " + nom + ", voici votre nouveau code PIN pour l’Espace Agent Nassiri Real Estate. L’ancien code ne fonctionne plus."
      : "Bonjour " + nom + ", bienvenue chez Nassiri Real Estate ! Votre Espace Agent est prêt. Vous pouvez y déposer vos biens et suivre vos demandes.") +
      "\n\nLien : " + LIEN_AGENT() + "\nIdentifiant : " + ag.email + "\nCode PIN : " + pin +
      "\n\nGardez ce code pour vous. En cas de perte, contactez-nous : nous vous en enverrons un nouveau.";
  }
  /* Boîte affichée une seule fois après la création d'un agent ou d'un nouveau code */
  function boiteCodeAgent(ag, pin, nouveau) {
    return new Promise(function (fini) {
      var texte = messageAgent(ag, pin, nouveau), num = numWa(ag.whatsapp || ag.telephone);
      var m = document.createElement("div"); m.className = "a-modale";
      m.innerHTML = '<div class="a-modale-boite a-modale-large" role="dialog" aria-modal="true" aria-labelledby="a-pin-titre"><h2 id="a-pin-titre">' + (nouveau ? "Nouveau code créé" : "Agent créé") + " : " + e(ag.nom) + "</h2>" +
        '<p class="a-pin-valeur" aria-label="Code PIN">' + e(pin) + "</p>" +
        '<p class="a-aide"><strong>Ce code ne sera plus affiché.</strong> Envoyez-le maintenant. S’il est perdu, utilisez « Nouveau code » sur la fiche de l’agent.</p>' +
        '<label class="a-etiquette" for="a-pin-message">Message à envoyer</label><textarea id="a-pin-message" rows="9" readonly>' + e(texte) + "</textarea>" +
        '<div class="a-modale-actions">' + (num ? '<button class="btn btn-vert" data-r="wa">Ouvrir dans WhatsApp</button>' : "") + (ag.email ? '<button class="btn btn-ligne" data-r="mail">Envoyer par e-mail</button>' : "") + '<button class="btn btn-ligne" data-r="copie">Copier le message</button><button class="btn btn-ligne" data-r="fin">Fermer</button></div>' +
        (num ? "" : '<p class="a-aide">Aucun numéro WhatsApp ou téléphone pour cet agent : copiez le message et envoyez-le vous-même.</p>') + "</div>";
      m.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-r]");
        if (b && b.dataset.r === "wa") window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(texte), "_blank", "noopener");
        else if (b && b.dataset.r === "mail") window.location.href = "mailto:" + encodeURIComponent(ag.email).replace(/%40/g, "@") + "?subject=" + encodeURIComponent("Votre accès à l’Espace Agent Nassiri Real Estate") + "&body=" + encodeURIComponent(texte);
        else if (b && b.dataset.r === "copie") copierTexte(texte).then(function (ok) { A.message(ok ? "Message copié." : "Copie impossible : sélectionnez le texte à la main."); });
        else if (b || ev.target === m) { m.remove(); fini(); }
      });
      document.body.appendChild(m);
    });
  }
  /* Le code PIN est fabriqué par le script Google : s'il ne revient pas, on le dit simplement (aucune consigne technique à l'écran) */
  function diagnosticScript() {
    if (A.demo || !A.config.apiUrl) return Promise.resolve("Mode démonstration.");
    return fetch(A.config.apiUrl, { redirect: "follow" }).then(function (r) { return r.json(); })
      .then(function (j) { return j && j.build ? "Script en ligne : " + j.build : "Script en ligne : version sans repère (ancienne)."; })
      .catch(function () { return "Script injoignable depuis ce navigateur."; });
  }
  function alerteScriptAncien(sansCode, detail) {
    return new Promise(function (fini) {
      var m = document.createElement("div"); m.className = "a-modale";
      m.innerHTML = '<div class="a-modale-boite a-modale-large" role="alertdialog" aria-modal="true"><h2>Le code PIN n’a pas pu être créé</h2>' +
        '<p>Une erreur est survenue. Réessayez dans un instant. Si le problème continue, prévenez l’administrateur du site.</p>' +
        (sansCode ? '<p class="a-aide">L’agent a été ajouté sans code : ouvrez sa fiche et cliquez sur <strong>Nouveau code PIN</strong> une fois le problème réglé.</p>' : "") +
        '<p class="a-aide">Référence de l’erreur : <strong>PIN-01</strong></p>' +
        '<div class="a-modale-actions"><button class="btn btn-vert" data-r="fin">Compris</button></div></div>';
      m.addEventListener("click", function (ev) { if (ev.target.closest("[data-r]") || ev.target === m) { m.remove(); fini(); } });
      document.body.appendChild(m);
      diagnosticScript().then(function (t) { try { console.info("[PIN-01] " + t + (detail ? " · " + detail : "")); } catch (x) {} });
    });
  }
  var RE_SCRIPT_ANCIEN = /mot de passe|motdepasse|code d.au moins|action inconnue/i;
  var STATUTS_SAMSAR = ["À contacter", "Contacté", "Actif", "Partenaire", "Inactif"];
  function samsar(id) { return (D.samsar || []).filter(function (s) { return s.id === id; })[0]; }
  function relanceSamsarDue(s) { return !!s.date_relance && s.date_relance <= aujourdhui() && s.statut !== "Inactif"; }
  var MODELES_SAMSAR = [
    { id: "premier", nom: "Premier contact", texte: function (s) { return "Bonjour " + nomAffiche(s) + ", ici Nassiri Real Estate à Marrakech. Nous développons notre réseau de partenaires. Aurions-nous l’occasion d’échanger quelques minutes sur une collaboration ?"; } },
    { id: "biens", nom: "Demander des biens", texte: function (s) { return "Bonjour " + nomAffiche(s) + ", avez-vous en ce moment des biens à nous proposer (villas, appartements, riads, terrains) ? Nous avons des clients à la recherche de biens."; } },
    { id: "relance", nom: "Relance", texte: function (s) { return "Bonjour " + nomAffiche(s) + ", je reviens vers vous pour savoir si vous avez de nouveaux biens à nous confier. Je reste à votre disposition."; } },
    { id: "merci", nom: "Remerciement", texte: function (s) { return "Bonjour " + nomAffiche(s) + ", merci pour votre confiance et pour le bien transmis. Nous revenons vers vous très vite avec nos retours."; } }
  ];
  function texteBienProspect(p, b) {
    return "Bonjour " + nomAffiche(p) + ", un bien pourrait vous intéresser : " + b.titre + " (" + b.type + " à " + b.ville + (b.quartier ? ", " + b.quartier : "") + ") — " + A.prixAffiche(b) + ".\nDétails et photos : " + A.lienBien(b);
  }
  function ouvrirWhatsApp(p, texte) {
    var num = numWa(p.telephone);
    if (!num) { A.message("Ce prospect n’a pas de numéro de téléphone."); return false; }
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(texte), "_blank", "noopener");
    return true;
  }
  function blocSuivi(p) {
    var num = numWa(p.telephone), mod = MODELES[0];
    return '<section class="a-bloc" id="a-suivi"><h2>Suivi</h2>' +
      '<p class="a-aide" id="a-relance-info">' + (p.date_relance ? "Prochaine relance : <strong>" + e(A.dateFr(p.date_relance)) + "</strong>" + (relanceDue(p) ? " (à faire)" : "") : "Aucune relance prévue.") + "</p>" +
      '<div class="a-puces a-relances"><span class="a-etiquette">Relancer dans</span>' +
        [["Demain", 1], ["3 jours", 3], ["1 semaine", 7], ["2 semaines", 14]].map(function (r) { return '<button type="button" class="puce" data-action="relance" data-jours="' + r[1] + '">' + r[0] + "</button>"; }).join("") +
        '<button type="button" class="puce" data-action="relance" data-jours="0">Aucune</button></div>' +
      '<h3 class="a-sous-titre">Message WhatsApp</h3>' +
      (num ? '<div class="a-wa"><label class="sr" for="a-wa-modele">Modèle de message</label><select id="a-wa-modele" data-action-change="modele-wa">' + MODELES.map(function (m) { return option(m.id, m.nom, mod.id); }).join("") + "</select>" +
        '<label class="sr" for="a-wa-texte">Texte du message</label><textarea id="a-wa-texte" rows="4">' + e(mod.texte(p)) + '</textarea>' +
        '<button type="button" class="btn btn-vert" data-action="wa-prospect">Ouvrir dans WhatsApp</button></div><p class="a-aide">Vous pouvez modifier le texte avant l’envoi. L’échange est ajouté à l’historique.</p>'
        : '<p class="a-vide">Ajoutez un numéro de téléphone pour envoyer un message WhatsApp.</p>') + "</section>";
  }
  function blocInteresses(b) {
    var l = correspondances(b);
    return '<section class="a-bloc" id="a-interesses"><h2>' + ico("personnes") + " Prospects intéressés</h2>" +
      (l.length ? '<p class="a-aide">Ce bien correspond à <strong>' + l.length + (l.length > 1 ? " prospects" : " prospect") + "</strong> d’après leurs critères (ville, type de bien, budget).</p>" +
        l.map(function (p) {
          return '<div class="a-ligne a-ligne-fixe"><span class="a-pastille">' + e(nomAffiche(p).charAt(0).toUpperCase() || "?") + '</span><span class="a-ligne-texte"><strong>' + e(nomAffiche(p)) + "</strong><small>" +
            e([p.type_recherche, p.ville_recherche, p.budget].filter(Boolean).join(" · ")) + '</small></span><button type="button" class="btn btn-ligne" data-action="aller" data-vue="prospect" data-id="' + e(p.id) + '">Fiche</button>' +
            (numWa(p.telephone) ? '<button type="button" class="btn btn-vert" data-action="wa-bien" data-prospect="' + e(p.id) + '" data-bien="' + e(b.id) + '">WhatsApp</button>' : "") + "</div>";
        }).join("")
        : '<p class="a-vide">Aucun prospect ne correspond pour le moment.</p>') + "</section>";
  }

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
    return A.api(action, donnees).then(function (r) {
      return (sansRecharger ? Promise.resolve() : charger()).then(function () { etat.occupe = ""; indicateur(); if (message) A.message(message); return r; });
    }).catch(function (err) {
      etat.occupe = ""; indicateur();
      if (err.code === "AUTH") { A.jeton.ecrire(""); D = null; rendre(); A.message(err.message); }
      else A.message(err.message);
      throw err;
    });
  }
  function charger() { return A.api("donnees").then(function (r) { D = r; try { sessionStorage.removeItem("nassiri_catalogue"); } catch (x) {} }); }
  function indicateur() { var i = document.getElementById("a-occupe"); if (i) { i.textContent = etat.occupe; i.hidden = !etat.occupe; } }
  function aller(vue, id) { etat.vue = vue; etat.id = id || null; etat.edition = null; etat.recherche = ""; etat.refus = null; rendre(); window.scrollTo(0, 0); }

  /* ====================================================================== CONNEXION */
  function vueConnexion(erreur) {
    return '<div class="a-connexion"><form class="a-connexion-carte" id="form-connexion">' +
      '<img class="a-connexion-logo" src="assets/img/logo/logo-clair-440.png" width="440" height="302" alt="Nassiri Real Estate">' +
      "<h1>Espace Pro</h1><p>Accès réservé à l’agence.</p>" +
      (A.demo ? '<div class="a-note">' + ico("info") + "<div><strong>Mode démonstration</strong><br>Le site n’est pas encore relié à Google Sheets. Les données sont fictives, enregistrées sur cet appareil, et <u>cet accès n’est pas protégé</u>.<br>Mot de passe de démonstration : <code>nassiri-demo</code></div></div>" : "") +
      '<label for="mdp">Mot de passe</label><input id="mdp" name="motDePasse" type="password" autocomplete="current-password" required>' +
      (erreur ? '<p class="retour est-erreur">' + e(erreur) + "</p>" : "") +
      '<button class="btn btn-vert" type="submit">Se connecter</button><a class="a-retour-site" href="index.html">← Retour au site</a></form></div>';
  }

  /* ====================================================================== TABLEAU DE BORD */
  function actionsAFaire() {
    var l = [], t = aujourdhui();
    var nonLues = D.alertes.filter(function (a) { return a.lu !== "oui"; }).length;
    if (nonLues) l.push({ t: nonLues + (nonLues > 1 ? " demandes non lues" : " demande non lue"), i: "cloche", v: "demandes", s: "recues" });
    var vis = D.visites.filter(function (v) { return v.statut === "À confirmer"; }).length;
    if (vis) l.push({ t: vis + (vis > 1 ? " visites à confirmer" : " visite à confirmer"), i: "calendrier", v: "demandes", s: "visites" });
    var prop = D.propositions.filter(function (p) { return p.statut === "Nouveau"; }).length;
    if (prop) l.push({ t: prop + (prop > 1 ? " biens proposés à étudier" : " bien proposé à étudier"), i: "cle", v: "demandes", s: "propositions" });
    var att = D.biens.filter(function (b) { return b.statut === "en_attente"; }).length;
    if (att) l.push({ t: att + (att > 1 ? " biens d’agents à valider" : " bien d’agent à valider"), i: "cle", v: "biens", s: "", filtreBien: "en_attente" });
    D.prospects.filter(function (p) { return p.date_relance && p.date_relance <= t && p.statut !== "Vente"; })
      .forEach(function (p) { l.push({ t: "Relancer " + p.nom + " (prévu le " + A.dateFr(p.date_relance) + ")", i: "telephone", v: "prospect", id: p.id }); });
    (D.samsar || []).filter(relanceSamsarDue).forEach(function (s) { l.push({ t: "Relancer le samsar " + s.nom + " (prévu le " + A.dateFr(s.date_relance) + ")", i: "telephone", v: "samsar", id: s.id }); });
    D.biens.filter(function (b) { return b.statut === "brouillon"; }).forEach(function (b) { l.push({ t: "Brouillon à terminer : " + b.titre, i: "crayon", v: "bien", id: b.id }); });
    D.biens.filter(function (b) { return (b.statut === "publie" || b.statut === "sous-offre") && !photosDe(b.id).length; })
      .forEach(function (b) { l.push({ t: "Bien publié sans photo : " + b.titre, i: "photo", v: "bien", id: b.id }); });
    if (!D.parametres.email_alertes) l.push({ t: "Renseigner l’e-mail qui reçoit les alertes", i: "courrier", v: "parametres" });
    return l;
  }
  function ligneAlerte(a) {
    var p = prospect(a.prospect_id), b = bien(a.bien_id);
    return '<button class="a-ligne' + (a.lu !== "oui" ? " est-non-lu" : "") + '" data-action="ouvrir-alerte" data-id="' + e(a.id) + '">' +
      '<span class="a-pastille">' + ico(ICO_ALERTE[a.type] || "courrier") + "</span><span class=\"a-ligne-texte\"><strong>" + e(p ? p.nom : "Prospect supprimé") + "</strong> · " + e(LIB_ALERTE[a.type] || a.type) +
      (b ? " · " + e(b.id) + " " + e(b.titre) : "") + "<small>" + e(a.resume || "") + '</small></span><span class="a-ligne-date">' + e(A.dateFr(a.date, true)) + "</span></button>";
  }
  function vueTableau() {
    var actifs = D.biens.filter(function (b) { return b.statut === "publie" || b.statut === "sous-offre"; }).length;
    var vendus = D.biens.filter(function (b) { return b.statut === "vendu"; }).length;
    var favoris = Object.keys(D.favoris).reduce(function (s, k) { return s + Math.max(D.favoris[k], 0); }, 0);
    var tuile = function (v, l, i, vue, s) { return '<button class="a-tuile" data-action="aller" data-vue="' + vue + '"' + (s ? ' data-sous="' + s + '"' : "") + ">" + ico(i) + "<strong>" + v + "</strong><span>" + l + "</span></button>"; };
    var actions = actionsAFaire();
    var top = D.biens.slice().sort(function (a, b) { return n(b.vues) - n(a.vues); }).filter(function (b) { return n(b.vues) > 0; }).slice(0, 5);
    return '<div class="a-tuiles">' + tuile(actifs, "Biens actifs", "maison", "biens") + tuile(vendus, "Biens vendus", "coche", "biens") + tuile(D.prospects.length, "Prospects", "personnes", "prospects") +
      '<button class="a-tuile" data-action="aller" data-vue="prospects" data-filtre-prospect="__relance">' + ico("horloge") + "<strong>" + D.prospects.filter(relanceDue).length + "</strong><span>À relancer</span></button>" +
      tuile(D.visites.length, "Demandes de visite", "calendrier", "demandes", "visites") + tuile(favoris, "Favoris (anonymes)", "coeur", "biens") + "</div>" +
      '<div class="a-deux"><section class="a-bloc"><h2>Actions à effectuer</h2>' +
        (actions.length ? actions.map(function (a) { return '<button class="a-ligne" data-action="aller" data-vue="' + a.v + '"' + (a.id ? ' data-id="' + e(a.id) + '"' : "") + (a.s ? ' data-sous="' + a.s + '"' : "") + (a.filtreBien ? ' data-filtre-bien="' + e(a.filtreBien) + '"' : "") + '><span class="a-pastille a-pastille-or">' + ico(a.i) + '</span><span class="a-ligne-texte">' + e(a.t) + "</span>" + ico("droite") + "</button>"; }).join("") : '<p class="a-vide">Tout est à jour.</p>') +
      '</section><section class="a-bloc"><h2>Dernières demandes reçues</h2>' +
        (D.alertes.length ? D.alertes.slice().sort(recent).slice(0, 6).map(ligneAlerte).join("") : '<p class="a-vide">Aucune demande pour le moment.</p>') +
      '</section></div><section class="a-bloc"><h2>Biens les plus consultés</h2>' +
        (top.length ? '<div class="a-top">' + top.map(function (b, i) { return '<button class="a-ligne" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '"><span class="a-rang">' + (i + 1) + '</span><span class="a-ligne-texte"><strong>' + e(b.titre) + "</strong><small>" + e(b.ville) + " · " + e(b.quartier) + " · " + e(b.id) + '</small></span><span class="a-mesure">' + ico("oeil") + " " + n(b.vues) + '</span><span class="a-mesure">' + ico("coeur") + " " + Math.max(D.favoris[b.id] || 0, 0) + "</span></button>"; }).join("") + "</div>" : '<p class="a-vide">Les consultations apparaîtront ici.</p>') +
      "</section>";
  }

  /* ====================================================================== BIENS */
  function vueBiens() {
    var q = etat.recherche.toLowerCase();
    var l = D.biens.filter(function (b) { return (!etat.filtreBien || b.statut === etat.filtreBien) && (!q || (b.titre + " " + b.ville + " " + b.quartier + " " + b.id).toLowerCase().indexOf(q) !== -1); })
      .sort(function (a, b) { return String(b.date_maj).localeCompare(String(a.date_maj)); });
    var puce = function (v, t) { var c = v ? D.biens.filter(function (b) { return b.statut === v; }).length : D.biens.length; return '<button class="puce' + (etat.filtreBien === v ? " est-actif" : "") + '" data-action="filtre-bien" data-v="' + v + '">' + t + " (" + c + ")</button>"; };
    return '<div class="a-outils"><div class="a-puces">' + puce("", "Tous") + puce("en_attente", "À valider") + puce("publie", "Publiés") + puce("brouillon", "Brouillons") + puce("refuse", "Refusés") + puce("sous-offre", "Sous offre") + puce("vendu", "Vendus") + puce("archive", "Archivés") + "</div>" +
      '<input class="a-recherche" type="search" placeholder="Rechercher un bien…" value="' + e(etat.recherche) + '" data-recherche aria-label="Rechercher un bien"></div>' +
      (l.length ? '<div class="a-biens">' + l.map(function (b) {
        var ph = photosDe(b.id), une = b.a_la_une === "oui", coeur = b.coup_de_coeur === "oui", ag = b.agent_id && agent(b.agent_id);
        return '<article class="a-bien"><button class="a-bien-photo" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '" aria-label="Modifier ' + e(b.titre) + '">' + A.photo(ph[0] && ph[0].url, "160px", "") + "</button>" +
          '<div class="a-bien-infos"><div class="a-bien-haut">' + badgeStatut(b.statut) + ((b.transaction === "location-longue" || b.transaction === "location-courte") ? '<span class="a-statut a-statut-une">' + (LIB_TRANSACTION[b.transaction] || "Location") + "</span>" : "") + (une ? '<span class="a-statut a-statut-une">' + ico("etoile") + " À la une</span>" : "") + (coeur ? '<span class="a-statut a-statut-une">' + ico("coeur") + " Coup de cœur</span>" : "") + (b.exclusivite === "oui" ? '<span class="a-statut a-statut-une">Exclusivité</span>' : "") + (ag ? '<span class="a-statut a-statut-p">' + ico("personnes") + " " + e(ag.nom.replace(/^Exemple — /, "")) + "</span>" : "") + "</div>" +
          "<h3>" + e(b.titre) + "</h3><p>" + e(b.type) + " · " + e(b.ville) + (b.quartier ? " · " + e(b.quartier) : "") + " · Réf. " + e(b.id) + "</p>" +
          '<p class="a-bien-prix">' + (b.prix_sur_demande === "oui" ? "Prix sur demande" : n(b.prix) ? A.prix(n(b.prix)) : "Prix à renseigner") + '<span class="a-mesure">' + ico("oeil") + " " + n(b.vues) + '</span><span class="a-mesure">' + ico("coeur") + " " + Math.max(D.favoris[b.id] || 0, 0) + '</span><span class="a-mesure">' + ico("photo") + " " + ph.length + "</span>" + (correspondances(b).length ? '<span class="a-mesure" title="Prospects dont les critères correspondent à ce bien">' + ico("personnes") + " " + correspondances(b).length + "</span>" : "") + "</p>" +
          (b.statut === "refuse" && b.motif_refus ? '<div class="a-refus"><strong>' + ico("info") + " " + e(b.motif_refus) + "</strong>" + (b.commentaire_refus ? "<p>" + e(b.commentaire_refus) + "</p>" : "") + "</div>" : "") + "</div>" +
          '<div class="a-bien-actions">' + (b.statut === "en_attente"
            ? '<button class="btn btn-vert" data-action="valider-bien" data-id="' + e(b.id) + '">' + ico("coche") + " Valider</button><button class=\"btn btn-ligne est-danger\" data-action=\"ouvrir-refus\" data-id=\"" + e(b.id) + '">' + ico("fermer") + " Refuser</button>"
            : '<button class="btn btn-vert" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '">' + ico("crayon") + " Modifier</button>") +
          '<label class="a-select"><span class="sr">Statut de ' + e(b.titre) + '</span><select data-action-change="statut-bien" data-id="' + e(b.id) + '">' + D.listes.statutsBien.map(function (s) { return option(s, (s === b.statut ? "Statut : " : "Passer en : ") + LIB_STATUT[s], b.statut); }).join("") + "</select></label>" +
          '<div class="a-bien-mini"><button class="a-icone' + (une ? " est-actif" : "") + '" data-action="une" data-id="' + e(b.id) + '" aria-pressed="' + une + '" title="Mettre à la une">' + ico("etoile") + "</button>" +
          '<button class="a-icone' + (coeur ? " est-actif" : "") + '" data-action="coeur" data-id="' + e(b.id) + '" aria-pressed="' + coeur + '" title="Coup de cœur">' + ico("coeur") + "</button>" +
          (b.statut === "publie" || b.statut === "sous-offre" ? '<a class="a-icone" href="bien.html?id=' + encodeURIComponent(b.id) + '" target="_blank" rel="noopener" title="Voir sur le site">' + ico("oeil") + "</a>" : "") +
          '<button class="a-icone a-icone-danger" data-action="supprimer-bien" data-id="' + e(b.id) + '" title="Supprimer">' + ico("corbeille") + "</button></div></div>" +
          (etat.refus === b.id ? panneauRefus(b) : "") + "</article>";
      }).join("") + "</div>" : '<p class="a-vide a-bloc">Aucun bien dans cette liste.</p>');
  }
  function panneauRefus(b) {
    return '<form class="a-refus-form" id="form-refus" data-id="' + e(b.id) + '"><label class="a-etiquette">Motif du refus</label><div class="a-puces">' +
      (D.motifsRefus || []).filter(function (m) { return m.actif === "oui"; }).map(function (m) { return '<button type="button" class="puce" data-action="choisir-motif" data-motif="' + e(m.libelle) + '">' + e(m.libelle) + "</button>"; }).join("") +
      '</div><label for="f-motif">Motif (modifiable)</label><input id="f-motif" name="motif" value="">' +
      '<label for="f-commentaire-refus">Commentaire pour l’agent</label><textarea id="f-commentaire-refus" name="commentaire" rows="3" placeholder="Précisez ce qui doit être corrigé…"></textarea>' +
      '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="annuler-refus">Annuler</button><button type="submit" class="btn btn-danger">Confirmer le refus</button></div></form>';
  }

  function vueBien() {
    var nouveau = !etat.id, b = etat.edition || (etat.edition = nouveau ? { statut: "brouillon", type: "Villa", ville: "Marrakech", equipements: "" } : Object.assign({}, bien(etat.id)));
    if (!b) return '<p class="a-vide a-bloc">Bien introuvable.</p>';
    var ph = nouveau ? [] : photosDe(etat.id), eq = String(b.equipements || "").split("|").filter(Boolean);
    var tous = A.equipements.concat(eq.filter(function (x) { return A.equipements.indexOf(x) === -1; }));
    var bascule = function (nom, libelle, aide) { return '<label class="a-bascule"><input type="checkbox" name="' + nom + '"' + (b[nom] === "oui" || b[nom] === true ? " checked" : "") + "><span></span><div><strong>" + libelle + "</strong><small>" + aide + "</small></div></label>"; };
    var banniereAgent = "";
    if (!nouveau && b.statut === "en_attente") {
      banniereAgent = '<section class="a-bloc a-refus" style="background:#FBF6EA;border-color:#EBDDBC;color:#5c4a22"><strong>' + ico("cle") + " Bien soumis par " + e((agent(b.agent_id) || {}).nom || "un agent") + ' — en attente de validation</strong><div class="a-form-pied" style="margin-top:10px"><button type="button" class="btn btn-vert" data-action="valider-bien" data-id="' + e(b.id) + '">' + ico("coche") + " Valider et publier</button><button type=\"button\" class=\"btn btn-ligne est-danger\" data-action=\"ouvrir-refus\" data-id=\"" + e(b.id) + '">' + ico("fermer") + " Refuser</button></div>" + (etat.refus === b.id ? panneauRefus(b) : "") + "</section>";
    } else if (!nouveau && b.statut === "refuse" && b.motif_refus) {
      banniereAgent = '<section class="a-bloc a-refus"><strong>' + ico("info") + " Refusé — " + e(b.motif_refus) + "</strong>" + (b.commentaire_refus ? "<p>" + e(b.commentaire_refus) + "</p>" : "") + "</section>";
    }
    return banniereAgent + (nouveau ? "" : blocInteresses(b)) + '<form id="form-bien" class="a-form" novalidate>' +
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
      '<section class="a-bloc"><h2>Situation juridique</h2><div class="a-grille">' + champ("juridique", "Situation (affichée au public si renseignée)", b.juridique, 'placeholder="ex. Titré, melkia, VNA…"', "plein") + "</div>" +
        bascule("juridique_verifie", "Vérifiée par l’agence", "N’activez que si vous avez contrôlé les documents.") + "</section>" +
      '<section class="a-bloc"><h2>Mise en avant</h2>' + bascule("a_la_une", "À la une", "Apparaît en premier dans « Notre sélection » sur l’accueil.") + bascule("exclusivite", "Exclusivité", "Affiche le badge « Exclusivité ».") +
        bascule("coup_de_coeur", "Coup de cœur", "Un seul bien à la fois : il est mis en avant dans la section « Coup de cœur » de l’accueil.") +
        bascule("prix_sur_demande", "Prix sur demande", "Masque le prix sur le site public et affiche « Prix sur demande ».") + "</section>" +
      '<section class="a-bloc a-bloc-prive"><h2>' + ico("bouclier") + ' Informations privées</h2><p class="a-aide">Jamais affichées sur le site public.</p><div class="a-grille">' +
        champ("adresse_privee", "Adresse exacte / propriétaire", b.adresse_privee, "", "plein") + '<div class="plein"><label for="f-notes">Notes internes</label><textarea id="f-notes" name="notes_privees" rows="3">' + e(b.notes_privees || "") + "</textarea></div></div></section>" +
      (b.agent_id ? '<section class="a-bloc a-bloc-prive"><h2>' + ico("bouclier") + " Agent apporteur · " + e((agent(b.agent_id) || {}).nom || b.agent_id) + '</h2><p class="a-aide">Visible uniquement dans l’Espace Pro, jamais dans l’Espace Agent ni sur le site public.</p><div class="a-grille">' +
        champ("commission", "Commission convenue", b.commission, 'placeholder="ex. 2% du prix de vente, ou 30 000 DH"', "plein") +
        '<div><label for="f-commission_statut">Statut de la commission</label><select id="f-commission_statut" name="commission_statut"><option value="">Non précisé</option>' + (D.listes.statutsCommission || []).map(function (s) { return option(s, s, b.commission_statut); }).join("") + "</select></div></div></section>" : "") +
      '<div class="a-barre"><div class="a-barre-statut">' + badgeStatut(b.statut || "brouillon") + (nouveau ? "" : "<small>Réf. " + e(b.id) + " · modifié le " + e(A.dateFr(b.date_maj, true)) + "</small>") + "</div>" +
        '<div class="a-barre-actions"><button type="button" class="btn btn-ligne" data-action="aller" data-vue="biens">Retour</button>' +
        '<button type="submit" class="btn ' + (b.statut === "publie" ? "btn-vert" : "btn-ligne") + '" data-publier="0">Enregistrer</button>' +
        (b.statut === "publie" ? "" : '<button type="submit" class="btn btn-vert" data-publier="1">Enregistrer et publier</button>') + "</div></div></form>";
  }
  function lireFormBien() {
    var f = document.getElementById("form-bien"); if (!f || !etat.edition) return;
    var b = etat.edition;
    ["titre", "type", "transaction", "prix", "ville", "quartier", "surface", "terrain", "chambres", "sdb", "description", "juridique", "adresse_privee", "notes_privees"].forEach(function (k) { b[k] = f.elements[k].value.trim(); });
    if (f.elements.commission) b.commission = f.elements.commission.value.trim();
    if (f.elements.commission_statut) b.commission_statut = f.elements.commission_statut.value;
    ["juridique_verifie", "a_la_une", "exclusivite", "coup_de_coeur", "prix_sur_demande"].forEach(function (k) { b[k] = f.elements[k].checked ? "oui" : "non"; });
    b.equipements = Array.prototype.filter.call(f.querySelectorAll('[name="equipement"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }).join("|");
  }
  function enregistrerBien(publier, silencieux) {
    lireFormBien();
    var b = Object.assign({}, etat.edition);
    if (!b.titre && !silencieux) { A.message("Indiquez un titre pour l’annonce."); document.getElementById("f-titre").focus(); return Promise.reject(new Error("titre")); }
    if (publier) {
      if (!n(b.prix)) { A.message("Indiquez un prix avant de publier."); document.getElementById("f-prix").focus(); return Promise.reject(new Error("prix")); }
      b.statut = "publie";
    }
    return faire("bienEnregistrer", { bien: b }, silencieux ? "" : (publier ? "Bien publié sur le site." : "Bien enregistré.")).then(function (r) {
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
          return A.preparerPhoto(f).then(function (ph) { return faire("photoAjouter", { bien_id: id, photo: { nom: ph.nom, mime: ph.mime, donnees: ph.donnees } }, "", true); })
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
    return faire("photosOrdonner", { bien_id: etat.id, ids: ids }, "Ordre des photos mis à jour.").then(rendre);
  }

  /* ====================================================================== AGENTS (apporteurs d'affaires) */
  function vueAgents() {
    var l = D.agents.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom); });
    return (l.length ? '<section class="a-bloc a-bloc-liste">' + l.map(function (a) {
      var mesBiens = D.biens.filter(function (b) { return b.agent_id === a.id; }), leads = mesBiens.length ? D.alertes.filter(function (al) { return mesBiens.some(function (b) { return b.id === al.bien_id; }); }).length : 0;
      return '<button class="a-ligne" data-action="aller" data-vue="agent" data-id="' + e(a.id) + '"><span class="a-pastille">' + e((a.nom || "?").replace(/^Exemple — /, "").charAt(0).toUpperCase()) + '</span><span class="a-ligne-texte"><strong>' + e(a.nom) + "</strong><small>" + e(a.email) + " · " + mesBiens.length + (mesBiens.length > 1 ? " biens apportés" : " bien apporté") + " · " + leads + (leads > 1 ? " demandes reçues" : " demande reçue") + "</small></span>" +
        '<span class="a-statut ' + (a.actif === "oui" ? "a-statut-publie" : "a-statut-brouillon") + '">' + (a.actif === "oui" ? "Actif" : "Désactivé") + "</span></button>";
    }).join("") + "</section>" : '<p class="a-vide a-bloc">Aucun agent / apporteur d’affaires pour le moment.</p>');
  }
  function vueAgent() {
    var nouveau = !etat.id, a = nouveau ? { actif: "oui" } : agent(etat.id);
    if (!a) return '<p class="a-vide a-bloc">Agent introuvable.</p>';
    var mesBiens = nouveau ? [] : D.biens.filter(function (b) { return b.agent_id === a.id; });
    return '<div class="a-deux a-deux-large"><form id="form-agent" class="a-bloc a-form" novalidate><h2>Coordonnées</h2><div class="a-grille">' +
      champ("nom", "Nom *", a.nom, "required", "plein") + champ("email", "E-mail (identifiant de connexion) *", a.email, 'type="email" required') + champ("telephone", "Téléphone", a.telephone, 'type="tel"') +
      champ("whatsapp", "WhatsApp (avec l’indicatif pays si possible)", a.whatsapp, "") + "</div>" +
      (nouveau ? '<p class="a-aide" style="margin:18px 0 14px">Un <strong>code PIN à 6 chiffres</strong> sera créé automatiquement. Vous pourrez l’envoyer tout de suite à l’agent par WhatsApp ou par e-mail.</p>' : "") +
      '<div class="a-form-pied">' + (nouveau ? "" : '<button type="button" class="lien-discret est-danger" data-action="supprimer-agent" data-id="' + e(a.id) + '">Supprimer cet agent</button>') + '<button class="btn btn-vert" type="submit">Enregistrer</button></div></form>' +
      (nouveau ? "" : '<div><section class="a-bloc"><h2>Accès</h2><p class="a-aide">Statut : <span class="a-statut ' + (a.actif === "oui" ? "a-statut-publie" : "a-statut-brouillon") + '">' + (a.actif === "oui" ? "Actif" : "Désactivé") + "</span></p>" +
        '<div class="a-contacts"><button type="button" class="btn btn-ligne" data-action="agent-actif" data-id="' + e(a.id) + '">' + (a.actif === "oui" ? "Désactiver l’accès" : "Réactiver l’accès") + '</button>' +
        '<button type="button" class="btn btn-vert" data-action="nouveau-code" data-id="' + e(a.id) + '">Nouveau code PIN</button></div>' +
        '<p class="a-aide">« Nouveau code PIN » crée un nouveau code (l’ancien ne fonctionne plus) et prépare le message WhatsApp. Les codes ne sont jamais conservés en clair.</p></section>' +
        '<section class="a-bloc"><h2>Biens apportés (' + mesBiens.length + ")</h2>" +
        (mesBiens.length ? mesBiens.map(function (b) { return '<button class="a-ligne" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '"><span class="a-ligne-texte"><strong>' + e(b.titre) + "</strong><small>" + e(b.id) + "</small></span>" + badgeStatut(b.statut) + "</button>"; }).join("") : '<p class="a-vide">Aucun bien pour le moment.</p>') + "</section></div>") + "</div>";
  }

  /* ====================================================================== SAMSAR */
  function vueSamsars() {
    var q = etat.recherche.toLowerCase(), relance = etat.filtreSamsar === "__relance", tous = D.samsar || [], nbRel = tous.filter(relanceSamsarDue).length;
    var l = tous.filter(function (s) { return (!etat.filtreSamsar || (relance ? relanceSamsarDue(s) : s.statut === etat.filtreSamsar)) && (!q || (s.nom + " " + s.telephone + " " + s.zone + " " + s.specialite).toLowerCase().indexOf(q) !== -1); })
      .sort(function (x, y) { return relance ? String(x.date_relance).localeCompare(String(y.date_relance)) : String(y.date_maj).localeCompare(String(x.date_maj)); });
    return '<div class="a-outils"><div class="a-puces"><button class="puce' + (relance ? " est-actif" : "") + '" data-action="filtre-samsar" data-v="__relance">' + ico("horloge") + " À relancer (" + nbRel + ")</button></div></div>" +
      '<div class="a-pipeline">' + [""].concat(STATUTS_SAMSAR).map(function (st) {
        var c = st ? tous.filter(function (s) { return s.statut === st; }).length : tous.length;
        return '<button class="a-etape' + (etat.filtreSamsar === st && !relance ? " est-actif" : "") + '" data-action="filtre-samsar" data-v="' + e(st) + '"><strong>' + c + "</strong><span>" + (st || "Tous") + "</span></button>";
      }).join("") + "</div>" +
      '<div class="a-outils"><input class="a-recherche" type="search" placeholder="Rechercher un samsar (nom, zone, téléphone)…" value="' + e(etat.recherche) + '" data-recherche aria-label="Rechercher un samsar"></div>' +
      (l.length ? '<section class="a-bloc a-bloc-liste">' + l.map(function (s) {
        var du = relanceSamsarDue(s);
        return '<button class="a-ligne" data-action="aller" data-vue="samsar" data-id="' + e(s.id) + '"><span class="a-pastille">' + e(nomAffiche(s).charAt(0).toUpperCase() || "?") + '</span><span class="a-ligne-texte"><strong>' + e(s.nom) + "</strong><small>" +
          e([s.specialite, s.zone, s.telephone].filter(Boolean).join(" · ") || "À compléter") + '</small></span><span class="a-prospect-fin"><span class="a-statut a-statut-p">' + e(s.statut) + "</span>" +
          (s.date_relance ? '<small class="' + (du ? "est-du" : "") + '">' + ico("horloge") + " Relance " + e(A.dateFr(s.date_relance)) + "</small>" : "") + "</span></button>";
      }).join("") + "</section>" : '<p class="a-vide a-bloc">' + (tous.length ? "Aucun samsar dans cette liste." : "Aucun samsar pour le moment. Ajoutez vos premiers contacts : plus votre réseau est large, plus vous recevrez de biens.") + "</p>");
  }
  function blocSuiviSamsar(s) {
    var num = numWa(s.telephone), mod = MODELES_SAMSAR[0];
    return '<section class="a-bloc" id="a-suivi"><h2>Suivi</h2>' +
      '<p class="a-aide" id="a-relance-info">' + (s.date_relance ? "Prochaine relance : <strong>" + e(A.dateFr(s.date_relance)) + "</strong>" + (relanceSamsarDue(s) ? " (à faire)" : "") : "Aucune relance prévue.") + "</p>" +
      '<div class="a-puces a-relances"><span class="a-etiquette">Relancer dans</span>' +
        [["Demain", 1], ["3 jours", 3], ["1 semaine", 7], ["2 semaines", 14]].map(function (r) { return '<button type="button" class="puce" data-action="relance-samsar" data-jours="' + r[1] + '">' + r[0] + "</button>"; }).join("") +
        '<button type="button" class="puce" data-action="relance-samsar" data-jours="0">Aucune</button></div>' +
      '<h3 class="a-sous-titre">Message WhatsApp</h3>' +
      (num ? '<div class="a-wa"><label class="sr" for="a-wa-modele">Modèle de message</label><select id="a-wa-modele" data-action-change="modele-wa-samsar">' + MODELES_SAMSAR.map(function (m) { return option(m.id, m.nom, mod.id); }).join("") + "</select>" +
        '<label class="sr" for="a-wa-texte">Texte du message</label><textarea id="a-wa-texte" rows="4">' + e(mod.texte(s)) + '</textarea><button type="button" class="btn btn-vert" data-action="wa-samsar">Ouvrir dans WhatsApp</button></div>' +
        '<p class="a-aide">Vous pouvez modifier le texte avant l’envoi. La date du dernier contact est mise à jour.</p>'
        : '<p class="a-vide">Ajoutez un numéro de téléphone pour envoyer un message WhatsApp.</p>') + "</section>";
  }
  function vueSamsar() {
    var nouveau = !etat.id, s = nouveau ? { statut: "À contacter" } : samsar(etat.id);
    if (!s) return '<p class="a-vide a-bloc">Samsar introuvable.</p>';
    return '<div class="a-deux a-deux-large"><form id="form-samsar" class="a-bloc a-form" novalidate><h2>Coordonnées et activité</h2>' +
      '<div class="a-grille">' + champ("nom", "Nom *", s.nom, "required", "plein") + champ("telephone", "Téléphone / WhatsApp", s.telephone, 'type="tel" placeholder="ex. 0600000000 ou +212600000000"') +
        champ("zone", "Zone ou quartiers", s.zone, 'placeholder="ex. Guéliz, Palmeraie"') + champ("specialite", "Spécialité", s.specialite, 'placeholder="ex. villas, terrains, riads"') +
        champ("source", "Comment l’avez-vous connu ?", s.source, "") + champ("commission", "Commission convenue", s.commission, 'placeholder="ex. 2 % du prix de vente"') +
        '<div><label for="f-statut">Statut</label><select id="f-statut" name="statut">' + STATUTS_SAMSAR.map(function (st) { return option(st, st, s.statut); }).join("") + "</select></div>" +
        champ("date_relance", "Date de relance", s.date_relance, 'type="date"') + champ("dernier_contact", "Dernier contact", s.dernier_contact, 'type="date"') +
        '<div class="plein"><label for="f-notes">Notes privées</label><textarea id="f-notes" name="notes" rows="4" placeholder="Biens évoqués, fiabilité, conditions…">' + e(s.notes || "") + "</textarea></div></div>" +
      '<div class="a-form-pied">' + (nouveau ? "" : '<button type="button" class="lien-discret est-danger" data-action="supprimer-samsar" data-id="' + e(s.id) + '">Supprimer ce samsar</button>') + '<button class="btn btn-vert" type="submit">Enregistrer</button></div>' +
      (nouveau ? "" : '<p class="a-aide">Fiche créée le ' + e(A.dateFr(s.date_creation, true)) + "</p>") + "</form>" +
      (nouveau ? "" : "<div>" + blocSuiviSamsar(s) + "</div>") + "</div>";
  }

  /* ====================================================================== V9 : IMPORT D'ANNONCE IA */
  var IMP_MAX_PHOTOS = 40, IMP_MAX_ZIP = 120 * 1024 * 1024, IMP_MAX_JSON = 1024 * 1024;
  var IMP_CHAMPS_TEXTE = ["titre", "type", "transaction", "ville", "quartier", "description", "juridique", "adresse_privee", "notes_privees"];
  var IMP_CHAMPS_NOMBRE = ["prix", "surface", "terrain", "chambres", "sdb"];
  var IMP_BASCULES = ["prix_sur_demande", "juridique_verifie", "exclusivite", "a_la_une", "coup_de_coeur"];
  var IMP_CONNUS = IMP_CHAMPS_TEXTE.concat(IMP_CHAMPS_NOMBRE, IMP_BASCULES, ["equipements", "statut", "devise", "reference", "photos", "a_verifier", "format", "version", "bien"]);
  var CONSIGNE_IA = [
    "Tu prépares une annonce pour mon site immobilier Nassiri Real Estate (Maroc). Je te donne les informations du bien et des photos.",
    "RÈGLES : n'invente RIEN. Une information absente reste vide (\"\" ou null) et tu la listes dans \"a_verifier\". Rédige en français, ton professionnel et sobre.",
    "LIVRABLE : un fichier ZIP contenant annonce.json et un dossier photos/ (JPEG, 1800 px max, nommés 01.jpg, 02.jpg…). Si tu ne peux pas créer de ZIP, donne-moi uniquement le JSON ci-dessous, dans un bloc de code.",
    "FORMAT annonce.json :",
    "{",
    "  \"format\": \"nassiri-annonce\", \"version\": 1,",
    "  \"bien\": {",
    "    \"titre\": \"\", \"type\": \"Villa|Appartement|Riad|Maison|Terrain\", \"transaction\": \"vente|location-longue|location-courte\",",
    "    \"prix\": 0, \"prix_sur_demande\": false, \"ville\": \"\", \"quartier\": \"\",",
    "    \"surface\": 0, \"terrain\": 0, \"chambres\": 0, \"sdb\": 0,",
    "    \"description\": \"\", \"equipements\": [\"Piscine\"], \"juridique\": \"\",",
    "    \"adresse_privee\": \"\", \"notes_privees\": \"\"",
    "  },",
    "  \"photos\": [ { \"fichier\": \"photos/01.jpg\", \"principale\": true } ],",
    "  \"a_verifier\": [\"…\"]",
    "}",
    "Notes : prix en dirhams (DH), nombres sans espaces ; surface = surface construite en m² ; terrain en m² ; adresse_privee et notes_privees ne sont jamais affichées au public ; l'ordre de \"photos\" est l'ordre d'affichage."
  ].join("\n");

  function nbImp(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    var s = String(v === null || v === undefined ? "" : v).replace(/[\s  ]/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
    return parseFloat(s) || 0;
  }
  function ouiImp(v) { return v === true || /^(oui|true|1|yes)$/i.test(String(v).trim()) ? "oui" : "non"; }
  function nettoyerTexteImp(v, max) { return String(v === null || v === undefined ? "" : v).replace(/<[^>]*>/g, "").replace(/\r\n?/g, "\n").trim().slice(0, max || 6000); }

  /* V9.3 : accepte aussi le « dossier annonce » (import_format nassiri-real-estate-listing-package) */
  function adapterDossier(o) {
    if (!o || typeof o !== "object" || o.bien || !(o.import_format || (o.title && o.images))) return o;
    var loc = o.location || {}, T = A.types, texteType = norm(o.property_type || o.type || "");
    var type = T.filter(function (x) { return texteType.indexOf(norm(x)) !== -1; })[0] || "";
    var eqSite = A.equipements, eq = (o.amenities || []).map(function (x) {
      var nx = norm(x), s = eqSite.filter(function (q) { return nx.indexOf(norm(q)) === 0 || (norm(q) === "terrasse" && nx.indexOf("terrasse") === 0) || (norm(q) === "vue degagee" && /^vue/.test(nx)); })[0];
      return s || String(x);
    });
    var notes = [], lt = o.land_title || {}, ta = o.tourism_approval || {}, act = o.tourism_activity || {};
    if (o.seller_authorization_note) notes.push(o.seller_authorization_note + ".");
    if (lt.verification) notes.push("Titre foncier : " + lt.verification + ".");
    if (ta.verification) notes.push("Agrément touristique : " + ta.verification + ".");
    if (act.listing_url) notes.push("Annonce en ligne de l’activité : " + act.listing_url);
    if (o.commission_terms) notes.push("Commission : " + o.commission_terms); else notes.push("Commission et conditions du mandat : non communiquées.");
    if (o.owner_contact) notes.push("Contact propriétaire : " + o.owner_contact);
    var quartier = String(loc.area || "").split("/").map(function (x) { return x.trim(); }).filter(Boolean).pop() || "";
    if (quartier === loc.city) quartier = "";
    var imgs = (o.images || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var apiv = (o.unknown_or_to_verify || []).slice();
    if (!type && o.property_type) apiv.unshift("Type de bien « " + o.property_type + " » : à choisir dans la liste du site.");
    return {
      format: "nassiri-annonce", version: 1, reference: o.external_reference || "",
      bien: { titre: o.title, type: type, transaction: o.transaction_type || "vente", prix: o.price, devise: o.currency, prix_sur_demande: false,
        ville: loc.city || "", quartier: quartier, surface: o.built_area_m2, terrain: o.land_area_m2, chambres: o.bedrooms, sdb: o.bathrooms,
        description: o.description, equipements: eq, juridique: lt.titled ? (/d[ée]clar/i.test(lt.verification || "") ? "Titré (déclaré par le propriétaire)" : "Titré") : "",
        adresse_privee: loc.street_address || "", notes_privees: notes.join("\n") },
      photos: imgs.map(function (i) { return { fichier: i.file, principale: !!i.cover }; }),
      a_verifier: apiv
    };
  }

  function lireJsonImp(texte) {
    var t = String(texte || "").replace(/^﻿/, "").trim();
    if (!t) throw new Error("Collez d’abord le texte de l’annonce.");
    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
    var a = t.indexOf("{"), z = t.lastIndexOf("}");
    if (a === -1 || z <= a) throw new Error("Ce texte ne ressemble pas à une annonce (aucun bloc { … } trouvé).");
    t = t.slice(a, z + 1);
    try { return adapterDossier(JSON.parse(t)); } catch (x1) {
      try { return adapterDossier(JSON.parse(t.replace(/[“”]/g, '"'))); }
      catch (x2) { throw new Error("Le texte n’est pas un JSON valide : " + x1.message); }
    }
  }

  /* Transforme le JSON reçu en annonce propre + liste d'alertes de lecture */
  function normaliserImp(brut) {
    var al = [], src = (brut && typeof brut === "object" && brut.bien && typeof brut.bien === "object") ? brut.bien : brut;
    if (!src || typeof src !== "object" || Array.isArray(src)) throw new Error("Structure inattendue : l’annonce doit être un objet JSON.");
    var b = { statut: "brouillon", equipements: "" };
    IMP_CHAMPS_TEXTE.forEach(function (k) { b[k] = nettoyerTexteImp(src[k], k === "description" ? 6000 : 300); });
    IMP_CHAMPS_NOMBRE.forEach(function (k) { var v = nbImp(src[k]); b[k] = v > 0 ? String(Math.round(v * 100) / 100) : ""; });
    IMP_BASCULES.forEach(function (k) { b[k] = ouiImp(src[k]); });
    var eq = src.equipements instanceof Array ? src.equipements : String(src.equipements || "").split(/[|,;\n]/);
    b.equipements = eq.map(function (x) { return nettoyerTexteImp(x, 60); }).filter(String).filter(function (x, i, t) { return t.indexOf(x) === i; }).join("|");
    var tr = norm(b.transaction).replace(/\s+/g, "-");
    if (!tr) b.transaction = "vente";
    else if (tr === "location" || tr === "location-longue-duree" || tr === "location-longue") b.transaction = "location-longue";
    else if (tr === "location-courte" || tr === "location-saisonniere" || tr === "location-courte-duree") b.transaction = "location-courte";
    else if (tr === "vente") b.transaction = "vente";
    else al.push({ niveau: "bloquant", texte: "Type de transaction non reconnu : « " + nettoyerTexteImp(src.transaction, 40) + " » (vente, location-longue ou location-courte)." });
    if (b.transaction !== "vente" && b.transaction !== "location-longue" && b.transaction !== "location-courte") b.transaction = "vente";
    var t = A.types.filter(function (x) { return norm(x) === norm(b.type); })[0];
    if (t) b.type = t;
    else if (b.type) al.push({ niveau: "bloquant", texte: "Type de bien « " + b.type + " » inconnu sur le site. Choisissez-le dans la liste ci-dessous (" + A.types.join(", ") + ")." }), b.type = "";
    else b.type = "";
    if (src.devise && !/^(dh|mad|dhs|dirhams?)$/i.test(String(src.devise).trim())) al.push({ niveau: "attention", texte: "Devise « " + nettoyerTexteImp(src.devise, 10) + " » : le site affiche uniquement des dirhams (DH). Vérifiez le prix." });
    if (src.statut && norm(src.statut) !== "brouillon") al.push({ niveau: "info", texte: "Le statut du fichier est ignoré : l’annonce arrive toujours en brouillon tant que vous ne cliquez pas sur « Valider et publier »." });
    Object.keys(src).forEach(function (k) { if (IMP_CONNUS.indexOf(k) === -1) al.push({ niveau: "info", texte: "Champ « " + nettoyerTexteImp(k, 40) + " » ignoré (il n’existe pas sur le site)." }); });
    var ref = nettoyerTexteImp((brut && brut.reference) || src.reference, 60).replace(/\s+/g, "-");
    if (ref && b.notes_privees.indexOf("Réf. externe : " + ref) === -1) b.notes_privees = ("Réf. externe : " + ref + (b.notes_privees ? "\n" + b.notes_privees : "")).slice(0, 3000);
    var av = (brut && brut.a_verifier) || src.a_verifier;
    (av instanceof Array ? av : av ? [av] : []).slice(0, 30).forEach(function (x) { var s = nettoyerTexteImp(x, 300); if (s) al.push({ niveau: "attention", texte: "À vérifier : " + s }); });
    return { bien: b, alertes: al, photosDecl: (brut && brut.photos) || src.photos || null };
  }

  /* Contrôles de cohérence recalculés à chaque modification */
  function controlerImp() {
    var I = etat.imp, b = I.bien, al = [], p = n(b.prix), s = n(b.surface), te = n(b.terrain);
    if (!b.titre) al.push({ niveau: "bloquant", texte: "Le titre est obligatoire." });
    if (!b.type) al.push({ niveau: "bloquant", texte: "Choisissez le type de bien." });
    if (!p && b.prix_sur_demande !== "oui") al.push({ niveau: "publier", texte: "Prix manquant : indiquez-le ou cochez « Prix sur demande » pour pouvoir publier." });
    if (b.transaction === "vente" && p && p < 100000) al.push({ niveau: "attention", texte: "Prix de vente très bas (" + A.prix(p) + ") : vérifiez qu’il est bien en dirhams." });
    if (b.transaction === "vente" && p > 200000000) al.push({ niveau: "attention", texte: "Prix très élevé (" + A.prix(p) + ") : vérifiez les zéros." });
    if (b.transaction === "location-longue" && p > 1000000) al.push({ niveau: "attention", texte: "Loyer mensuel très élevé : vérifiez le montant." });
    if (s && te && s > te) al.push({ niveau: "attention", texte: "La surface construite (" + s + " m²) dépasse celle du terrain (" + te + " m²)." });
    if (n(b.chambres) > 30) al.push({ niveau: "attention", texte: "Nombre de chambres inhabituel : vérifiez." });
    if (!b.ville) al.push({ niveau: "attention", texte: "Ville non renseignée." });
    if (!b.description) al.push({ niveau: "attention", texte: "Aucune description." });
    if (!I.photos.length) al.push({ niveau: "attention", texte: "Aucune photo : vous pourrez en ajouter ensuite depuis la fiche du bien." });
    var tn = norm(b.titre).replace(/[^a-z0-9]/g, ""), mref = String(b.notes_privees || "").match(/Réf\. externe : (\S+)/), cref = mref ? "Réf. externe : " + mref[1] : "";
    var dbl = D.biens.filter(function (x) { return (cref && String(x.notes_privees || "").indexOf(cref) !== -1) || (tn && norm(x.titre).replace(/[^a-z0-9]/g, "") === tn) || (n(x.prix) && n(x.prix) === p && norm(x.ville) === norm(b.ville) && n(x.terrain) === te && n(x.surface) === s); })[0];
    I.doublon = dbl || null;
    if (dbl) al.push({ niveau: "doublon", texte: "Doublon possible : « " + dbl.titre + " » (réf. " + dbl.id + ") existe déjà sur le site. Cochez la case de confirmation pour créer quand même." });
    return I.alertesFixes.concat(al);
  }

  function mimeExt(nom) {
    var m = String(nom).toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/);
    if (!m) return "";
    return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" }[m[1]];
  }
  function infoImp(t) { var i = document.getElementById("a-imp-progres"); if (i) { i.textContent = t; i.hidden = !t; } }

  function preparerPhotosImp(fichiers, alertes) {
    var I = etat.imp, fait = 0;
    return fichiers.reduce(function (p, f) {
      return p.then(function () {
        infoImp("Préparation de la photo " + (fait + 1) + " sur " + fichiers.length + "…");
        return A.preparerPhoto(f.fichier).then(function (ph) { ph.principale = f.principale; I.photos.push(ph); },
          function (err) { alertes.push({ niveau: "attention", texte: "Photo ignorée — " + err.message }); });
      }).then(function () { fait++; });
    }, Promise.resolve()).then(function () {
      var i = -1; I.photos.forEach(function (ph, k) { if (ph.principale && i === -1) i = k; });
      if (i > 0) I.photos.unshift(I.photos.splice(i, 1)[0]);
    });
  }

  function demarrerImp(brut, fichiersPhotos, source) {
    var res = normaliserImp(brut), fixes = res.alertes;
    etat.imp = { etape: "apercu", source: source, bien: res.bien, photos: [], alertesFixes: fixes, doublon: null, confirmeDoublon: false, occupe: false, resultat: null };
    return preparerPhotosImp(fichiersPhotos || [], fixes).then(function () { rendre(); window.scrollTo(0, 0); });
  }

  function importerTexte() {
    var ta = document.getElementById("a-imp-texte"), brut;
    try { brut = lireJsonImp(ta ? ta.value : ""); } catch (x) { A.message(x.message); return Promise.resolve(); }
    return demarrerImp(brut, [], "texte").catch(function (x) { A.message(x.message); });
  }

  function importerFichier(fichier) {
    var nom = String(fichier.name || "").toLowerCase();
    if (/\.json$|\.txt$/.test(nom)) {
      if (fichier.size > IMP_MAX_JSON) { A.message("Fichier trop volumineux pour un JSON d’annonce."); return Promise.resolve(); }
      return fichier.text().then(function (t) { return demarrerImp(lireJsonImp(t), [], "json"); }).catch(function (x) { A.message(x.message); });
    }
    if (!/\.zip$/.test(nom)) { A.message("Format non pris en charge : choisissez un fichier .zip ou .json."); return Promise.resolve(); }
    if (typeof JSZip === "undefined") { A.message("Le module ZIP n’est pas chargé : actualisez la page (Ctrl+F5) puis réessayez."); return Promise.resolve(); }
    if (fichier.size > IMP_MAX_ZIP) { A.message("ZIP trop lourd (" + Math.round(fichier.size / 1048576) + " Mo, maximum 120 Mo). Réduisez le nombre de photos."); return Promise.resolve(); }
    infoImp("Lecture du ZIP…");
    return JSZip.loadAsync(fichier).then(function (zip) {
      var noms = Object.keys(zip.files).filter(function (k) { return !zip.files[k].dir && !/(^|\/)(__MACOSX|\.DS_Store)/.test(k) && !/(^|\/)\._/.test(k); });
      if (noms.length > 150) throw new Error("ZIP invalide : trop de fichiers (" + noms.length + ").");
      var bad = noms.filter(function (k) { return /(^|\/)\.\.(\/|$)/.test(k) || /^\//.test(k); });
      if (bad.length) throw new Error("ZIP refusé : chemin de fichier suspect (« " + bad[0] + " »).");
      var js = noms.filter(function (k) { return /(^|\/)annonce\.json$/i.test(k); })[0] || noms.filter(function (k) { return /\.json$/i.test(k); })[0];
      if (!js) throw new Error("Aucun fichier annonce.json trouvé dans le ZIP.");
      var taille = zip.files[js]._data && zip.files[js]._data.uncompressedSize;
      if (taille && taille > IMP_MAX_JSON) throw new Error("annonce.json est anormalement volumineux.");
      var racine = js.indexOf("/") === -1 ? "" : js.slice(0, js.lastIndexOf("/") + 1);
      return zip.files[js].async("string").then(function (t) {
        var brut = lireJsonImp(t), alertes = [], liste = [];
        var decl = (brut && brut.photos) || (brut && brut.bien && brut.bien.photos);
        if (decl instanceof Array && decl.length) {
          decl.forEach(function (x) {
            var f = typeof x === "string" ? x : x && x.fichier, princ = !!(x && typeof x === "object" && x.principale);
            if (!f) return;
            var chemin = racine + String(f).replace(/^\.?\//, ""), cle = noms.indexOf(chemin) !== -1 ? chemin : noms.filter(function (k) { return k.toLowerCase() === chemin.toLowerCase(); })[0];
            if (!cle) alertes.push({ niveau: "attention", texte: "Photo déclarée mais introuvable dans le ZIP : " + nettoyerTexteImp(f, 80) });
            else liste.push({ cle: cle, principale: princ });
          });
        } else {
          var imgsZip = noms.filter(function (k) { return mimeExt(k); }).sort(), web = imgsZip.filter(function (k) { return /(^|\/)(photos|photos_web)\//i.test(k) && !/original/i.test(k); });
          (web.length ? web : imgsZip.filter(function (k) { return !/original/i.test(k); })).forEach(function (k) { liste.push({ cle: k, principale: false }); });
        }
        var vus = {}; liste = liste.filter(function (x) { if (vus[x.cle]) return false; vus[x.cle] = 1; return true; });
        noms.forEach(function (k) { if (!/\.json$/i.test(k) && !mimeExt(k)) alertes.push({ niveau: "info", texte: "Fichier ignoré (type non accepté) : " + nettoyerTexteImp(k.split("/").pop(), 60) }); });
        liste = liste.filter(function (x) { if (!mimeExt(x.cle)) { alertes.push({ niveau: "attention", texte: "Format de photo non accepté : " + nettoyerTexteImp(x.cle.split("/").pop(), 60) + " (JPEG, PNG, WebP ou HEIC)." }); return false; } return true; });
        if (liste.length > IMP_MAX_PHOTOS) { alertes.push({ niveau: "attention", texte: "Plus de " + IMP_MAX_PHOTOS + " photos : seules les " + IMP_MAX_PHOTOS + " premières sont gardées." }); liste = liste.slice(0, IMP_MAX_PHOTOS); }
        var fichiers = [], i = 0;
        return liste.reduce(function (p, x) {
          return p.then(function () {
            infoImp("Extraction de la photo " + (++i) + " sur " + liste.length + "…");
            return zip.files[x.cle].async("blob").then(function (bl) {
              if (bl.size > 40 * 1048576) { alertes.push({ niveau: "attention", texte: "Photo trop lourde ignorée : " + nettoyerTexteImp(x.cle.split("/").pop(), 60) }); return; }
              var nomF = x.cle.split("/").pop();
              fichiers.push({ fichier: new File([bl], nomF, { type: mimeExt(nomF) }), principale: x.principale });
            });
          });
        }, Promise.resolve()).then(function () {
          return demarrerImp(brut, fichiers, "zip").then(function () { etat.imp.alertesFixes = etat.imp.alertesFixes.concat(alertes); majApercuImp(); });
        });
      });
    }).catch(function (x) { infoImp(""); A.message(x.message || "Impossible de lire ce ZIP."); });
  }

  function lireFormImp() {
    var f = document.getElementById("form-import"), I = etat.imp; if (!f || !I) return;
    var b = I.bien;
    IMP_CHAMPS_TEXTE.concat(IMP_CHAMPS_NOMBRE).forEach(function (k) { if (f.elements[k]) b[k] = f.elements[k].value.trim(); });
    ["prix_sur_demande", "juridique_verifie", "exclusivite", "a_la_une", "coup_de_coeur"].forEach(function (k) { if (f.elements[k]) b[k] = f.elements[k].checked ? "oui" : "non"; });
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
    if (!al.length) return '<p class="a-imp-ok">' + ico("coche") + " Aucune anomalie détectée. Relisez tout de même l’aperçu avant de publier.</p>";
    return '<ul class="a-imp-alertes">' + al.map(function (a) { return '<li class="a-imp-' + a.niveau + '">' + ico(ico2[a.niveau]) + "<span>" + e(a.texte) + "</span></li>"; }).join("") + "</ul>" +
      (etat.imp.doublon ? '<label class="a-case a-imp-doublon"><input type="checkbox" name="confirme_doublon" data-action-change="imp-maj"' + (etat.imp.confirmeDoublon ? " checked" : "") + "><span>Créer quand même cette annonce</span></label>" : "");
  }
  function photosImpHtml() {
    var ph = etat.imp.photos;
    return '<div class="a-photos">' + ph.map(function (p, i) {
      return '<div class="a-photo' + (i === 0 ? " est-principale" : "") + '"><img src="' + p.apercu + '" alt="Photo ' + (i + 1) + '">' + (i === 0 ? '<span class="a-photo-etiquette">' + ico("etoile") + " Principale</span>" : "") +
        '<div class="a-photo-actions">' + (i > 0 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="gauche" title="Déplacer vers la gauche">' + ico("gauche") + "</button>" : "") +
        (i > 0 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="principale" title="Définir comme photo principale">' + ico("etoile") + "</button>" : "") +
        (i < ph.length - 1 ? '<button type="button" data-action="imp-photo" data-i="' + i + '" data-m="droite" title="Déplacer vers la droite">' + ico("droite") + "</button>" : "") +
        '<button type="button" class="est-danger" data-action="imp-photo" data-i="' + i + '" data-m="retirer" title="Retirer cette photo">' + ico("corbeille") + "</button></div></div>";
    }).join("") + "</div>";
  }
  function majApercuImp() {
    if (etat.vue !== "import" || !etat.imp || etat.imp.etape !== "apercu") return;
    var a = document.getElementById("a-imp-apercu"), l = document.getElementById("a-imp-alertes"), p = document.getElementById("a-imp-photos");
    if (a) a.innerHTML = apercuImp(); if (l) l.innerHTML = alertesImpHtml(); if (p) p.innerHTML = photosImpHtml();
  }

  function vueImport() {
    var I = etat.imp;
    if (!I) {
      return '<section class="a-bloc"><h2>1. Choisir l’annonce préparée par l’IA</h2><p class="a-aide">Importez le fichier <strong>ZIP</strong> reçu (annonce + photos), ou collez simplement le texte JSON de l’annonce. Rien n’est publié à cette étape : vous verrez d’abord un aperçu.</p>' +
        '<div class="a-imp-choix"><label class="btn btn-vert a-imp-fichier" for="a-imp-fichier">' + ico("plus") + " Choisir un fichier ZIP ou JSON</label>" +
        '<input class="sr" id="a-imp-fichier" type="file" accept=".zip,.json,.txt,application/zip,application/json,text/plain"></div>' +
        '<p class="a-aide" id="a-imp-progres" role="status" hidden></p></section>' +
        '<section class="a-bloc"><h2>…ou coller le texte de l’annonce</h2><label class="sr" for="a-imp-texte">Texte JSON de l’annonce</label>' +
        '<textarea id="a-imp-texte" rows="8" placeholder="Collez ici le JSON fourni par Claude ou ChatGPT" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>' +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="imp-analyser">Analyser le texte collé</button></div>' +
        '<p class="a-aide">Avec le texte seul, les photos s’ajoutent ensuite depuis la fiche du bien.</p></section>' +
        '<section class="a-bloc"><h2>Consigne à donner à une IA</h2><p class="a-aide">Copiez cette consigne dans ChatGPT ou Claude avec les informations et les photos du bien : l’IA vous rendra un fichier prêt à importer ici.</p>' +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="imp-copier-consigne">Copier la consigne</button></div></section>';
    }
    if (I.etape === "fini") {
      var r = I.resultat;
      return '<section class="a-bloc a-imp-fin"><h2>' + ico("coche") + (r.publie ? " Annonce publiée" : " Brouillon enregistré") + "</h2><p><strong>" + e(r.titre) + "</strong> — réf. " + e(r.id) + " · " + r.photos + " photo" + (r.photos > 1 ? "s" : "") + ".</p>" +
        '<div class="a-form-pied">' + (r.publie ? '<a class="btn btn-vert" href="bien.html?id=' + encodeURIComponent(r.id) + '" target="_blank" rel="noopener">' + ico("oeil") + " Voir l’annonce sur le site</a>" : "") +
        '<button type="button" class="btn btn-ligne" data-action="aller" data-vue="bien" data-id="' + e(r.id) + '">Modifier la fiche</button>' +
        '<button type="button" class="btn btn-ligne" data-action="imp-nouvelle">Importer une autre annonce</button></div></section>';
    }
    var b = I.bien, eq = String(b.equipements || "").split("|").filter(Boolean), tous = A.equipements.concat(eq.filter(function (x) { return A.equipements.indexOf(x) === -1; }));
    var ch = function (nom, lib, val, attrs, cls) { return champ(nom, lib, val, 'data-action-change="imp-maj" ' + (attrs || ""), cls); };
    var cb = function (nom, lib) { return '<label class="a-case"><input type="checkbox" name="' + nom + '" data-action-change="imp-maj"' + (b[nom] === "oui" ? " checked" : "") + "><span>" + lib + "</span></label>"; };
    return '<section class="a-bloc"><h2>2. Contrôles</h2><div id="a-imp-alertes">' + alertesImpHtml() + "</div></section>" +
      '<section class="a-bloc"><h2>3. Aperçu de l’annonce</h2><p class="a-aide">Mise en forme simplifiée : le site affichera la même annonce avec son habillage habituel.</p><div id="a-imp-apercu">' + apercuImp() + "</div></section>" +
      '<section class="a-bloc"><h2>Photos (' + I.photos.length + ')</h2><p class="a-aide">La première photo est la photo principale. Flèches : changer l’ordre. Étoile : photo principale.</p><div id="a-imp-photos">' + photosImpHtml() + "</div></section>" +
      '<form id="form-import" class="a-form" novalidate><section class="a-bloc"><h2>4. Corriger si nécessaire</h2><div class="a-grille">' +
        ch("titre", "Titre *", b.titre, "", "plein") +
        '<div><label for="f-type">Type de bien</label><select id="f-type" name="type" data-action-change="imp-maj"><option value="">— Choisir —</option>' + A.types.map(function (t) { return option(t, t, b.type); }).join("") + "</select></div>" +
        '<div><label for="f-transaction">Transaction</label><select id="f-transaction" name="transaction" data-action-change="imp-maj">' + ["vente", "location-longue", "location-courte"].map(function (t) { return option(t, LIB_TRANSACTION[t], b.transaction); }).join("") + "</select></div>" +
        ch("prix", "Prix (DH)", b.prix, 'inputmode="numeric"') + ch("ville", "Ville", b.ville, 'list="l-villes"') + '<datalist id="l-villes">' + A.villes.map(function (v) { return '<option value="' + e(v) + '">'; }).join("") + "</datalist>" +
        ch("quartier", "Quartier (affiché au public)", b.quartier, "") +
        ch("surface", "Surface construite (m²)", b.surface, 'inputmode="numeric"') + ch("terrain", "Surface du terrain (m²)", b.terrain, 'inputmode="numeric"') +
        ch("chambres", "Chambres", b.chambres, 'inputmode="numeric"') + ch("sdb", "Salles de bains", b.sdb, 'inputmode="numeric"') +
        ch("juridique", "Situation juridique (affichée au public)", b.juridique, "", "plein") + "</div>" +
        '<div class="a-cases">' + cb("prix_sur_demande", "Prix sur demande") + cb("juridique_verifie", "Situation vérifiée") + cb("exclusivite", "Exclusivité") + cb("a_la_une", "À la une") + cb("coup_de_coeur", "Coup de cœur") + "</div>" +
        '<label class="a-etiquette">Équipements</label><div class="a-cases">' + tous.map(function (x) { return '<label class="a-case"><input type="checkbox" name="equipement" value="' + e(x) + '" data-action-change="imp-maj"' + (eq.indexOf(x) !== -1 ? " checked" : "") + "><span>" + e(x) + "</span></label>"; }).join("") + "</div>" +
        '<div class="plein"><label for="f-description">Description</label><textarea id="f-description" name="description" rows="9" data-action-change="imp-maj">' + e(b.description) + "</textarea></div>" +
        '<div class="a-grille">' + ch("adresse_privee", "Adresse exacte / propriétaire (privé)", b.adresse_privee, "", "plein") + '<div class="plein"><label for="f-notes_privees">Notes internes (privées)</label><textarea id="f-notes_privees" name="notes_privees" rows="2" data-action-change="imp-maj">' + e(b.notes_privees) + "</textarea></div></div></section>" +
      '<div class="a-barre"><div class="a-barre-statut"><span class="a-statut a-statut-brouillon">Brouillon</span><small id="a-imp-progres" role="status" hidden></small></div><div class="a-barre-actions">' +
        '<button type="button" class="btn btn-ligne" data-action="imp-annuler">Annuler l’import</button>' +
        '<button type="button" class="btn btn-ligne" data-action="imp-creer" data-publier="0">Enregistrer en brouillon</button>' +
        '<button type="button" class="btn btn-vert" data-action="imp-creer" data-publier="1">Valider et publier</button></div></div></form>';
  }

  function creerImp(publier) {
    var I = etat.imp; if (!I || I.occupe) return Promise.resolve();
    lireFormImp();
    var al = controlerImp(), bloq = al.filter(function (a) { return a.niveau === "bloquant"; })[0];
    if (bloq) { A.message(bloq.texte); return Promise.resolve(); }
    if (publier) { var pb = al.filter(function (a) { return a.niveau === "publier"; })[0]; if (pb) { A.message(pb.texte); return Promise.resolve(); } }
    if (I.doublon && !I.confirmeDoublon) { A.message("Doublon possible : cochez « Créer quand même cette annonce » pour continuer."); return Promise.resolve(); }
    I.occupe = true;
    var b = Object.assign({}, I.bien, { statut: "brouillon" }), id = null, fait = 0;
    document.querySelectorAll('[data-action="imp-creer"],[data-action="imp-annuler"]').forEach(function (x) { x.disabled = true; });
    infoImp("Création de l’annonce…");
    var pause = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
    var envoyer = function (ph, tentative) {
      return A.api("photoAjouter", { bien_id: id, photo: { nom: ph.nom, mime: ph.mime, donnees: ph.donnees } }).catch(function (err) {
        if (err.code === "AUTH" || tentative >= 1) throw err;
        return pause(1500).then(function () { return envoyer(ph, tentative + 1); });
      });
    };
    return A.api("bienEnregistrer", { bien: b }).then(function (r) {
      id = r.bien.id;
      return I.photos.reduce(function (p, ph) {
        return p.then(function () { infoImp("Envoi de la photo " + (fait + 1) + " sur " + I.photos.length + "…"); return envoyer(ph, 0).then(function () { fait++; }); });
      }, Promise.resolve());
    }).then(function () {
      if (publier) { infoImp("Publication…"); return A.api("bienEnregistrer", { bien: { id: id, statut: "publie" } }); }
    }).then(function () {
      return charger().then(function () {
        I.occupe = false; I.resultat = { id: id, titre: b.titre, publie: !!publier, photos: fait };
        if (publier) { I.etape = "fini"; rendre(); window.scrollTo(0, 0); A.message("Annonce publiée sur le site."); }
        else { etat.imp = null; aller("bien", id); A.message("Brouillon enregistré : vous pouvez le corriger puis le publier."); }
      });
    }).catch(function (err) {
      I.occupe = false;
      var annule = id ? A.api("bienSupprimer", { id: id }).then(function () { return true; }, function () { return false; }) : Promise.resolve(true);
      return annule.then(function (ok) {
        infoImp("");
        document.querySelectorAll('[data-action="imp-creer"],[data-action="imp-annuler"]').forEach(function (x) { x.disabled = false; });
        if (err.code === "AUTH") { A.jeton.ecrire(""); D = null; rendre(); A.message(err.message); return; }
        A.message("Import interrompu : " + err.message + (ok ? " Rien n’a été publié, vous pouvez réessayer." : " Attention : un brouillon incomplet (" + id + ") a pu rester dans la liste, supprimez-le."));
        return charger().then(rendre, rendre);
      });
    });
  }

  /* ====================================================================== V9.2 : IMPORT DE CONTACTS SAMSAR */
  var SIMP_MAX = 300;
  var RE_TEL = /(\+?\d[\d\s().\-]{6,}\d)/;
  function normTel(brut) {
    var s = String(brut || "").trim(), plus = /^\s*(\+|00)/.test(s), d = s.replace(/\D/g, "");
    if (/^00/.test(d)) d = d.slice(2);
    if (!plus && /^0[5-7]\d{8}$/.test(d)) return "+212" + d.slice(1);
    if (!plus && /^[5-7]\d{8}$/.test(d)) return "+212" + d;
    if (/^212[5-7]\d{8}$/.test(d)) return "+" + d;
    if (d.length < 8 || d.length > 15) return "";
    return (plus || /^212/.test(d) ? "+" : "") + d;
  }
  function parserVcf(texte) {
    var t = String(texte || "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, ""), res = [];
    t.split(/BEGIN:VCARD/i).slice(1).forEach(function (bloc) {
      var nom = "", n = "", tels = [];
      bloc.split("\n").forEach(function (l) {
        var m = l.match(/^(?:[A-Za-z0-9\-]+\.)?([A-Za-z\-]+)(?:;[^:]*)?:(.*)$/); if (!m) return;
        var k = m[1].toUpperCase(), v = m[2].trim();
        if (k === "FN" && !nom) nom = v;
        else if (k === "N" && !n) n = v.split(";").reverse().filter(Boolean).join(" ").trim();
        else if (k === "TEL" && v) tels.push(v);
      });
      if (tels.length) res.push({ nom: nom || n, tels: tels });
    });
    return res;
  }
  function decouperCsv(texte) {
    var t = String(texte || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n"), prem = t.split("\n")[0] || "";
    var sep = (prem.split(";").length > prem.split(",").length && prem.split(";").length >= prem.split("\t").length) ? ";" : (prem.split("\t").length > prem.split(",").length ? "\t" : ",");
    var lignes = [], cell = "", ligne = [], q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { ligne.push(cell); cell = ""; }
      else if (c === "\n") { ligne.push(cell); lignes.push(ligne); ligne = []; cell = ""; }
      else cell += c;
    }
    ligne.push(cell); lignes.push(ligne);
    return lignes;
  }
  function parserCellules(lignes) {
    var res = [];
    lignes.forEach(function (cells) {
      var tels = [], noms = [];
      cells.forEach(function (c) {
        c = String(c || "").trim(); if (!c) return;
        if (RE_TEL.test(c) && c.replace(/\D/g, "").length >= 8 && c.replace(/[\d\s+().\-]/g, "").length <= 2) tels.push(c.match(RE_TEL)[1]);
        else if (RE_TEL.test(c) && c.replace(/\D/g, "").length >= 8) { var m = c.match(RE_TEL); tels.push(m[1]); var r = c.replace(m[1], " ").replace(/^[\s\-:;,|•]+|[\s\-:;,|•]+$/g, "").trim(); if (r) noms.push(r); }
        else noms.push(c);
      });
      if (tels.length) res.push({ nom: noms.slice(0, 2).join(" ").slice(0, 120), tels: tels });
    });
    return res;
  }
  function analyserContacts(texte, nomFichier) {
    var brut;
    if (/\.vcf$/i.test(nomFichier || "") || /BEGIN:VCARD/i.test(texte)) brut = parserVcf(texte);
    else if (/\.csv$/i.test(nomFichier || "")) brut = parserCellules(decouperCsv(texte));
    else brut = parserCellules(String(texte || "").replace(/\r\n?/g, "\n").split("\n").map(function (l) { return [l]; }));
    if (!brut.length) throw new Error("Aucun numéro de téléphone trouvé dans ce contenu.");
    var existants = {}; (D.samsar || []).forEach(function (s) { var k = String(s.telephone || "").replace(/\D/g, "").slice(-9); if (k.length >= 8) existants[k] = s.nom; });
    var vus = {}, lignes = [];
    brut.slice(0, SIMP_MAX + 1).forEach(function (c) {
      var tel = "", reste = [];
      c.tels.forEach(function (t) { var nt = normTel(t); if (nt && !tel) tel = nt; else if (nt) reste.push(nt); });
      var cle = tel.replace(/\D/g, "").slice(-9), etat2 = "ok", info = "";
      if (!tel) { etat2 = "invalide"; info = "Numéro non reconnu : " + String(c.tels[0]).slice(0, 30); }
      else if (existants[cle]) { etat2 = "doublon"; info = "Déjà dans le carnet : " + existants[cle]; }
      else if (vus[cle]) { etat2 = "doublon"; info = "Présent plusieurs fois dans le fichier"; }
      if (tel) vus[cle] = 1;
      lignes.push({ nom: (c.nom || "").trim(), tel: tel || String(c.tels[0] || ""), autres: reste, etat: etat2, info: info, coche: etat2 === "ok" });
    });
    var depasse = brut.length > SIMP_MAX;
    return { lignes: lignes.slice(0, SIMP_MAX), depasse: depasse, total: brut.length };
  }
  function lireDefautsSimp() {
    var f = document.getElementById("form-simp"), S = etat.simp; if (!f || !S) return;
    ["zone", "specialite", "source"].forEach(function (k) { if (f.elements[k]) S.defauts[k] = f.elements[k].value.trim(); });
  }
  function majCompteSimp() {
    var S = etat.simp, n2 = S.lignes.filter(function (l) { return l.coche && l.etat !== "invalide"; }).length, b = document.getElementById("a-simp-go");
    if (b) { b.textContent = "Importer " + n2 + " contact" + (n2 > 1 ? "s" : ""); b.disabled = !n2; }
  }
  function vueSamsarImport() {
    var S = etat.simp;
    if (!S) {
      return '<section class="a-bloc"><h2>1. Choisir les contacts</h2><p class="a-aide">Importez vos contacts d’un coup : plus besoin de les saisir un par un. Rien n’est enregistré avant votre validation.</p>' +
        '<div class="a-imp-choix"><label class="btn btn-vert a-imp-fichier" for="a-simp-fichier">' + ico("plus") + " Choisir un fichier de contacts (.vcf ou .csv)</label>" +
        '<input class="sr" id="a-simp-fichier" type="file" accept=".vcf,.csv,.txt,text/vcard,text/x-vcard,text/csv,text/plain"></div><p class="a-aide" id="a-simp-progres" role="status" hidden></p></section>' +
        '<section class="a-bloc"><h2>…ou coller une liste</h2><textarea id="a-simp-texte" rows="8" placeholder="Un contact par ligne, par exemple :\nKarim Guéliz +212 6 12 34 56 78\nHassan - 0661 22 33 44\n0662334455" spellcheck="false"></textarea>' +
        '<div class="a-form-pied"><button type="button" class="btn btn-ligne" data-action="simp-coller">Coller depuis le presse-papiers</button><button type="button" class="btn btn-vert" data-action="simp-analyser">Analyser la liste</button></div>' +
        '<p class="a-aide">Astuce sur le terrain : dans WhatsApp, appuyez longuement sur le numéro du samsar, choisissez Copier, puis ici « Coller depuis le presse-papiers ». Répétez pour chaque numéro, puis « Analyser ». Le nom est facultatif. Les numéros marocains (06…, 07…) sont convertis au format international pour WhatsApp.</p></section>' +
        '<section class="a-bloc"><h2>Comment récupérer vos contacts ?</h2><ul class="a-aide a-liste-aide"><li><strong>Google Contacts</strong> (Android, ou contacts.google.com sur ordinateur) : sélectionnez les contacts, Exporter, format vCard (.vcf) ou CSV.</li>' +
        '<li><strong>iPhone / iCloud</strong> : sur icloud.com/contacts (depuis un ordinateur), sélectionnez les contacts, roue dentée, Exporter vCard. L’application Contacts de l’iPhone ne sait exporter qu’un contact à la fois.</li>' +
        '<li><strong>WhatsApp</strong> n’offre pas d’export : enregistrez vos samsar dans vos contacts (idéalement avec une étiquette ou un groupe « Samsar »), puis exportez comme ci-dessus. Vous pouvez aussi copier-coller des numéros dans la zone ci-dessus.</li></ul></section>';
    }
    if (S.fini) {
      return '<section class="a-bloc a-imp-fin"><h2>' + ico("coche") + " Import terminé</h2><p><strong>" + S.fini.ok + "</strong> contact" + (S.fini.ok > 1 ? "s" : "") + " ajouté" + (S.fini.ok > 1 ? "s" : "") + " au carnet" +
        (S.fini.dbl ? " · " + S.fini.dbl + " déjà présent" + (S.fini.dbl > 1 ? "s" : "") : "") + (S.fini.err ? " · " + S.fini.err + " en erreur" : "") + ".</p>" +
        (S.fini.msg ? '<p class="a-aide">' + e(S.fini.msg) + "</p>" : "") +
        '<div class="a-form-pied"><button type="button" class="btn btn-vert" data-action="aller" data-vue="samsars">Voir le carnet Samsar</button><button type="button" class="btn btn-ligne" data-action="simp-nouveau">Importer d’autres contacts</button></div></section>';
    }
    var nbOk = S.lignes.filter(function (l) { return l.etat === "ok"; }).length, nbDbl = S.lignes.filter(function (l) { return l.etat === "doublon"; }).length, nbInv = S.lignes.filter(function (l) { return l.etat === "invalide"; }).length;
    return '<section class="a-bloc"><h2>2. Vérifier les contacts</h2><p>' + S.lignes.length + " contact" + (S.lignes.length > 1 ? "s" : "") + " lu" + (S.lignes.length > 1 ? "s" : "") + " : <strong>" + nbOk + " nouveau" + (nbOk > 1 ? "x" : "") + "</strong>" +
      (nbDbl ? " · " + nbDbl + " déjà présent" + (nbDbl > 1 ? "s" : "") : "") + (nbInv ? " · " + nbInv + " numéro" + (nbInv > 1 ? "s" : "") + " invalide" + (nbInv > 1 ? "s" : "") : "") + ".</p>" +
      (S.depasse ? '<ul class="a-imp-alertes"><li class="a-imp-attention">Plus de ' + SIMP_MAX + " contacts : seuls les " + SIMP_MAX + " premiers sont affichés. Importez le reste dans un second temps.</li></ul>" : "") +
      '<div class="a-puces"><button type="button" class="puce" data-action="simp-tout" data-v="1">Tout cocher</button><button type="button" class="puce" data-action="simp-tout" data-v="0">Tout décocher</button></div>' +
      '<div class="a-simp-liste">' + S.lignes.map(function (l, i) {
        return '<div class="a-simp-ligne a-simp-' + l.etat + '"><label class="a-case"><input type="checkbox" data-action-change="simp-coche" data-i="' + i + '"' + (l.coche ? " checked" : "") + (l.etat === "invalide" ? " disabled" : "") + "><span class=\"sr\">Importer ce contact</span></label>" +
          '<input class="a-simp-nom" data-action-change="simp-nom" data-i="' + i + '" value="' + e(l.nom) + '" placeholder="Nom (facultatif)" aria-label="Nom du contact"><span class="a-simp-tel">' + e(l.tel) + "</span>" + (l.info ? '<small class="a-simp-info">' + e(l.info) + "</small>" : "") + "</div>";
      }).join("") + "</div></section>" +
      '<form id="form-simp" class="a-bloc a-form" novalidate><h2>3. Informations communes (facultatif)</h2><p class="a-aide">Appliquées à tous les contacts importés. Statut : « À contacter ».</p><div class="a-grille">' +
        champ("zone", "Zone ou quartiers", S.defauts.zone, "") + champ("specialite", "Spécialité", S.defauts.specialite, "") + champ("source", "Comment les avez-vous connus ?", S.defauts.source, "", "plein") + "</div>" +
      '<div class="a-barre"><div class="a-barre-statut"><small id="a-simp-progres" role="status" hidden></small></div><div class="a-barre-actions"><button type="button" class="btn btn-ligne" data-action="simp-nouveau">Annuler</button>' +
      '<button type="button" class="btn btn-vert" id="a-simp-go" data-action="simp-go">Importer</button></div></div></form>';
  }
  function infoSimp(t) { var i = document.getElementById("a-simp-progres"); if (i) { i.textContent = t; i.hidden = !t; } }
  function demarrerSimp(texte, nom) {
    try { var r = analyserContacts(texte, nom); etat.simp = { lignes: r.lignes, depasse: r.depasse, defauts: { zone: "", specialite: "", source: "Import de contacts du " + A.dateFr(aujourdhui()) }, occupe: false, fini: null }; rendre(); window.scrollTo(0, 0); setTimeout(majCompteSimp, 0); }
    catch (x) { A.message(x.message); }
  }
  function lancerSimp() {
    var S = etat.simp; if (!S || S.occupe) return;
    lireDefautsSimp();
    var cibles = S.lignes.filter(function (l) { return l.coche && l.etat !== "invalide"; });
    if (!cibles.length) { A.message("Cochez au moins un contact."); return; }
    S.occupe = true; document.querySelectorAll('[data-action="simp-go"],[data-action="simp-nouveau"]').forEach(function (b) { b.disabled = true; });
    var ok = 0, dbl = 0, err = 0, i = 0, msg = "", stop = false;
    cibles.reduce(function (p, l) {
      return p.then(function () {
        if (stop) return;
        infoSimp("Import " + (++i) + " sur " + cibles.length + "…");
        var s = { nom: l.nom || "Contact " + l.tel, telephone: l.tel, zone: S.defauts.zone, specialite: S.defauts.specialite, source: S.defauts.source, statut: "À contacter" };
        if (l.autres.length) s.notes = "Autres numéros : " + l.autres.join(", ");
        return A.api("samsarEnregistrer", { samsar: s }).then(function () { ok++; }, function (er) {
          if (er.code === "AUTH") { stop = true; msg = er.message; err++; } else if (/déjà enregistré/.test(er.message)) dbl++; else { err++; msg = er.message; }
        });
      });
    }, Promise.resolve()).then(function () { return charger(); }).then(function () {
      S.occupe = false; S.fini = { ok: ok, dbl: dbl, err: err, msg: msg }; rendre(); window.scrollTo(0, 0);
    }, function (er) { S.occupe = false; A.message(er.message); rendre(); });
  }

  /* ====================================================================== PROSPECTS */
  function vueProspects() {
    var q = etat.recherche.toLowerCase(), t = aujourdhui();
    var relance = etat.filtreProspect === "__relance", nbRelance = D.prospects.filter(relanceDue).length;
    var l = D.prospects.filter(function (p) { return (!etat.filtreProspect || (relance ? relanceDue(p) : p.statut === etat.filtreProspect)) && (!q || (p.nom + " " + p.telephone + " " + p.email + " " + p.ville_recherche).toLowerCase().indexOf(q) !== -1); })
      .sort(function (a, b) { return relance ? String(a.date_relance).localeCompare(String(b.date_relance)) : String(b.date_maj).localeCompare(String(a.date_maj)); });
    return '<div class="a-outils"><div class="a-puces"><button class="puce' + (relance ? " est-actif" : "") + '" data-action="filtre-prospect" data-v="__relance">' + ico("horloge") + " À relancer (" + nbRelance + ")</button></div></div>" +
      '<div class="a-pipeline">' + [""].concat(D.listes.statutsProspect).map(function (s) {
        var c = s ? D.prospects.filter(function (p) { return p.statut === s; }).length : D.prospects.length;
        return '<button class="a-etape' + (etat.filtreProspect === s && !relance ? " est-actif" : "") + '" data-action="filtre-prospect" data-v="' + e(s) + '"><strong>' + c + "</strong><span>" + (s || "Tous") + "</span></button>";
      }).join("") + "</div>" +
      '<div class="a-outils"><input class="a-recherche" type="search" placeholder="Rechercher un prospect…" value="' + e(etat.recherche) + '" data-recherche aria-label="Rechercher un prospect"></div>' +
      (l.length ? '<section class="a-bloc a-bloc-liste">' + l.map(function (p) {
        var du = p.date_relance && p.date_relance <= t && p.statut !== "Vente";
        return '<button class="a-ligne" data-action="aller" data-vue="prospect" data-id="' + e(p.id) + '"><span class="a-pastille">' + e((p.nom || "?").replace(/^Exemple — /, "").charAt(0).toUpperCase()) + '</span><span class="a-ligne-texte"><strong>' + e(p.nom) + "</strong><small>" +
          e([p.type_recherche, p.ville_recherche, p.budget].filter(Boolean).join(" · ") || "Recherche à préciser") + '</small></span><span class="a-prospect-fin"><span class="a-statut a-statut-p">' + e(p.statut) + "</span>" +
          (p.date_relance ? '<small class="' + (du ? "est-du" : "") + '">' + ico("horloge") + " Relance " + e(A.dateFr(p.date_relance)) + "</small>" : "") + "</span></button>";
      }).join("") + "</section>" : '<p class="a-vide a-bloc">Aucun prospect dans cette liste.</p>');
  }
  function vueProspect() {
    var nouveau = !etat.id, p = nouveau ? { statut: "Nouveau" } : prospect(etat.id);
    if (!p) return '<p class="a-vide a-bloc">Prospect introuvable.</p>';
    var hist = nouveau ? [] : D.historique.filter(function (h) { return h.prospect_id === p.id; }).sort(recent);
    var visites = nouveau ? [] : D.visites.filter(function (v) { return v.prospect_id === p.id; }).sort(recent);
    var tel = String(p.telephone || "").replace(/[^\d+]/g, "");
    return '<div class="a-deux a-deux-large"><form id="form-prospect" class="a-bloc a-form" novalidate><h2>Coordonnées et recherche</h2>' +
      (nouveau ? "" : '<div class="a-contacts">' + (tel ? '<a class="btn btn-ligne" href="tel:' + e(tel) + '">' + ico("telephone") + ' Appeler</a><a class="btn btn-ligne" href="https://wa.me/' + e(numWa(tel)) + '" target="_blank" rel="noopener">WhatsApp</a>' : "") + (p.email ? '<a class="btn btn-ligne" href="mailto:' + e(p.email) + '">' + ico("courrier") + " E-mail</a>" : "") + "</div>") +
      '<div class="a-grille">' + champ("nom", "Nom *", p.nom, "required", "plein") + champ("telephone", "Téléphone", p.telephone, 'type="tel"') + champ("email", "E-mail", p.email, 'type="email"') +
        champ("budget", "Budget", p.budget, 'placeholder="ex. 3 à 5 M DH"') + champ("type_recherche", "Type de bien recherché", p.type_recherche) + champ("ville_recherche", "Localisation souhaitée", p.ville_recherche) +
        '<div><label for="f-statut">Statut commercial</label><select id="f-statut" name="statut">' + D.listes.statutsProspect.map(function (s) { return option(s, s, p.statut); }).join("") + "</select></div>" +
        champ("date_relance", "Date de relance", p.date_relance, 'type="date"') +
        '<div class="plein"><label for="f-notes">Notes privées</label><textarea id="f-notes" name="notes" rows="4">' + e(p.notes || "") + "</textarea></div></div>" +
      '<div class="a-form-pied">' + (nouveau ? "" : '<button type="button" class="lien-discret est-danger" data-action="supprimer-prospect" data-id="' + e(p.id) + '">Supprimer ce prospect</button>') + '<button class="btn btn-vert" type="submit">Enregistrer</button></div>' +
      (nouveau ? "" : '<p class="a-aide">Fiche créée le ' + e(A.dateFr(p.date_creation, true)) + " · origine : " + e(p.source || "—") + "</p>") + "</form>" +
      (nouveau ? "" : "<div>" + blocSuivi(p) + '<section class="a-bloc"><h2>Historique des contacts</h2><form id="form-historique" class="a-historique-ajout"><select name="type" aria-label="Type de contact"><option>Appel</option><option>E-mail</option><option>WhatsApp</option><option>Visite</option><option>Note</option></select><input name="note" placeholder="Ajouter une note…" aria-label="Note" required><button class="btn btn-vert" type="submit" aria-label="Ajouter">' + ico("plus") + "</button></form>" +
        (hist.length ? '<ol class="a-fil">' + hist.map(function (h) { return "<li><span>" + e(h.type) + " · " + e(A.dateFr(h.date, true)) + "</span><p>" + e(h.note) + "</p></li>"; }).join("") + "</ol>" : '<p class="a-vide">Aucun échange enregistré.</p>') + "</section>" +
        (visites.length ? '<section class="a-bloc"><h2>Demandes de visite</h2>' + visites.map(ligneVisite).join("") + "</section>" : "") + "</div>") + "</div>";
  }

  /* ====================================================================== DEMANDES */
  function ligneVisite(v) {
    var p = prospect(v.prospect_id), b = bien(v.bien_id);
    return '<div class="a-ligne a-ligne-fixe"><span class="a-pastille">' + ico("calendrier") + '</span><span class="a-ligne-texte"><strong>' + e(p ? p.nom : "Prospect supprimé") + "</strong> · " + e(b ? b.id + " " + b.titre : "Bien non précisé") +
      "<small>Souhaitée : " + e(v.date_souhaitee ? A.dateFr(v.date_souhaitee) : "date à convenir") + " · " + e(v.creneau || "") + (v.message ? " — " + e(v.message) : "") + "</small></span>" +
      '<label class="a-select"><span class="sr">Statut de la visite</span><select data-action-change="statut-visite" data-id="' + e(v.id) + '">' + D.listes.statutsVisite.map(function (s) { return option(s, s, v.statut); }).join("") + "</select></label></div>";
  }
  function vueDemandes() {
    var sv = etat.sousVue, onglet = function (v, t, c) { return '<button class="puce' + (sv === v ? " est-actif" : "") + '" data-action="sous-vue" data-v="' + v + '">' + t + " (" + c + ")</button>"; };
    var h = '<div class="a-outils"><div class="a-puces">' + onglet("recues", "Reçues", D.alertes.length) + onglet("visites", "Visites", D.visites.length) + onglet("propositions", "Biens proposés", D.propositions.length) + "</div>" +
      (sv === "recues" && D.alertes.some(function (a) { return a.lu !== "oui"; }) ? '<button class="lien-discret" data-action="tout-lu">Tout marquer comme lu</button>' : "") + "</div>";
    if (sv === "recues") return h + (D.alertes.length ? '<section class="a-bloc a-bloc-liste">' + D.alertes.slice().sort(recent).map(ligneAlerte).join("") + "</section>" : '<p class="a-vide a-bloc">Aucune demande reçue.</p>');
    if (sv === "visites") return h + (D.visites.length ? '<section class="a-bloc a-bloc-liste">' + D.visites.slice().sort(recent).map(ligneVisite).join("") + "</section>" : '<p class="a-vide a-bloc">Aucune demande de visite.</p>');
    return h + (D.propositions.length ? D.propositions.slice().sort(recent).map(function (m) {
      var p = prospect(m.prospect_id), ph = String(m.photos || "").split("|").filter(Boolean);
      return '<section class="a-bloc a-proposition"><div class="a-proposition-haut"><div><h2>' + e([m.type, m.ville].filter(Boolean).join(" · ") || "Bien proposé") + "</h2><p>" + e(p ? p.nom + " · " + (p.telephone || p.email) : "Prospect supprimé") + " · reçu le " + e(A.dateFr(m.date, true)) + "</p></div>" +
        '<label class="a-select"><span class="sr">Statut</span><select data-action-change="statut-proposition" data-id="' + e(m.id) + '">' + D.listes.statutsProposition.map(function (s) { return option(s, s, m.statut); }).join("") + "</select></label></div>" +
        '<p class="a-proposition-chiffres">' + (n(m.surface) ? A.nombre(n(m.surface)) + " m² · " : "") + (n(m.prix_souhaite) ? "Prix souhaité : " + A.prix(n(m.prix_souhaite)) : "Prix non précisé") + "</p>" +
        (m.description ? "<p>" + e(m.description) + "</p>" : "") + (m.commentaires ? '<p class="a-aide">Commentaire : ' + e(m.commentaires) + "</p>" : "") +
        (ph.length ? '<div class="vignettes">' + ph.map(function (u) { return '<div class="vignette">' + A.photo(u, "120px", "Photo du bien proposé") + "</div>"; }).join("") + "</div>" : "") +
        '<div class="a-form-pied">' + (p ? '<button class="btn btn-ligne" data-action="aller" data-vue="prospect" data-id="' + e(p.id) + '">Voir le propriétaire</button>' : "") +
        '<button class="btn btn-vert" data-action="proposition-brouillon" data-id="' + e(m.id) + '">Créer un brouillon d’annonce</button></div></section>';
    }).join("") : '<p class="a-vide a-bloc">Aucun bien proposé.</p>');
  }

  /* ====================================================================== PARAMÈTRES */
  function vueParametres() {
    var p = D.parametres;
    return '<form id="form-parametres" class="a-bloc a-form" novalidate><h2>Coordonnées et alertes</h2><div class="a-grille">' +
        champ("email_alertes", "E-mail qui reçoit les alertes", p.email_alertes, 'type="email" placeholder="vous@exemple.com"', "plein") +
        champ("whatsapp", "WhatsApp : Nom:numéro international, séparés par une virgule", p.whatsapp, 'placeholder="ex. Khaled Nassiri:33667407214, Mohamed Nassiri:33641078018"', "plein") + champ("telephone", "Téléphone affiché", p.telephone, 'type="tel"') +
        champ("email_contact", "E-mail de contact affiché", p.email_contact, 'type="email"', "plein") + '</div><div class="a-form-pied"><button class="btn btn-vert" type="submit">Enregistrer</button></div></form>' +
      '<section class="a-bloc"><h2>Motifs de refus (Espace Agent)</h2><p class="a-aide">Boutons proposés au staff pour refuser rapidement un bien soumis par un agent. Désactivez un motif pour le retirer sans perdre son historique.</p>' +
        (D.motifsRefus && D.motifsRefus.length ? D.motifsRefus.slice().sort(function (a, b) { return n(a.ordre) - n(b.ordre); }).map(function (m) {
          return '<div class="a-ligne a-ligne-fixe"><span class="a-ligne-texte">' + e(m.libelle) + '</span><label class="a-select"><span class="sr">Actif</span><select data-action-change="statut-motif" data-id="' + e(m.id) + '"><option value="oui"' + (m.actif === "oui" ? " selected" : "") + '>Actif</option><option value="non"' + (m.actif !== "oui" ? " selected" : "") + ">Désactivé</option></select></label>" +
            '<button class="a-icone a-icone-danger" data-action="supprimer-motif" data-id="' + e(m.id) + '" title="Supprimer">' + ico("corbeille") + "</button></div>";
        }).join("") : '<p class="a-vide">Aucun motif pour le moment.</p>') +
        '<form id="form-motif" class="a-historique-ajout"><input name="libelle" placeholder="Nouveau motif…" aria-label="Nouveau motif" required><button class="btn btn-vert" type="submit" aria-label="Ajouter">' + ico("plus") + "</button></form></section>" +
      (A.demo
        ? '<section class="a-bloc"><h2>Mode démonstration</h2><p class="a-aide">Le site n’est pas encore relié à Google Sheets : les données sont fictives et restent sur cet appareil. Aucun e-mail réel n’est envoyé. Suivez <strong>docs/INSTALLATION.md</strong> pour activer la connexion.</p><div class="a-form-pied"><button class="btn btn-ligne" data-action="reinitialiser-demo">Réinitialiser les données de démonstration</button></div></section>'
        : '<form id="form-mdp" class="a-bloc a-form" novalidate><h2>Mot de passe</h2><div class="a-grille">' + champ("ancien", "Mot de passe actuel", "", 'type="password" autocomplete="current-password"') + champ("nouveau", "Nouveau mot de passe (10 caractères minimum)", "", 'type="password" autocomplete="new-password"') + '</div><div class="a-form-pied"><button class="btn btn-vert" type="submit">Changer le mot de passe</button></div></form>');
  }

  /* ====================================================================== GABARIT */
  var MENU = [["tableau", "Tableau<i> de bord</i>", "tableau"], ["biens", "Biens", "maison"], ["agents", "Agents", "personnes"], ["prospects", "Prospects", "personnes"], ["samsars", "Samsar", "cle"], ["demandes", "Demandes", "cloche"], ["parametres", "Paramètres", "reglages"]];
  function rendre() {
    if (!D) { racine.innerHTML = vueConnexion(); return; }
    var v = etat.vue, section = v === "bien" ? "biens" : v === "prospect" ? "prospects" : v === "agent" ? "agents" : v === "samsar" ? "samsars" : v === "import" ? "biens" : v === "samsarimport" ? "samsars" : v, nonLues = D.alertes.filter(function (a) { return a.lu !== "oui"; }).length;
    var titres = { tableau: "Tableau de bord", biens: "Biens", bien: etat.id ? "Modifier le bien" : "Ajouter un bien", agents: "Agents", agent: etat.id ? (agent(etat.id) || {}).nom || "Agent" : "Ajouter un agent", prospects: "Prospects", prospect: etat.id ? (prospect(etat.id) || {}).nom || "Prospect" : "Ajouter un prospect", import: "Importer une annonce IA", samsarimport: "Importer des contacts", samsars: "Samsar", samsar: etat.id ? (samsar(etat.id) || {}).nom || "Samsar" : "Ajouter un samsar", demandes: "Demandes", parametres: "Paramètres" };
    var corps = { tableau: vueTableau, biens: vueBiens, bien: vueBien, agents: vueAgents, agent: vueAgent, prospects: vueProspects, prospect: vueProspect, demandes: vueDemandes, parametres: vueParametres, samsars: vueSamsars, samsar: vueSamsar, import: vueImport, samsarimport: vueSamsarImport }[v]();
    var action = v === "biens" || v === "tableau" ? '<div class="a-entete-btns"><button class="btn btn-ligne" data-action="imp-ouvrir">' + ico("plus") + ' Importer une annonce IA</button><button class="btn btn-or" data-action="aller" data-vue="bien">' + ico("plus") + " Ajouter un bien</button></div>" : v === "prospects" ? '<button class="btn btn-or" data-action="aller" data-vue="prospect">' + ico("plus") + " Ajouter un prospect</button>" : v === "agents" ? '<button class="btn btn-or" data-action="aller" data-vue="agent">' + ico("plus") + " Ajouter un agent</button>" : v === "samsars" ? '<div class="a-entete-btns"><button class="btn btn-ligne" data-action="simp-ouvrir">' + ico("plus") + ' Importer des contacts</button><button class="btn btn-or" data-action="aller" data-vue="samsar">' + ico("plus") + " Ajouter un samsar</button></div>" : "";
    var retour = v === "bien" ? "biens" : v === "prospect" ? "prospects" : v === "agent" ? "agents" : v === "samsar" ? "samsars" : v === "import" ? "biens" : v === "samsarimport" ? "samsars" : "";
    racine.innerHTML = '<div class="a-app"><aside class="a-menu"><a class="a-menu-logo" href="index.html" title="Voir le site"><img src="assets/img/logo/logo-clair-440.png" width="440" height="302" alt="Nassiri Real Estate"></a><nav aria-label="Espace Pro">' +
      MENU.map(function (m) { return '<button class="' + (section === m[0] ? "est-actif" : "") + '" data-action="aller" data-vue="' + m[0] + '"' + (section === m[0] ? ' aria-current="page"' : "") + ">" + ico(m[2]) + "<span>" + m[1] + "</span>" + (m[0] === "demandes" && nonLues ? '<em class="a-compteur">' + nonLues + "</em>" : "") + "</button>"; }).join("") +
      '</nav><div class="a-menu-bas"><a href="index.html" target="_blank" rel="noopener">' + ico("oeil") + '<span>Voir le site</span></a><button data-action="deconnexion">' + ico("sortie") + "<span>Déconnexion</span></button></div></aside>" +
      '<main class="a-principal">' + (A.demo ? '<p class="a-bandeau-demo">' + ico("info") + " Mode démonstration — données fictives enregistrées sur cet appareil, accès non protégé.</p>" : "") +
      '<header class="a-entete"><div>' + (retour ? '<button class="a-fil-retour" data-action="aller" data-vue="' + retour + '">' + ico("gauche") + " " + titres[retour] + "</button>" : "") + "<h1>" + e(titres[v]) + "</h1></div>" + action + "</header>" + corps + "</main></div>" +
      '<div id="a-occupe" class="a-occupe" role="status" hidden></div>';
  }

  /* ====================================================================== ÉVÉNEMENTS */
  var ACTIONS = {
    aller: function (b) { if (b.dataset.filtreProspect !== undefined) etat.filtreProspect = b.dataset.filtreProspect; if (b.dataset.sous) etat.sousVue = b.dataset.sous; if (b.dataset.filtreBien !== undefined) etat.filtreBien = b.dataset.filtreBien; aller(b.dataset.vue, b.dataset.id); },
    "filtre-bien": function (b) { etat.filtreBien = b.dataset.v; rendre(); },
    "imp-ouvrir": function () { etat.imp = null; aller("import"); },
    "imp-nouvelle": function () { etat.imp = null; rendre(); },
    "imp-annuler": function () { confirmer("Annuler l’import ?", "L’annonce préparée ne sera pas enregistrée.", "Annuler l’import").then(function (ok) { if (ok) { etat.imp = null; aller("biens"); } }); },
    "imp-analyser": function () { importerTexte(); },
    "imp-copier-consigne": function () { copierTexte(CONSIGNE_IA).then(function (ok) { A.message(ok ? "Consigne copiée : collez-la dans ChatGPT ou Claude." : "Copie impossible sur cet appareil."); }); },
    "imp-photo": function (b) {
      lireFormImp();
      var ph = etat.imp.photos, i = parseInt(b.dataset.i, 10), m = b.dataset.m;
      if (m === "gauche" && i > 0) { var t = ph[i]; ph[i] = ph[i - 1]; ph[i - 1] = t; }
      else if (m === "droite" && i < ph.length - 1) { var u = ph[i]; ph[i] = ph[i + 1]; ph[i + 1] = u; }
      else if (m === "principale") ph.unshift(ph.splice(i, 1)[0]);
      else if (m === "retirer") ph.splice(i, 1);
      rendre();
    },
    "imp-creer": function (b) { creerImp(b.dataset.publier === "1"); },
    "simp-ouvrir": function () { etat.simp = null; aller("samsarimport"); },
    "simp-nouveau": function () { etat.simp = null; rendre(); },
    "simp-analyser": function () { var ta = document.getElementById("a-simp-texte"); demarrerSimp(ta ? ta.value : "", ""); },
    "simp-tout": function (b) { var v = b.dataset.v === "1"; etat.simp.lignes.forEach(function (l) { if (l.etat !== "invalide") l.coche = v; }); lireDefautsSimp(); rendre(); majCompteSimp(); },
    "simp-go": function () { lancerSimp(); },
    "simp-coller": function () {
      var ta = document.getElementById("a-simp-texte");
      if (!navigator.clipboard || !navigator.clipboard.readText) { A.message("Collez à la main dans la zone (appui long, puis Coller)."); return; }
      navigator.clipboard.readText().then(function (t) { if (!t.trim()) { A.message("Le presse-papiers est vide."); return; } ta.value = (ta.value ? ta.value.replace(/\s+$/, "") + "\n" : "") + t; A.message("Collé : ajoutez d’autres numéros ou cliquez sur « Analyser »."); }, function () { A.message("Collez à la main dans la zone (appui long, puis Coller)."); });
    },
    "filtre-prospect": function (b) { etat.filtreProspect = b.dataset.v; rendre(); },
    "filtre-samsar": function (b) { etat.filtreSamsar = b.dataset.v; rendre(); },
    "relance-samsar": function (b) {
      var s = samsar(etat.id), j = parseInt(b.dataset.jours, 10), date = j ? dansJours(j) : "";
      faire("samsarEnregistrer", { samsar: { id: s.id, date_relance: date } }, date ? "Relance fixée au " + A.dateFr(date) + "." : "Relance supprimée.", true).then(function (r) {
        Object.assign(s, r.samsar);
        var champDate = document.getElementById("f-date_relance"), info = document.getElementById("a-relance-info");
        if (champDate) champDate.value = date;
        if (info) info.innerHTML = date ? "Prochaine relance : <strong>" + e(A.dateFr(date)) + "</strong>" : "Aucune relance prévue.";
      });
    },
    "wa-samsar": function () {
      var s = samsar(etat.id), ta = document.getElementById("a-wa-texte"), txt = ta ? ta.value.trim() : "";
      if (!txt || !ouvrirWhatsApp(s, txt)) return;
      faire("samsarEnregistrer", { samsar: { id: s.id, dernier_contact: aujourdhui() } }, "Dernier contact mis à jour.", true).then(function (r) {
        Object.assign(s, r.samsar);
        var c = document.getElementById("f-dernier_contact"); if (c) c.value = s.dernier_contact;
      });
    },
    "supprimer-samsar": function (b) {
      confirmer("Supprimer ce samsar ?", "Sa fiche sera supprimée définitivement.", "Supprimer définitivement")
        .then(function (ok) { if (ok) faire("samsarSupprimer", { id: b.dataset.id }, "Samsar supprimé.").then(function () { aller("samsars"); }).catch(function () {}); });
    },
    "agent-actif": function (b) {
      var ag = agent(b.dataset.id), actif = ag.actif === "oui";
      faire("agentEnregistrer", { agent: { id: ag.id, actif: actif ? "non" : "oui" } }, actif ? "Accès désactivé : " + ag.nom + " ne peut plus se connecter." : "Accès réactivé.").then(rendre);
    },
    "nouveau-code": function (b) {
      var ag = agent(b.dataset.id);
      confirmer("Créer un nouveau code PIN ?", "L’ancien code de " + ag.nom + " ne fonctionnera plus. Le nouveau code s’affichera une seule fois, avec le message WhatsApp prêt à envoyer.", "Créer le nouveau code")
        .then(function (ok) { if (ok) faire("agentNouveauCode", { id: ag.id }).then(function (r) { if (!r.pin) return alerteScriptAncien(false, "aucun code renvoyé"); return boiteCodeAgent(r.agent, r.pin, true); }).then(rendre).catch(function (err) { if (RE_SCRIPT_ANCIEN.test(String(err && err.message))) alerteScriptAncien(false, String(err.message).slice(0, 160)); }); });
    },
    relance: function (b) {
      var p = prospect(etat.id), j = parseInt(b.dataset.jours, 10), date = j ? dansJours(j) : "";
      faire("prospectEnregistrer", { prospect: { id: p.id, date_relance: date } }, date ? "Relance fixée au " + A.dateFr(date) + "." : "Relance supprimée.", true).then(function (r) {
        Object.assign(p, r.prospect);
        var champDate = document.getElementById("f-date_relance"), info = document.getElementById("a-relance-info");
        if (champDate) champDate.value = date;
        if (info) info.innerHTML = date ? "Prochaine relance : <strong>" + e(A.dateFr(date)) + "</strong>" : "Aucune relance prévue.";
      });
    },
    "wa-prospect": function () {
      var p = prospect(etat.id), ta = document.getElementById("a-wa-texte"), sel = document.getElementById("a-wa-modele"), txt = ta ? ta.value.trim() : "";
      if (!txt || !ouvrirWhatsApp(p, txt)) return;
      var m = MODELES.filter(function (x) { return sel && x.id === sel.value; })[0];
      faire("historiqueAjouter", { prospect_id: p.id, type: "WhatsApp", note: "Message envoyé" + (m ? " (modèle : " + m.nom + ")" : "") + " : " + txt.slice(0, 300) }, "Échange ajouté à l’historique.").then(rendre);
    },
    "wa-bien": function (b) {
      var p = prospect(b.dataset.prospect), x = bien(b.dataset.bien);
      if (!p || !x || !ouvrirWhatsApp(p, texteBienProspect(p, x))) return;
      faire("historiqueAjouter", { prospect_id: p.id, type: "WhatsApp", note: "Bien proposé : " + x.id + " " + x.titre }, "Proposition ajoutée à l’historique de " + nomAffiche(p) + ".").then(rendre);
    },
    "sous-vue": function (b) { etat.sousVue = b.dataset.v; rendre(); },
    deconnexion: function () { A.api("deconnexion").catch(function () {}).then(function () { A.jeton.ecrire(""); D = null; etat.vue = "tableau"; rendre(); }); },
    "valider-bien": function (b) {
      var x = bien(b.dataset.id);
      confirmer("Valider ce bien ?", "« " + x.titre + " » sera publié sur le site public." + (!n(x.prix) ? " Attention : aucun prix n’est renseigné." : ""), "Valider et publier")
        .then(function (ok) { if (ok) faire("bienValider", { id: x.id }, "Bien validé et publié.").then(function () { if (etat.edition && etat.id === x.id) etat.edition = Object.assign({}, bien(x.id)); rendre(); }); });
    },
    "ouvrir-refus": function (b) { etat.refus = b.dataset.id; rendre(); var i = document.getElementById("f-motif"); if (i) i.focus(); },
    "annuler-refus": function () { etat.refus = null; rendre(); },
    "choisir-motif": function (b) { var i = document.getElementById("f-motif"); if (i) i.value = b.dataset.motif; },
    une: function (b) { var x = bien(b.dataset.id); faire("bienEnregistrer", { bien: { id: x.id, a_la_une: x.a_la_une === "oui" ? "non" : "oui" } }, x.a_la_une === "oui" ? "Retiré de la une." : "Mis à la une.").then(rendre); },
    coeur: function (b) { var x = bien(b.dataset.id); faire("bienEnregistrer", { bien: { id: x.id, coup_de_coeur: x.coup_de_coeur === "oui" ? "non" : "oui" } }, x.coup_de_coeur === "oui" ? "Retiré des coups de cœur." : "Mis en coup de cœur.").then(rendre); },
    "supprimer-bien": function (b) {
      var x = bien(b.dataset.id);
      confirmer("Supprimer ce bien ?", "« " + x.titre + " » et ses photos seront supprimés définitivement. Pour le garder sans l’afficher, choisissez plutôt « Archivé ».", "Supprimer définitivement")
        .then(function (ok) { if (ok) faire("bienSupprimer", { id: x.id }, "Bien supprimé.").then(function () { aller("biens"); }); });
    },
    "photo-supprimer": function (b) {
      confirmer("Supprimer cette photo ?", "Elle sera retirée de l’annonce.", "Supprimer").then(function (ok) { if (ok) { lireFormBien(); faire("photoSupprimer", { id: b.dataset.id }, "Photo supprimée.").then(rendre); } });
    },
    "photo-gauche": function (b) { ordonnerPhotos(b.dataset.id, -1); },
    "photo-droite": function (b) { ordonnerPhotos(b.dataset.id, 1); },
    "photo-principale": function (b) { ordonnerPhotos(b.dataset.id, "debut"); },
    "ouvrir-alerte": function (b) {
      var a = D.alertes.filter(function (x) { return x.id === b.dataset.id; })[0], suite = function () { if (prospect(a.prospect_id)) aller("prospect", a.prospect_id); else rendre(); };
      if (a.lu !== "oui") faire("alerteLue", { id: a.id }).then(suite); else suite();
    },
    "tout-lu": function () { faire("alerteLue", { tout: true }, "Demandes marquées comme lues.").then(rendre); },
    "supprimer-agent": function (b) {
      confirmer("Supprimer cet agent ?", "Son accès sera supprimé définitivement. Réattribuez d’abord ses biens s’il en a.", "Supprimer définitivement")
        .then(function (ok) { if (ok) faire("agentSupprimer", { id: b.dataset.id }, "Agent supprimé.").then(function () { aller("agents"); }).catch(function () {}); });
    },
    "supprimer-prospect": function (b) {
      confirmer("Supprimer ce prospect ?", "Sa fiche, son historique et ses demandes seront supprimés définitivement.", "Supprimer définitivement")
        .then(function (ok) { if (ok) faire("prospectSupprimer", { id: b.dataset.id }, "Prospect supprimé.").then(function () { aller("prospects"); }); });
    },
    "proposition-brouillon": function (b) {
      var m = D.propositions.filter(function (x) { return x.id === b.dataset.id; })[0], p = prospect(m.prospect_id);
      faire("bienEnregistrer", { bien: { titre: (m.type || "Bien") + " à " + (m.ville || "préciser"), type: A.types.indexOf(m.type) !== -1 ? m.type : "Villa", ville: m.ville, prix: m.prix_souhaite, surface: m.surface, description: m.description,
        notes_privees: "Proposé par " + (p ? p.nom + " — " + (p.telephone || p.email) : "?") + (m.commentaires ? "\n" + m.commentaires : ""), statut: "brouillon" } }, "Brouillon créé : complétez-le puis publiez.")
        .then(function (r) { return faire("propositionStatut", { id: m.id, statut: "À l’étude" }).then(function () { aller("bien", r.bien.id); }); });
    },
    "supprimer-motif": function (b) { faire("motifSupprimer", { id: b.dataset.id }, "Motif supprimé.").then(rendre); },
    "reinitialiser-demo": function () {
      confirmer("Réinitialiser la démonstration ?", "Toutes les données de test saisies sur cet appareil seront effacées.", "Réinitialiser").then(function (ok) { if (ok) { ATLAS_DEMO.reinitialiser(); A.jeton.ecrire(""); location.reload(); } });
    }
  };
  var CHANGEMENTS = {
    "statut-bien": function (s) {
      var x = bien(s.dataset.id);
      if (s.value === "publie" && !n(x.prix)) { A.message("Indiquez un prix avant de publier ce bien."); s.value = x.statut; return; }
      faire("bienEnregistrer", { bien: { id: x.id, statut: s.value } }, "Statut : " + LIB_STATUT[s.value] + ".").then(rendre, rendre);
    },
    "imp-maj": function () { lireFormImp(); majApercuImp(); },
    "simp-coche": function (s) { etat.simp.lignes[parseInt(s.dataset.i, 10)].coche = s.checked; majCompteSimp(); },
    "simp-nom": function (s) { etat.simp.lignes[parseInt(s.dataset.i, 10)].nom = s.value.trim(); },
    "modele-wa": function (s) { var m = MODELES.filter(function (x) { return x.id === s.value; })[0], ta = document.getElementById("a-wa-texte"); if (m && ta) ta.value = m.texte(prospect(etat.id)); },
    "modele-wa-samsar": function (s) { var m = MODELES_SAMSAR.filter(function (x) { return x.id === s.value; })[0], ta = document.getElementById("a-wa-texte"); if (m && ta) ta.value = m.texte(samsar(etat.id)); },
    "statut-visite": function (s) { faire("visiteStatut", { id: s.dataset.id, statut: s.value }, "Visite : " + s.value + ".").then(rendre, rendre); },
    "statut-proposition": function (s) { faire("propositionStatut", { id: s.dataset.id, statut: s.value }, "Statut mis à jour.").then(rendre, rendre); },
    "statut-motif": function (s) { faire("motifEnregistrer", { motif: { id: s.dataset.id, actif: s.value } }, "Motif mis à jour.").then(rendre, rendre); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    racine = document.getElementById("admin");
    racine.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-action]");
      if (b && ACTIONS[b.dataset.action]) { ev.preventDefault(); ACTIONS[b.dataset.action](b); }
    });
    racine.addEventListener("change", function (ev) {
      var s = ev.target.closest("[data-action-change]");
      if (s) return CHANGEMENTS[s.dataset.actionChange](s);
      if (ev.target.id === "a-simp-fichier" && ev.target.files.length) { var fc = ev.target.files[0]; ev.target.value = ""; if (fc.size > 5 * 1048576) { A.message("Fichier trop volumineux (5 Mo maximum)."); return; } fc.text().then(function (t) { demarrerSimp(t, fc.name); }); return; }
      if (ev.target.id === "a-imp-fichier" && ev.target.files.length) { var fi = ev.target.files[0]; ev.target.value = ""; importerFichier(fi); return; }
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
      var f = ev.target, v = A.valeurs(f);
      if (f.id === "form-connexion") {
        var bouton = f.querySelector("button"); bouton.disabled = true; bouton.textContent = "Connexion…";
        A.api("connexion", { motDePasse: v.motDePasse }).then(function (r) { A.jeton.ecrire(r.jeton); return charger(); }).then(rendre, function (err) { D = null; racine.innerHTML = vueConnexion(err.message); document.getElementById("mdp").focus(); });
      } else if (f.id === "form-bien") {
        enregistrerBien(ev.submitter && ev.submitter.dataset.publier === "1").catch(function () {});
      } else if (f.id === "form-prospect") {
        if (!v.nom) { A.message("Indiquez un nom."); return; }
        if (etat.id) v.id = etat.id;
        faire("prospectEnregistrer", { prospect: v }, "Prospect enregistré.").then(function (r) { etat.id = r.prospect.id; rendre(); });
      } else if (f.id === "form-historique") {
        faire("historiqueAjouter", { prospect_id: etat.id, type: v.type, note: v.note }, "Note ajoutée.").then(rendre);
      } else if (f.id === "form-parametres") {
        faire("parametresEnregistrer", { parametres: v }, "Paramètres enregistrés.").then(rendre);
      } else if (f.id === "form-mdp") {
        faire("motDePasseChanger", v, "Mot de passe modifié.", true).then(function () { f.reset(); });
      } else if (f.id === "form-refus") {
        if (!v.motif) { A.message("Choisissez ou saisissez un motif de refus."); return; }
        faire("bienRefuser", { id: f.dataset.id, motif: v.motif, commentaire: v.commentaire }, "Bien refusé : l’agent a été notifié.").then(function () { etat.refus = null; if (etat.edition && etat.id === f.dataset.id) etat.edition = Object.assign({}, bien(f.dataset.id)); rendre(); });
      } else if (f.id === "form-agent") {
        if (!v.nom || !v.email) { A.message("Indiquez un nom et un e-mail."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v.email).trim())) { A.message("L’e-mail n’est pas valide (exemple : prenom@exemple.com)."); return; }
        if (etat.id) v.id = etat.id;
        if (!v.motDePasse) delete v.motDePasse;
        var creation = !etat.id;
        faire("agentEnregistrer", { agent: v }, etat.id ? "Agent mis à jour." : "").then(function (r) {
          if (r.pin) { A.message("Agent créé."); boiteCodeAgent(r.agent, r.pin, false).then(function () { aller("agents"); }); }
          else if (creation && !v.motDePasse) { alerteScriptAncien(true, "aucun code renvoyé").then(function () { aller("agents"); }); }
          else aller("agents");
        }).catch(function (err) { if (creation && RE_SCRIPT_ANCIEN.test(String(err && err.message))) alerteScriptAncien(false, String(err.message).slice(0, 160)); });
      } else if (f.id === "form-samsar") {
        if (!v.nom) { A.message("Indiquez un nom."); return; }
        if (etat.id) v.id = etat.id;
        faire("samsarEnregistrer", { samsar: v }, etat.id ? "Samsar mis à jour." : "Samsar ajouté.").then(function () { aller("samsars"); }).catch(function () {});
      } else if (f.id === "form-motif") {
        if (!v.libelle) { A.message("Indiquez un libellé."); return; }
        faire("motifEnregistrer", { motif: v }, "Motif enregistré.", true).then(function () { charger().then(rendre); f.reset(); });
      }
    });
    /* Session existante : on tente de reprendre directement */
    if (A.jeton.lire()) { racine.innerHTML = '<p class="a-chargement">Chargement…</p>'; charger().then(rendre, function () { A.jeton.ecrire(""); D = null; rendre(); }); }
    else rendre();
  });
})();
