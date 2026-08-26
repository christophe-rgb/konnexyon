// Données fictives pour le mode démo — des personnes, pas des couples.

export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@konnexyon.fr',
}

export const DEMO_PROFILE = {
  id: 'demo-user-1',
  display_name: 'Camille',
  age: 34,
  city: 'Montpellier',
  max_distance_km: 50,
  visibility: 'public',
  status: 'active',
  hide_location: false,
  email_1: 'demo@konnexyon.fr',
  email_1_confirmed: true,
}

// ─── Mot du jour ──────────────────────────────────────────────

export const DEMO_WORD = {
  id: 'demo-word-1',
  word: 'Seuil',
  publish_date: '2026-08-23',
}

export const DEMO_RESPONSES = [
  { id: 'demo-r-1', user_id: 'demo-2', pseudo: 'Marion',  line: 'On a hésité si longtemps devant la porte que la nuit est passée derrière nous.' },
  { id: 'demo-r-2', user_id: 'demo-3', pseudo: 'Théo',    line: 'Le paillasson dit bienvenue à des gens qui ne viennent plus.' },
  { id: 'demo-r-3', user_id: 'demo-4', pseudo: 'Inès',    line: 'J’ai posé mes clés sur la table sans savoir si je repartais.' },
  { id: 'demo-r-4', user_id: 'demo-5', pseudo: 'Louise',  line: 'Il faut deux courages : celui d’entrer, et celui de rester.' },
]

// la liste de lecture ajoute l'âge, la ville et la position
export const DEMO_READING = [
  { compatibility: 88, user_id: 'demo-2', display_name: 'Marion', age: 37, city: 'Lyon',        line: DEMO_RESPONSES[0].line, distance_km: 4,  deja_connecte: false, passe: false,  lng: 4.8357, lat: 45.7640 },
  { compatibility: 62, user_id: 'demo-3', display_name: 'Théo',   age: 41, city: 'Villeurbanne', line: DEMO_RESPONSES[1].line, distance_km: 7,  deja_connecte: true,  passe: false,  lng: 4.8800, lat: 45.7700 },
  { compatibility: 74, user_id: 'demo-4', display_name: 'Inès',   age: 29, city: 'Lyon',        line: DEMO_RESPONSES[2].line, distance_km: 2,  deja_connecte: false, passe: true,  lng: 4.8300, lat: 45.7580 },
  { compatibility: 41, user_id: 'demo-5', display_name: 'Louise', age: 35, city: 'Écully',      line: DEMO_RESPONSES[3].line, distance_km: 11, deja_connecte: false, passe: false, lng: 4.7780, lat: 45.7740 },
]

export const DEMO_CARNET = [
  { id: 'demo-c-1', word: 'Marée',    publish_date: '2026-08-22', line: 'Elle revient toujours, c’est bien ça le problème.' },
  { id: 'demo-c-2', word: 'Insomnie', publish_date: '2026-08-21', line: 'À trois heures, la maison respire sans moi.' },
  { id: 'demo-c-3', word: 'Presque',  publish_date: '2026-08-20', line: 'Le plus long des mots, quand on le dit à voix basse.' },
]

// ─── Connexions (mode démo) ───────────────────────────────────

export const DEMO_MATCHES = DEMO_READING.map((p, i) => ({
  id: `demo-match-${i + 1}`,
  created_at: new Date(2026, 7, 23 - i).toISOString(),
  profile: { id: p.user_id, display_name: p.display_name, age: p.age, city: p.city },
}))

export const DEMO_MESSAGES = {
  'demo-match-1': [
    { id: 'dm-1', match_id: 'demo-match-1', sender_id: 'demo-2',      content: 'J’ai relu ta réponse.',                 created_at: '2026-08-23T09:12:00.000Z', read_at: null },
    { id: 'dm-2', match_id: 'demo-match-1', sender_id: 'demo-user-1', content: 'Et ?',                                   created_at: '2026-08-23T09:20:00.000Z', read_at: null },
    { id: 'dm-3', match_id: 'demo-match-1', sender_id: 'demo-2',      content: 'Je crois que je ne suis pas d’accord avec toi.', created_at: '2026-08-23T09:24:00.000Z', read_at: null },
    { id: 'dm-4', match_id: 'demo-match-1', sender_id: 'demo-user-1', content: 'Tant mieux. C’est le début d’une bonne conversation.', created_at: '2026-08-23T09:31:00.000Z', read_at: null },
  ],
  'demo-match-2': [
    { id: 'dm-5', match_id: 'demo-match-2', sender_id: 'demo-3', content: 'Ta ligne d’hier m’a tenu éveillé.', created_at: '2026-08-22T22:40:00.000Z', read_at: null },
  ],
}
