/* ==========================================================================
   NASSIRI REAL ESTATE — MODE DÉMONSTRATION
   --------------------------------------------------------------------------
   Tant qu'aucune URL Google Apps Script n'est renseignée dans config.js, le site
   fait tourner le VRAI code serveur (copie de apps-script/Code.gs) dans le
   navigateur, avec ce fichier qui imite Google Sheets / Drive / Mail.
   Les données restent sur l'appareil (localStorage). Aucune protection réelle :
   ce mode sert uniquement à essayer le site et l'administration.
   ========================================================================== */
(function () {
  "use strict";
  var CLE = "nassiri_demo_v3_";
  var mem = {};
  function lire(k, defaut) {
    if (k in mem) return mem[k];
    try { var v = localStorage.getItem(CLE + k); mem[k] = v === null ? defaut : JSON.parse(v); } catch (e) { mem[k] = defaut; }
    return mem[k];
  }
  function ecrire(k, v) {
    mem[k] = v;
    try { localStorage.setItem(CLE + k, JSON.stringify(v)); }
    catch (e) { if (k.indexOf("photo_") === 0) { delete mem[k]; throw new Error("Espace de démonstration plein : supprimez quelques photos de test."); } }
  }

  /* ---------- SHA-256 synchrone (pour le hachage du mot de passe) ---------- */
  function sha256(str) {
    var K = [], H = [], i, j, p = 2, n = 0;
    function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    while (n < 64) { var premier = true; for (i = 2; i * i <= p; i++) if (p % i === 0) { premier = false; break; }
      if (premier) { if (n < 8) H[n] = frac(Math.pow(p, 1 / 2)); K[n++] = frac(Math.pow(p, 1 / 3)); } p++; }
    var octets = Array.from(new TextEncoder().encode(str)), l = octets.length * 8;
    octets.push(0x80); while (octets.length % 64 !== 56) octets.push(0);
    for (i = 7; i >= 0; i--) octets.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    var h = H.slice(), w = [];
    function r(x, s) { return (x >>> s) | (x << (32 - s)); }
    for (var o = 0; o < octets.length; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (octets[o + i * 4] << 24) | (octets[o + i * 4 + 1] << 16) | (octets[o + i * 4 + 2] << 8) | octets[o + i * 4 + 3];
      for (i = 16; i < 64; i++) { var s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0, (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + g) | 0, (h[7] + hh) | 0];
    }
    var out = [];
    for (i = 0; i < 8; i++) for (j = 3; j >= 0; j--) { var v = (h[i] >>> (j * 8)) & 255; out.push(v > 127 ? v - 256 : v); }
    return out;
  }

  /* ---------- Faux classeur ---------- */
  function Feuille(nom) { this.nom = nom; }
  Feuille.prototype = {
    _v: function () { return lire("feuille_" + this.nom, []); },
    _s: function (v) { ecrire("feuille_" + this.nom, v); },
    getMaxRows: function () { return 1000; },
    getLastRow: function () { return this._v().length; },
    setFrozenRows: function () {},
    getDataRange: function () { var v = this._v(); return { getValues: function () { return JSON.parse(JSON.stringify(v)); } }; },
    appendRow: function (ligne) { var v = this._v(); v.push(ligne.map(String)); this._s(v); },
    deleteRow: function (n) { var v = this._v(); v.splice(n - 1, 1); this._s(v); },
    getRange: function (l, c, nl, nc) {
      var f = this;
      return {
        setNumberFormat: function () { return this; },
        setValues: function (vals) {
          var v = f._v();
          vals.forEach(function (ligne, i) { v[l - 1 + i] = v[l - 1 + i] || []; ligne.forEach(function (x, j) { v[l - 1 + i][c - 1 + j] = String(x); }); });
          f._s(v);
        },
        setValue: function (x) { this.setValues([[x]]); },
        getValue: function () { var v = f._v(); return (v[l - 1] && v[l - 1][c - 1] !== undefined) ? v[l - 1][c - 1] : ""; },
        clearContent: function () { var v = f._v(); for (var i = 0; i < (nl || 1); i++) { if (!v[l - 1 + i]) continue; for (var j = 0; j < (nc || 1); j++) v[l - 1 + i][c - 1 + j] = ""; } f._s(v); return this; }
      };
    }
  };
  var classeur = {
    getSheetByName: function (nom) { return lire("feuilles", []).indexOf(nom) === -1 ? null : new Feuille(nom); },
    insertSheet: function (nom) { var l = lire("feuilles", []); l.push(nom); ecrire("feuilles", l); return new Feuille(nom); }
  };

  function p2(n) { return (n < 10 ? "0" : "") + n; }
  var G = {
    SpreadsheetApp: { getActiveSpreadsheet: function () { return classeur; } },
    PropertiesService: { getScriptProperties: function () { return {
      getProperty: function (k) { return lire("prop_" + k, null); }, setProperty: function (k, v) { ecrire("prop_" + k, v); } }; } },
    CacheService: { getScriptCache: function () { return {
      get: function (k) { var c = lire("cache_" + k, null); return c && c.fin > Date.now() ? c.v : null; },
      put: function (k, v, s) { ecrire("cache_" + k, { v: v, fin: Date.now() + s * 1000 }); },
      remove: function (k) { ecrire("cache_" + k, null); } }; } },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: function (t) { return { setMimeType: function () { return this; }, getContent: function () { return t; } }; } },
    MailApp: { sendEmail: function (a, sujet, corps) { var b = lire("courriels", []); b.push({ a: a, sujet: sujet, corps: corps, date: new Date().toISOString() }); ecrire("courriels", b.slice(-30)); } },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 },
      createFolder: function () { return G.DriveApp.getFolderById("dossier-demo"); },
      getFolderById: function (id) { return { getId: function () { return id; }, createFile: function (blob) {
        var fid = "demo" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
        ecrire("photo_" + fid, "data:" + blob.mime + ";base64," + blob.donnees);
        return G.DriveApp.getFileById(fid); } }; },
      getFileById: function (id) { return { getId: function () { return id; }, setSharing: function () {},
        setTrashed: function () { mem["photo_" + id] = null; try { localStorage.removeItem(CLE + "photo_" + id); } catch (e) {} } }; }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
      computeDigest: function (a, s) { return sha256(s); },
      getUuid: function () { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === "x" ? r : (r & 3) | 8).toString(16); }); },
      base64Decode: function (b) { return b; },
      newBlob: function (donnees, mime, nom) { return { donnees: donnees, mime: mime, nom: nom }; },
      formatDate: function (d, zone, motif) {
        if (motif === "yyyyMMddHH") return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + p2(d.getUTCHours());
        return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + "T" + p2(d.getHours()) + ":" + p2(d.getMinutes());
      }
    },
    URL_PHOTO_DEMO: function (id) { return "demo-photo:" + id; }
  };

  /* Le vrai code serveur (code-serveur.js, copie exacte de Code.gs) s'attend à trouver ces
     services Google en tant que variables globales, comme dans l'environnement Apps Script réel. */
  ["SpreadsheetApp", "PropertiesService", "CacheService", "LockService", "ContentService", "MailApp", "DriveApp", "Utilities"]
    .forEach(function (k) { window[k] = G[k]; });

  window.ATLAS_DEMO = {
    google: G,
    photo: function (url) { return lire("photo_" + url.slice(11), "") || ""; },
    courriels: function () { return lire("courriels", []); },
    initialise: function () { return !!lire("pret", false); },
    marquerPret: function () { ecrire("pret", true); },
    ajouterLigne: function (onglet, ligne) { new Feuille(onglet).appendRow(ligne); },
    reinitialiser: function () {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(CLE) === 0) localStorage.removeItem(k); }); } catch (e) {}
      mem = {};
    }
  };
})();
