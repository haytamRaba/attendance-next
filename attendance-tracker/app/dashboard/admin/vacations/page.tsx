'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminVacationsPage() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingRequests()
  }, [])

  async function loadPendingRequests() {
    const { data } = await supabase
      .from('vacations')
      .select(`
        *,
        employee:employees!vacations_employee_id_fkey (
          full_name,
          email,
          position
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    
    setPendingRequests(data || [])
    setLoading(false)
  }

  async function updateStatus(vacationId: string, status: string) {
    const { error } = await supabase
      .from('vacations')
      .update({ status })
      .eq('id', vacationId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Vacation ${status}!`)
      loadPendingRequests()
    }
  }

  if (loading) return <div className="p-8 text-center">Loading requests...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pending Vacation Requests</h1>
      
      {pendingRequests.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-medium">No pending requests - all caught up!</p>
          <p className="text-green-600 text-sm mt-1">All vacation requests have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{request.employee.full_name}</h3>
                  <p className="text-gray-600 text-sm">{request.employee.position} • {request.employee.email}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</p>
                    <p>{request.days_used} days requested</p>
                    <p>Requested on: {new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => updateStatus(request.id, 'approved')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(request.id, 'rejected')}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}