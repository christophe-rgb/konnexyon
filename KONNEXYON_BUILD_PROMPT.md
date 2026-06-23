# PROMPT MAÎTRE — Construction professionnelle de Konnexyon

> Prompt destiné à un **agent IA de code** (Claude Code / Cursor / équivalent).
> Stratégie **hybride** : conserver le socle existant (Supabase, modèle de données, langage visuel),
> refondre le front-end et l'infrastructure au niveau **professionnel**, sur **Web/PWA + mobile natif**.
> Niveau de qualité visé : **Tinder / Bumble / Feeld**.

---

## 0. RÔLE & MISSION

Tu agis comme un **expert webmaster / architecte d'applications** senior (produit, design, full-stack,
DevOps, sécurité, conformité). Ta mission : faire évoluer **Konnexyon** — une application de rencontres
**pour couples libertins** — d'un prototype web fonctionnel vers une **application professionnelle,
multiplateforme, sécurisée, scalable et esthétiquement irréprochable**, prête pour une mise en production
réelle et une publication sur les stores.

Tu dois raisonner produit AVANT de coder, proposer une architecture cible, puis livrer par incréments
testés. Tu n'introduis jamais de régression et tu traites la sécurité et la conformité RGPD comme des
exigences **bloquantes**, pas optionnelles.

---

## 1. CONTEXTE PRODUIT

- **Konnexyon** : app de rencontres réservée aux **couples adultes** de la sphère libertine/échangiste.
- **Marché** : francophone — France, Belgique, Canada (Québec), Suisse. FR par défaut, i18n prévu.
- **Positionnement** : haut de gamme, discret, élégant. Identité visuelle **or / noir**, typographie
  sérif raffinée (Cormorant), micro-interactions soignées. Ton premium, intime, jamais vulgaire.
- **Données sensibles** : orientation sexuelle, pratiques, photos → **RGPD Art. 9** (consentement
  explicite, horodaté, versionné, révocable, effacement réel).
- **Public adulte** : age-gate strict, `noindex` sur contenus adultes, modération obligatoire.

---

## 2. PÉRIMÈTRE & STRATÉGIE HYBRIDE

### À CONSERVER (le socle qui marche)
- **Backend Supabase** : PostgreSQL + PostGIS, Row Level Security, Realtime, Edge Functions, Storage.
- **Modèle de données** existant (profiles, likes, matches, messages, blocks, reports,
  partner_confirmations, abonnements) — à **durcir**, pas à jeter.
- **Langage visuel** : palette or/sombre, Cormorant, l'esprit de marque.
- **Logique métier produit** : onboarding couple à double email, découverte swipe/grille/carte,
  likes → matchs mutuels, messagerie, premium Stripe, blog SEO multi-pays.

### À REFONDRE (passage au niveau pro)
- **Front-end** : architecture en **monorepo** partagé web + mobile.
- **Infrastructure** : CI/CD, tests, observabilité, gestion des secrets, migrations versionnées propres.
- **Sécurité & conformité** : combler les failles connues (voir §9), durcir RLS, modération, anti-abus.
- **Qualité du code** : typage strict (TypeScript), validation runtime, gestion d'erreurs explicite.

---

## 3. ARCHITECTURE CIBLE

Monorepo géré par **pnpm + Turborepo** :

```
konnexyon/
├─ apps/
│  ├─ web/        → Next.js 14 (App Router, SSR/ISR) — app + blog SEO + marketing
│  └─ mobile/     → Expo (React Native) — iOS + Android
├─ packages/
│  ├─ core/       → logique métier, client Supabase, types générés, schémas Zod, hooks partagés
│  ├─ ui-tokens/  → design tokens (couleurs, typo, espacements, motion) partagés web/mobile
│  └─ config/     → eslint, tsconfig, prettier partagés
└─ supabase/      → migrations, Edge Functions, seed, policies RLS (source de vérité backend)
```

**Principes :**
- **Une seule source de logique** (`packages/core`) consommée par web et mobile : types Supabase générés
  (`supabase gen types`), validation **Zod**, clients API, machines d'état.
- **Web** : Next.js pour le SEO du blog/landing + perfs (SSR/ISR, images optimisées). L'app connectée
  reste majoritairement client-side (PWA installable, offline-friendly).
- **Mobile** : Expo/React Native, partage de `core`, navigation native, notifications push, accès caméra/GPS.
- **Cartes** : Leaflet (web) / `react-native-maps` ou Mapbox (mobile) derrière une abstraction commune.
- **Pas de logique de sécurité côté client** : toute règle d'accès est appliquée par **RLS + Edge Functions**.

