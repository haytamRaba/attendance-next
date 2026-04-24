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
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadPendingRequests()
  }, [])

  async function loadPendingRequests() {
    const { data } = await supabase
      .from('vacations')
      .select(`
        *,
        employee:employees!vacations_employee_id_fkey (
          id,
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

  async function updateStatus(vacationId: string, status: 'approved' | 'rejected', notes?: string) {
    const { error } = await supabase
      .from('vacations')
      .update({ status })
      .eq('id', vacationId)
    
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    
    // Get the request details for email
    const request = pendingRequests.find(r => r.id === vacationId)
    
    if (request) {
      try {
        const { sendVacationStatusEmail } = await import('@/app/lib/email-service')
        await sendVacationStatusEmail(
          request.employee.full_name,
          request.employee.email,
          status,
          request.start_date,
          request.end_date,
          notes
        )
        
        alert(`Vacation ${status}! ${request.employee.full_name} has been notified via email.`)
      } catch (emailError) {
        console.error('Email error:', emailError)
        alert(`Vacation ${status}! But email notification failed.`)
      }
    } else {
      alert(`Vacation ${status}!`)
    }
    
    loadPendingRequests()
    setSelectedRequest(null)
    setRejectionReason('')
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{request.employee.full_name}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      Pending
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{request.employee.position} • {request.employee.email}</p>
                  
                  <div className="mt-3 bg-gray-50 p-3 rounded">
                    <p className="font-medium text-sm">Subject: {request.subject || 'Vacation Request'}</p>
                    <p className="text-sm mt-1">Reason: {request.reason || 'No reason provided'}</p>
                  </div>
                  
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
                    onClick={() => setSelectedRequest(request)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Reject with Reason
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal with Reason */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Reject Vacation Request</h3>
            <p className="text-gray-600 mb-4">
              Rejecting request from <strong>{selectedRequest.employee.full_name}</strong>
            </p>
            
            <label className="block text-sm font-medium mb-2">
              Reason for rejection (will be emailed to employee):
            </label>
            <textarea
              rows={4}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="e.g., Business needs, insufficient notice, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateStatus(selectedRequest.id, 'rejected', rejectionReason)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}