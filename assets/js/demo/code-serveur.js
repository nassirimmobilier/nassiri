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
var COLONNE_PIN_OK = false;          // vérification de la colonne pin_visible faite une seule fois par exécution
var BUILD = 'V11.2 - import annonce agents';   // visible en ouvrant l'adresse du script dans un navigateur
var DUREE_SESSION = 21600;          // 6 h (maximum du cache Apps Script)
var MAX_ECHECS = 5;                 // tentatives de connexion avant blocage
var BLOCAGE = 900;                  // 15 min
var MAX_DEMANDES_HEURE = 120;       // protège le quota d'e-mails et le classeur
var MAX_PHOTOS_PROPOSITION = 5;

var ONGLETS = {
  BIENS: ['id', 'statut', 'titre', 'type', 'ville', 'quartier', 'prix', 'surface', 'terrain', 'chambres', 'sdb',
    'description', 'equipements', 'juridique', 'juridique_verifie', 'exclusivite', 'a_la_une',
    'date_creation', 'date_publication', 'date_maj', 'vues', 'adresse_privee', 'notes_privees',
    'transaction', 'prix_sur_demande', 'coup_de_coeur',
    'agent_id', 'commission', 'commission_statut', 'motif_refus', 'commentaire_refus'],
  PHOTOS: ['id', 'bien_id', 'url', 'drive_id', 'ordre'],
  PROSPECTS: ['id', 'date_creation', 'nom', 'telephone', 'email', 'budget', 'type_recherche', 'ville_recherche',
    'statut', 'notes', 'date_relance', 'source', 'date_maj'],
  HISTORIQUE: ['id', 'prospect_id', 'date', 'type', 'note'],
  VISITES: ['id', 'date', 'prospect_id', 'bien_id', 'date_souhaitee', 'creneau', 'message', 'statut'],
  PROPOSITIONS: ['id', 'date', 'prospect_id', 'ville', 'type', 'prix_souhaite', 'surface', 'description',
    'commentaires', 'photos', 'statut'],
  FAVORIS: ['date', 'bien_id', 'action'],
  ALERTES: ['id', 'date', 'type', 'prospect_id', 'bien_id', 'resume', 'lu', 'email_envoye'],
  PARAMETRES: ['cle', 'valeur'],
  AGENTS: ['id', 'nom', 'email', 'telephone', 'whatsapp', 'sel', 'hachage', 'actif', 'date_creation', 'pin_visible', 'import_illimite'],
  SAMSAR: ['id', 'date_creation', 'nom', 'telephone', 'zone', 'specialite', 'source', 'statut', 'commission', 'notes', 'date_relance', 'dernier_contact', 'date_maj'],
  MOTIFS_REFUS: ['id', 'libelle', 'actif', 'ordre'],
  /* V11 : espace partenaires (notaires, avocats, promoteurs) */
  PARTENAIRES: ['id', 'nom', 'societe', 'type', 'email', 'telephone', 'whatsapp', 'sel', 'hachage', 'actif', 'date_creation', 'pin_visible'],
  DOSSIERS: ['id', 'reference', 'bien', 'etape', 'partenaire_id', 'agent_id', 'notes', 'date_creation', 'date_maj'],
  PROGRAMMES: ['id', 'nom', 'partenaire_id', 'agent_id', 'lien_brochure', 'date_creation'],
  LOTS: ['id', 'programme_id', 'nom', 'detail', 'statut', 'date_maj'],
  DEMANDES: ['id', 'programme_id', 'lot_nom', 'agent_nom', 'statut', 'date'],
  MESSAGES: ['id', 'partenaire_id', 'auteur', 'texte', 'date', 'lu']
};
/* Onglets ajoutés après l'installation initiale : créés automatiquement au premier usage (jamais de perte de données). */
var ONGLETS_AJOUTES = ['SAMSAR', 'PARTENAIRES', 'DOSSIERS', 'PROGRAMMES', 'LOTS', 'MESSAGES', 'DEMANDES'];
var TYPES_PARTENAIRE = ['notaire', 'avocat', 'promoteur'];
var ETAPES_DOSSIER = ['Promesse de vente', 'Compromis signé', 'Acte à signer', 'Titre foncier obtenu'];
var STATUTS_LOT = ['Disponible', 'Réservé', 'Vendu'];
var STATUTS_DEMANDE = ['À confirmer', 'Confirmée', 'Refusée'];
var MAX_IMPORTS_HEURE = 10;         // annonces importées par un agent et par heure (levable agent par agent par l'admin)
var MAX_MESSAGES_HEURE = 30;        // limite de messages par partenaire et par heure
/* en_attente : soumis par un agent, attend la validation du staff. refuse : renvoyé à l'agent avec motif. */
var STATUTS_BIEN = ['brouillon', 'en_attente', 'publie', 'sous-offre', 'vendu', 'archive', 'refuse'];
/* Statuts qu'un agent peut choisir lui-même : jamais publié directement sans validation du staff. */
var STATUTS_BIEN_AGENT = ['brouillon', 'en_attente'];
var TRANSACTIONS_BIEN = ['vente', 'location-longue', 'location-courte'];
var STATUTS_PROSPECT = ['Nouveau', 'Contacté', 'Qualifié', 'Visite', 'Offre', 'Vente'];
var STATUTS_SAMSAR = ['À contacter', 'Contacté', 'Actif', 'Partenaire', 'Inactif'];
var STATUTS_VISITE = ['À confirmer', 'Confirmée', 'Effectuée', 'Annulée'];
var STATUTS_PROPOSITION = ['Nouveau', 'À l’étude', 'Accepté', 'Refusé'];
var STATUTS_COMMISSION = ['à verser', 'versée'];
var PARAMETRES_PUBLICS = ['whatsapp', 'telephone', 'email_contact'];
var PARAMETRES_MODIFIABLES = ['email_alertes', 'whatsapp', 'telephone', 'email_contact'];
/* Champs d'un bien visibles du public (jamais adresse_privee ni notes_privees) */
var CHAMPS_PUBLICS = ['id', 'statut', 'titre', 'type', 'ville', 'quartier', 'prix', 'surface', 'terrain', 'chambres',
  'sdb', 'description', 'equipements', 'juridique', 'juridique_verifie', 'exclusivite', 'a_la_une', 'date_publication',
  'transaction', 'prix_sur_demande', 'coup_de_coeur'];

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
  if (!lire_('MOTIFS_REFUS').length) {
    ['Photos insuffisantes ou de mauvaise qualité', 'Informations incomplètes (prix, surface, description)', 'Situation juridique à clarifier']
      .forEach(function (libelle, i) { ajouter_('MOTIFS_REFUS', { id: identifiant_('MR'), libelle: libelle, actif: 'oui', ordre: String(i + 1) }); });
  }
}

