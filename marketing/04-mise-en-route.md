# Mise en route — l'ordre des opérations

Tout est paramétré **en pause**. Rien ne dépense un euro tant que les
étapes ci-dessous ne sont pas faites, dans cet ordre.

## 1. Avant la première commande (bloquant)

- [ ] **Fournisseurs.** Six références sur huit sont sourçables en
      dropshipping (sceaux laiton, cire, porte-plume, encres, papier).
      Le Carnet du Mot du jour et les Cartes-questions doivent être
      **imprimés** : c'est un vrai imprimeur, pas du print-on-demand
      générique, sinon la qualité ne tient pas le prix affiché.
- [ ] **Stripe.** Créer le compte, puis déployer la fonction edge
      `creer-paiement` avec la clé secrète. Le front l'appelle déjà —
      tant qu'elle n'existe pas, le bouton « Passer commande » affiche
      un message honnête au lieu de planter.
- [ ] **Appliquer la migration** `20260824000000_boutique.sql` sur
      Supabase (elle crée le catalogue, les commandes et leurs RLS).
- [ ] **Mentions légales boutique** : CGV, délai de rétractation 14 jours
      légal (on annonce 30, c'est un engagement commercial au-dessus de
      la loi), coordonnées du vendeur. Les CGU actuelles couvrent le
      site, pas la vente de biens.

## 2. Avant la première publicité (bloquant)

- [ ] **Pixel unique** sur `konnexyon.com` — site et boutique. C'est le
      cœur du dispositif : un seul pixel pour les deux projets.
- [ ] **API Conversions** en doublon du pixel navigateur.
- [ ] Les six événements listés dans `01-campagne-meta.md` câblés et
      vérifiés dans le testeur d'événements Meta.
- [ ] **Audiences personnalisées** créées à la main dans Ads Manager,
      avec exactement ces noms — le CSV les appelle par leur nom :
      `AddToCart_7j`, `InitiateCheckout_7j`, `ViewContent_14j`,
      `AddToCart_14j`, `Acheteurs_30j`, `Acheteurs_180j`,
      `Visiteurs_boutique_30j`.
- [ ] **Deux vidéos minimum** tournées : V1 (la cire) et V3 (le
      déballage). Ne pas attendre les six.

## 3. Import de la campagne

1. Ads Manager → Créer → **Importer** → déposer `03-meta-import.csv`.
2. Tout arrive **en pause**. Vérifier avant de publier.
3. Les colonnes `Video File Name` portent des noms de fichiers, pas des
   identifiants : téléverser les vidéos, puis rattacher chaque créa à sa
   ligne. Meta ne peut pas deviner un fichier qu'il n'a pas.
4. `C1-D` (similaire 1 % acheteurs) reste **en pause jusqu'à 100 achats**.
   Le nom de l'ad set le rappelle.
5. Passer au palier 1 (40 €/jour) : n'activer que `C1-A`, `C2-A`, `C3-A`,
   et ramener le budget de C1 à 24 €/jour.

## 4. TrendTrack

Deux branchements, deux usages :

**En conversation** — le connecteur MCP est déjà déclaré dans
`.mcp.json`. Il reste à l'autoriser une fois :
Claude → Réglages → Connecteurs → Ajouter un connecteur → coller
`https://api.trendtrack.io/v1/mcp` → se connecter en OAuth. Pas de clé à
copier. C'est une action à faire à la main, l'OAuth ne peut pas être
automatisé depuis ici.

**En autonomie** — pour la veille planifiée :

```bash
export TRENDTRACK_API_KEY=tt_...
node scripts/trendtrack.mjs veille
```

Dépose dans `marketing/veille/` un JSON daté et un digest lisible des
publicités actives sur nos huit termes de rayon. La facturation
TrendTrack se fait à la ligne renvoyée : le script journalise le coût de
chaque appel et plafonne les limites.

## 5. Les deux semaines qui suivent

| Jour | Ce qu'on fait |
|---|---|
| J0 | Palier 1 activé. On ne touche plus à rien. |
| J+3 | Première lecture. On regarde le CTR sortant, pas le ROAS — trop tôt. |
| J+7 | On coupe les créas sous 1,2 % de CTR sortant sur 1 500 impressions. |
| J+14 | Première décision de ROAS. ≥ 1,8 → palier 2. Sinon on retourne au créatif, pas au ciblage. |

Le réflexe à éviter : toucher au ciblage quand ça ne marche pas. En 2026
sur Meta, un échec est presque toujours un échec créatif.
