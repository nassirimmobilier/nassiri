/* ==========================================================================
   NASSIRI REAL ESTATE — Espace Pro (administration)
   Toutes les actions passent par le serveur, qui vérifie la session à chaque appel.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, e = A.esc, ico = A.icone;
  var racine, D = null;
  var etat = { vue: "tableau", id: null, filtreBien: "", filtreProspect: "", recherche: "", sousVue: "recues", edition: null, occupe: "", refus: null };
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
          '<p class="a-bien-prix">' + (b.prix_sur_demande === "oui" ? "Prix sur demande" : n(b.prix) ? A.prix(n(b.prix)) : "Prix à renseigner") + '<span class="a-mesure">' + ico("oeil") + " " + n(b.vues) + '</span><span class="a-mesure">' + ico("coeur") + " " + Math.max(D.favoris[b.id] || 0, 0) + '</span><span class="a-mesure">' + ico("photo") + " " + ph.length + "</span></p>" +
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
    return banniereAgent + '<form id="form-bien" class="a-form" novalidate>' +
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
      champ("whatsapp", "WhatsApp", a.whatsapp, "") + champ("motDePasse", nouveau ? "Mot de passe (8 caractères minimum) *" : "Nouveau mot de passe (laisser vide pour ne pas changer)", "", 'type="password" autocomplete="new-password"') + "</div>" +
      (nouveau ? "" : '<label class="a-bascule"><input type="checkbox" name="actif"' + (a.actif === "oui" ? " checked" : "") + "><span></span><div><strong>Accès actif</strong><small>Désactivez pour bloquer sa connexion sans supprimer ses biens.</small></div></label>") +
      '<div class="a-form-pied">' + (nouveau ? "" : '<button type="button" class="lien-discret est-danger" data-action="supprimer-agent" data-id="' + e(a.id) + '">Supprimer cet agent</button>') + '<button class="btn btn-vert" type="submit">Enregistrer</button></div></form>' +
      (nouveau ? "" : '<section class="a-bloc"><h2>Biens apportés (' + mesBiens.length + ")</h2>" +
        (mesBiens.length ? mesBiens.map(function (b) { return '<button class="a-ligne" data-action="aller" data-vue="bien" data-id="' + e(b.id) + '"><span class="a-ligne-texte"><strong>' + e(b.titre) + "</strong><small>" + e(b.id) + "</small></span>" + badgeStatut(b.statut) + "</button>"; }).join("") : '<p class="a-vide">Aucun bien pour le moment.</p>') + "</section>") + "</div>";
  }

  /* ====================================================================== PROSPECTS */
  function vueProspects() {
    var q = etat.recherche.toLowerCase(), t = aujourdhui();
    var l = D.prospects.filter(function (p) { return (!etat.filtreProspect || p.statut === etat.filtreProspect) && (!q || (p.nom + " " + p.telephone + " " + p.email + " " + p.ville_recherche).toLowerCase().indexOf(q) !== -1); })
      .sort(function (a, b) { return String(b.date_maj).localeCompare(String(a.date_maj)); });
    return '<div class="a-pipeline">' + [""].concat(D.listes.statutsProspect).map(function (s) {
        var c = s ? D.prospects.filter(function (p) { return p.statut === s; }).length : D.prospects.length;
        return '<button class="a-etape' + (etat.filtreProspect === s ? " est-actif" : "") + '" data-action="filtre-prospect" data-v="' + e(s) + '"><strong>' + c + "</strong><span>" + (s || "Tous") + "</span></button>";
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
      (nouveau ? "" : '<div class="a-contacts">' + (tel ? '<a class="btn btn-ligne" href="tel:' + e(tel) + '">' + ico("telephone") + ' Appeler</a><a class="btn btn-ligne" href="https://wa.me/' + e(tel.replace(/\D/g, "")) + '" target="_blank" rel="noopener">WhatsApp</a>' : "") + (p.email ? '<a class="btn btn-ligne" href="mailto:' + e(p.email) + '">' + ico("courrier") + " E-mail</a>" : "") + "</div>") +
      '<div class="a-grille">' + champ("nom", "Nom *", p.nom, "required", "plein") + champ("telephone", "Téléphone", p.telephone, 'type="tel"') + champ("email", "E-mail", p.email, 'type="email"') +
        champ("budget", "Budget", p.budget, 'placeholder="ex. 3 à 5 M DH"') + champ("type_recherche", "Type de bien recherché", p.type_recherche) + champ("ville_recherche", "Localisation souhaitée", p.ville_recherche) +
        '<div><label for="f-statut">Statut commercial</label><select id="f-statut" name="statut">' + D.listes.statutsProspect.map(function (s) { return option(s, s, p.statut); }).join("") + "</select></div>" +
        champ("date_relance", "Date de relance", p.date_relance, 'type="date"') +
        '<div class="plein"><label for="f-notes">Notes privées</label><textarea id="f-notes" name="notes" rows="4">' + e(p.notes || "") + "</textarea></div></div>" +
      '<div class="a-form-pied">' + (nouveau ? "" : '<button type="button" class="lien-discret est-danger" data-action="supprimer-prospect" data-id="' + e(p.id) + '">Supprimer ce prospect</button>') + '<button class="btn btn-vert" type="submit">Enregistrer</button></div>' +
      (nouveau ? "" : '<p class="a-aide">Fiche créée le ' + e(A.dateFr(p.date_creation, true)) + " · origine : " + e(p.source || "—") + "</p>") + "</form>" +
      (nouveau ? "" : '<div><section class="a-bloc"><h2>Historique des contacts</h2><form id="form-historique" class="a-historique-ajout"><select name="type" aria-label="Type de contact"><option>Appel</option><option>E-mail</option><option>WhatsApp</option><option>Visite</option><option>Note</option></select><input name="note" placeholder="Ajouter une note…" aria-label="Note" required><button class="btn btn-vert" type="submit" aria-label="Ajouter">' + ico("plus") + "</button></form>" +
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
  var MENU = [["tableau", "Tableau<i> de bord</i>", "tableau"], ["biens", "Biens", "maison"], ["agents", "Agents", "personnes"], ["prospects", "Prospects", "personnes"], ["demandes", "Demandes", "cloche"], ["parametres", "Paramètres", "reglages"]];
  function rendre() {
    if (!D) { racine.innerHTML = vueConnexion(); return; }
    var v = etat.vue, section = v === "bien" ? "biens" : v === "prospect" ? "prospects" : v === "agent" ? "agents" : v, nonLues = D.alertes.filter(function (a) { return a.lu !== "oui"; }).length;
    var titres = { tableau: "Tableau de bord", biens: "Biens", bien: etat.id ? "Modifier le bien" : "Ajouter un bien", agents: "Agents", agent: etat.id ? (agent(etat.id) || {}).nom || "Agent" : "Ajouter un agent", prospects: "Prospects", prospect: etat.id ? (prospect(etat.id) || {}).nom || "Prospect" : "Ajouter un prospect", demandes: "Demandes", parametres: "Paramètres" };
    var corps = { tableau: vueTableau, biens: vueBiens, bien: vueBien, agents: vueAgents, agent: vueAgent, prospects: vueProspects, prospect: vueProspect, demandes: vueDemandes, parametres: vueParametres }[v]();
    var action = v === "biens" || v === "tableau" ? '<button class="btn btn-or" data-action="aller" data-vue="bien">' + ico("plus") + " Ajouter un bien</button>" : v === "prospects" ? '<button class="btn btn-or" data-action="aller" data-vue="prospect">' + ico("plus") + " Ajouter un prospect</button>" : v === "agents" ? '<button class="btn btn-or" data-action="aller" data-vue="agent">' + ico("plus") + " Ajouter un agent</button>" : "";
    var retour = v === "bien" ? "biens" : v === "prospect" ? "prospects" : v === "agent" ? "agents" : "";
    racine.innerHTML = '<div class="a-app"><aside class="a-menu"><a class="a-menu-logo" href="index.html" title="Voir le site"><img src="assets/img/logo/logo-clair-440.png" width="440" height="302" alt="Nassiri Real Estate"></a><nav aria-label="Espace Pro">' +
      MENU.map(function (m) { return '<button class="' + (section === m[0] ? "est-actif" : "") + '" data-action="aller" data-vue="' + m[0] + '"' + (section === m[0] ? ' aria-current="page"' : "") + ">" + ico(m[2]) + "<span>" + m[1] + "</span>" + (m[0] === "demandes" && nonLues ? '<em class="a-compteur">' + nonLues + "</em>" : "") + "</button>"; }).join("") +
      '</nav><div class="a-menu-bas"><a href="index.html" target="_blank" rel="noopener">' + ico("oeil") + '<span>Voir le site</span></a><button data-action="deconnexion">' + ico("sortie") + "<span>Déconnexion</span></button></div></aside>" +
      '<main class="a-principal">' + (A.demo ? '<p class="a-bandeau-demo">' + ico("info") + " Mode démonstration — données fictives enregistrées sur cet appareil, accès non protégé.</p>" : "") +
      '<header class="a-entete"><div>' + (retour ? '<button class="a-fil-retour" data-action="aller" data-vue="' + retour + '">' + ico("gauche") + " " + titres[retour] + "</button>" : "") + "<h1>" + e(titres[v]) + "</h1></div>" + action + "</header>" + corps + "</main></div>" +
      '<div id="a-occupe" class="a-occupe" role="status" hidden></div>';
  }

  /* ====================================================================== ÉVÉNEMENTS */
  var ACTIONS = {
    aller: function (b) { if (b.dataset.sous) etat.sousVue = b.dataset.sous; if (b.dataset.filtreBien !== undefined) etat.filtreBien = b.dataset.filtreBien; aller(b.dataset.vue, b.dataset.id); },
    "filtre-bien": function (b) { etat.filtreBien = b.dataset.v; rendre(); },
    "filtre-prospect": function (b) { etat.filtreProspect = b.dataset.v; rendre(); },
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
        if (etat.id) v.id = etat.id;
        if (!v.motDePasse) delete v.motDePasse;
        faire("agentEnregistrer", { agent: v }, etat.id ? "Agent mis à jour." : "Agent créé.").then(function (r) { aller("agents"); });
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
