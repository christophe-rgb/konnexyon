import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Home() {
  const { user, profile, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login')
    else if (!profile?.email_1_confirmed) navigate('/onboarding')
    else navigate('/discover')
  }, [user, profile, loading, navigate])

  return null
}
