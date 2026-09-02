// Les quatre réponses qui tiennent lieu de profil.
// Les clés sont celles de la contrainte SQL profile_answers_slug ;
// les intitulés vivent ici pour rester modifiables sans migration.

export const MAX_ANSWER_LENGTH = 400

export const PROFILE_PROMPTS = [
  {
    slug: 'phrase_pour_commencer',
    label: 'Une phrase pour commencer',
    placeholder: 'Ce que tu dirais en premier, si on te laissait choisir.',
  },
  {
    slug: 'ce_qui_me_fait_rester',
    label: 'Ce qui me fait rester',
    placeholder: 'Une soirée, une conversation, une habitude — ce qui te retient.',
  },
  {
    slug: 'une_question',
    label: 'Une question',
    placeholder: 'Celle que tu poserais pour savoir à qui tu parles vraiment.',
  },
  {
    slug: 'ce_que_je_cherche',
    label: 'Ce que je cherche',
    placeholder: 'Pas forcément quelqu’un.',
  },
]

export const PROMPT_LABELS = Object.fromEntries(
  PROFILE_PROMPTS.map(p => [p.slug, p.label])
)

// Les six questions de la charte — inspiration affichée sur la page d'accueil
// et proposée à qui sèche devant la page blanche.
export const QUESTIONS_INSPIRATION = [
  'Une chose que tu ne dis presque jamais.',
  'Quelle phrase pourrait te faire changer d’avis ?',
  'Quel souvenir n’as-tu jamais raconté correctement ?',
  'Qu’est-ce qui te fait immédiatement apprécier quelqu’un ?',
  'Quelle conversation aimerais-tu avoir ce soir ?',
  'Quelle est la dernière chose qui t’a vraiment surpris ?',
]

// « MARION, 37 ans · Lyon » — les champs manquants ne laissent pas de séparateur orphelin
export function formatIdentity({ age, city }) {
  return [age ? `${age} ans` : null, city || null].filter(Boolean).join(' · ')
}