/* ============================== ENTRÉES HTTP ============================== */

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'catalogue') return repondre_(proteger_(function () { return catalogue_(); }));
  return repondre_({ ok: true, service: 'Nassiri Real Estate', version: VERSION, build: BUILD, pin_auto: true });
}

function doPost(e) {
  return repondre_(proteger_(function () {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(d.action || '');
    if (PUBLIQUES[action]) return PUBLIQUES[action](d);
    if (ADMIN[action]) { exigerSession_(d.jeton); return verrou_(function () { return ADMIN[action](d); }); }
    if (AGENT[action]) { var agentId = exigerSessionAgent_(d.jeton); return verrou_(function () { return AGENT[action](d, agentId); }); }
    if (PARTENAIRE[action]) { var partenaireId = exigerSessionPartenaire_(d.jeton); return verrou_(function () { return PARTENAIRE[action](d, partenaireId); }); }
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
  var ss = SpreadsheetApp.getActiveSpreadsheet(), f = ss.getSheetByName(nom);
  if (!f && ONGLETS[nom] && ONGLETS_AJOUTES.indexOf(nom) !== -1) {      // onglet ajouté après l'installation initiale : création automatique
    var cols = ONGLETS[nom];
    f = ss.insertSheet(nom);
    f.getRange(1, 1, f.getMaxRows(), cols.length).setNumberFormat('@');
    f.getRange(1, 1, 1, cols.length).setValues([cols]);
    f.setFrozenRows(1);
  }
  if (f && nom === 'AGENTS' && !COLONNE_PIN_OK) {          // colonne « pin_visible » ajoutée après l'installation : création automatique
    var colPin = ONGLETS.AGENTS.indexOf('pin_visible') + 1;
    if (String(f.getRange(1, colPin).getValue()) !== 'pin_visible') {
      f.getRange(1, colPin, f.getMaxRows(), 1).setNumberFormat('@');
      f.getRange(1, colPin).setValue('pin_visible');
    }
    var colImp = ONGLETS.AGENTS.indexOf('import_illimite') + 1;       // V11.2 : réglage « import sans limite » par agent
    if (String(f.getRange(1, colImp).getValue()) !== 'import_illimite') {
      f.getRange(1, colImp, f.getMaxRows(), 1).setNumberFormat('@');
      f.getRange(1, colImp).setValue('import_illimite');
    }
    COLONNE_PIN_OK = true;
  }
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
/* Les codes PIN restent visibles pour l'administrateur jusqu'à l'action « Sécuriser les codes » (propriété CODES_VISIBLES = non). */
function codesVisibles_() { return PropertiesService.getScriptProperties().getProperty('CODES_VISIBLES') !== 'non'; }
/* Code PIN à 6 chiffres tiré au hasard (aléa sécurisé des identifiants Google, sans biais : on ne garde que les chiffres 0 à 9). */
function genererPin_() {
  var pin = '';
  while (pin.length < 6) {
    var u = Utilities.getUuid().replace(/-/g, '');
    for (var i = 0; i < u.length && pin.length < 6; i++) { var v = parseInt(u.charAt(i), 16); if (v < 10) pin += String(v); }
  }
  return pin;
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

/* ============================== AUTHENTIFICATION DES AGENTS ============================== */

function trouverAgentParEmail_(email) {
  email = String(email || '').toLowerCase();
  var l = lire_('AGENTS');
  for (var i = 0; i < l.length; i++) if (l[i].email.toLowerCase() === email) return l[i];
  return null;
}
function connexionAgent_(d) {
  var cache = CacheService.getScriptCache(), cleEchecs = 'echecs_agent_' + String(d.email || '').toLowerCase().slice(0, 120);
  var echecs = parseInt(cache.get(cleEchecs) || '0', 10);
  if (echecs >= MAX_ECHECS) throw erreur_('Trop de tentatives. Réessayez dans 15 minutes.', 'BLOQUE');
  var a = trouverAgentParEmail_(d.email);
  if (!a || a.actif !== 'oui' || !a.sel || !a.hachage || hacher_(String(d.motDePasse || ''), a.sel) !== a.hachage) {
    cache.put(cleEchecs, String(echecs + 1), BLOCAGE);
    throw erreur_('E-mail ou mot de passe incorrect.', 'AUTH');
  }
  cache.remove(cleEchecs);
  var jeton = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('session_agent_' + jeton, a.id, DUREE_SESSION);
  return { jeton: jeton, duree: DUREE_SESSION, agent: { id: a.id, nom: a.nom, email: a.email } };
}
function exigerSessionAgent_(jeton) {
  var cache = CacheService.getScriptCache(), cle = 'session_agent_' + String(jeton || '');
  var agentId = jeton && String(jeton).length >= 40 ? cache.get(cle) : null;
  if (!agentId) throw erreur_('Session expirée. Reconnectez-vous.', 'AUTH');
  cache.put(cle, agentId, DUREE_SESSION);
  var a = trouver_('AGENTS', agentId);
  if (!a || a.actif !== 'oui') throw erreur_('Accès désactivé. Contactez l’agence.', 'AUTH');
  return agentId;
}

/* ============================== AUTHENTIFICATION DES PARTENAIRES ============================== */

function trouverPartenaireParEmail_(email) {
  email = String(email || '').toLowerCase();
  var l = lire_('PARTENAIRES');
  for (var i = 0; i < l.length; i++) if (l[i].email.toLowerCase() === email) return l[i];
  return null;
}
function connexionPartenaire_(d) {
  var cache = CacheService.getScriptCache(), cleEchecs = 'echecs_partenaire_' + String(d.email || '').toLowerCase().slice(0, 120);
  var echecs = parseInt(cache.get(cleEchecs) || '0', 10);
  if (echecs >= MAX_ECHECS) throw erreur_('Trop de tentatives. Réessayez dans 15 minutes.', 'BLOQUE');
  var p = trouverPartenaireParEmail_(d.email);
  if (!p || p.actif !== 'oui' || !p.sel || !p.hachage || hacher_(String(d.motDePasse || ''), p.sel) !== p.hachage) {
    cache.put(cleEchecs, String(echecs + 1), BLOCAGE);
    throw erreur_('E-mail ou code PIN incorrect.', 'AUTH');
  }
  cache.remove(cleEchecs);
  var jeton = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('session_partenaire_' + jeton, p.id, DUREE_SESSION);
  return { jeton: jeton, duree: DUREE_SESSION, partenaire: { id: p.id, nom: p.nom, type: p.type } };
}
function exigerSessionPartenaire_(jeton) {
  var cache = CacheService.getScriptCache(), cle = 'session_partenaire_' + String(jeton || '');
  var id = jeton && String(jeton).length >= 40 ? cache.get(cle) : null;
  if (!id) throw erreur_('Session expirée. Reconnectez-vous.', 'AUTH');
  cache.put(cle, id, DUREE_SESSION);
  var p = trouver_('PARTENAIRES', id);
  if (!p || p.actif !== 'oui') throw erreur_('Accès désactivé. Contactez l’agence.', 'AUTH');
  return id;
}
/* Fiche partenaire sans sel ni empreinte du code ; le code visible n'est renvoyé que si l'administrateur ne l'a pas « sécurisé ». */
function partenairePublic_(p) {
  var c = sansClefs_(p, ['sel', 'hachage']);
  c.pin_visible = codesVisibles_() ? (p.pin_visible || '') : '';
  return c;
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
    /* L'agent qui a apporté ce bien est notifié en plus de l'administrateur (jamais à sa place). */
    notifierAgentDeBien_(bien, LIBELLES[type] + ' sur votre bien', LIBELLES[type] + ' pour votre bien « ' + (bien ? bien.titre : '') + ' » (Réf. ' + bienId + ').\n\n' +
      'Nom : ' + p.nom + '\nTéléphone : ' + p.telephone + '\nE-mail : ' + p.email + '\n\n' + resume);
    ajouter_('ALERTES', { id: identifiant_('A'), date: maintenant_(), type: type, prospect_id: p.id, bien_id: bienId,
      resume: resume, lu: 'non', email_envoye: envoye });
    return {};
  });
}

var PUBLIQUES = {
  catalogue: function () { return catalogue_(); },
  connexion: function (d) { return connexion_(d); },
  connexionAgent: function (d) { return connexionAgent_(d); },
  connexionPartenaire: function (d) { return connexionPartenaire_(d); },
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

/* estAgent : restreint les champs qu'un agent peut renseigner lui-même (jamais la commission, jamais publié directement). */
function bienDepuis_(d, estAgent) {
  var b = {};
  ['titre', 'type', 'ville', 'quartier', 'description', 'juridique', 'adresse_privee', 'notes_privees'].forEach(function (k) { if (d[k] !== undefined) b[k] = propre_(d[k], 6000); });
  ['prix', 'surface', 'terrain', 'chambres', 'sdb'].forEach(function (k) { if (d[k] !== undefined) b[k] = nombre_(d[k]); });
  var bascules = estAgent ? ['prix_sur_demande'] : ['juridique_verifie', 'exclusivite', 'a_la_une', 'prix_sur_demande', 'coup_de_coeur'];
  bascules.forEach(function (k) { if (d[k] !== undefined) b[k] = oui_(d[k]); });
  if (d.equipements !== undefined) b.equipements = (d.equipements instanceof Array ? d.equipements : String(d.equipements).split('|')).map(function (x) { return propre_(x, 60); }).filter(String).join('|');
  if (d.statut !== undefined) {
    var statutsAutorises = estAgent ? STATUTS_BIEN_AGENT : STATUTS_BIEN;
    if (statutsAutorises.indexOf(d.statut) === -1) throw erreur_(estAgent ? 'Ce statut n’est pas autorisé. Enregistrez en brouillon ou soumettez pour validation.' : 'Statut inconnu.');
    b.statut = d.statut;
  }
  if (d.transaction !== undefined) { if (TRANSACTIONS_BIEN.indexOf(d.transaction) === -1) throw erreur_('Type de transaction inconnu.'); b.transaction = d.transaction; }
  if (!estAgent) {
    if (d.agent_id !== undefined) b.agent_id = propre_(d.agent_id, 60);
    if (d.commission !== undefined) b.commission = propre_(d.commission, 60);
    if (d.commission_statut !== undefined) { if (d.commission_statut && STATUTS_COMMISSION.indexOf(d.commission_statut) === -1) throw erreur_('Statut de commission inconnu.'); b.commission_statut = d.commission_statut; }
  }
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
    var agents = tous_('AGENTS').map(function (a) { return { id: a.id, nom: a.nom, email: a.email, telephone: a.telephone, whatsapp: a.whatsapp, actif: a.actif, date_creation: a.date_creation, pin_visible: codesVisibles_() ? a.pin_visible : '', import_illimite: a.import_illimite || '' }; });
    return { biens: tous_('BIENS'), photos: tous_('PHOTOS'), prospects: tous_('PROSPECTS'), historique: tous_('HISTORIQUE'),
      visites: tous_('VISITES'), propositions: tous_('PROPOSITIONS'), alertes: tous_('ALERTES'), favoris: favoris, parametres: param,
      agents: agents, codes_visibles: codesVisibles_(), samsar: tous_('SAMSAR'), motifsRefus: tous_('MOTIFS_REFUS'),
      partenaires: lire_('PARTENAIRES').map(partenairePublic_).map(sans_), dossiers: tous_('DOSSIERS'), programmes: tous_('PROGRAMMES'),
      lots: tous_('LOTS'), demandes: tous_('DEMANDES'), messages: tous_('MESSAGES'),
      listes: { typesPartenaire: TYPES_PARTENAIRE, etapesDossier: ETAPES_DOSSIER, statutsLot: STATUTS_LOT, statutsDemande: STATUTS_DEMANDE,
        statutsBien: STATUTS_BIEN, transactionsBien: TRANSACTIONS_BIEN, statutsProspect: STATUTS_PROSPECT, statutsSamsar: STATUTS_SAMSAR, statutsVisite: STATUTS_VISITE, statutsProposition: STATUTS_PROPOSITION, statutsCommission: STATUTS_COMMISSION } };
  },

  bienEnregistrer: function (d) {
    var b = bienDepuis_(d.bien || {}), id = d.bien && d.bien.id, ancien = id ? trouver_('BIENS', id) : null;
    b.date_maj = maintenant_();
    if ((b.statut === 'publie') && !(ancien && ancien.date_publication)) b.date_publication = maintenant_();
    if (ancien) return { bien: sans_(modifier_('BIENS', id, b)) };
    b.id = prochainIdBien_(); b.statut = b.statut || 'brouillon'; b.transaction = b.transaction || 'vente'; b.date_creation = b.date_maj; b.vues = '0';
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
  },

  /* ---- Validation des biens soumis par les agents ---- */
  bienValider: function (d) {
    var b = trouver_('BIENS', d.id);
    if (!b) throw erreur_('Bien introuvable.', 'INTROUVABLE');
    var maj = { statut: 'publie', motif_refus: '', commentaire_refus: '', date_maj: maintenant_() };
    if (!b.date_publication) maj.date_publication = maintenant_();
    var r = modifier_('BIENS', d.id, maj);
    notifierAgentDeBien_(b, 'Votre bien a été publié', 'Bonne nouvelle : votre bien « ' + b.titre + ' » (Réf. ' + b.id + ') a été validé et est maintenant visible sur le site.');
    return { bien: sans_(r) };
  },
  bienRefuser: function (d) {
    var b = trouver_('BIENS', d.id);
    if (!b) throw erreur_('Bien introuvable.', 'INTROUVABLE');
    var motif = propre_(d.motif, 300), commentaire = propre_(d.commentaire, 3000);
    var r = modifier_('BIENS', d.id, { statut: 'refuse', motif_refus: motif, commentaire_refus: commentaire, date_maj: maintenant_() });
    notifierAgentDeBien_(b, 'Votre bien nécessite une correction', 'Votre bien « ' + b.titre + ' » (Réf. ' + b.id + ') n’a pas pu être publié en l’état.' +
      (motif ? '\nMotif : ' + motif : '') + (commentaire ? '\n\n' + commentaire : '') + '\n\nVous pouvez le corriger puis le soumettre à nouveau depuis votre espace.');
    return { bien: sans_(r) };
  },

  /* ---- Gestion des agents / apporteurs d'affaires ---- */
  agentEnregistrer: function (d) {
    var s = d.agent || {}, a = {};
    ['nom', 'email', 'telephone', 'whatsapp'].forEach(function (k) { if (s[k] !== undefined) a[k] = propre_(s[k], 200); });
    if (s.actif !== undefined) a.actif = oui_(s.actif);
    if (s.import_illimite !== undefined) a.import_illimite = oui_(s.import_illimite) === 'oui' ? 'oui' : '';
    if (s.id) {
      var avant = trouver_('AGENTS', s.id);
      if (!avant) throw erreur_('Agent introuvable.', 'INTROUVABLE');
      if (a.email && a.email.toLowerCase() !== avant.email.toLowerCase() && trouverAgentParEmail_(a.email)) throw erreur_('Un agent utilise déjà cet e-mail.');
      if (s.motDePasse) { if (String(s.motDePasse).length < 8) throw erreur_('Le mot de passe doit contenir au moins 8 caractères.'); a.sel = Utilities.getUuid(); a.hachage = hacher_(s.motDePasse, a.sel); a.pin_visible = ''; }
      return { agent: sansClefs_(modifier_('AGENTS', s.id, a), ['sel', 'hachage']) };
    }
    if (!a.nom) throw erreur_('Indiquez un nom.');
    if (!a.email) throw erreur_('Indiquez un e-mail.');
    if (trouverAgentParEmail_(a.email)) throw erreur_('Un agent utilise déjà cet e-mail.');
    /* Nouvel agent : un code PIN est généré automatiquement. Il n'est renvoyé qu'une seule fois (jamais stocké en clair). */
    var pin = s.motDePasse ? '' : genererPin_(), secret = s.motDePasse ? String(s.motDePasse) : pin;
    if (secret.length < 6) throw erreur_('Le code doit contenir au moins 6 caractères.');
    a.id = identifiant_('AG'); a.actif = a.actif || 'oui'; a.date_creation = maintenant_();
    a.sel = Utilities.getUuid(); a.hachage = hacher_(secret, a.sel); a.pin_visible = (pin && codesVisibles_()) ? pin : '';
    return { agent: sansClefs_(ajouter_('AGENTS', a), ['sel', 'hachage']), pin: pin };
  },
  /* Sécuriser : efface tous les codes visibles et ne les conserve plus. Les codes déjà donnés aux agents continuent de fonctionner. */
  codesSecuriser: function () {
    var f = feuille_('AGENTS'), col = ONGLETS.AGENTS.indexOf('pin_visible') + 1, n = f.getLastRow() - 1;
    if (n > 0) f.getRange(2, col, n, 1).clearContent();
    var fp = feuille_('PARTENAIRES'), colP = ONGLETS.PARTENAIRES.indexOf('pin_visible') + 1, np = fp.getLastRow() - 1;
    if (np > 0) fp.getRange(2, colP, np, 1).clearContent();
    PropertiesService.getScriptProperties().setProperty('CODES_VISIBLES', 'non');
    return { codes_visibles: false };
  },
  /* Nouveau code PIN (code perdu) : l'ancien cesse de fonctionner. Le nouveau n'est renvoyé qu'une fois. */
  agentNouveauCode: function (d) {
    var a = trouver_('AGENTS', d.id);
    if (!a) throw erreur_('Agent introuvable.', 'INTROUVABLE');
    var pin = genererPin_(), sel = Utilities.getUuid();
    modifier_('AGENTS', a.id, { sel: sel, hachage: hacher_(pin, sel), pin_visible: codesVisibles_() ? pin : '' });
    CacheService.getScriptCache().remove('echecs_agent_' + String(a.email || '').toLowerCase().slice(0, 120));
    return { agent: sansClefs_(trouver_('AGENTS', a.id), ['sel', 'hachage']), pin: pin };
  },
  /* ---- Carnet de samsar (réseau d'intermédiaires) ---- */
  samsarEnregistrer: function (d) {
    var s = d.samsar || {}, x = {};
    ['nom', 'telephone', 'zone', 'specialite', 'source', 'commission', 'date_relance', 'dernier_contact'].forEach(function (k) { if (s[k] !== undefined) x[k] = propre_(s[k], 200); });
    if (s.notes !== undefined) x.notes = propre_(s.notes, 6000);
    if (s.statut !== undefined) { if (STATUTS_SAMSAR.indexOf(s.statut) === -1) throw erreur_('Statut inconnu.'); x.statut = s.statut; }
    x.date_maj = maintenant_();
    var chiffres = chiffres_(x.telephone || '');
    var doublon = function (ignorerId) {
      if (chiffres.length < 8) return null;
      var l = lire_('SAMSAR');
      for (var i = 0; i < l.length; i++) if (l[i].id !== ignorerId && chiffres_(l[i].telephone).slice(-9) === chiffres.slice(-9)) return l[i];
      return null;
    };
    if (s.id) {
      if (!trouver_('SAMSAR', s.id)) throw erreur_('Samsar introuvable.', 'INTROUVABLE');
      var autre = x.telephone !== undefined ? doublon(s.id) : null;
      if (autre) throw erreur_('Ce numéro est déjà enregistré pour « ' + autre.nom + ' ».');
      return { samsar: sans_(modifier_('SAMSAR', s.id, x)) };
    }
    if (!x.nom) throw erreur_('Indiquez un nom.');
    var deja = doublon('');
    if (deja) throw erreur_('Ce numéro est déjà enregistré pour « ' + deja.nom + ' ».');
    x.id = identifiant_('S'); x.date_creation = x.date_maj; x.statut = x.statut || 'À contacter';
    return { samsar: sans_(ajouter_('SAMSAR', x)) };
  },
  samsarSupprimer: function (d) { supprimer_('SAMSAR', d.id); return {}; },
  agentSupprimer: function (d) {
    if (lire_('BIENS').some(function (b) { return b.agent_id === d.id; })) throw erreur_('Cet agent a des biens rattachés : réattribuez-les avant de le supprimer.');
    supprimer_('AGENTS', d.id);
    return {};
  },

  /* ---- V11 : partenaires (notaires, avocats, promoteurs) ---- */
  partenaireEnregistrer: function (d) {
    var s = d.partenaire || {}, p = {};
    ['nom', 'societe', 'email', 'telephone', 'whatsapp'].forEach(function (k) { if (s[k] !== undefined) p[k] = propre_(s[k], 200); });
    if (s.actif !== undefined) p.actif = oui_(s.actif);
    if (p.email !== undefined && p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) throw erreur_('Adresse e-mail invalide.');
    if (s.id) {
      var avant = trouver_('PARTENAIRES', s.id);
      if (!avant) throw erreur_('Partenaire introuvable.', 'INTROUVABLE');
      if (p.email && p.email.toLowerCase() !== avant.email.toLowerCase() && trouverPartenaireParEmail_(p.email)) throw erreur_('Un partenaire utilise déjà cet e-mail.');
      return { partenaire: sans_(partenairePublic_(modifier_('PARTENAIRES', s.id, p))) };
    }
    if (!p.nom) throw erreur_('Indiquez un nom.');
    if (!p.email) throw erreur_('Indiquez un e-mail.');
    if (TYPES_PARTENAIRE.indexOf(s.type) === -1) throw erreur_('Choisissez le type de partenaire.');
    if (trouverPartenaireParEmail_(p.email)) throw erreur_('Un partenaire utilise déjà cet e-mail.');
    /* Nouveau partenaire : code PIN à 6 chiffres généré automatiquement (comme pour les agents). */
    var pin = genererPin_();
    p.id = identifiant_('PT'); p.type = s.type; p.actif = p.actif || 'oui'; p.date_creation = maintenant_();
    p.sel = Utilities.getUuid(); p.hachage = hacher_(pin, p.sel); p.pin_visible = codesVisibles_() ? pin : '';
    return { partenaire: sans_(partenairePublic_(ajouter_('PARTENAIRES', p))), pin: pin };
  },
  partenaireNouveauCode: function (d) {
    var p = trouver_('PARTENAIRES', d.id);
    if (!p) throw erreur_('Partenaire introuvable.', 'INTROUVABLE');
    var pin = genererPin_(), sel = Utilities.getUuid();
    modifier_('PARTENAIRES', p.id, { sel: sel, hachage: hacher_(pin, sel), pin_visible: codesVisibles_() ? pin : '' });
    CacheService.getScriptCache().remove('echecs_partenaire_' + String(p.email || '').toLowerCase().slice(0, 120));
    return { partenaire: sans_(partenairePublic_(trouver_('PARTENAIRES', p.id))), pin: pin };
  },
  partenaireSupprimer: function (d) {
    if (lire_('DOSSIERS').some(function (x) { return x.partenaire_id === d.id; }) || lire_('PROGRAMMES').some(function (x) { return x.partenaire_id === d.id; }))
      throw erreur_('Ce partenaire a des dossiers ou des programmes : supprimez-les ou réattribuez-les avant de le supprimer.');
    lire_('MESSAGES').filter(function (m) { return m.partenaire_id === d.id; }).sort(function (a, b) { return b._ligne - a._ligne; })
      .forEach(function (m) { feuille_('MESSAGES').deleteRow(m._ligne); });
    supprimer_('PARTENAIRES', d.id);
    return {};
  },
  dossierEnregistrer: function (d) {
    var s = d.dossier || {}, x = {};
    ['reference', 'bien'].forEach(function (k) { if (s[k] !== undefined) x[k] = propre_(s[k], 200); });
    if (s.notes !== undefined) x.notes = propre_(s.notes, 6000);
    if (s.etape !== undefined) { if (ETAPES_DOSSIER.indexOf(s.etape) === -1) throw erreur_('Étape inconnue.'); x.etape = s.etape; }
    if (s.agent_id !== undefined) { if (s.agent_id && !trouver_('AGENTS', s.agent_id)) throw erreur_('Agent introuvable.'); x.agent_id = propre_(s.agent_id, 60); }
    if (s.partenaire_id !== undefined) {
      var pt = trouver_('PARTENAIRES', s.partenaire_id);
      if (!pt || (pt.type !== 'notaire' && pt.type !== 'avocat')) throw erreur_('Un dossier se confie à un notaire ou à un avocat.');
      x.partenaire_id = pt.id;
    }
    x.date_maj = maintenant_();
    if (s.id) return { dossier: sans_(modifier_('DOSSIERS', s.id, x)) };
    if (!x.partenaire_id) throw erreur_('Choisissez le partenaire.');
    if (!x.bien) throw erreur_('Indiquez le bien concerné.');
    var max = 0; lire_('DOSSIERS').forEach(function (r) { var m = String(r.reference).match(/(\d+)$/); if (m && parseInt(m[1], 10) > max) max = parseInt(m[1], 10); });
    x.id = identifiant_('DO'); x.reference = x.reference || ('D-' + new Date().getFullYear() + '-' + ('000' + (max + 1)).slice(-3));
    x.etape = x.etape || ETAPES_DOSSIER[0]; x.date_creation = x.date_maj;
    return { dossier: sans_(ajouter_('DOSSIERS', x)) };
  },
  dossierSupprimer: function (d) { supprimer_('DOSSIERS', d.id); return {}; },
  programmeEnregistrer: function (d) {
    var s = d.programme || {}, x = {};
    ['nom'].forEach(function (k) { if (s[k] !== undefined) x[k] = propre_(s[k], 200); });
    if (s.lien_brochure !== undefined) {
      var lien = propre_(s.lien_brochure, 500);
      if (lien && !/^https?:\/\//i.test(lien)) throw erreur_('Le lien de la brochure doit commencer par http:// ou https://.');
      x.lien_brochure = lien;
    }
    if (s.agent_id !== undefined) { if (s.agent_id && !trouver_('AGENTS', s.agent_id)) throw erreur_('Agent introuvable.'); x.agent_id = propre_(s.agent_id, 60); }
    if (s.partenaire_id !== undefined) {
      var pt = trouver_('PARTENAIRES', s.partenaire_id);
      if (!pt || pt.type !== 'promoteur') throw erreur_('Un programme se confie à un promoteur.');
      x.partenaire_id = pt.id;
    }
    if (s.id) return { programme: sans_(modifier_('PROGRAMMES', s.id, x)) };
    if (!x.partenaire_id) throw erreur_('Choisissez le promoteur.');
    if (!x.nom) throw erreur_('Indiquez le nom du programme.');
    x.id = identifiant_('PR'); x.date_creation = maintenant_();
    return { programme: sans_(ajouter_('PROGRAMMES', x)) };
  },
  programmeSupprimer: function (d) {
    ['LOTS', 'DEMANDES'].forEach(function (nom) {
      lire_(nom).filter(function (x) { return x.programme_id === d.id; }).sort(function (a, b) { return b._ligne - a._ligne; })
        .forEach(function (x) { feuille_(nom).deleteRow(x._ligne); });
    });
    supprimer_('PROGRAMMES', d.id);
    return {};
  },
  lotEnregistrer: function (d) {
    var s = d.lot || {}, x = {};
    ['nom', 'detail'].forEach(function (k) { if (s[k] !== undefined) x[k] = propre_(s[k], 300); });
    if (s.statut !== undefined) { if (STATUTS_LOT.indexOf(s.statut) === -1) throw erreur_('Statut inconnu.'); x.statut = s.statut; }
    x.date_maj = maintenant_();
    if (s.id) return { lot: sans_(modifier_('LOTS', s.id, x)) };
    if (!trouver_('PROGRAMMES', s.programme_id)) throw erreur_('Programme introuvable.', 'INTROUVABLE');
    if (!x.nom) throw erreur_('Indiquez le nom du lot.');
    x.id = identifiant_('LO'); x.programme_id = s.programme_id; x.statut = x.statut || 'Disponible';
    return { lot: sans_(ajouter_('LOTS', x)) };
  },
  lotSupprimer: function (d) { supprimer_('LOTS', d.id); return {}; },
  demandeEnregistrer: function (d) {
    var s = d.demande || {}, x = {};
    ['lot_nom', 'agent_nom'].forEach(function (k) { if (s[k] !== undefined) x[k] = propre_(s[k], 200); });
    if (s.statut !== undefined) { if (STATUTS_DEMANDE.indexOf(s.statut) === -1) throw erreur_('Statut inconnu.'); x.statut = s.statut; }
    if (s.id) return { demande: sans_(modifier_('DEMANDES', s.id, x)) };
    if (!trouver_('PROGRAMMES', s.programme_id)) throw erreur_('Programme introuvable.', 'INTROUVABLE');
    if (!x.lot_nom) throw erreur_('Indiquez le lot concerné.');
    x.id = identifiant_('DE'); x.programme_id = s.programme_id; x.statut = x.statut || 'À confirmer'; x.date = maintenant_();
    return { demande: sans_(ajouter_('DEMANDES', x)) };
  },
  demandeSupprimer: function (d) { supprimer_('DEMANDES', d.id); return {}; },
  /* Messagerie : un fil de discussion par partenaire */
  messageEnvoyerAdmin: function (d) {
    var p = trouver_('PARTENAIRES', d.partenaire_id), texte = propre_(d.texte, 2000).trim();
    if (!p) throw erreur_('Partenaire introuvable.', 'INTROUVABLE');
    if (!texte) throw erreur_('Écrivez votre message.');
    var m = ajouter_('MESSAGES', { id: identifiant_('MS'), partenaire_id: p.id, auteur: 'agence', texte: texte, date: maintenant_(), lu: 'non' });
    if (p.email) { try { MailApp.sendEmail(p.email, 'Nassiri Real Estate — nouveau message', 'Vous avez un nouveau message de l’agence Nassiri Real Estate.\n\nConnectez-vous à votre Espace Pro pour le lire.'); } catch (e) { /* un échec d'e-mail ne bloque jamais l'action */ } }
    return { message: sans_(m) };
  },
  messagesLusAdmin: function (d) {
    lire_('MESSAGES').forEach(function (m) { if (m.partenaire_id === d.partenaire_id && m.auteur === 'partenaire' && m.lu !== 'oui') modifier_('MESSAGES', m.id, { lu: 'oui' }); });
    return {};
  },

  /* ---- Motifs de refus préenregistrés (modifiables sans toucher au code) ---- */
  motifEnregistrer: function (d) {
    var s = d.motif || {}, m = {};
    if (s.libelle !== undefined) m.libelle = propre_(s.libelle, 300);
    if (s.actif !== undefined) m.actif = oui_(s.actif);
    if (s.id) return { motif: sans_(modifier_('MOTIFS_REFUS', s.id, m)) };
    if (!m.libelle) throw erreur_('Indiquez un libellé.');
    m.id = identifiant_('MR'); m.actif = m.actif || 'oui'; m.ordre = String(lire_('MOTIFS_REFUS').length + 1);
    return { motif: sans_(ajouter_('MOTIFS_REFUS', m)) };
  },
  motifSupprimer: function (d) { supprimer_('MOTIFS_REFUS', d.id); return {}; }
};

/* Variante de sans_ qui masque en plus certaines clés sensibles (ex. sel/hachage d'un agent). */
function sansClefs_(o, clefs) { var c = sans_(o); clefs.forEach(function (k) { delete c[k]; }); return c; }
function notifierAgentDeBien_(bien, sujet, corps) {
  if (!bien || !bien.agent_id) return;
  var a = trouver_('AGENTS', bien.agent_id);
  if (!a || !a.email) return;
  try { MailApp.sendEmail(a.email, 'Nassiri Real Estate — ' + sujet, corps); } catch (e) { /* un échec d'e-mail ne doit jamais bloquer l'action */ }
}
function notifierAdminNouvelleSoumission_(bien, agent) {
  var dest = parametre_('email_alertes');
  if (!dest) return;
  try {
    MailApp.sendEmail(dest, 'Nassiri Real Estate — Bien à valider : ' + bien.titre,
      (agent ? agent.nom : 'Un agent') + ' a soumis un bien pour validation.\n\nBien : ' + bien.id + ' — ' + bien.titre +
      '\nVille : ' + bien.ville + (bien.quartier ? ', ' + bien.quartier : '') +
      '\n\nRetrouvez-le dans l’Espace Pro, section « À valider ».');
  } catch (e) { /* un échec d'e-mail ne doit jamais bloquer l'action */ }
}

/* ============================== ESPACE AGENT ============================== */
/* Toute action ici est déjà scopée par exigerSessionAgent_ : agentId est l'identifiant vérifié côté serveur,
   jamais une valeur envoyée par le client. Un agent ne peut jamais lire ni modifier le bien d'un autre agent. */

function cleImport_(agentId) { return 'imports_' + agentId + '_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH'); }
function etatImport_(agentId, a) {
  var illimite = !!(a && a.import_illimite === 'oui'), n = parseInt(CacheService.getScriptCache().get(cleImport_(agentId)) || '0', 10);
  return { illimite: illimite, limite: MAX_IMPORTS_HEURE, restant: illimite ? null : Math.max(0, MAX_IMPORTS_HEURE - n) };
}

var AGENT = {
  deconnexionAgent: function (d) { CacheService.getScriptCache().remove('session_agent_' + d.jeton); return {}; },

  donneesAgent: function (d, agentId) {
    var a = trouver_('AGENTS', agentId);
    var mesBiens = lire_('BIENS').filter(function (b) { return b.agent_id === agentId; }).map(function (b) { return sansClefs_(b, ['commission', 'commission_statut']); });
    var mesIds = {}; mesBiens.forEach(function (b) { mesIds[b.id] = true; });
    var mesPhotos = tous_('PHOTOS').filter(function (p) { return mesIds[p.bien_id]; });
    return { agent: { id: a.id, nom: a.nom, email: a.email, telephone: a.telephone, whatsapp: a.whatsapp }, import_annonce: etatImport_(agentId, a),
      biens: mesBiens, photos: mesPhotos, motifsRefus: tous_('MOTIFS_REFUS').filter(function (m) { return m.actif === 'oui'; }),
      listes: { statutsBienAgent: STATUTS_BIEN_AGENT, transactionsBien: TRANSACTIONS_BIEN } };
  },

  bienEnregistrerAgent: function (d, agentId) {
    var id = d.bien && d.bien.id, ancien = id ? trouver_('BIENS', id) : null;
    if (ancien && ancien.agent_id !== agentId) throw erreur_('Ce bien ne vous appartient pas.', 'INTERDIT');
    var b = bienDepuis_(d.bien || {}, true);
    b.date_maj = maintenant_();
    var futurStatut = b.statut || (ancien ? ancien.statut : 'brouillon');
    var soumission = futurStatut === 'en_attente' && (!ancien || ancien.statut !== 'en_attente');
    if (soumission) { b.motif_refus = ''; b.commentaire_refus = ''; }
    var r;
    if (ancien) { r = modifier_('BIENS', id, b); }
    else {
      b.id = prochainIdBien_(); b.agent_id = agentId; b.statut = b.statut || 'brouillon'; b.transaction = b.transaction || 'vente';
      b.date_creation = b.date_maj; b.vues = '0';
      if (!b.titre) b.titre = 'Nouveau bien';
      r = ajouter_('BIENS', b);
    }
    if (soumission) notifierAdminNouvelleSoumission_(r, trouver_('AGENTS', agentId));
    return { bien: sansClefs_(r, ['commission', 'commission_statut']) };
  },
  /* V11.2 : création d'un bien préparé par une IA. Toujours au nom de l'agent, jamais publié (brouillon ou en attente de validation). */
  bienImporterAgent: function (d, agentId) {
    var a = trouver_('AGENTS', agentId), e = etatImport_(agentId, a);
    if (!e.illimite && e.restant <= 0) throw erreur_('Vous avez atteint la limite d’imports pour cette heure (' + MAX_IMPORTS_HEURE + '). Réessayez un peu plus tard ou demandez à l’agence de lever la limite.', 'LIMITE');
    var src = Object.assign({}, d.bien || {}); delete src.id;
    src.statut = src.statut === 'en_attente' ? 'en_attente' : 'brouillon';
    var r = AGENT.bienEnregistrerAgent({ bien: src }, agentId);
    if (!e.illimite) { var cache = CacheService.getScriptCache(), cle = cleImport_(agentId); cache.put(cle, String((parseInt(cache.get(cle) || '0', 10)) + 1), 3700); }
    return r;
  },
  bienSupprimerAgent: function (d, agentId) {
    var b = trouver_('BIENS', d.id);
    if (!b || b.agent_id !== agentId) throw erreur_('Ce bien ne vous appartient pas.', 'INTERDIT');
    if (['brouillon', 'en_attente', 'refuse'].indexOf(b.statut) === -1) throw erreur_('Ce bien est déjà publié : contactez l’agence pour le retirer.', 'INTERDIT');
    lire_('PHOTOS').filter(function (p) { return p.bien_id === d.id; }).sort(function (a, b2) { return b2._ligne - a._ligne; })
      .forEach(function (p) { jeterPhoto_(p.drive_id); feuille_('PHOTOS').deleteRow(p._ligne); });
    supprimer_('BIENS', d.id);
    return {};
  },
  photoAjouterAgent: function (d, agentId) {
    var b = trouver_('BIENS', d.bien_id);
    if (!b || b.agent_id !== agentId) throw erreur_('Ce bien ne vous appartient pas.', 'INTERDIT');
    var s = stockerPhoto_(d.photo, d.bien_id), n = lire_('PHOTOS').filter(function (p) { return p.bien_id === d.bien_id; }).length;
    return { photo: sans_(ajouter_('PHOTOS', { id: identifiant_('PH'), bien_id: d.bien_id, url: s.url, drive_id: s.drive_id, ordre: String(n + 1) })) };
  },
  photoSupprimerAgent: function (d, agentId) {
    var p = trouver_('PHOTOS', d.id);
    if (!p) return {};
    var b = trouver_('BIENS', p.bien_id);
    if (!b || b.agent_id !== agentId) throw erreur_('Ce bien ne vous appartient pas.', 'INTERDIT');
    jeterPhoto_(p.drive_id); supprimer_('PHOTOS', d.id);
    return {};
  },
  photosOrdonnerAgent: function (d, agentId) {
    var b = trouver_('BIENS', d.bien_id);
    if (!b || b.agent_id !== agentId) throw erreur_('Ce bien ne vous appartient pas.', 'INTERDIT');
    (d.ids || []).forEach(function (id, i) { var p = trouver_('PHOTOS', id); if (p && p.bien_id === d.bien_id) modifier_('PHOTOS', id, { ordre: String(i + 1) }); });
    return {};
  }
};

/* ============================== ESPACE PARTENAIRE ============================== */
/* Toute action ici est scopée par exigerSessionPartenaire_ : partenaireId est l'identifiant vérifié côté serveur,
   jamais une valeur envoyée par le client. Un partenaire ne lit ni ne modifie jamais ce qui n'est pas rattaché à lui.
   Ne sortent jamais d'ici : notes internes, commissions, autres partenaires, prospects, e-mail des agents. */

function contactAgent_(id) {
  var a = id ? trouver_('AGENTS', id) : null;
  return a ? { nom: a.nom, telephone: a.telephone, whatsapp: a.whatsapp } : null;
}

var PARTENAIRE = {
  deconnexionPartenaire: function (d) { CacheService.getScriptCache().remove('session_partenaire_' + d.jeton); return {}; },

  donneesPartenaire: function (d, pid) {
    var p = trouver_('PARTENAIRES', pid);
    var messages = lire_('MESSAGES').filter(function (m) { return m.partenaire_id === pid; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(sans_);
    var agence = {}; PARAMETRES_PUBLICS.forEach(function (c) { agence[c] = parametre_(c); });
    var sortie = { partenaire: { id: p.id, nom: p.nom, societe: p.societe, type: p.type, email: p.email }, agence: agence, messages: messages,
      non_lus: messages.filter(function (m) { return m.auteur === 'agence' && m.lu !== 'oui'; }).length,
      listes: { etapesDossier: ETAPES_DOSSIER, statutsLot: STATUTS_LOT } };
    if (p.type === 'promoteur') {
      var progs = lire_('PROGRAMMES').filter(function (x) { return x.partenaire_id === pid; }), ids = {};
      progs.forEach(function (x) { ids[x.id] = true; });
      sortie.programmes = progs.map(function (x) { return { id: x.id, nom: x.nom, lien_brochure: x.lien_brochure, agent: contactAgent_(x.agent_id) }; });
      sortie.lots = lire_('LOTS').filter(function (x) { return ids[x.programme_id]; }).map(sans_);
      sortie.demandes = lire_('DEMANDES').filter(function (x) { return ids[x.programme_id]; }).map(sans_);
    } else {
      sortie.dossiers = lire_('DOSSIERS').filter(function (x) { return x.partenaire_id === pid; })
        .map(function (x) { return { id: x.id, reference: x.reference, bien: x.bien, etape: x.etape, date_maj: x.date_maj, agent: contactAgent_(x.agent_id) }; });
    }
    return sortie;
  },
  /* Le promoteur met à jour le statut de SES lots uniquement */
  lotStatutPartenaire: function (d, pid) {
    var lot = trouver_('LOTS', d.id), prog = lot ? trouver_('PROGRAMMES', lot.programme_id) : null;
    if (!lot || !prog || prog.partenaire_id !== pid) throw erreur_('Ce lot ne vous appartient pas.', 'INTERDIT');
    if (STATUTS_LOT.indexOf(d.statut) === -1) throw erreur_('Statut inconnu.');
    return { lot: sans_(modifier_('LOTS', lot.id, { statut: d.statut, date_maj: maintenant_() })) };
  },
  messageEnvoyerPartenaire: function (d, pid) {
    var texte = propre_(d.texte, 2000).trim();
    if (!texte) throw erreur_('Écrivez votre message.');
    var cache = CacheService.getScriptCache(), cle = 'messages_' + pid + '_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
    var n = parseInt(cache.get(cle) || '0', 10);
    if (n >= MAX_MESSAGES_HEURE) throw erreur_('Trop de messages en peu de temps. Réessayez un peu plus tard.', 'LIMITE');
    cache.put(cle, String(n + 1), 3700);
    var p = trouver_('PARTENAIRES', pid);
    var m = ajouter_('MESSAGES', { id: identifiant_('MS'), partenaire_id: pid, auteur: 'partenaire', texte: texte, date: maintenant_(), lu: 'non' });
    var dest = parametre_('email_alertes');
    if (dest) { try { MailApp.sendEmail(dest, 'Nassiri Real Estate — message de ' + p.nom, 'Nouveau message de ' + p.nom + (p.societe ? ' (' + p.societe + ')' : '') + '.\n\n' + texte + '\n\nRépondez depuis l’Espace Pro, section « Partenaires ».'); } catch (e) { /* un échec d'e-mail ne bloque jamais l'action */ } }
    return { message: sans_(m) };
  },
  messagesLusPartenaire: function (d, pid) {
    lire_('MESSAGES').forEach(function (m) { if (m.partenaire_id === pid && m.auteur === 'agence' && m.lu !== 'oui') modifier_('MESSAGES', m.id, { lu: 'oui' }); });
    return {};
  }
};
