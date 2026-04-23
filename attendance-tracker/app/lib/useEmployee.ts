import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


const EMAIL = 'haytamemsi@raba.com'

export function useEmployee() {
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('email', EMAIL)
          .single()
        
        if (error) throw error
        setEmployee(data)
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching employee:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEmployee()
  }, [])

  return { employee, loading, error }
}