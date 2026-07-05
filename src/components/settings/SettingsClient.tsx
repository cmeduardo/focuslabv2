'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const UNIVERSIDADES = [
  'USAC', 'URL', 'UVG', 'UFM', 'UNIS', 'USEMI', 'Galileo', 'Mariano Gálvez', 'Otra',
]

const CARRERAS = [
  'Ingeniería en Sistemas',
  'Ingeniería en Ciencias y Sistemas',
  'Ciencias de la Computación',
  'Ingeniería Industrial',
  'Administración de Empresas',
  'Psicología',
  'Medicina',
  'Derecho',
  'Arquitectura',
  'Diseño Gráfico',
  'Comunicación',
  'Otra',
]

const TIMEZONES = [
  { value: 'America/Guatemala', label: 'Guatemala (UTC-6)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/New_York', label: 'Nueva York (UTC-5)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
]

interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  university?: string
  career?: string
  semester?: number
  timezone?: string
  onboarding_completed: boolean
}

interface Props {
  profile: Profile | null
  email: string
}

// Componente de campo de formulario reutilizable
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors'

export default function SettingsClient({ profile, email }: Props) {
  const router = useRouter()

  // --- Estado del formulario de perfil ---
  const [profileForm, setProfileForm] = useState({
    fullName: profile?.full_name ?? '',
    username: profile?.username ?? '',
    university: profile?.university ?? '',
    career: profile?.career ?? '',
    semester: String(profile?.semester ?? '1'),
    timezone: profile?.timezone ?? 'America/Guatemala',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // --- Estado del formulario de contraseña ---
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  function updateProfile(field: string, value: string) {
    setProfileForm(prev => ({ ...prev, [field]: value }))
    setProfileSuccess(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    if (!profile) return

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.fullName,
        username: profileForm.username,
        university: profileForm.university || null,
        career: profileForm.career || null,
        semester: parseInt(profileForm.semester) || null,
        timezone: profileForm.timezone,
      })
      .eq('id', profile.id)

    if (error) {
      if (error.message.includes('username')) {
        setProfileError('Ese nombre de usuario ya está en uso.')
      } else {
        setProfileError('Error al guardar los cambios. Intenta de nuevo.')
      }
      setProfileLoading(false)
      return
    }

    setProfileSuccess(true)
    setProfileLoading(false)
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()

    // Verificar contraseña actual haciendo re-login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordForm.current,
    })

    if (signInError) {
      setPasswordError('La contraseña actual es incorrecta.')
      setPasswordLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })

    if (error) {
      setPasswordError('Error al cambiar la contraseña. Intenta de nuevo.')
      setPasswordLoading(false)
      return
    }

    setPasswordSuccess(true)
    setPasswordForm({ current: '', next: '', confirm: '' })
    setPasswordLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-3xl font-bold text-white mb-1">Ajustes</h1>
        <p className="text-slate-400 text-sm">Gestiona tu perfil y preferencias.</p>
      </motion.div>

      {/* --- Sección: Perfil --- */}
      <motion.section
        className="glass-card rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          👤 Perfil
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre completo">
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => updateProfile('fullName', e.target.value)}
                className={inputClass}
                placeholder="Tu nombre"
              />
            </Field>
            <Field label="Nombre de usuario">
              <input
                type="text"
                value={profileForm.username}
                onChange={e => updateProfile('username', e.target.value)}
                required
                className={inputClass}
                placeholder="@usuario"
              />
            </Field>
          </div>

          <Field label="Correo electrónico">
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} opacity-50 cursor-not-allowed`}
            />
            <p className="text-xs text-slate-500 mt-1">El correo no se puede cambiar desde aquí.</p>
          </Field>

          <Field label="Universidad">
            <select
              value={profileForm.university}
              onChange={e => updateProfile('university', e.target.value)}
              className={inputClass}
            >
              <option value="" className="bg-[#1A1A2E]">Sin especificar</option>
              {UNIVERSIDADES.map(u => (
                <option key={u} value={u} className="bg-[#1A1A2E]">{u}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Carrera">
              <select
                value={profileForm.career}
                onChange={e => updateProfile('career', e.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-[#1A1A2E]">Sin especificar</option>
                {CARRERAS.map(c => (
                  <option key={c} value={c} className="bg-[#1A1A2E]">{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Semestre actual">
              <select
                value={profileForm.semester}
                onChange={e => updateProfile('semester', e.target.value)}
                className={inputClass}
              >
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(s => (
                  <option key={s} value={s} className="bg-[#1A1A2E]">Semestre {s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Zona horaria">
            <select
              value={profileForm.timezone}
              onChange={e => updateProfile('timezone', e.target.value)}
              className={inputClass}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value} className="bg-[#1A1A2E]">
                  {tz.label}
                </option>
              ))}
            </select>
          </Field>

          {profileError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              ✓ Perfil actualizado correctamente.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {profileLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </motion.section>

      {/* --- Sección: Contraseña --- */}
      <motion.section
        className="glass-card rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          🔑 Contraseña
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Contraseña actual">
            <input
              type="password"
              value={passwordForm.current}
              onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nueva contraseña">
              <input
                type="password"
                value={passwordForm.next}
                onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))}
                required
                className={inputClass}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>
            <Field label="Confirmar nueva contraseña">
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                required
                className={inputClass}
                placeholder="Repite la contraseña"
              />
            </Field>
          </div>

          {passwordError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              ✓ Contraseña actualizada correctamente.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {passwordLoading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </motion.section>

      {/* --- Sección: Sesión --- */}
      <motion.section
        className="glass-card rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          🚪 Sesión
        </h2>
        <p className="text-slate-400 text-sm mb-5">
          Conectado como <span className="text-white">{email}</span>
        </p>
        <button
          onClick={handleSignOut}
          className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
        >
          Cerrar sesión
        </button>
      </motion.section>
    </div>
  )
}
