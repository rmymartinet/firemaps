# Sécurité et vie privée

État actuel : aucune authentification, base, upload ou donnée personnelle persistée. La géolocalisation est demandée uniquement par action dans l’écran urgence, reste en mémoire et n’est pas envoyée.

Les recherches d’adresse passent par une route serveur sans cache puis par l’IGN Géoplateforme. Firemaps ne les stocke pas, mais elles peuvent apparaître dans les journaux techniques de l’hébergeur ou du fournisseur. Avant production, désactiver la journalisation des chaînes de requête ou définir une rétention minimale et l’expliquer dans l’information de confidentialité.

Avant les observations : limiter taille/type, supprimer EXIF côté serveur, stocker les originaux en privé, réduire la précision publique, appliquer rate limiting et modération. Avant Supabase : RLS restrictive, clés serveur hors client, journal d’administration et politiques de rétention.
