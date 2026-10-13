# Migration WARIWARI — 13 octobre 2026

Le produit web et le nom affiché dans les applications natives deviennent WARIWARI. Les identifiants de stockage, le package @wariba/core et les identifiants natifs restent compatibles avec les installations existantes. Les exports antérieurs WARIBA restent importables.

Le projet Vercel définitif est `wariwari`. Les neuf variables nécessaires ont été migrées, les secrets de cron/opérations/hachage ont été renouvelés et les analyses restent désactivées. Deux tâches Vercel sont configurées avec authentification CRON_SECRET (alertes et reçus). Les tâches de données GitHub existantes sont conservées.

Validation locale : 164 tests TypeScript, 102 tests données BOC, 8 tests actualités ; types web/mobile, lint et build Next réussis. Next et les dépendances critiques sont corrigés. L'audit de production complet reste bloquant : 23 alertes hautes et 20 modérées dans la chaîne native/dépendances transitives, aucune critique. L'étape d'audit reste exigée dans la CI, après les autres contrôles.

La base Supabase `lxcjiocyzptrrnzvywmn` est suspendue. Sa restauration est refusée car les deux emplacements gratuits actifs du compte sont occupés par d'autres projets. Aucun projet tiers n'a été suspendu et aucun abonnement payant n'a été engagé. Authentification, synchronisation cloud et traitements de cron ne sont pas certifiés tant que cette base n'est pas restaurée. Les tâches ne doivent pas être présentées comme opérationnelles sur des données réelles.

La mise à niveau Expo SDK/React Native nécessite la validation sur appareil prévue par les instructions du dépôt. Les contrôles natifs et l'audit restent une condition de finalisation, sans masquer les erreurs.
