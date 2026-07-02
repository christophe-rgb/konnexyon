import { create } from 'zustand'

// État partagé du lecteur de musique. Le composant MusicPlayer (invisible :
// juste la balise <audio> + la logique) pousse son état ici ; la barre de
// navigation (Navbar) lit cet état pour afficher le vumètre et les contrôles.
export const useMusic = create(() => ({
  active:    false,         // lecteur actif (connecté, prêt, pistes, non fermé)
  available: false,         // des pistes existent (même si le lecteur est fermé)
  playing:   false,
  title:     'Konnexyon',
  analyser:  null,          // AnalyserNode Web Audio (vumètre réactif) ou null
  toggle:    () => {},
  next:      () => {},
  close:     () => {},
  reopen:    () => {},      // rouvre le lecteur après une fermeture
}))
