# V9.7 — Code PIN des agents : message clair, e-mail, formulaire corrigé
- Création d'agent : si le script Google (Code.gs) n'est pas à jour et ne renvoie pas de code PIN, une fenêtre explique quoi faire (au lieu d'un échec silencieux ou d'un message incompréhensible). Idem pour « Nouveau code PIN ».
- Fenêtre du code : ajout du bouton « Envoyer par e-mail » (en plus de WhatsApp et Copier).
- Formulaire agent : e-mail vérifié avant l'envoi ; le texte sur le code PIN ne chevauche plus le champ WhatsApp.
- admin.js rechargé automatiquement (?v=9.7).
- Code.gs inchangé (le PIN est fabriqué par Code.gs : il doit être à jour dans Apps Script).
