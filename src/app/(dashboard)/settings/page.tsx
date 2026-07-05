import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

// Página de ajustes — carga el perfil del usuario desde Supabase
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <SettingsClient profile={profile} email={user.email ?? ''} />
}
