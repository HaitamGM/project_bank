import { useState } from 'react'

// Photo de profil du client, avec repli automatique sur les initiales si l'image manque.
export default function Avatar({ photo, prenom = '', nom = '', size = 64, className = '', rounded = 'rounded-2xl' }) {
  const [err, setErr] = useState(false)
  const initials = `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase()
  const style = { width: size, height: size }

  if (photo && !err) {
    return (
      <img
        src={photo}
        alt={`${prenom} ${nom}`.trim() || 'Avatar'}
        onError={() => setErr(true)}
        style={style}
        className={`${rounded} object-cover bg-emerald-600 shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={{ ...style, fontSize: size / 2.6 }}
      className={`${rounded} bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 ${className}`}
    >
      {initials || '?'}
    </div>
  )
}
