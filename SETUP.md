# Setup — Guide complet

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → New project
2. Choisis une région Europe (ex: `eu-west-2`)
3. Note le **Project URL** et la **anon key** (Settings → API)

---

## 2. Activer les extensions

Dans **Database → Extensions**, active :
- `postgis` (géolocalisation)
- `pg_cron` (suppression auto photos)
- `uuid-ossp` (UUIDs, souvent déjà actif)

---

## 3. Exécuter le schéma SQL

Dans **SQL Editor → New query**, colle le contenu de `supabase/schema.sql` et exécute.

> ⚠️ Si PostGIS n'est pas activé avant, l'exécution échouera. Active-le d'abord.

---

## 4. Créer les buckets Storage

Dans **Storage → New bucket** :

| Nom | Public | Taille max | Types autorisés |
|-----|--------|-----------|-----------------|
| `avatars` | ✗ Non | 5 MB | image/jpeg, image/png, image/webp |
| `chat-photos` | ✗ Non | 10 MB | image/jpeg, image/png, image/webp |

Puis pour chaque bucket, dans **Policies**, ajoute :
- SELECT : `auth.uid() is not null`
- INSERT : `auth.uid() is not null`
- UPDATE : `auth.uid() = owner`
- DELETE : `auth.uid() = owner`

---

## 5. Configurer les variables d'environnement

Copie `.env.example` en `.env` :

```bash
cp .env.example .env
```

Remplis les valeurs :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

### Obtenir un token Mapbox

1. Va sur [mapbox.com](https://account.mapbox.com) → Create a token
2. Scopes minimum : `styles:read`, `tiles:read`
3. Restreins à ton domaine en production

---

## 6. Déployer la Edge Function (confirmation partenaire)

```bash
# Installe la CLI Supabase si besoin
brew install supabase/tap/supabase

# Lien avec ton projet
supabase login
supabase link --project-ref TON_PROJECT_REF

# Déployer la fonction
supabase functions deploy send-partner-confirmation
```

Ajoute les secrets dans **Settings → Edge Functions** :
```
RESEND_API_KEY = re_xxxxxxxxxx
```

Crée un compte [resend.com](https://resend.com) (gratuit jusqu'à 3000 emails/mois).
Dans la Edge Function, remplace `noreply@votredomaine.com` par ton domaine vérifié Resend.

---

## 7. Configurer l'Auth Supabase

Dans **Authentication → URL Configuration** :
- Site URL : `http://localhost:5173` (dev) / ton URL Vercel (prod)
- Redirect URLs : ajoute `http://localhost:5173/reset-password` et `https://tonapp.vercel.app/reset-password`

Dans **Authentication → Email Templates**, les templates par défaut fonctionnent.

---

## 8. Lancer en local

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:5173

---

## 9. Créer le premier compte admin

1. Inscris-toi normalement dans l'app
2. Dans **Supabase → Authentication → Users**, trouve ton user
3. Clique sur les `...` → Edit user → App Metadata → ajoute :
   ```json
   { "role": "admin" }
   ```
4. Tu as maintenant accès à `/admin`

---

## 10. Déployer sur Vercel

```bash
npm install -g vercel
vercel
```

Ajoute les variables d'environnement dans le dashboard Vercel :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`

Le `vercel.json` à la racine gère déjà le routing SPA.

---

## Checklist finale avant ouverture

- [ ] Schema SQL exécuté sans erreur
- [ ] Extensions postgis + pg_cron actives
- [ ] Buckets `avatars` et `chat-photos` créés avec policies
- [ ] `.env` rempli avec les vraies clés
- [ ] Token Mapbox valide et restreint au domaine
- [ ] Edge Function déployée + RESEND_API_KEY configuré
- [ ] Auth redirect URLs configurées
- [ ] Compte admin créé
- [ ] Test complet : inscription → onboarding → discover → like → match → chat
