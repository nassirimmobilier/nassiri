/* COPIE AUTOMATIQUE de apps-script/Code.gs pour le mode démonstration — ne pas modifier ici. */
window.ATLAS_DEMO.serveur = (function (SpreadsheetApp, PropertiesService, CacheService, LockService, ContentService, MailApp, DriveApp, Utilities, URL_PHOTO_DEMO) {
/**
 * NASSIRI REAL ESTATE — API Google Apps Script
 * ---------------------------------------------------------------------------
 * Script LIÉ au classeur Google Sheets (Extensions > Apps Script).
 * Déploiement : Application Web — Exécuter en tant que : Moi — Accès : Tout le monde.
 *
 * Sécurité :
 *  - Le mot de passe administrateur n'est JAMAIS dans le site public. Il est haché (sel +
 *    SHA-256 itéré) et conservé dans les Propriétés du script, côté Google.
 *  - Chaque action d'administration exige un jeton de session vérifié ICI, côté serveur.
 *  - Les données privées (prospects, adresses, notes) ne sortent que par les actions admin.
 */

var VERSION = '2.0';
var DUREE_SESSION = 21600;          // 6 h (maximum du cache Apps Script)
var MAX_ECHECS = 5;                 // tentatives de connexion avant blocage
var BLOCAGE = 900;                  // 15 min
var MAX_DEMANDES_HEURE = 120;       // protège le quota d'e-mails et le classeur
var MAX_PHOTOS_PROPOSITION = 5;

var ONGLETS = {
  BIENS: ['id', 'statut', 'titre', 'type', 'ville', 'quartier', 'prix', 'surface', 'terrain', 'chambres', 'sdb',
    'description', 'equipements', 'juridique', 'juridique_verifie', 'exclusivite', 'a_la_une',
    'date_creation', 'date_publication', 'date_maj', 'vues', 'adresse_privee', 'notes_privees'],
  PHOTOS: ['id', 'bien_id', 'url', 'drive_id', 'ordre'],
  PROSPECTS: ['id', 'date_creation', 'nom', 'telephone', 'email', 'budget', 'type_recherche', 'ville_recherche',
    'statut', 'notes', 'date_relance', 'source', 'date_maj'],
  HISTORIQUE: ['id', 'prospect_id', 'date', 'type', 'note'],
  VISITES: ['id', 'date', 'prospect_id', 'bien_id', 'date_souhaitee', 'creneau', 'message', 'statut'],
  PROPOSITIONS: ['id', 'date', 'prospect_id', 'ville', 'type', 'prix_souhaite', 'surface', 'description',
    'commentaires', 'photos', 'statut'],
  FAVORIS: ['date', 'bien_id', 'action'],
  ALERTES: ['id', 'date', 'type', 'prospect_id', 'bien_id', 'resume', 'lu', 'email_envoye'],
  PARAMETRES: ['cle', 'valeur']
};
var STATUTS_BIEN = ['brouillon', 'publie', 'sous-offre', 'vendu', 'archive'];
var STATUTS_PROSPECT = ['Nouveau', 'Contacté', 'Qualifié', 'Visite', 'Offre', 'Vente'];
var STATUTS_VISITE = ['À confirmer', 'Confirmée', 'Effectuée', 'Annulée'];
var STATUTS_PROPOSITION = ['Nouveau', 'À l’étude', 'Accepté', 'Refusé'];
var PARAMETRES_PUBLICS = ['whatsapp', 'telephone', 'email_contact'];
var PARAMETRES_MODIFIABLES = ['email_alertes', 'whatsapp', 'telephone', 'email_contact'];
/* Champs d'un bien visibles du public (jamais adresse_privee ni notes_privees) */
var CHAMPS_PUBLICS = ['id', 'statut', 'titre', 'type', 'ville', 'quartier', 'prix', 'surface', 'terrain', 'chambres',
  'sdb', 'description', 'equipements', 'juridique', 'juridique_verifie', 'exclusivite', 'a_la_une', 'date_publication'];

/* ============================== MENU DU CLASSEUR ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Nassiri Real Estate')
    .addItem('1. Installer / vérifier les onglets', 'menuInstaller')
    .addItem('2. Définir le mot de passe administrateur', 'menuMotDePasse')
    .addItem('3. Envoyer un e-mail de test', 'menuTestEmail')
    .addToUi();
}
function menuInstaller() {
  installer_();
  SpreadsheetApp.getUi().alert('Onglets installés. Renseignez « email_alertes » dans l’onglet PARAMETRES, puis définissez le mot de passe (menu Nassiri Real Estate).');
}
function menuMotDePasse() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Mot de passe administrateur', 'Choisissez un mot de passe d’au moins 10 caractères :', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try { definirMotDePasse_(r.getResponseText()); ui.alert('Mot de passe enregistré (haché, jamais stocké en clair).'); }
  catch (e) { ui.alert(e.message); }
}
function menuTestEmail() {
  var a = parametre_('email_alertes');
  if (!a) { SpreadsheetApp.getUi().alert('Renseignez d’abord « email_alertes » dans l’onglet PARAMETRES.'); return; }
  MailApp.sendEmail(a, 'Nassiri Real Estate — e-mail de test', 'Les alertes e-mail fonctionnent.');
  SpreadsheetApp.getUi().alert('E-mail de test envoyé à ' + a);
}

/* Crée les onglets manquants et leurs en-têtes ; ne supprime jamais de données. */
function installer_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(ONGLETS).forEach(function (nom) {
    var f = ss.getSheetByName(nom) || ss.insertSheet(nom);
    var cols = ONGLETS[nom];
    f.getRange(1, 1, f.getMaxRows(), cols.length).setNumberFormat('@');   // tout en texte : pas de conversion automatique
    f.getRange(1, 1, 1, cols.length).setValues([cols]);
    f.setFrozenRows(1);
  });
  var existants = lire_('PARAMETRES').map(function (p) { return p.cle; });
  PARAMETRES_MODIFIABLES.forEach(function (cle) {
    if (existants.indexOf(cle) === -1) feuille_('PARAMETRES').appendRow([cle, '']);
  });
}

/* ============================== ENTRÉES HTTP ============================== */

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'catalogue') return repondre_(proteger_(function () { return catalogue_(); }));
  return repondre_({ ok: true, service: 'Nassiri Real Estate', version: VERSION });
}

