'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Moroccan labor law: 1.5 days per month = 18 days per year
const DAYS_PER_MONTH = 1.5
const TOTAL_ANNUAL_DAYS = 18

export default function VacationsPage() {
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [vacations, setVacations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: ''
  })
  const [stats, setStats] = useState({
    totalDaysUsed: 0,
    daysRemaining: 0,
    accruedDays: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Get employee
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
      .single()
    
    if (empData) {
      setEmployee(empData)
      await loadVacations(empData.id)
      calculateVacationStats(empData.hire_date, empData.id)
    }
    
    setLoading(false)
  }

  async function loadVacations(employeeId: string) {
    const { data } = await supabase
      .from('vacations')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false })
    
    setVacations(data || [])
  }

  async function calculateVacationStats(hireDate: string, employeeId: string) {
    // Calculate accrued days based on hire date
    const hire = new Date(hireDate)
    const now = new Date()
    const monthsWorked = (now.getFullYear() - hire.getFullYear()) * 12 + 
                         (now.getMonth() - hire.getMonth())
    
    const accrued = monthsWorked * DAYS_PER_MONTH
    
    // Get used days from approved vacations
    const { data: approvedVacations } = await supabase
      .from('vacations')
      .select('days_used')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
    
    const used = approvedVacations?.reduce((sum, v) => sum + v.days_used, 0) || 0
    
    setStats({
      totalDaysUsed: used,
      daysRemaining: Math.max(0, accrued - used),
      accruedDays: Math.floor(accrued * 10) / 10 
    })
  }

  function calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both days
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const daysRequested = calculateDaysBetween(formData.start_date, formData.end_date)
    
    // Check if enough days remaining
    if (daysRequested > stats.daysRemaining) {
      alert(`You only have ${stats.daysRemaining} days remaining. Requested: ${daysRequested} days`)
      setLoading(false)
      return
    }
    
    const { error } = await supabase
      .from('vacations')
      .insert({
        employee_id: employee.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_used: daysRequested,
        status: 'pending'
      })
    
    if (error) {
      alert('Error submitting request: ' + error.message)
    } else {
      alert('Vacation request submitted!')
      setShowForm(false)
      setFormData({ start_date: '', end_date: '' })
      loadData() // Refresh all data
    }
    
    setLoading(false)
  }

  async function updateStatus(vacationId: string, newStatus: string) {
    const { error } = await supabase
      .from('vacations')
      .update({ status: newStatus })
      .eq('id', vacationId)
    
    if (error) {
      alert('Error updating status: ' + error.message)
    } else {
      loadData()
    }
  }

  if (!employee) return <div className="p-8">Loading employee data...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vacation Manager</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Accrued Days</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.accruedDays}</p>
          <p className="text-xs text-gray-500">Since hire date ({new Date(employee.hire_date).toLocaleDateString()})</p>
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
      
      {/* Request Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">New Vacation Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
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
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            {formData.start_date && formData.end_date && (
              <div className="text-sm text-gray-600">
                Requesting: {calculateDaysBetween(formData.start_date, formData.end_date)} days
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}
      
      {/* Vacation History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Vacation History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                    <td className="px-6 py-4">{new Date(vacation.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{new Date(vacation.end_date).toLocaleDateString()}</td>
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
                    <td className="px-6 py-4 space-x-2">
                      {vacation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(vacation.id, 'approved')}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(vacation.id, 'rejected')}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
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
        <h3 className="font-semibold mb-2">Moroccan Labor Law Reference:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• 1.5 days of paid vacation per month worked</li>
          <li>• Total 18 days per full year (Article 238 of Labor Code)</li>
          <li>• Vacations must be taken within the year they are earned</li>
          <li>• Employer can decide vacation timing based on work needs</li>
        </ul>
      </div>
    </div>
  )
}