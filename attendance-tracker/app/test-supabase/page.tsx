import { createClient } from '@supabase/supabase-js'

export default async function TestSupabasePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
        ) : (
        <div>
          <p className="text-green-600 mb-4">✓ Connected successfully!</p>
          <p className="font-semibold">Employees in database:</p>
          <pre className="mt-2 p-4 text-blue-700 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(employees, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}