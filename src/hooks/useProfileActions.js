import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { validateImageFile, validateImageMagicBytes } from '../lib/upload'
import { toast } from '../components/Toast'
import { confirm } from '../components/ConfirmDialog'

export function useProfileActions(uid) {
  const myProfile    = useAuthStore(s => s.profile)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const navigate     = useNavigate()

  const [liked,   setLiked]   = useState(false)
  const [liking,  setLiking]  = useState(false)
  const [matched, setMatched] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const connectingRef = useRef(false)
  const reportingRef  = useRef(false)

  const checkMatch = useCallback(async () => {
    if (!myProfile?.id || !uid) return
    const a = myProfile.id < uid ? myProfile.id : uid
    const b = myProfile.id < uid ? uid : myProfile.id
    const { data } = await supabase.from('matches')
      .select('id').eq('couple_a', a).eq('couple_b', b).single()
    setMatched(!!data)
  }, [myProfile?.id, uid])

  const checkLike = useCallback(async () => {
    if (!myProfile?.id || !uid) return
    const { data } = await supabase.from('likes')
      .select('id').eq('from_id', myProfile.id).eq('to_id', uid).single()
    setLiked(!!data)
  }, [myProfile?.id, uid])

  const handleConnect = async () => {
    if (connectingRef.current) return
    connectingRef.current = true
    setLiking(true)
    try {
      if (liked) {
        const { error } = await supabase.from('likes').delete().eq('from_id', myProfile.id).eq('to_id', uid)
        if (error) { toast('Erreur : impossible de retirer la connexion', 'error'); return }
        setLiked(false)
      } else {
        const { error } = await supabase.from('likes').insert({ from_id: myProfile.id, to_id: uid })
        if (error && error.code !== '23505') { toast(`Erreur : ${error.message}`, 'error'); return }
        setLiked(true)
        toast('Demande de connexion envoyée ✓')
        await new Promise(r => setTimeout(r, 300))
        checkMatch()
      }
    } finally {
      connectingRef.current = false
      setLiking(false)
    }
  }

  const block = async () => {
    const ok = await confirm({
      title: 'Bloquer ce couple',
      message: 'Le match et les contacts seront supprimés. Continuer ?',
      confirmLabel: 'Bloquer',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('blocks').insert({ blocker_id: myProfile.id, blocked_id: uid })
    if (error && error.code !== '23505') { toast(`Erreur : ${error.message}`, 'error'); return }
    toast('Couple bloqué')
    navigate('/discover')
  }

  const report = async (reason) => {
    if (!reason.trim()) return false
    if (reportingRef.current) return false
    reportingRef.current = true
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: myProfile.id,
        reported_id: uid,
        reason,
      })
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return false }
      toast('Signalement envoyé')
      return true
    } finally {
      reportingRef.current = false
    }
  }

  const uploadAvatar = async (file) => {
    const check = validateImageFile(file)
    if (!check.ok) { toast(check.error, 'error'); return }
    const magic = await validateImageMagicBytes(file)
    if (!magic.ok) { toast(magic.error, 'error'); return }
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${myProfile.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast(`Erreur upload : ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', myProfile.id)
      if (dbErr) { toast(`Erreur sauvegarde : ${dbErr.message}`); return }
      await fetchProfile(myProfile.id)
      toast('Photo mise à jour ✓')
    } catch {
      toast("Erreur inattendue lors de l'upload")
    }
  }

  const deleteAvatar = async () => {
    const ok = await confirm({
      title: 'Supprimer la photo',
      message: 'Supprimer votre photo de profil ?',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      const url = myProfile.avatar_url || ''
      const filename = url.split('/').pop()
      if (filename) await supabase.storage.from('avatars').remove([`${myProfile.id}/${filename}`])
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', myProfile.id)
      await fetchProfile(myProfile.id)
      toast('Photo supprimée')
    } catch {
      toast('Erreur lors de la suppression')
    }
  }

  const save = async (form, { setEditing }) => {
    setSaving(true)
    try {
      const orientationMap = {
        'hetero-hetero': 'hetero_hetero',
        'hetero-bi':     'hetero_bi',
        'bi-hetero':     'hetero_bi',
        'bi-bi':         'bi_all',
      }
      const { orientation_lui, orientation_elle } = form
      const orientation = orientationMap[`${orientation_lui}-${orientation_elle}`] || 'hetero_hetero'
      const { couple_name, bio, seeking, limits, availabilities } = form
      const { error } = await supabase
        .from('profiles')
        .update({ couple_name, bio, seeking, limits, availabilities, orientation })
        .eq('id', myProfile.id)
      if (error) {
        toast('Erreur lors de la sauvegarde — ' + (error.message || 'réessayez'))
        return
      }
      await fetchProfile(myProfile.id)
      setEditing(false)
      navigate('/discover?view=map')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Exception save():', err)
      toast('Une erreur inattendue est survenue')
    } finally {
      setSaving(false)
    }
  }

  return {
    liked, liking, matched, saving,
    checkLike, checkMatch,
    handleConnect, block, report,
    uploadAvatar, deleteAvatar, save,
  }
}
