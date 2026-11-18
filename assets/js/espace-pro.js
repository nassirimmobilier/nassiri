/* ==========================================================================
   NASSIRI REAL ESTATE — Espace Pro : porte d'entrée unique
   Un seul écran de connexion pour l'administration, les agents et les partenaires.
   Chacun est ensuite dirigé vers son propre espace ; le serveur vérifie les droits à chaque action.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, e = A.esc, ico = A.icone;
  var racine, CLE_ROLE = "nassiri_role";
  var ROLES = [
    { id: "admin", lib: "Admin", texte: "Accès réservé à la direction de l’agence.", page: "admin.html" },
    { id: "agent", lib: "Agent", texte: "Votre e-mail et le code PIN reçu de l’agence par WhatsApp ou par e-mail.", page: "agent.html" },
    { id: "partenaire", lib: "Partenaire", texte: "Notaires, avocats, promoteurs : votre e-mail et le code PIN remis par l’agence.", page: "partenaire.html" }
  ];
  var role = "agent";

  function roleParId(id) { return ROLES.filter(function (r) { return r.id === id; })[0]; }
  function lireRole() {
    var p = new URLSearchParams(location.search).get("role"), m = "";
    try { m = localStorage.getItem(CLE_ROLE) || ""; } catch (x) {}
    return roleParId(p) ? p : roleParId(m) ? m : "agent";
  }
  function noteDemo() {
    if (!A.demo) return "";
    var t = { admin: "Mot de passe : <code>nassiri-demo</code>", agent: "<code>youssef.exemple@example.com</code> / <code>agent-demo</code>",
      partenaire: "Notaire : <code>notaire.exemple@example.com</code> / <code>123456</code><br>Promoteur : <code>promoteur.exemple@example.com</code> / <code>654321</code>" };
    return '<div class="a-note">' + ico("info") + "<div><strong>Mode démonstration</strong><br>Données fictives, enregistrées sur cet appareil, accès non protégé.<br>" + t[role] + "</div></div>";
  }
  function vue(erreur) {
    var r = roleParId(role), admin = role === "admin";
    return '<div class="a-connexion"><form class="a-connexion-carte" id="form-connexion" novalidate>' +
      '<img class="a-connexion-logo" src="assets/img/logo/logo-nassiri-440.png" width="440" height="302" alt="Nassiri Real Estate">' +
      "<h1>Espace Pro</h1><p>Choisissez votre espace, puis identifiez-vous.</p>" +
      '<div class="a-onglets" role="group" aria-label="Votre espace">' + ROLES.map(function (x) { return '<button type="button" data-role="' + x.id + '" aria-pressed="' + (x.id === role) + '">' + e(x.lib) + "</button>"; }).join("") + "</div>" +
      '<p class="a-onglet-texte">' + e(r.texte) + "</p>" + noteDemo() +
      (admin
        ? '<label for="f-mdp">Mot de passe</label><input id="f-mdp" name="motDePasse" type="password" autocomplete="current-password" required>'
        : '<label for="f-email">Adresse e-mail</label><input id="f-email" name="email" type="email" autocomplete="username" required>' +
          '<label for="f-mdp">Code PIN</label><input id="f-mdp" name="motDePasse" type="password" inputmode="numeric" autocomplete="current-password" required>') +
      (erreur ? '<p class="retour est-erreur" role="alert">' + e(erreur) + "</p>" : "") +
      '<button class="btn btn-vert" type="submit">Se connecter</button><p class="a-aide a-onglet-aide">Code perdu ? Contactez l’agence : elle vous en enverra un nouveau.</p><a class="a-retour-site" href="index.html">← Retour au site</a></form></div>';
  }
  function afficher(erreur) {
    racine.innerHTML = vue(erreur);
    var c = document.getElementById(role === "admin" ? "f-mdp" : "f-email"); if (c) c.focus();
  }
  function ouvrir(id) { window.location.href = roleParId(id).page; }

  document.addEventListener("DOMContentLoaded", function () {
    racine = document.getElementById("pro");
    role = lireRole();
    /* Une session déjà ouverte dans cet onglet : on rejoint directement l'espace correspondant */
    if (A.jeton.lire()) return ouvrir("admin");
    if (A.jetonAgent.lire()) return ouvrir("agent");
    if (A.jetonPartenaire.lire()) return ouvrir("partenaire");
    racine.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-role]");
      if (b) { role = b.dataset.role; try { localStorage.setItem(CLE_ROLE, role); } catch (x) {} afficher(); }
    });
    racine.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = ev.target, v = A.valeurs(f), bouton = f.querySelector("button[type=submit]"), appel;
      if (role === "admin") appel = A.api("connexion", { motDePasse: v.motDePasse }).then(function (r) { A.jeton.ecrire(r.jeton); });
      else if (role === "agent") appel = A.apiAgent("connexionAgent", { email: v.email, motDePasse: v.motDePasse }).then(function (r) { A.jetonAgent.ecrire(r.jeton); });
      else appel = A.apiPartenaire("connexionPartenaire", { email: v.email, motDePasse: v.motDePasse }).then(function (r) { A.jetonPartenaire.ecrire(r.jeton); });
      bouton.disabled = true; bouton.textContent = "Connexion…";
      appel.then(function () { try { localStorage.setItem(CLE_ROLE, role); } catch (x) {} ouvrir(role); }, function (err) { afficher(err.message); });
    });
    afficher();
  });
})();
