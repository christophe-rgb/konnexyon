# Konnexyon — État du site (mémoire)

> Document de référence sur l'état courant de l'app, les étapes SQL à appliquer,
> et les réglages « mode test » à connaître. Mis à jour au fil des sessions.

## Stack
- **Front** : React + Vite, Zustand, React Router, TailwindCSS. Déploiement **Vercel** (branche `main` = prod).
- **Back** : Supabase (Postgres + PostGIS, RLS, Realtime, Edge Functions, Storage), projet `qpynduwnteqlxhiyzknv`.
- **Paiement** : Stripe (actuellement **désactivé côté produit**, voir mode test).

## Identité
- App de rencontres **pour couples** (libertins), FR/BE/CH/QC, 18+.
- Landing : **fond noir, logo géant** (reflet bijou + halo). Le reste de l'app est **clair**.
- Mise en avant **100% gratuit** (accueil, inscription, réglages).

## Fonctionnalités livrées (session)
- Géoloc onboarding avec **repli IP** + backfill au login.
- Découverte swipe/grille/**carte claire** ; couples **contactés restent visibles** (marqueur vert ✓), retirés du swipe.
- **Dock de chat** façon Messenger (plusieurs couples en parallèle, réductible).
- **Bots Cap d'Agde** (Julie & Marc, Sophie & Lucas, Camille & Hugo).
- **Boîte des bots (admin)** : répondre à la place des bots depuis son compte.
- Bouton **« Sortie »** clair. Suppression de compte RGPD réelle (Edge Function).
- Corrections : boucle onboarding (age_confirmed_at), session périmée (getUser), sécurité RLS, etc.

## ⚠️ Étapes SQL à appliquer en base (SQL Editor Supabase)
À exécuter (idempotent) si pas déjà fait :
1. `supabase/migrations/20260101001900_security_hardening_and_map_rpc.sql`
2. `supabase/migrations/20260101002000_avatars_public_bucket.sql`  ← **bucket avatars public** (sinon photos invisibles)
3. `supabase/migrations/20260101002100_finish_security_hardening.sql`  ← policy messages + enum `banned`
4. `supabase/migrations/20260101002200_matching_unmatch_realtime.sql`  ← matching symétrique, unmatch, Realtime, `stripe_events`
5. `supabase/migrations/20260101002300_cap_dagde_bots.sql`  ← 3 bots Cap d'Agde + auto-réponse
6. `supabase/migrations/20260101002400_admin_bot_inbox.sql`  ← RPC boîte des bots (coupe l'auto-réponse)
7. `supabase/migrations/20260101002500_bots_villes_and_admin_avatar.sql`  ← 5 bots (Lyon x2, Paris x2, Montpellier) + RPC `admin_set_bot_avatar`
8. `supabase/migrations/20260101002600_remove_two_cap_dagde_bots.sql`  ← supprime Sophie & Lucas + Camille & Hugo
9. `supabase/migrations/20260101002700_admin_reset_delete_bot_thread.sql`  ← RPC vider/supprimer une conversation de bot

**IMPORTANT — `is_admin()` doit exister AVANT toute fonction admin** (définie dans `supabase/schema.sql`). Sinon les `create function admin_*` échouent et Supabase annule tout le bloc :
```sql
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
```

Droits (si erreur `permission denied for table messages`) :
```sql
grant select,insert,update,delete on public.messages,public.likes,public.matches,public.blocks,public.reports,public.profiles to authenticated;
```

**Bucket photos** (sinon avatars/bots invisibles) : `update storage.buckets set public = true where id = 'avatars';`

Edge Functions à (re)déployer via CLI : `supabase functions deploy stripe-webhook stripe-cancel send-partner-confirmation delete-account`.

## Réglages Supabase requis
- **Authentication → Providers → Email** : « Confirm email » **OFF**, « Allow new users to sign up » **ON**.
- Se passer admin : `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb where email='<mon_email>';` puis **déconnexion/reconnexion**.
- Espace admin : Réglages → **Administration → Espace admin → Boîte des bots** (ou `/admin`).

## Nouveautés récentes (session UI + bots villes)
- **Age-gate** : fond noir + grand logo animé (1ère page à l'arrivée).
- **Bandeaux d'en-tête premium** sur toutes les pages : barre noire pleine largeur, titre centré en dégradé or officiel `#B8891F→#F4D875→#B8891F`, halo doré. Corps des pages reste clair.
- **Page Profil** refaite premium + repli propre si photo cassée (`onError`).
- **Logo de fond façon reflet** sur Connexions (et login).
- **Charte graphique** : `CHARTE_GRAPHIQUE.md` (couleurs, typo, dégradé officiel, rayons).
- **Service worker** (`public/sw.js`) : network-first pour le HTML (fin des vieux builds cachés).
- **Bots villes** : 5 bots Lyon/Paris/Montpellier. Boîte des bots avec encart « Messages en attente », **Photos des bots** (upload), et **vider/supprimer** une conversation.
- **Admin** : page sur fond noir (sinon onglets blancs sur blanc invisibles).
- **Fix carte** : « peu importe » (`max_distance_km = 0`) enfin pris en compte (test `!= null`, plus la véracité).

## 🧪 Mode test (à revenir en « vraies règles » plus tard)
Actuellement volontairement permissif pour tester :
- **Tout le monde voit tout le monde** (get_nearby sans filtre distance/orientation/visibilité).
- **Un like crée un match immédiat** (`create_match_if_mutual` modifié) → on peut écrire à tout couple contacté.
- **Paywall retiré** (likes + messagerie gratuits, côté UI et serveur).
- Positions parfois **synthétiques** (profils placés/étalés à la main pendant les tests).

## Points ouverts / à vérifier
- « Première connexion → onboarding » : à confirmer (compte déjà onboardé ? `age_confirmed_at` / `email_1_confirmed` en base).
- Nettoyer les faux profils de seed (`id like '11111111-%'`) si on veut ne garder que du réel.
- Redonner les vraies règles (distance, match mutuel, orientation) en fin de phase test.
