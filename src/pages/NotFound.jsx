import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 text-center px-4">
      <h1 className="text-4xl font-bold text-gold">404</h1>
      <p className="text-lg text-text/70">Page introuvable</p>
      <Link to="/" className="text-gold underline hover:opacity-80 transition-opacity">
        Retour à l'accueil
      </Link>
    </div>
  )
}
