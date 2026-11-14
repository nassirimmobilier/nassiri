/* ==========================================================================
   NASSIRI REAL ESTATE — Mesure d'audience (Google Analytics 4), avec accord du visiteur
   --------------------------------------------------------------------------
   Chargé par app.js uniquement si ATLAS.config.analyticsId est renseigné, hors mode démonstration
   et hors Espace Pro. Rien n'est envoyé à Google tant que le visiteur n'a pas cliqué sur « Accepter ».
   ========================================================================== */
(function () {
  "use strict";
  var A = window.ATLAS, ID = (A.config && A.config.analyticsId) || "", CLE = "nassiri_stats";
  if (!/^G-[A-Z0-9]{6,14}$/.test(ID) || A.demo) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  function lire() { try { return localStorage.getItem(CLE) || ""; } catch (e) { return ""; } }
  function ecrire(v) { try { v ? localStorage.setItem(CLE, v) : localStorage.removeItem(CLE); } catch (e) { /* stockage indisponible */ } }
  var demarre = false;

  function demarrer() {
    if (demarre) return; demarre = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ID);
    document.head.appendChild(s);
    A._stats = function (nom, params) { gtag("event", nom, params); };
    (A._fileEvt || []).splice(0).forEach(function (e) { A._stats(e[0], e[1]); });
    ecouter();
  }

  /* Clics sur WhatsApp, téléphone et e-mail */
  function ecouter() {
    var idBien = new URLSearchParams(location.search).get("id") || undefined;
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var p = { page: location.pathname.replace(/^.*\//, "") || "index.html", bien_id: idBien };
      if (e.target.closest("[data-whatsapp]")) return A._stats("whatsapp_click", p);
      var a = e.target.closest("a[href]");
      if (!a || a.hasAttribute("data-partage-voie")) return;
      var h = a.getAttribute("href") || "";
      if (/^https:\/\/wa\.me\//.test(h)) A._stats("whatsapp_contact", p);
      else if (/^tel:/.test(h)) A._stats("call_click", p);
      else if (/^mailto:/.test(h)) A._stats("email_click", p);
    }, true);
  }

  function bandeau() {
    if (document.querySelector(".stats-bandeau")) return;
    var d = document.createElement("div"); d.className = "stats-bandeau"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Mesure d’audience");
    d.innerHTML = "<p>Nous mesurons de façon anonyme les visites de ce site pour l’améliorer. Aucune donnée n’est envoyée sans votre accord. <a href=\"confidentialite.html\">En savoir plus</a></p>" +
      '<div class="stats-actions"><button type="button" class="btn btn-vert" data-stats="oui">Accepter</button><button type="button" class="btn btn-ligne" data-stats="non">Refuser</button></div>';
    document.body.appendChild(d);
  }

  document.addEventListener("click", function (e) {
    var c = e.target.closest && e.target.closest("[data-stats]");
    if (c) {
      ecrire(c.dataset.stats);
      var b = document.querySelector(".stats-bandeau"); if (b) b.remove();
      if (c.dataset.stats === "oui") demarrer();
      if (A.message) A.message(c.dataset.stats === "oui" ? "Merci, mesure d’audience activée" : "Compris, aucune mesure");
      return;
    }
    if (e.target.closest && e.target.closest("[data-stats-choix]")) { ecrire(""); bandeau(); }
  });

  function initialiser() {
    document.querySelectorAll("[data-stats-choix]").forEach(function (el) { el.hidden = false; });
    var v = lire();
    if (v === "oui") demarrer(); else if (v !== "non") bandeau();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiser); else initialiser();
})();
