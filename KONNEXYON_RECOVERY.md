# KONNEXYON — Fiche de reprise de session

> À coller en début de conversation Claude en cas de crash ou perte de contexte.

---

## Projet

**Konnexyon** — Plateforme de rencontres libertines adultes 18+  
Marché : France, Belgique, Suisse, Québec  
Modèle : freemium → abonnement Premium récurrent  
URL production : https://www.konnexyon.com  
Répertoire local : `/Users/parrachristophe/agent`

---

## Stack technique

| Couche | Techno |
|---|---|
| Front | React 18 + Vite (SPA) |
| Backend | Supabase (PostgreSQL + Auth + Storage + RPC PostGIS) |
| Déploiement | Vercel (projet : `christopheparra-3261s-projects/konnexyon`) |
| Emails | Resend |
| Paiement | Segpay (en cours d'intégration — remplace Stripe) |
| DNS | OVH → konnexyon.com + www |

---

## Commandes essentielles

```bash
# Démarrer le serveur local
cd /Users/parrachristophe/agent
npm run dev

# Builder
npm run build

# Déployer en production
npx vercel deploy --prod

# Test automatique (5 checks)
node /Users/parrachristophe/agent/scripts/test-site.mjs

# Lier Supabase
SUPABASE_ACCESS_TOKEN=sbp_f575235d80ad57e830d44ce9e9833e05b968f916 npx supabase link --project-ref qpynduwnteqlxhiyzknv
```

---

## Identifiants clés (NE PAS committer)

```
Supabase project ref    : qpynduwnteqlxhiyzknv
Supabase access token   : sbp_f575235d80ad57e830d44ce9e9833e05b968f916
Supabase anon key       : dans .env.local (VITE_SUPABASE_ANON_KEY)
Supabase service role   : dans .env.local (ne jamais mettre dans le code front)
Resend API key          : dans .env.local
Compte admin Konnexyon  : christopheparra@gmail.com
Compte test Thomas      : thomas.martin@testuser.konnexyon.com / Thomas2026!
```

---

## Architecture fichiers clés

```
src/
├── App.jsx                  — Routes, RequireAuth, RequireProfile, bouton panique ✕
├── store/auth.js            — Store Zustand : user, profile, init(), fetchProfile(), signOut()
├── lib/supabase.js          — Client Supabase
├── lib/plan.js              — isPremium()
├── lib/demo.js              — Profils démo
├── pages/
│   ├── Home.jsx             — Landing page (redirige vers /discover si connecté)
│   ├── Login.jsx            — Connexion + géolocalisation PostGIS SRID=4326
│   ├── Register.jsx         — Inscription
│   ├── Onboarding.jsx       — Tunnel onboarding (5 étapes)
│   ├── Discover.jsx         — Page principale : swipe / grille / carte
│   ├── Profile.jsx          — Profil own + externe, edit form
│   ├── Matches.jsx          — Connexions mutuelles
│   ├── Messages.jsx         — Liste des conversations (Premium)
│   ├── Conversation.jsx     — Chat en temps réel
│   ├── Settings.jsx         — Paramètres + déconnexion
│   ├── Admin.jsx            — Panel admin
│   └── Abonnement.jsx       — Page abonnement (Segpay à intégrer)
├── components/
│   ├── AgeGate.jsx          — Vérification 18+ (sessionStorage age_confirmed)
│   ├── Navbar.jsx           — Barre de navigation bottom (mobile)
│   ├── SwipeStack.jsx       — Stack de swipe
│   ├── ProfileCard.jsx      — Carte profil
│   ├── MapView.jsx          — Vue carte Leaflet (lazy loaded)
│   ├── FilterPanel.jsx      — Filtres de découverte
│   ├── UpgradeModal.jsx     — Modal passage Premium
│   ├── PanierSheet.jsx      — Profils mis de côté
│   └── Toast.jsx            — Notifications
supabase/
├── schema.sql               — Schéma complet DB
├── functions/               — Edge Functions
│   ├── stripe-checkout/     — Checkout Stripe (à migrer Segpay)
│   └── stripe-webhook/      — Webhook Stripe révocation premium
└── migrations/
    └── add_banned_report_status.sql  — À appliquer en prod
scripts/
└── test-site.mjs            — Script de test automatique 5 checks
```

---

## Base de données Supabase

### Tables principales
- `profiles` — id, couple_name, bio, avatar_url, orientation (enum), looking_for, seeking, availabilities, limits, max_distance_km, visibility, status, location (PostGIS), email_1, email_2, email_1_confirmed, email_2_confirmed
- `likes` — from_id, to_id
- `matches` — couple_a, couple_b
- `messages` — match_id, sender_id, content, created_at
- `blocks` — blocker_id, blocked_id
- `reports` — reporter_id, reported_id, reason, status

### RLS policies (profiles)
- SELECT : `status = 'active'`
- INSERT : `id = auth.uid()`
- UPDATE : `id = auth.uid()`

### RPC clé
- `get_nearby_compatible_profiles(radius_km)` — retourne les profils compatibles à proximité (PostGIS)

### Migration à appliquer
```sql
ALTER TYPE profile_status ADD VALUE IF NOT EXISTS 'banned';
```

---

## État actuel du projet (17/06/2026)

### Fonctionnel ✅
- Inscription / onboarding complet (5 étapes)
- Connexion / déconnexion
- Discover (swipe, grille, carte)
- Profil own + édition (seeking, availabilities, limits, visibility)
- Page Connexions (matches)
- Messages Premium (gate)
- Bouton panique ✕ (top-right, redirige google.fr)
- Redirection vers carte après édition profil
- Tests automatiques 5/5

### En cours / À faire 🔧
- Intégration Segpay (Abonnement.jsx appelle encore stripe-checkout)
- Migration SQL `add_banned_report_status.sql` à appliquer en prod
- TTL Storage bucket `chat-photos` (RGPD)
- Copyright `© 2025` → `© 2026` dans Home.jsx

---

## Agents disponibles dans ~/.claude/agents/

| Fichier | Rôle |
|---|---|
| `cto-konnexyon.md` | Audit code, sécurité OWASP, UX, performance |
| `cfo-konnexyon.md` | CFO, TVA OSS, MRR/ARR, trésorerie |
| `expert-segpay.md` | Paiements, chargebacks, KYC, webhooks |
| `auteur-compositeur.md` | La Transat, écriture, dramaturgie |

---

## Bugs corrigés en session (historique)

| Fix | Fichier |
|---|---|
| isOwn fiable quand myProfile charge en différé | Profile.jsx |
| Redirection vers /discover?view=map après save() | Profile.jsx |
| try/catch/finally sur save() | Profile.jsx |
| Sections seeking/availabilities/limits dans EditForm | Profile.jsx |
| Guard géolocalisation + exclusion orientation_lui/elle | Onboarding.jsx |
| Validation couple_name + setProfile avec orientation | Onboarding.jsx |
| onPass alimente le panier (bouton Zap) | Discover.jsx |
| Fallback MapView si chunk lazy échoue (écran noir) | Discover.jsx |
| Format SRID=4326 pour PostGIS | Login.jsx |
| data.user null géré explicitement | Register.jsx |
| Stale closure sur index | SwipeStack.jsx |
| signOut ordre d'opérations | auth.js |
| Bouton panique ✕ fixe | App.jsx |
| Révocation premium à l'annulation | stripe-webhook/index.ts |
