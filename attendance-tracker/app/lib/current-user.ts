import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export async function getCurrentUser() {
  const { data: admin } = await supabase
    .from('employees')
    .select('*')
    .eq('role', 'admin')
    .limit(1)
    .single()
  
  return admin
}

export async function getCurrentEmployeeId() {
  const user = await getCurrentUser()
  return user?.id
}