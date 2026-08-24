# Campagne Meta — Konnexyon × La Papeterie

Compte : **Konnexyon** · Pays : France · Langue : français · Devise : EUR

## Le socle technique, avant toute dépense

Un **seul pixel** sur `konnexyon.com`, site et boutique confondus. C'est
le point le plus important du dispositif : les événements `Purchase` de
la boutique et les `CompleteRegistration` du site nourrissent le même
modèle. Meta apprend à reconnaître « quelqu'un qui écrit » une seule
fois, et s'en sert pour les deux.

Événements à câbler, dans cet ordre de priorité :

| Événement | Où | Sert à |
|---|---|---|
| `Purchase` (+ valeur, devise) | Confirmation de commande | Optimisation principale |
| `InitiateCheckout` | Clic « Passer commande » | Retargeting panier |
| `AddToCart` | Bouton « Ajouter » | Audience chaude |
| `ViewContent` (+ `content_ids`) | Fiche produit | Retargeting produit |
| `CompleteRegistration` | Inscription Konnexyon | Mesure de la thèse |
| `Lead` (perso. « ligne écrite ») | Première ligne du Mot du jour | Signal de qualité membre |

API Conversions en plus du pixel navigateur : sur du trafic mobile
français, le pixel seul perd entre 20 et 30 % des signaux.

## Structure

Quatre campagnes. Pas une de plus — la fragmentation tue l'apprentissage.

```
C1  ACQUISITION BOUTIQUE      Ventes · CBO           60 % du budget
C2  TEST CRÉATIF              Ventes · CBO           15 %
C3  RETARGETING               Ventes · ABO           15 %
C4  BASCULE VERS L'APP        Prospects · CBO        10 %
```

---

## C1 — Acquisition boutique · Ventes · Budget de campagne (CBO)

Objectif : Achat. Fenêtre d'attribution 7 j clic / 1 j vue.
Placements : Advantage+ (automatiques). Ne pas exclure Audience Network
avant d'avoir 50 achats — on n'a pas encore de quoi trancher.

| Ad set | Ciblage | Âge | Note |
|---|---|---|---|
| **C1-A · Advantage+ large** | Aucun intérêt, ciblage large | 25-55 | Reçoit la majorité du budget. En 2026 c'est l'ad set qui gagne presque toujours. |
| **C1-B · Papeterie & journaling** | Intérêts : Papeterie, Bullet journal, Moleskine, Calligraphie, Scrapbooking, Stylo-plume, Carterie | 25-50 | Le cœur de cible. Sert de garde-fou si le large dérape. |
| **C1-C · Lenteur & déconnexion** | Intérêts : Pleine conscience, Développement personnel, Détox numérique, Minimalisme, Lecture, Poésie | 28-52 | L'angle « fatigue du message instantané ». |
| **C1-D · Similaire 1 % acheteurs** | Lookalike 1 % FR sur `Purchase` | 25-55 | **À n'activer qu'à partir de 100 achats.** Avant, la graine est trop pauvre. |

Budget de campagne : voir les trois paliers plus bas.
Créas par ad set : 4 à 6, jamais moins. Meta a besoin de volume créatif.

---

## C2 — Test créatif · Ventes · CBO

Un seul ad set, ciblage large, budget volontairement bas. C'est le banc
d'essai : toute nouvelle vidéo passe par là avant d'entrer en C1.

- **C2-A · Banc d'essai** — large, 25-55, 6 à 8 créas en rotation.
- Règle de sortie : une créa qui n'atteint pas un CTR sortant de 1,2 %
  sur 1 500 impressions est coupée. Celle qui produit un achat à un CPA
  sous l'objectif monte en C1.
- On ne juge jamais une créa sur moins de 1 500 impressions.

---

## C3 — Retargeting · Ventes · Budget par ad set (ABO)

En ABO parce que les audiences chaudes sont petites : en CBO, Meta
dépenserait tout sur la plus grande et affamerait les autres.