function doPost(e) {
  return repondre_(proteger_(function () {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(d.action || '');
    if (PUBLIQUES[action]) return PUBLIQUES[action](d);
    if (ADMIN[action]) { exigerSession_(d.jeton); return verrou_(function () { return ADMIN[action](d); }); }
    throw erreur_('Action inconnue.', 'ACTION');
  }));
}

function proteger_(fn) {
  try { var r = fn() || {}; r.ok = true; return r; }
  catch (err) { return { ok: false, erreur: err.publique ? err.message : 'Erreur du serveur. Réessayez.', code: err.code || 'SERVEUR', detail: err.publique ? '' : String(err.message || err) }; }
}
function erreur_(message, code) { var e = new Error(message); e.publique = true; e.code = code || 'REQUETE'; return e; }
function repondre_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function verrou_(fn) {
  var v = LockService.getScriptLock(); v.waitLock(20000);
  try { return fn(); } finally { v.releaseLock(); }
}

/* ============================== ACCÈS AU CLASSEUR ============================== */

function feuille_(nom) {
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!f) throw erreur_('Onglet « ' + nom + ' » introuvable : lancez l’installation depuis le menu Nassiri Real Estate.', 'INSTALLATION');
  return f;
}
function texte_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Africa/Casablanca', "yyyy-MM-dd'T'HH:mm");
  return v === null || v === undefined ? '' : String(v);
}
function lire_(nom) {
  var cols = ONGLETS[nom], v = feuille_(nom).getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i].join('') === '') continue;
    var o = { _ligne: i + 1 };
    for (var c = 0; c < cols.length; c++) o[cols[c]] = texte_(v[i][c]);
    out.push(o);
  }
  return out;
}
function propre_(v, max) {           // neutralise les formules et limite la longueur
  return String(v === null || v === undefined ? '' : v).replace(/^[=\s]+/, '').slice(0, max || 500);
}
function ligne_(nom, o) { return ONGLETS[nom].map(function (c) { return propre_(o[c], 20000); }); }
function ajouter_(nom, o) { feuille_(nom).appendRow(ligne_(nom, o)); return o; }
function trouver_(nom, id) {
  var l = lire_(nom);
  for (var i = 0; i < l.length; i++) if (l[i][ONGLETS[nom][0]] === String(id)) return l[i];
  return null;
}
function modifier_(nom, id, changements) {
  var o = trouver_(nom, id);
  if (!o) throw erreur_('Élément introuvable.', 'INTROUVABLE');
  Object.keys(changements).forEach(function (k) { if (ONGLETS[nom].indexOf(k) > 0) o[k] = changements[k]; });
  feuille_(nom).getRange(o._ligne, 1, 1, ONGLETS[nom].length).setValues([ligne_(nom, o)]);
  return o;
}
function supprimer_(nom, id) { var o = trouver_(nom, id); if (o) feuille_(nom).deleteRow(o._ligne); }
function sans_(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== '_ligne') c[k] = o[k]; }); return c; }
function tous_(nom) { return lire_(nom).map(sans_); }
function maintenant_() { return Utilities.formatDate(new Date(), 'Africa/Casablanca', "yyyy-MM-dd'T'HH:mm"); }
function identifiant_(prefixe) { return prefixe + '-' + new Date().getTime().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }
function parametre_(cle) {
  var l = lire_('PARAMETRES');
  for (var i = 0; i < l.length; i++) if (l[i].cle === cle) return l[i].valeur;
  return '';
}
function oui_(v) { return v === true || v === 'oui' || v === 'true' ? 'oui' : 'non'; }
function nombre_(v) { var n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isNaN(n) ? '' : String(n); }

