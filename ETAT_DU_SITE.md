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
5. `supabase/migrations/20260101002300_cap_dagde_bots.sql`  ← 3 bots + auto-réponse
6. `supabase/migrations/20260101002400_admin_bot_inbox.sql`  ← RPC boîte des bots (coupe l'auto-réponse)

Droits (si erreur `permission denied for table messages`) :
```sql
grant select,insert,update,delete on public.messages,public.likes,public.matches,public.blocks,public.reports,public.profiles to authenticated;
```

Edge Functions à (re)déployer via CLI : `supabase functions deploy stripe-webhook stripe-cancel send-partner-confirmation delete-account`.

## Réglages Supabase requis
- **Authentication → Providers → Email** : « Confirm email » **OFF**, « Allow new users to sign up » **ON**.
- Se passer admin : `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb where email='<mon_email>';` puis **déconnexion/reconnexion**.
- Espace admin : Réglages → **Administration → Espace admin → Boîte des bots** (ou `/admin`).

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
