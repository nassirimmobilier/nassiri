/* ==========================================================================
   NASSIRI REAL ESTATE — Import d'annonce préparée par une IA (module partagé, V11.2)
   Lit le texte JSON ou le ZIP (annonce.json + photos) et le transforme en annonce propre
   avec une liste d'alertes. Aucune écriture ici : l'enregistrement passe toujours par le
   serveur et par la validation de l'agence.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS;
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
  var IMP_MAX_PHOTOS = 40, IMP_MAX_ZIP = 120 * 1024 * 1024, IMP_MAX_JSON = 1024 * 1024;
  var IMP_CHAMPS_TEXTE = ["titre", "type", "transaction", "ville", "quartier", "description", "juridique", "adresse_privee", "notes_privees"];
  var IMP_CHAMPS_NOMBRE = ["prix", "surface", "terrain", "chambres", "sdb"];
  var IMP_BASCULES = ["prix_sur_demande", "juridique_verifie", "exclusivite", "a_la_une", "coup_de_coeur"];
  var IMP_CONNUS = IMP_CHAMPS_TEXTE.concat(IMP_CHAMPS_NOMBRE, IMP_BASCULES, ["equipements", "statut", "devise", "reference", "photos", "a_verifier", "format", "version", "bien"]);
  var CONSIGNE_IA = [
    "Tu prépares une annonce pour l'agence immobilière Nassiri Real Estate (Maroc). Je suis agent de l'agence : je te donne les informations du bien et des photos.",
    "RÈGLES : n'invente RIEN. Une information absente reste vide (\"\" ou null) et tu la listes dans \"a_verifier\". Rédige en français, ton professionnel et sobre.",
    "LIVRABLE : un fichier ZIP contenant annonce.json et un dossier photos/ (JPEG, 1600 px max, nommés 01.jpg, 02.jpg…). Si tu ne peux pas créer de ZIP, donne-moi uniquement le JSON ci-dessous, dans un bloc de code.",
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
    "Notes : ne mentionne JAMAIS de commission ni d'honoraires ; prix en dirhams (DH), nombres sans espaces ; surface = surface construite en m² ; terrain en m² ; adresse_privee et notes_privees ne sont jamais affichées au public ; l'ordre de \"photos\" est l'ordre d'affichage."
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


  function mimeExt(nom) {
    var m = String(nom).toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/);
    if (!m) return "";
    return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" }[m[1]];
  }

  /* Lecture d'un fichier ZIP (annonce.json + photos) ou JSON : renvoie { brut, fichiers:[{fichier,principale}], alertes } */
  function lireFichier(fichier, progres) {
    var info = progres || function () {};
    var nom = String(fichier.name || "").toLowerCase();
    if (/\.json$|\.txt$/.test(nom)) {
      if (fichier.size > IMP_MAX_JSON) return Promise.reject(new Error("Fichier trop volumineux pour un JSON d’annonce."));
      return fichier.text().then(function (t) { return { brut: lireJsonImp(t), fichiers: [], alertes: [], source: "json" }; });
    }
    if (!/\.zip$/.test(nom)) return Promise.reject(new Error("Format non pris en charge : choisissez un fichier .zip ou .json."));
    if (typeof JSZip === "undefined") return Promise.reject(new Error("Le module ZIP n’est pas chargé : actualisez la page puis réessayez."));
    if (fichier.size > IMP_MAX_ZIP) return Promise.reject(new Error("ZIP trop lourd (" + Math.round(fichier.size / 1048576) + " Mo, maximum 120 Mo). Réduisez le nombre de photos."));
    info("Lecture du ZIP…");
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
            info("Extraction de la photo " + (++i) + " sur " + liste.length + "…");
            return zip.files[x.cle].async("blob").then(function (bl) {
              if (bl.size > 40 * 1048576) { alertes.push({ niveau: "attention", texte: "Photo trop lourde ignorée : " + nettoyerTexteImp(x.cle.split("/").pop(), 60) }); return; }
              var nomF = x.cle.split("/").pop();
              fichiers.push({ fichier: new File([bl], nomF, { type: mimeExt(nomF) }), principale: x.principale });
            });
          });
        }, Promise.resolve()).then(function () { return { brut: brut, fichiers: fichiers, alertes: alertes, source: "zip" }; });
      });
    });
  }

  A.importAnnonce = {
    MAX_PHOTOS: IMP_MAX_PHOTOS, CHAMPS_TEXTE: IMP_CHAMPS_TEXTE, CHAMPS_NOMBRE: IMP_CHAMPS_NOMBRE, BASCULES: IMP_BASCULES,
    consigne: CONSIGNE_IA, lireJson: lireJsonImp, normaliser: normaliserImp, lireFichier: lireFichier, nettoyer: nettoyerTexteImp, norm: norm
  };
})();
