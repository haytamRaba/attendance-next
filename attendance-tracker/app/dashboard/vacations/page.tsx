'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Moroccan labor law: 1.5 days per month = 18 days per year
const DAYS_PER_MONTH = 1.5

export default function VacationsPage() {
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [vacations, setVacations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    subject: '',
    reason: ''
  })
  const [stats, setStats] = useState({
    totalDaysUsed: 0,
    daysRemaining: 0,
    accruedDays: 0
  })
  const [emailStatus, setEmailStatus] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Get employee (using your email)
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'haytamemsi@raba.com')
      .single()
    
    if (empData) {
      setEmployee(empData)
      await loadVacations(empData.id)
      await calculateVacationStats(empData.hire_date, empData.id)
    }
    
    setLoading(false)
  }

  async function loadVacations(employeeId: string) {
    const { data } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
    
    setVacations(data || [])
  }

  async function calculateVacationStats(hireDate: string, employeeId: string) {
    const hire = new Date(hireDate)
    const now = new Date()
    const monthsWorked = (now.getFullYear() - hire.getFullYear()) * 12 + 
                         (now.getMonth() - hire.getMonth())
    
    const accrued = monthsWorked * DAYS_PER_MONTH
    
    const { data: approvedVacations } = await supabase
      .from('vacations')
      .select('days_used')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
    
    const used = approvedVacations?.reduce((sum, v) => sum + v.days_used, 0) || 0
    
    setStats({
      totalDaysUsed: used,
      daysRemaining: Math.max(0, Math.floor(accrued) - used),
      accruedDays: Math.floor(accrued)
    })
  }

  function calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  async function checkOverlap(startDate: string, endDate: string): Promise<boolean> {
    if (!employee) return false
    
    const { data: existingVacations } = await supabase
      .from('vacations')
      .select('start_date, end_date, status')
      .eq('employee_id', employee.id)
      .in('status', ['approved', 'pending'])
    
    if (!existingVacations || existingVacations.length === 0) {
      return false
    }
    
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)
    
    for (const vac of existingVacations) {
      const existingStart = new Date(vac.start_date)
      const existingEnd = new Date(vac.end_date)
      
      if (newStart <= existingEnd && newEnd >= existingStart) {
        return true
      }
    }
    
    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const daysRequested = calculateDaysBetween(formData.start_date, formData.end_date)
    
    // Validation checks
    if (daysRequested > stats.daysRemaining) {
      alert(`You only have ${stats.daysRemaining} days remaining. Requested: ${daysRequested} days`)
      setLoading(false)
      return
    }
    
    const hasOverlap = await checkOverlap(formData.start_date, formData.end_date)
    if (hasOverlap) {
      alert('You already have a vacation request for these dates!')
      setLoading(false)
      return
    }
    
    if (!formData.subject.trim()) {
      alert('Please enter a subject for your vacation request')
      setLoading(false)
      return
    }
    
    if (!formData.reason.trim()) {
      alert('Please provide a reason for your vacation request')
      setLoading(false)
      return
    }
    
    // Submit to database
    const { data: newVacation, error } = await supabase
      .from('vacations')
      .insert({
        employee_id: employee.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_used: daysRequested,
        status: 'pending',
        subject: formData.subject,
        reason: formData.reason
      })
      .select()
      .single()
    
    if (error) {
      alert('Error submitting request: ' + error.message)
    } else {
      // Try to send email notification
      try {
        const { sendVacationRequestEmail } = await import('@/app/lib/email-service')
        const emailSent = await sendVacationRequestEmail(
          employee.full_name,
          employee.email,
          formData.subject,
          formData.reason,
          formData.start_date,
          formData.end_date,
          daysRequested
        )
        
        if (emailSent) {
          setEmailStatus({
            show: true,
            message: 'Vacation request submitted! RH has been notified via email.',
            type: 'success'
          })
        } else {
          setEmailStatus({
            show: true,
            message: 'Request submitted but email notification failed. RH will still see it in dashboard.',
            type: 'error'
          })
        }
      } catch (emailError) {
        console.error('Email error:', emailError)
        setEmailStatus({
          show: true,
          message: 'Request submitted but email notification could not be sent.',
          type: 'error'
        })
      }
      
      setShowForm(false)
      setFormData({ start_date: '', end_date: '', subject: '', reason: '' })
      await loadData()
      
      // Hide status message after 5 seconds
      setTimeout(() => {
        setEmailStatus({ show: false, message: '', type: 'success' })
      }, 5000)
    }
    
    setLoading(false)
  }

  if (!employee) return <div className="p-8 text-center">Loading employee data...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vacation Manager</h1>
      
      {/* Status Message */}
      {emailStatus.show && (
        <div className={`mb-4 p-4 rounded-lg ${
          emailStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          {emailStatus.message}
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Accrued Days</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.accruedDays}</p>
          <p className="text-xs text-gray-500">Since hire date</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Used Days</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.totalDaysUsed}</p>
          <p className="text-xs text-gray-500">Approved vacations only</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Remaining Days</h3>
          <p className="text-3xl font-bold text-green-600">{stats.daysRemaining}</p>
          <p className="text-xs text-gray-500">Based on Moroccan law (18 days/year)</p>
        </div>
      </div>
      
      {/* Request Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Request Vacation'}
        </button>
      </div>
      
      {/* Request Form with Subject and Reason */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">New Vacation Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Annual Leave, Family Event, Medical Leave"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for vacation <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Please provide details about your vacation request..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            {formData.start_date && formData.end_date && (
              <div className="text-sm bg-gray-50 p-3 rounded">
                <strong>Summary:</strong> You are requesting {calculateDaysBetween(formData.start_date, formData.end_date)} days
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 w-full"
            >
              {loading ? 'Submitting...' : 'Submit Request & Notify RH'}
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              📧 RH will be notified via email immediately
            </p>
          </form>
        </div>
      )}
      
      {/* Vacation History - Now showing subjects too */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">My Vacation History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vacations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No vacation requests yet
                  </td>
                </tr>
              ) : (
                vacations.map((vacation) => (
                  <tr key={vacation.id}>
                    <td className="px-6 py-4 font-medium">{vacation.subject || 'Vacation'}</td>
                    <td className="px-6 py-4">
                      {new Date(vacation.start_date).toLocaleDateString()} → {new Date(vacation.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{vacation.days_used}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vacation.status === 'approved' ? 'bg-green-100 text-green-800' :
                        vacation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vacation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {vacation.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">📧 How it works:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Fill in subject and reason for your vacation</li>
          <li>• RH receives an email notification immediately</li>
          <li>• You'll get an email when your request is approved/rejected</li>
          <li>• Moroccan labor law: 1.5 days per month (18 days/year)</li>
        </ul>
      </div>
    </div>
  )
}