# V10 — Code PIN visible dans la fiche agent, envoi par Gmail / Partager
- Fiche agent : section « Code PIN » (code en grand + boutons WhatsApp, Gmail, Partager (iPhone/Safari), Copier le message).
- Gmail : ouvre un nouveau message Gmail (navigateur, ou application Gmail sur iPhone) au lieu de l'application Mail. Le bouton « Envoyer par e-mail » (mailto) est supprimé.
- Code.gs : nouvelle colonne AGENTS.pin_visible (créée automatiquement, au format texte pour garder les 0 du début) ; action codesSecuriser ; donnees renvoie pin_visible et codes_visibles ; BUILD = 'V10 - codes PIN visibles'.
- Paramètres : « Sécuriser les codes » efface tous les codes visibles et repasse au fonctionnement « code montré une seule fois » (choix 1). Les codes déjà donnés restent valables.
- Agents existants sans code visible : cliquer « Nouveau code PIN » une fois.
- Le mot de passe de connexion reste protégé (empreinte) ; pin_visible n'est jamais envoyé à l'Espace Agent.
- config.js : nouvelle adresse du script (…ljvMxJ-/exec), comme V9.9.1.
