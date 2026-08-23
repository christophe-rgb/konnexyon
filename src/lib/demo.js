// Données fictives pour le mode démo

export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@app.com',
}

export const DEMO_PROFILE = {
  id: 'demo-user-1',
  couple_name: 'Alex & Sam',
  bio: 'Couple curieux et bienveillant, nous cherchons des rencontres conviviales sans prise de tête.',
  avatar_url: null,
  orientation: 'hetero_hetero',
  looking_for: ['couple', 'woman'],
  seeking: ['rencontres_occasionnelles', 'amis_libertins'],
  availabilities: ['weekend', 'rdv'],
  limits: ['discretion', 'preservatif'],
  max_distance_km: 50,
  visibility: 'public',
  status: 'active',
  hide_location: false,
  email_1: 'demo@app.com',
  email_1_confirmed: true,
  email_2: null,
  email_2_confirmed: false,
  distance_km: 0,
}

export const DEMO_PROFILES = [
  {
    id: 'demo-2',
    couple_name: 'Marc & Julie',
    bio: 'Couple hétéro de 35 ans, ouverts et discrets. Nous cherchons des amis libertins pour des soirées sympa.',
    avatar_url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80',
    orientation: 'hetero_hetero',
    looking_for: ['couple'],
    seeking: ['echangisme', 'amis_libertins'],
    limits: ['discretion', 'pas_photo'],
    distance_km: 8,
    lng: 3.88, lat: 43.61,
  },
  {
    id: 'demo-3',
    couple_name: 'Tom & Léa',
    bio: 'Bisexuels tous les deux, on aime rencontrer des gens ouverts d\'esprit. Préférence pour les couples.',
    avatar_url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80',
    orientation: 'bi_all',
    looking_for: ['couple', 'woman'],
    seeking: ['decouverte', 'rencontres_occasionnelles'],
    limits: ['preservatif', 'discretion'],
    distance_km: 14,
    lng: 3.87, lat: 43.62,
  },
  {
    id: 'demo-4',
    couple_name: 'Pierre & Marie',
    bio: 'Couple expérimenté, 40 ans, cherchons des rencontres de qualité dans la bonne humeur.',
    avatar_url: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80',
    orientation: 'hetero_bi',
    looking_for: ['couple'],
    seeking: ['echangisme', 'rencontres_occasionnelles'],
    limits: ['preservatif', 'pas_contact_hors_site'],
    distance_km: 23,
    lng: 3.90, lat: 43.59,
  },
  {
    id: 'demo-5',
    couple_name: 'Chris & Jordan',
    bio: 'Nouveaux dans le milieu, curieux et respectueux. On prend notre temps.',
    avatar_url: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&q=80',
    orientation: 'bi_all',
    looking_for: ['couple', 'woman', 'man'],
    seeking: ['decouverte'],
    limits: ['pas_photo', 'discretion'],
    distance_km: 31,
    lng: 3.85, lat: 43.64,
  },
  {
    id: 'demo-6',
    couple_name: 'Nico & Lisa',
    bio: 'Couple actif qui aime les soirées festives. Ouverts et sans tabous.',
    avatar_url: 'https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?w=600&q=80',
    orientation: 'hetero_hetero',
    looking_for: ['couple'],
    seeking: ['echangisme', 'amis_libertins', 'rencontres_occasionnelles'],
    limits: ['preservatif'],
    distance_km: 45,
    lng: 3.92, lat: 43.57,
  },
]

export const DEMO_MATCHES = [
  {
    id: 'match-1',
    couple_a: 'demo-user-1',
    couple_b: 'demo-2',
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    profile: DEMO_PROFILES[0],
    lastMessage: 'Avec plaisir ! On vous propose samedi soir ?',
  },
  {
    id: 'match-2',
    couple_a: 'demo-user-1',
    couple_b: 'demo-3',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    profile: DEMO_PROFILES[1],
    lastMessage: null,
  },
]

export const DEMO_MESSAGES = {
  'match-1': [
    {
      id: 'msg-1',
      match_id: 'match-1',
      sender_id: 'demo-2',
      content: 'Bonjour ! Votre profil nous a beaucoup plu 😊',
      photo_url: null,
      read_at: new Date().toISOString(),
      deleted_for: [],
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 1000).toISOString(),
    },
    {
      id: 'msg-2',
      match_id: 'match-1',
      sender_id: 'demo-user-1',
      content: 'Bonjour Marc & Julie ! Pareil de notre côté, on est ravis du match 🙂',
      photo_url: null,
      read_at: new Date().toISOString(),
      deleted_for: [],
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 2000).toISOString(),
    },
    {
      id: 'msg-3',
      match_id: 'match-1',
      sender_id: 'demo-2',
      content: 'On serait dispo pour se rencontrer prochainement, vous êtes libres quand ?',
      photo_url: null,
      read_at: new Date().toISOString(),
      deleted_for: [],
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'msg-4',
      match_id: 'match-1',
      sender_id: 'demo-user-1',
      content: 'Avec plaisir ! On vous propose samedi soir ?',
      photo_url: null,
      read_at: new Date().toISOString(),
      deleted_for: [],
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ],
  'match-2': [],
}

// ─── Mot du jour (mode démo) ──────────────────────────────────

export const DEMO_WORD = {
  id: 'demo-word-1',
  word: 'Seuil',
  publish_date: '2026-08-23',
}

export const DEMO_RESPONSES = [
  { id: 'demo-r-1', user_id: 'demo-2', pseudo: 'Marc & Julie',    line: 'On a hésité si longtemps devant la porte que la nuit est passée derrière nous.' },
  { id: 'demo-r-2', user_id: 'demo-3', pseudo: 'Camille & Théo',  line: 'Le paillasson dit bienvenue à des gens qui ne viennent plus.' },
  { id: 'demo-r-3', user_id: 'demo-4', pseudo: 'Inès & Rachid',   line: 'J’ai posé mes clés sur la table sans savoir si je repartais.' },
  { id: 'demo-r-4', user_id: 'demo-5', pseudo: 'Louise & Pierre', line: 'Il faut deux courages : celui d’entrer, et celui de rester.' },
]

export const DEMO_CARNET = [
  { id: 'demo-c-1', word: 'Marée',    publish_date: '2026-08-22', line: 'Elle revient toujours, c’est bien ça le problème.' },
  { id: 'demo-c-2', word: 'Insomnie', publish_date: '2026-08-21', line: 'À trois heures, la maison respire sans moi.' },
  { id: 'demo-c-3', word: 'Presque',  publish_date: '2026-08-20', line: 'Le plus long des mots, quand on le dit à voix basse.' },
]