| Ad set | Audience | Budget/j | Message |
|---|---|---|---|
| **C3-A · Panier abandonné 7 j** | `InitiateCheckout` OU `AddToCart` 7 j, exclure `Purchase` 30 j | 12 € | Rappel du franco de port + les 30 jours pour changer d'avis. |
| **C3-B · Visiteurs produit 14 j** | `ViewContent` 14 j, exclure `AddToCart` 14 j | 10 € | Le détail du Nécessaire, en gros plan. |
| **C3-C · Acheteurs 180 j** | `Purchase` 180 j | 8 € | L'Abonnement Correspondance et le Papier en recharge. C'est là qu'on va chercher la marge. |

---

## C4 — Bascule vers l'application · Prospects · CBO

La campagne qui referme la boucle. Budget faible, audiences minuscules,
coût par inscription dérisoire parce que ce sont des gens qui ont déjà
payé.

| Ad set | Audience | Message |
|---|---|---|
| **C4-A · Acheteurs boutique** | `Purchase` 180 j | « Vous avez de quoi écrire. Reste à savoir à qui. » |
| **C4-B · Visiteurs boutique sans achat** | Visiteurs 30 j, exclure `Purchase` | « Commencez par lire. C'est gratuit. » |

Optimisation : `CompleteRegistration`. Pas d'achat — on ne vend rien ici.

---

## Les trois paliers de budget

Meta a besoin d'environ 50 conversions par ad set et par semaine pour
sortir de l'apprentissage. En dessous de 100 €/jour au total, la machine
apprend lentement : c'est jouable, mais il faut l'accepter et donner du
temps.

### Palier 1 — Amorçage · 40 €/jour (1 200 €/mois)
On ne lance pas tout. Objectif : trouver la créa qui marche.

| Campagne | Budget/j |
|---|---|
| C1 Acquisition (C1-A seul) | 24 € |
| C2 Test créatif | 10 € |
| C3 Retargeting (C3-A seul) | 6 € |
| C4 | éteinte |

Durée : 3 semaines minimum sans y toucher. Sortie : ≥ 1 achat/jour à un
ROAS ≥ 1,8.

### Palier 2 — Croisière · 100 €/jour (3 000 €/mois)
Structure complète, C1-D toujours éteinte tant qu'on n'a pas 100 achats.

| Campagne | Budget/j |
|---|---|
| C1 Acquisition (A, B, C) | 60 € |
| C2 Test créatif | 15 € |
| C3 Retargeting (A, B, C) | 18 € |
| C4 Bascule app | 7 € |

### Palier 3 — Échelle · 250 €/jour (7 500 €/mois)
Uniquement si le ROAS tient à 2,0 sur 14 jours glissants.

| Campagne | Budget/j |
|---|---|
| C1 Acquisition (A, B, C, D) | 150 € |
| C2 Test créatif | 38 € |
| C3 Retargeting | 37 € |
| C4 Bascule app | 25 € |

Montée par paliers de +20 % tous les 3 jours. Au-delà, on relance
l'apprentissage et on casse ce qui marchait.

## Règles de conduite

1. **On ne touche à rien pendant 72 h après un lancement.** Chaque
   modification de budget ou de ciblage relance l'apprentissage.
2. **On coupe un ad set après 3 jours sans achat** si la dépense dépasse
   3 × le CPA cible.
3. **On juge au niveau campagne, jamais au niveau ad set en CBO.** Meta
   déplace le budget, c'est son travail.
4. **Une nouvelle créa par semaine, minimum.** La fatigue créative
   arrive vers 15 000 impressions par créa sur une audience française.
5. **Saisonnalité** : doubler le budget deux semaines avant la
   Saint-Valentin, la fête des mères et à partir du 15 novembre. Ce sont
   trois pics de cadeau, et le Nécessaire est un cadeau.

## Balises UTM

Le champ `source` de la table `orders` lit `utm_campaign` — c'est ce qui
permet de rapprocher une commande d'une campagne sans dépendre de
l'attribution Meta.

```
https://konnexyon.com/boutique?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```