/* ============================== AUTHENTIFICATION ============================== */

function hex_(octets) {
  return octets.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function hacher_(motDePasse, sel) {
  var h = sel + ':' + motDePasse;
  for (var i = 0; i < 300; i++) h = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + sel, Utilities.Charset.UTF_8));
  return h;
}
function definirMotDePasse_(mdp) {
  mdp = String(mdp || '');
  if (mdp.length < 10) throw erreur_('Le mot de passe doit contenir au moins 10 caractères.');
  var sel = Utilities.getUuid(), p = PropertiesService.getScriptProperties();
  p.setProperty('ADMIN_SEL', sel);
  p.setProperty('ADMIN_HACHAGE', hacher_(mdp, sel));
}
function verifierMotDePasse_(mdp) {
  var p = PropertiesService.getScriptProperties(), sel = p.getProperty('ADMIN_SEL'), h = p.getProperty('ADMIN_HACHAGE');
  if (!sel || !h) throw erreur_('Aucun mot de passe défini : utilisez le menu Nassiri Real Estate du classeur.', 'INSTALLATION');
  return hacher_(String(mdp || ''), sel) === h;
}
function connexion_(d) {
  var cache = CacheService.getScriptCache(), echecs = parseInt(cache.get('echecs') || '0', 10);
  if (echecs >= MAX_ECHECS) throw erreur_('Trop de tentatives. Réessayez dans 15 minutes.', 'BLOQUE');
  if (!verifierMotDePasse_(d.motDePasse)) {
    cache.put('echecs', String(echecs + 1), BLOCAGE);
    throw erreur_('Mot de passe incorrect.', 'AUTH');
  }
  cache.remove('echecs');
  var jeton = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('session_' + jeton, '1', DUREE_SESSION);
  return { jeton: jeton, duree: DUREE_SESSION };
}
function exigerSession_(jeton) {
  var cache = CacheService.getScriptCache(), cle = 'session_' + String(jeton || '');
  if (!jeton || String(jeton).length < 40 || cache.get(cle) !== '1') throw erreur_('Session expirée. Reconnectez-vous.', 'AUTH');
  cache.put(cle, '1', DUREE_SESSION);   // prolonge la session à chaque action
}

/* ============================== PARTIE PUBLIQUE ============================== */