---

## 4. STACK TECHNIQUE IMPOSÉE

| Domaine | Choix |
|---|---|
| Langage | **TypeScript strict** partout (`strict: true`, pas de `any` implicite) |
| Web | Next.js 14 (App Router), React 18, Tailwind CSS |
| Mobile | Expo SDK récent, React Native, Expo Router, Reanimated (swipe fluide) |
| État | Zustand (UI/local) + TanStack Query (données serveur, cache, retries) |
| Backend | Supabase (Postgres 15 + PostGIS, RLS, Realtime, Edge Functions Deno, Storage) |
| Validation | Zod (entrées formulaires + parsing réponses) |
| Paiement | Stripe (abonnements, Billing, webhooks signés + idempotents) |
| Auth | Supabase Auth (email/mot de passe + OAuth optionnel), refresh sécurisé |
| Tests | Vitest (unit), Testing Library, Playwright (e2e web), Detox/Maestro (e2e mobile) |
| CI/CD | GitHub Actions (lint + typecheck + tests + build) ; Vercel (web) ; EAS (mobile) |
| Observabilité | Sentry (erreurs web+mobile+functions), logs structurés, analytics produit (PostHog) |

---

## 5. MODÈLE DE DONNÉES (à conserver et durcir)

Tables principales (PostgreSQL) :
- `profiles` — couple : `couple_name`, `bio`, `avatar_url`, `orientation` (enum) + `orientation_lui`/
  `orientation_elle`, `looking_for`, `seeking[]`, `availabilities[]`, `limits[]`, `max_distance_km`,
  `visibility`, `status`, `hide_location`, `location geography(point,4326)`, double email + confirmations,
  champs RGPD (`consent_given_at`, `consent_version`), champs plan (`plan`, `plan_expires_at`,
  `stripe_customer_id`, `stripe_subscription_id`).
- `likes`, `matches` (créés par trigger sur like mutuel), `messages` (texte + photo + `read_at` +
  `deleted_for[]` + `photo_expires_at`), `blocks`, `reports`, `partner_confirmations`.
- Index spatial GiST sur `location` ; RPC PostGIS pour proximité.

**Exigences :**
1. Générer les **types TypeScript** depuis le schéma et les utiliser partout.
2. **Migrations versionnées** au format timestamp Supabase CLI, **sans doublons** (nettoyer les fichiers
   de migration dupliqués/legacy qui référencent des colonnes inexistantes).
3. Toute RPC appelée par le client **doit exister** dans une migration (ex. `get_my_location`,
   `get_match_locations`, `get_nearby_compatible_profiles`, `get_message_threads`).
4. La **géolocalisation** est obligatoire pour apparaître sur la carte : prévoir GPS précis + repli IP
   approximatif (niveau ville), et un backfill pour les profils créés sans position.

---

## 6. FONCTIONNALITÉS (par module, avec critères d'acceptation)

Pour chaque module, livrer : UI web + mobile, états vide/chargement/erreur, tests, accessibilité.

### 6.1 Onboarding couple
- Étapes : consentement RGPD (Art. 9, bloquant, horodaté + versionné) → identité couple → photo →
  désirs → disponibilités → limites → distance → visibilité.
- Géolocalisation capturée de façon robuste (GPS sinon IP) ; persistance fiable de **toutes** les données
  saisies (y compris `orientation_lui`/`orientation_elle`).
- Double confirmation email des deux partenaires.
- **Acceptation** : un couple ne peut pas finaliser sans consentement ; après onboarding il apparaît sur
  la carte ; aucune donnée saisie n'est perdue.

### 6.2 Découverte (swipe / grille / carte)
- Swipe fluide 60 fps (gestes natifs sur mobile, Reanimated) ; grille ; carte avec marqueurs floutés
  (~500 m) pour la confidentialité.
