/* ==========================================================================
   NASSIRI REAL ESTATE — Espace Partenaire (notaires, avocats, promoteurs)
   Chaque partenaire ne voit que ce qui lui est confié. Le serveur vérifie la session et les droits
   à chaque action ; il n'envoie jamais ici les notes internes, les commissions, ni les autres partenaires.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, e = A.esc, ico = A.icone;
  var racine, D = null;
  var etat = { vue: "principal", occupe: "" };
  var LIB_TYPE = { notaire: "Notaire", avocat: "Avocat", promoteur: "Promoteur" };

  /* ---------- Outils ---------- */
  function option(v, libelle, choisi) { return '<option value="' + e(v) + '"' + (v === choisi ? " selected" : "") + ">" + e(libelle) + "</option>"; }
  function sansExemple(s) { return String(s || "").replace(/^Exemple — /, ""); }
  function promoteur() { return D.partenaire.type === "promoteur"; }
  function numWa(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (/^00/.test(d)) d = d.slice(2); else if (/^0\d{9}$/.test(d)) d = "212" + d.slice(1);
    return d;
  }
  function salutation() {
    var p = D.partenaire;
    return promoteur() ? "Bonjour, " + sansExemple(p.societe || p.nom) : "Bonjour, Maître " + sansExemple(p.nom);
  }
  /* Contacts WhatsApp de l'agence : « Nom:numéro, Nom:numéro » (paramètre de l'Espace Pro, sinon valeur par défaut du site) */
  function contactsAgence() {
    var brut = (D.agence && D.agence.whatsapp) || A.config.whatsapp || "";
    return String(brut).split(",").map(function (x) { var t = x.split(":"); return { nom: (t[0] || "").trim(), num: numWa(t[1]) }; }).filter(function (c) { return c.num; });
  }

  function faire(action, donnees, message, sansRecharger) {
    etat.occupe = "Enregistrement…"; indicateur();
    return A.apiPartenaire(action, donnees).then(function (r) {
      return (sansRecharger ? Promise.resolve() : charger()).then(function () { etat.occupe = ""; indicateur(); if (message) A.message(message); return r; });
    }).catch(function (err) {
      etat.occupe = ""; indicateur();
      if (err.code === "AUTH") { A.jetonPartenaire.ecrire(""); D = null; versPorte(); }
      else A.message(err.message);
      throw err;
    });
  }
  function charger() { return A.apiPartenaire("donneesPartenaire").then(function (r) { D = r; }); }
  function indicateur() { var i = document.getElementById("a-occupe"); if (i) { i.textContent = etat.occupe; i.hidden = !etat.occupe; } }
  function versPorte() { window.location.replace("espace-pro.html?role=partenaire"); }
  function aller(vue) { etat.vue = vue; rendre(); window.scrollTo(0, 0); }

  /* ====================================================================== NOTAIRE / AVOCAT */
  function vueDossiers() {
    var etapes = D.listes.etapesDossier;
    return '<section class="a-bloc"><h2>Mes dossiers</h2>' + (D.dossiers.length ? D.dossiers.map(function (d) {
      var k = etapes.indexOf(d.etape) + 1;
      return '<div class="a-sous-bloc"><div class="a-ligne-fixe" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="a-ligne-texte"><strong>' + e(d.bien) + "</strong><small>Dossier " + e(d.reference) + "</small></span>" +
        '<span class="a-statut a-statut-p">' + e(d.etape) + "</span></div>" +
        '<div class="a-etapes" aria-hidden="true">' + etapes.map(function (x, i) { return '<span class="' + (i < k ? "est-fait" : "") + '"></span>'; }).join("") + "</div>" +
        '<div class="a-etapes-noms" aria-hidden="true"><span>Promesse</span><span>Compromis</span><span>Acte</span><span>Titre foncier</span></div>' +
        (d.agent ? '<p class="a-aide">Agent référent : ' + e(sansExemple(d.agent.nom)) + (numWa(d.agent.whatsapp || d.agent.telephone) ? ' · <a href="https://wa.me/' + numWa(d.agent.whatsapp || d.agent.telephone) + '" target="_blank" rel="noopener">WhatsApp</a>' : "") + "</p>" : "") + "</div>";
    }).join("") : '<p class="a-vide">Aucun dossier ne vous est confié pour le moment. L’agence vous en confiera ici.</p>') + "</section>";
  }

  /* ====================================================================== PROMOTEUR */
  function vueProgrammes() {
    var statuts = D.listes.statutsLot, compte = function (s) { return D.lots.filter(function (l) { return l.statut === s; }).length; };
    var tuiles = '<div class="a-tuiles a-tuiles-3">' + [["Disponible", "lot disponible", "lots disponibles"], ["Réservé", "lot réservé", "lots réservés"], ["Vendu", "lot vendu", "lots vendus"]].map(function (t) {
      var c = compte(t[0]); return '<div class="a-tuile"><strong>' + c + "</strong><span>" + (c > 1 ? t[2] : t[1]) + "</span></div>"; }).join("") + "</div>";
    return tuiles + (D.programmes.length ? D.programmes.map(function (p) {
      var lots = D.lots.filter(function (l) { return l.programme_id === p.id; }), dem = D.demandes.filter(function (x) { return x.programme_id === p.id; });
      return '<section class="a-bloc"><h2>' + e(sansExemple(p.nom)) + "</h2>" +
        (/^https?:\/\//i.test(p.lien_brochure || "") ? '<p class="a-aide"><a href="' + e(p.lien_brochure) + '" target="_blank" rel="noopener">Ouvrir la brochure du programme</a></p>' : "") +
        '<h3 class="a-sous-titre">Mes lots</h3>' + (lots.length ? lots.map(function (l) {
          return '<div class="a-ligne a-ligne-fixe"><span class="a-ligne-texte"><strong>' + e(l.nom) + "</strong><small>" + e(l.detail) + '</small></span><label class="a-select"><span class="sr">Statut de ' + e(l.nom) + '</span><select data-action-change="lot-statut" data-id="' + e(l.id) + '">' +
            statuts.map(function (s) { return option(s, s, l.statut); }).join("") + "</select></label></div>";
        }).join("") : '<p class="a-vide">Aucun lot enregistré pour ce programme.</p>') +
        '<h3 class="a-sous-titre" style="margin-top:18px">Demandes de réservation</h3>' + (dem.length ? dem.map(function (x) {
          return '<div class="a-ligne a-ligne-fixe"><span class="a-ligne-texte"><strong>' + e(x.lot_nom) + "</strong><small>Transmise par " + e(sansExemple(x.agent_nom || "l’agence")) + " · " + e(A.dateFr(x.date)) + '</small></span><span class="a-statut a-statut-p">' + e(x.statut) + "</span></div>";
        }).join("") : '<p class="a-vide">Aucune demande pour le moment.</p>') +
        (p.agent ? '<p class="a-aide" style="margin-top:14px">Agent référent : ' + e(sansExemple(p.agent.nom)) + "</p>" : "") + "</section>";
    }).join("") : '<p class="a-vide a-bloc">Aucun programme ne vous est confié pour le moment.</p>');
  }

  /* ====================================================================== CONTACT ET MESSAGES */
  function blocContact() {
    var c = contactsAgence();
    return '<section class="a-bloc"><h2>Votre contact à l’agence</h2><p class="a-aide">Écrivez à l’agence dans l’onglet Messages, ou contactez-la directement.</p><div class="a-contacts">' +
      '<button type="button" class="btn btn-vert" data-action="aller" data-vue="messages">' + ico("courrier") + " Écrire un message</button>" +
      c.map(function (x) { return '<a class="btn btn-ligne" href="https://wa.me/' + x.num + '" target="_blank" rel="noopener">WhatsApp' + (x.nom ? " · " + e(x.nom) : "") + "</a>"; }).join("") + "</div></section>";
  }
  function vueMessages() {
    return '<section class="a-bloc"><h2>Messagerie avec l’agence</h2>' + (D.messages.length
      ? '<div class="a-fil-messages" id="a-fil" tabindex="0" aria-label="Messages">' + D.messages.map(function (m) {
          return '<div class="a-msg' + (m.auteur === "partenaire" ? " est-moi" : "") + '">' + e(m.texte) + "<small>" + (m.auteur === "partenaire" ? "Vous" : "Agence") + " · " + e(A.dateFr(m.date, true)) + "</small></div>"; }).join("") + "</div>"
      : '<p class="a-vide">Aucun message pour le moment.</p>') +
      '<form id="form-message" class="a-historique-ajout"><label class="sr" for="f-texte">Votre message</label><textarea id="f-texte" name="texte" rows="3" placeholder="Écrire à l’agence…" required></textarea>' +
      '<button class="btn btn-vert" type="submit">Envoyer</button></form></section>';
  }

  /* ====================================================================== GABARIT */
  function rendre() {
    if (!D) { racine.innerHTML = '<p class="a-chargement">Chargement…</p>'; return; }
    var v = etat.vue, p = D.partenaire, nl = D.non_lus || 0;
    var MENU = [["principal", promoteur() ? "Mes programmes" : "Mes dossiers", promoteur() ? "maison" : "document"], ["messages", "Messages", "courrier"]];
    var titres = { principal: promoteur() ? "Mes programmes" : "Mes dossiers", messages: "Messages" };
    var corps = v === "messages" ? vueMessages() : (promoteur() ? vueProgrammes() : vueDossiers()) + blocContact();
    racine.innerHTML = '<div class="a-app"><aside class="a-menu"><a class="a-menu-logo" href="index.html" title="Voir le site"><img src="assets/img/logo/logo-nassiri-440.png" width="440" height="302" alt="Nassiri Real Estate"></a><nav aria-label="Espace Partenaire">' +
      MENU.map(function (m) { return '<button class="' + (v === m[0] ? "est-actif" : "") + '" data-action="aller" data-vue="' + m[0] + '"' + (v === m[0] ? ' aria-current="page"' : "") + ">" + ico(m[2]) + "<span>" + m[1] + "</span>" + (m[0] === "messages" && nl ? '<em class="a-compteur">' + nl + "</em>" : "") + "</button>"; }).join("") +
      '</nav><div class="a-menu-bas"><a href="index.html" target="_blank" rel="noopener">' + ico("oeil") + '<span>Voir le site</span></a><button data-action="deconnexion">' + ico("sortie") + "<span>Déconnexion</span></button></div></aside>" +
      '<main class="a-principal">' + (A.demo ? '<p class="a-bandeau-demo">' + ico("info") + " Mode démonstration — données fictives enregistrées sur cet appareil.</p>" : "") +
      '<header class="a-entete"><div><h1>' + e(titres[v]) + "</h1></div></header>" +
      '<p class="a-aide" style="margin-bottom:16px">' + e(salutation()) + ". Vous ne voyez ici que ce que l’agence vous a confié.</p>" + corps + "</main></div>" +
      '<div id="a-occupe" class="a-occupe" role="status" hidden></div>';
    var fil = document.getElementById("a-fil"); if (fil) fil.scrollTop = fil.scrollHeight;
  }

  /* ====================================================================== ÉVÉNEMENTS */
  var ACTIONS = {
    aller: function (b) {
      etat.vue = b.dataset.vue; rendre(); window.scrollTo(0, 0);
      if (etat.vue === "messages" && D.non_lus) A.apiPartenaire("messagesLusPartenaire").then(function () { D.non_lus = 0; D.messages.forEach(function (m) { if (m.auteur === "agence") m.lu = "oui"; }); rendre(); }, function () {});
    },
    deconnexion: function () { A.apiPartenaire("deconnexionPartenaire").catch(function () {}).then(function () { A.jetonPartenaire.ecrire(""); D = null; window.location.href = "espace-pro.html?role=partenaire"; }); }
  };
  var CHANGEMENTS = {
    "lot-statut": function (s) { faire("lotStatutPartenaire", { id: s.dataset.id, statut: s.value }, "Statut du lot mis à jour : " + s.value + ".").then(rendre, rendre); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    racine = document.getElementById("partenaire");
    racine.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-action]");
      if (b && ACTIONS[b.dataset.action]) { ev.preventDefault(); ACTIONS[b.dataset.action](b); }
    });
    racine.addEventListener("change", function (ev) {
      var s = ev.target.closest("[data-action-change]");
      if (s) CHANGEMENTS[s.dataset.actionChange](s);
    });
    racine.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = ev.target, v = A.valeurs(f);
      if (f.id === "form-message") {
        if (!String(v.texte || "").trim()) { A.message("Écrivez votre message."); return; }
        faire("messageEnvoyerPartenaire", { texte: v.texte }, "Message envoyé.").then(rendre, function () {});
      }
    });
    /* V11.2.1 : actualisation automatique toutes les 60 s (jamais pendant la rédaction d'un message) */
    A.actualisationAuto({ pret: function () { return !!D; }, donnees: function () { return D; }, lire: function () { return A.apiPartenaire("donneesPartenaire"); }, ecrire: function (r) { D = r; }, rendre: rendre });
    if (!A.jetonPartenaire.lire()) { versPorte(); return; }
    racine.innerHTML = '<p class="a-chargement">Chargement…</p>';
    charger().then(rendre, function () { A.jetonPartenaire.ecrire(""); D = null; versPorte(); });
  });
})();
