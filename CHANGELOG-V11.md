# V11 — Espace Pro unifié + espaces partenaires

- Une seule porte : `espace-pro.html` (onglets Admin / Agent / Partenaire), chaque rôle arrive dans son espace.
- Nouveau `partenaire.html` : notaires, avocats (« Maître [Nom] ») → dossiers avec progression en 4 étapes ; promoteurs → programmes, lots (statut modifiable), demandes de réservation, brochure.
- Messagerie agence ↔ partenaire (badge non lus, alerte e-mail sans contenu).
- Admin : onglet « Partenaires » (création avec PIN à 6 chiffres, envoi WhatsApp/Gmail, nouveau code, désactivation, dossiers, programmes, lots, demandes, messages).
- Code.gs : build « V11 - espace partenaires » ; 6 nouveaux onglets Sheet créés automatiquement (PARTENAIRES, DOSSIERS, PROGRAMMES, LOTS, DEMANDES, MESSAGES) ; droits vérifiés côté serveur.
- Les partenaires ne voient jamais notes, commissions, e-mail des agents.
- Les liens « Espace Pro » du site pointent vers espace-pro.html.
- À venir (V11.1, sur ordre) : dépôt de documents par les partenaires.
