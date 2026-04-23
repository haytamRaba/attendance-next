import { createClient } from '@supabase/supabase-js'

// This runs on the server
async function getEmployeeStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // add authentication later
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('email', 'haytamemsi@raba.com')
    .single()
  
  // Get today's attendance if exists
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employee?.id)
    .gte('check_in', new Date().toISOString().split('T')[0]) // Today from midnight
    .maybeSingle()
  
  return { employee, todayAttendance }
}

export default async function DashboardHome() {
  const { employee, todayAttendance } = await getEmployeeStats()
  
  if (!employee) {
    return <div className="text-center text-red-800 py-10">No employee data found</div>
  }
  
  return (
    <div>
      <h1 className="text-3xl text-gray-800 font-bold mb-6">
        Welcome back, {employee.full_name}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800  mb-4">Today's Status</h2>
          {todayAttendance ? (
            <div>
              <p className="text-green-600"> Checked in at {new Date(todayAttendance.check_in).toLocaleTimeString()}</p>
              {todayAttendance.check_out && (
                <p>Checked out at {new Date(todayAttendance.check_out).toLocaleTimeString()}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-900">Not checked in yet today</p>
          )}
        </div>
        
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold  text-gray-800 mb-4">Quick Stats</h2>
          <p className="text-gray-900">Hire date: {new Date(employee.hire_date).toLocaleDateString()}</p>
          <p className="text-gray-900">Position: {employee.position}</p>
        </div>
      </div>
    </div>
  )
}