- Filtres cohérents client/serveur : distance (dont « illimité »), désirs, **compatibilité d'orientation
  gérée côté serveur** (pas d'égalité stricte qui vide la liste).
- **Acceptation** : changer un filtre réinitialise la pile de swipe ; un profil liké disparaît des 3 vues ;
  pas de like sur soi-même ni sur un id vide ; « peu importe » la distance ne tronque pas à 500 km.

### 6.3 Likes → Matchs
- Like mutuel ⇒ match créé par trigger serveur (jamais par le client) ⇒ modale « Connexion ! ».
- Détection de match fiable (Realtime, pas un `setTimeout` arbitraire).
- Unmatch / blocage supprime le match et les contenus liés.

### 6.4 Messagerie
- Temps réel (Realtime) **filtré strictement par RLS** : un utilisateur ne reçoit que les messages de ses
  matchs. Pagination, accusés de lecture, suppression « pour moi », photos éphémères (URL signées qui
  respectent réellement l'expiration + suppression des fichiers Storage).
- **Acceptation** : nettoyage correct des canaux Realtime (aucune fuite entre conversations) ; un membre
  ne peut éditer/supprimer que **ses** messages ; le marquage « lu » passe par une RPC sécurisée.

### 6.5 Abonnement Premium (Stripe)
- Paywall appliqué **côté serveur** (RLS/Edge Function), pas seulement dans l'UI.
- Webhooks Stripe **signés, idempotents**, vérifiant `payment_status`; résiliation conforme loi Chatel
  (cancel_at_period_end) ; reprise via `stripe_customer_id` (pas d'API inexistante).
- **Acceptation** : un compte gratuit ne peut pas envoyer de message via l'API ; double webhook = un seul
  effet ; résiliation possible sans contacter le support.

### 6.6 Modération, sécurité utilisateur
- Signalements, blocages, bannissement ; file de modération admin ; age-gate ; anti-spam (rate limiting
  likes/messages) ; détection basique d'abus.

### 6.7 Blog / SEO / marketing (web)
- Articles multi-pays (FR/BE/CA/CH), rendu SSR/ISR, sitemap, Open Graph, `noindex` sur l'adulte,
  performance Core Web Vitals.

### 6.8 Notifications
- Push mobile (Expo Notifications) + emails transactionnels (nouveau match, message, confirmation
  partenaire, bienvenue) via Edge Functions, avec gestion des préférences et désinscription.

---

## 7. DESIGN SYSTEM

- **Tokens partagés** (`packages/ui-tokens`) : couleurs (or `#C9A84C` / dégradés `#A07830→#E8CC7A`, fonds
  sombres/crème), typographie (Cormorant serif pour titres, Inter pour le texte), espacements, rayons,
  ombres, durées/courbes d'animation.
- **Composants** cohérents web/mobile : cartes profil, boutons, champs, modales, toasts, skeletons,
  bottom sheets.
- **Motion** : transitions douces, swipe physique réaliste, halos dorés discrets, jamais clignotant.
- **Accessibilité** : contrastes AA, focus visibles, labels ARIA (web) / accessibilityLabel (mobile),
  tailles tactiles ≥ 44 px, support clavier et lecteurs d'écran.
- **Responsive** : du petit mobile au desktop ; respect des safe areas mobiles.

---

## 8. PERFORMANCE & SCALABILITÉ

- Objectifs : **LCP < 2,5 s**, INP < 200 ms, JS initial web réduit (code-splitting, lazy routes),
  60 fps sur le swipe.
- Images : avatars/photos servis optimisés (formats modernes, tailles adaptées, lazy loading,
  transformations Storage).
- Données : TanStack Query (cache, déduplication, retries exponentiels), pagination partout, requêtes
  batchées (pas de N+1 comme le chargement des matchs actuel).
- Realtime : abonnements ciblés et nettoyés ; dépendances d'effets stables (id, pas objets entiers).
- DB : index adaptés (spatial GiST, statut, plan), RPC efficaces, éviter le travail redondant.

---

## 9. SÉCURITÉ & CONFORMITÉ (BLOQUANT)

Corriger explicitement les failles connues et garantir :
1. **RLS partout** ; aucune policy `using (true)` exposant des données (ex. `partner_confirmations` doit
   passer uniquement par RPC `security definer`).
2. RPC `security definer` qui utilisent **`auth.uid()`**, jamais un paramètre `user_id` arbitraire
   (ex. suppression de message).
3. `messages_update` restreint au **propriétaire** ; marquage « lu » via RPC dédiée.
4. Paywall premium **vérifié serveur**.
5. Colonnes monétisées/statut **non modifiables** par l'utilisateur (revoke + trigger).
6. Webhooks Stripe signés + idempotents + vérification du paiement.
7. **RGPD** : consentement Art. 9 horodaté/versionné ; révocation effaçant **toutes** les données
   sensibles (orientation lui/elle, désirs, disponibilités, limites) ; export et suppression de compte ;
   politique de rétention des photos réellement appliquée.
8. Uploads : validation type **par magic bytes** + extension dérivée du type validé + limites de taille ;
   buckets privés + URL signées.
9. Secrets hors du code ; CORS restreint ; en-têtes de sécurité ; logs sans données sensibles.
10. Age-gate et `noindex` sur contenus adultes.

---

## 10. QUALITÉ, CI/CD, OBSERVABILITÉ

- **CI** (GitHub Actions) : lint + typecheck + tests unitaires + build, bloquants sur PR.
- **Tests** : unitaires (logique métier, hooks, RPC critiques), e2e web (Playwright) sur parcours clés
  (onboarding, swipe→match, message, paiement sandbox), smoke e2e mobile.
- **Migrations** : appliquées/validées en CI sur une base éphémère.
- **Observabilité** : Sentry (web + mobile + Edge Functions), analytics produit (entonnoir onboarding,
  taux de match), alertes sur erreurs critiques.
- **Definition of Done** par tâche : code typé, testé, accessible, sans régression, documenté,
  migration fournie si schéma modifié, build vert.

---

## 11. INTERNATIONALISATION & LÉGAL

- i18n dès le départ (FR par défaut) ; chaînes externalisées.
- Pages légales par pays (CGU, confidentialité, mentions, droit de rétractation/Chatel), bannière cookies
  conforme, gestion du consentement.

---

## 12. LIVRAISON PAR PHASES

- **Phase 0 — Fondations** : monorepo, TypeScript strict, types Supabase générés, CI, design tokens,
  migrations nettoyées, correctifs de sécurité bloquants (§9).
- **Phase 1 — Cœur web pro** : auth, onboarding robuste, découverte (swipe/grille/carte), likes/matchs,
  messagerie temps réel sécurisée, premium Stripe serveur. PWA installable.
- **Phase 2 — Mobile natif** : app Expo iOS/Android partageant `core`, push, caméra/GPS natifs,
  parcours complets, soumission stores (assets, politiques, age rating).
- **Phase 3 — Croissance** : blog SEO/ISR, notifications email, modération avancée, analytics,
  optimisations perf, A/B.

À chaque phase : démo fonctionnelle + tests verts + notes de migration.

---

## 13. RÈGLES D'EXÉCUTION POUR L'AGENT

1. **Comprendre avant de coder** : commence par un plan d'architecture et un découpage en tâches.
2. **Incréments testés** : petites PR cohérentes, chacune buildable, testée, sans régression.
3. **Sécurité d'abord** : aucune fonctionnalité ne shippe en contournant RLS/validation.
4. **Pas de secret en clair**, pas de `any`, pas d'erreur avalée silencieusement.
5. **Toute modif de schéma** ⇒ migration timestampée + types régénérés.
6. **Respecter l'identité visuelle** existante (or/sombre, Cormorant) en la systématisant en tokens.
7. **Documenter** les décisions d'archi et les commandes de run/déploiement.
8. Si une exigence est ambiguë ou à fort impact, **poser la question** avant d'implémenter.

---

## 14. LIVRABLES ATTENDUS

- Monorepo opérationnel (web + mobile + core + supabase) qui build et tourne en local.
- Schéma + migrations propres et appliquées, types générés.
- Apps web (PWA) et mobile (iOS/Android) couvrant les parcours du §6.
- Suite de tests + pipeline CI verte + observabilité branchée.
- Documentation : architecture, setup, variables d'environnement, déploiement, runbook sécurité/RGPD.

---

## 15. CRITÈRES D'ACCEPTATION GLOBAUX

- Un couple peut s'inscrire, être visible sur la carte, découvrir, matcher, discuter, payer — sur web
  **et** mobile, sans bug bloquant.
- Aucune donnée d'un couple n'est accessible à un autre (vérifié par tests RLS).
- RGPD : consentement, révocation effective, export, suppression fonctionnels.
- Paiement testé en sandbox de bout en bout, webhooks idempotents.
- Performances et accessibilité conformes aux objectifs (§7, §8).
- CI verte, zéro régression sur les parcours critiques.
```
```
```
```
```

---

> **Pour atteindre 10/10**, fournis (optionnel) : la charte/assets de marque définitifs (logo, polices
> sous licence), les `price_id` Stripe et le modèle tarifaire exact, la liste finale des langues/marchés
> au lancement, la date cible de mise en production, et le classement de priorité entre les 4 axes si un
> arbitrage devient nécessaire.
