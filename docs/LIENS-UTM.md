# Liens marqués (UTM) pour la mesure d'audience

Aujourd'hui toutes les visites arrivent en « Direct », parce que les liens ne sont pas marqués. En ajoutant des paramètres `utm_…` à l'adresse, Google Analytics sait d'où vient chaque visiteur. Rien à installer : Analytics les lit tout seul (et seulement si le visiteur a accepté la mesure).

Adresse de base : `https://nassirimmobilier.github.io/nassiri/`

| Où vous partagez le lien | Lien à utiliser |
|---|---|
| Message WhatsApp | `https://nassirimmobilier.github.io/nassiri/?utm_source=whatsapp&utm_medium=message&utm_campaign=partage` |
| Instagram (bio) | `https://nassirimmobilier.github.io/nassiri/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Carte de visite (QR code) | `https://nassirimmobilier.github.io/nassiri/?utm_source=carte-visite&utm_medium=print&utm_campaign=qr` |

Pour une fiche bien : ajoutez les mêmes paramètres après l'identifiant, par exemple `bien.html?id=NR-0002&utm_source=whatsapp&utm_medium=message&utm_campaign=partage`.

Règles : tout en minuscules, sans espace ni accent, et toujours le même nom pour la même source (ne mélangez pas « whatsapp » et « WhatsApp »). Ne marquez jamais les liens de l'Espace Pro : il n'est plus mesuré.
Pour distinguer plus tard les villes, ajoutez par exemple `utm_campaign=meknes-bio`.