function photosPar_() {
  var par = {};
  lire_('PHOTOS').sort(function (a, b) { return (parseFloat(a.ordre) || 0) - (parseFloat(b.ordre) || 0); })
    .forEach(function (p) { (par[p.bien_id] = par[p.bien_id] || []).push(p); });
  return par;
}
function catalogue_() {
  var photos = photosPar_();
  var biens = lire_('BIENS').filter(function (b) { return b.statut === 'publie' || b.statut === 'sous-offre'; })
    .map(function (b) {
      var o = {}; CHAMPS_PUBLICS.forEach(function (c) { o[c] = b[c]; });
      o.photos = (photos[b.id] || []).map(function (p) { return p.url; });
      return o;
    });
  var config = {}; PARAMETRES_PUBLICS.forEach(function (c) { config[c] = parametre_(c); });
  return { biens: biens, config: config };
}
function limiter_() {
  var cache = CacheService.getScriptCache(), cle = 'demandes_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var n = parseInt(cache.get(cle) || '0', 10);
  if (n >= MAX_DEMANDES_HEURE) throw erreur_('Trop de demandes en ce moment. Réessayez un peu plus tard.', 'LIMITE');
  cache.put(cle, String(n + 1), 3700);
}
function chiffres_(s) { return String(s || '').replace(/\D/g, '').replace(/^0+/, ''); }

function trouverOuCreerProspect_(d, source) {
  var email = propre_(d.email, 120).toLowerCase(), tel = propre_(d.telephone, 40), l = lire_('PROSPECTS'), p = null;
  for (var i = 0; i < l.length && !p; i++) {
    if (email && l[i].email.toLowerCase() === email) p = l[i];
    else if (chiffres_(tel).length >= 8 && chiffres_(l[i].telephone).slice(-9) === chiffres_(tel).slice(-9)) p = l[i];
  }
  var infos = { nom: propre_(d.nom, 120), telephone: tel, email: email, budget: propre_(d.budget, 60),
    type_recherche: propre_(d.type_recherche, 60), ville_recherche: propre_(d.ville_recherche, 60) };
  if (p) {
    var maj = { date_maj: maintenant_() };
    Object.keys(infos).forEach(function (k) { if (infos[k] && (!p[k] || k === 'budget' || k === 'type_recherche' || k === 'ville_recherche')) maj[k] = infos[k]; });
    return modifier_('PROSPECTS', p.id, maj);
  }
  infos.id = identifiant_('P'); infos.date_creation = maintenant_(); infos.date_maj = infos.date_creation;
  infos.statut = 'Nouveau'; infos.notes = ''; infos.date_relance = ''; infos.source = source;
  return ajouter_('PROSPECTS', infos);
}

var LIBELLES = { contact: 'Demande de renseignements', visite: 'Demande de visite', confier: 'Proposition de bien' };

/* 1. enregistre la demande  2. crée ou actualise le prospect  3. alerte e-mail  4. visible au tableau de bord */
function demande_(type, d) {
  if (d.site) return {};                                   // champ piège rempli par les robots : on ignore
  limiter_();
  if (!propre_(d.nom)) throw erreur_('Indiquez votre nom.');
  if (!propre_(d.telephone) && !propre_(d.email)) throw erreur_('Indiquez un téléphone ou un e-mail.');
  if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw erreur_('Adresse e-mail invalide.');
  return verrou_(function () {
    var bien = d.bien_id ? trouver_('BIENS', d.bien_id) : null, bienId = bien ? bien.id : '';
    var p = trouverOuCreerProspect_(d, LIBELLES[type]);
    var message = propre_(d.message, 2000), resume = message;
    if (type === 'visite') {
      ajouter_('VISITES', { id: identifiant_('V'), date: maintenant_(), prospect_id: p.id, bien_id: bienId,
        date_souhaitee: propre_(d.date_souhaitee, 20), creneau: propre_(d.creneau, 40), message: message, statut: 'À confirmer' });
      resume = 'Visite souhaitée : ' + (propre_(d.date_souhaitee, 20) || 'date à convenir') + ' ' + propre_(d.creneau, 40) + (message ? ' — ' + message : '');
    }
    if (type === 'confier') {
      var urls = (d.photos || []).slice(0, MAX_PHOTOS_PROPOSITION).map(function (ph) { return stockerPhoto_(ph, 'proposition').url; });
      ajouter_('PROPOSITIONS', { id: identifiant_('M'), date: maintenant_(), prospect_id: p.id, ville: propre_(d.ville, 60),
        type: propre_(d.type, 40), prix_souhaite: nombre_(d.prix_souhaite), surface: nombre_(d.surface),
        description: propre_(d.description, 3000), commentaires: propre_(d.commentaires, 2000), photos: urls.join('|'), statut: 'Nouveau' });
      resume = [propre_(d.type, 40), propre_(d.ville, 60), nombre_(d.surface) ? nombre_(d.surface) + ' m²' : '', nombre_(d.prix_souhaite) ? nombre_(d.prix_souhaite) + ' DH' : ''].filter(String).join(' · ');
    }
    ajouter_('HISTORIQUE', { id: identifiant_('H'), prospect_id: p.id, date: maintenant_(), type: 'Demande',
      note: LIBELLES[type] + (bien ? ' — ' + bien.id + ' ' + bien.titre : '') + (resume ? ' : ' + resume : '') });
    var envoye = 'non', dest = parametre_('email_alertes');
    if (dest) {
      try {
        MailApp.sendEmail(dest, 'Nassiri Real Estate — ' + LIBELLES[type] + ' : ' + p.nom,
          LIBELLES[type] + '\n\nNom : ' + p.nom + '\nTéléphone : ' + p.telephone + '\nE-mail : ' + p.email +
          (bien ? '\nBien : ' + bien.id + ' — ' + bien.titre : '') + '\n\n' + resume + '\n\nRetrouvez cette demande dans l’Espace Pro.');
        envoye = 'oui';
      } catch (err) { envoye = 'non'; }
    }
    ajouter_('ALERTES', { id: identifiant_('A'), date: maintenant_(), type: type, prospect_id: p.id, bien_id: bienId,
      resume: resume, lu: 'non', email_envoye: envoye });
    return {};
  });
}

var PUBLIQUES = {
  catalogue: function () { return catalogue_(); },
  connexion: function (d) { return connexion_(d); },
  contact: function (d) { return demande_('contact', d); },
  visite: function (d) { return demande_('visite', d); },
  confier: function (d) { return demande_('confier', d); },
  /* Statistique anonyme : aucun identifiant de visiteur n'est enregistré */
  favori: function (d) {
    limiter_();
    if (trouver_('BIENS', d.bien_id)) ajouter_('FAVORIS', { date: maintenant_(), bien_id: d.bien_id, action: d.retire ? '-1' : '1' });
    return {};
  },
  vue: function (d) {
    limiter_();
    return verrou_(function () {
      var b = trouver_('BIENS', d.bien_id);
      if (b) modifier_('BIENS', b.id, { vues: String((parseInt(b.vues, 10) || 0) + 1) });
      return {};
    });
  }
};

/* ============================== PHOTOS (Google Drive) ============================== */

function dossierPhotos_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('DOSSIER_PHOTOS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* dossier supprimé : on en recrée un */ } }
  var d = DriveApp.createFolder('Nassiri Real Estate — Photos');
  p.setProperty('DOSSIER_PHOTOS', d.getId());
  return d;
}
/* photo = { nom, mime, donnees (base64) } — déjà redimensionnée par le navigateur avant l'envoi */
function stockerPhoto_(photo, prefixe) {
  if (!photo || !photo.donnees) throw erreur_('Photo vide.');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(photo.mime) === -1) throw erreur_('Format de photo non accepté (JPEG, PNG ou WebP).');
  if (photo.donnees.length > 6000000) throw erreur_('Photo trop lourde.');
  var blob = Utilities.newBlob(Utilities.base64Decode(photo.donnees), photo.mime, prefixe + '-' + propre_(photo.nom, 80).replace(/[^\w.\-]/g, '_'));
  var f = dossierPhotos_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = f.getId();
  return { drive_id: id, url: typeof URL_PHOTO_DEMO === 'function' ? URL_PHOTO_DEMO(id) : 'https://lh3.googleusercontent.com/d/' + id };
}
function jeterPhoto_(driveId) { if (driveId) { try { DriveApp.getFileById(driveId).setTrashed(true); } catch (e) { /* déjà supprimée */ } } }

/* ============================== ADMINISTRATION ============================== */

function bienDepuis_(d) {
  var b = {};
  ['titre', 'type', 'ville', 'quartier', 'description', 'juridique', 'adresse_privee', 'notes_privees'].forEach(function (k) { if (d[k] !== undefined) b[k] = propre_(d[k], 6000); });
  ['prix', 'surface', 'terrain', 'chambres', 'sdb'].forEach(function (k) { if (d[k] !== undefined) b[k] = nombre_(d[k]); });
  ['juridique_verifie', 'exclusivite', 'a_la_une'].forEach(function (k) { if (d[k] !== undefined) b[k] = oui_(d[k]); });
  if (d.equipements !== undefined) b.equipements = (d.equipements instanceof Array ? d.equipements : String(d.equipements).split('|')).map(function (x) { return propre_(x, 60); }).filter(String).join('|');
  if (d.statut !== undefined) { if (STATUTS_BIEN.indexOf(d.statut) === -1) throw erreur_('Statut inconnu.'); b.statut = d.statut; }
  return b;
}
function prochainIdBien_() {
  var max = 0; lire_('BIENS').forEach(function (b) { var n = parseInt(String(b.id).replace(/\D/g, ''), 10); if (n > max) max = n; });
  return 'NR-' + ('0000' + (max + 1)).slice(-4);
}

var ADMIN = {
  deconnexion: function (d) { CacheService.getScriptCache().remove('session_' + d.jeton); return {}; },

  /* Toutes les données de l'Espace Pro en un seul appel */
  donnees: function () {
    var favoris = {};
    lire_('FAVORIS').forEach(function (f) { favoris[f.bien_id] = (favoris[f.bien_id] || 0) + (parseInt(f.action, 10) || 0); });
    var param = {}; lire_('PARAMETRES').forEach(function (p) { param[p.cle] = p.valeur; });
    return { biens: tous_('BIENS'), photos: tous_('PHOTOS'), prospects: tous_('PROSPECTS'), historique: tous_('HISTORIQUE'),
      visites: tous_('VISITES'), propositions: tous_('PROPOSITIONS'), alertes: tous_('ALERTES'), favoris: favoris, parametres: param,
      listes: { statutsBien: STATUTS_BIEN, statutsProspect: STATUTS_PROSPECT, statutsVisite: STATUTS_VISITE, statutsProposition: STATUTS_PROPOSITION } };
  },

  bienEnregistrer: function (d) {
    var b = bienDepuis_(d.bien || {}), id = d.bien && d.bien.id, ancien = id ? trouver_('BIENS', id) : null;
    b.date_maj = maintenant_();
    if ((b.statut === 'publie') && !(ancien && ancien.date_publication)) b.date_publication = maintenant_();
    if (ancien) return { bien: sans_(modifier_('BIENS', id, b)) };
    b.id = prochainIdBien_(); b.statut = b.statut || 'brouillon'; b.date_creation = b.date_maj; b.vues = '0';
    if (!b.titre) b.titre = 'Nouveau bien';
    return { bien: sans_(ajouter_('BIENS', b)) };
  },
  bienSupprimer: function (d) {
    lire_('PHOTOS').filter(function (p) { return p.bien_id === d.id; }).sort(function (a, b) { return b._ligne - a._ligne; })
      .forEach(function (p) { jeterPhoto_(p.drive_id); feuille_('PHOTOS').deleteRow(p._ligne); });
    supprimer_('BIENS', d.id);
    return {};
  },
  photoAjouter: function (d) {
    if (!trouver_('BIENS', d.bien_id)) throw erreur_('Bien introuvable.', 'INTROUVABLE');
    var s = stockerPhoto_(d.photo, d.bien_id), n = lire_('PHOTOS').filter(function (p) { return p.bien_id === d.bien_id; }).length;
    return { photo: sans_(ajouter_('PHOTOS', { id: identifiant_('PH'), bien_id: d.bien_id, url: s.url, drive_id: s.drive_id, ordre: String(n + 1) })) };
  },
  photoSupprimer: function (d) {
    var p = trouver_('PHOTOS', d.id);
    if (p) { jeterPhoto_(p.drive_id); supprimer_('PHOTOS', d.id); }
    return {};
  },
  /* ids dans le nouvel ordre : la première photo est la photo principale */
  photosOrdonner: function (d) {
    (d.ids || []).forEach(function (id, i) { var p = trouver_('PHOTOS', id); if (p && p.bien_id === d.bien_id) modifier_('PHOTOS', id, { ordre: String(i + 1) }); });
    return {};
  },

  prospectEnregistrer: function (d) {
    var s = d.prospect || {}, p = {};
    ['nom', 'telephone', 'email', 'budget', 'type_recherche', 'ville_recherche', 'date_relance'].forEach(function (k) { if (s[k] !== undefined) p[k] = propre_(s[k], 200); });
    if (s.notes !== undefined) p.notes = propre_(s.notes, 6000);
    if (s.statut !== undefined) { if (STATUTS_PROSPECT.indexOf(s.statut) === -1) throw erreur_('Statut inconnu.'); p.statut = s.statut; }
    p.date_maj = maintenant_();
    if (s.id) {
      var avant = trouver_('PROSPECTS', s.id);
      if (avant && p.statut && avant.statut !== p.statut) ajouter_('HISTORIQUE', { id: identifiant_('H'), prospect_id: s.id, date: maintenant_(), type: 'Statut', note: avant.statut + ' → ' + p.statut });
      return { prospect: sans_(modifier_('PROSPECTS', s.id, p)) };
    }
    if (!p.nom) throw erreur_('Indiquez un nom.');
    p.id = identifiant_('P'); p.date_creation = p.date_maj; p.statut = p.statut || 'Nouveau'; p.source = 'Saisie manuelle';
    return { prospect: sans_(ajouter_('PROSPECTS', p)) };
  },
  prospectSupprimer: function (d) {
    ['HISTORIQUE', 'VISITES', 'PROPOSITIONS', 'ALERTES'].forEach(function (nom) {
      lire_(nom).filter(function (x) { return x.prospect_id === d.id; }).sort(function (a, b) { return b._ligne - a._ligne; })
        .forEach(function (x) { feuille_(nom).deleteRow(x._ligne); });
    });
    supprimer_('PROSPECTS', d.id);
    return {};
  },
  historiqueAjouter: function (d) {
    if (!trouver_('PROSPECTS', d.prospect_id)) throw erreur_('Prospect introuvable.', 'INTROUVABLE');
    return { entree: sans_(ajouter_('HISTORIQUE', { id: identifiant_('H'), prospect_id: d.prospect_id, date: maintenant_(), type: propre_(d.type, 40) || 'Note', note: propre_(d.note, 3000) })) };
  },
  visiteStatut: function (d) {
    if (STATUTS_VISITE.indexOf(d.statut) === -1) throw erreur_('Statut inconnu.');
    return { visite: sans_(modifier_('VISITES', d.id, { statut: d.statut })) };
  },
  propositionStatut: function (d) {
    if (STATUTS_PROPOSITION.indexOf(d.statut) === -1) throw erreur_('Statut inconnu.');
    return { proposition: sans_(modifier_('PROPOSITIONS', d.id, { statut: d.statut })) };
  },
  alerteLue: function (d) {
    lire_('ALERTES').forEach(function (a) { if ((d.tout || a.id === d.id) && a.lu !== 'oui') modifier_('ALERTES', a.id, { lu: 'oui' }); });
    return {};
  },
  parametresEnregistrer: function (d) {
    var l = lire_('PARAMETRES');
    PARAMETRES_MODIFIABLES.forEach(function (cle) {
      if (!d.parametres || d.parametres[cle] === undefined) return;
      var v = propre_(d.parametres[cle], 200), trouve = false;
      l.forEach(function (p) { if (p.cle === cle) { feuille_('PARAMETRES').getRange(p._ligne, 2).setValue(v); trouve = true; } });
      if (!trouve) feuille_('PARAMETRES').appendRow([cle, v]);
    });
    return {};
  },
  motDePasseChanger: function (d) {
    if (!verifierMotDePasse_(d.ancien)) throw erreur_('Mot de passe actuel incorrect.');
    definirMotDePasse_(d.nouveau);
    return {};
  }
};

return { doPost: doPost, doGet: doGet, installer: installer_, definirMotDePasse: definirMotDePasse_, ONGLETS: ONGLETS };
})(ATLAS_DEMO.google.SpreadsheetApp, ATLAS_DEMO.google.PropertiesService, ATLAS_DEMO.google.CacheService, ATLAS_DEMO.google.LockService, ATLAS_DEMO.google.ContentService, ATLAS_DEMO.google.MailApp, ATLAS_DEMO.google.DriveApp, ATLAS_DEMO.google.Utilities, ATLAS_DEMO.google.URL_PHOTO_DEMO);
