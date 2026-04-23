'use client'  // Client Component

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AttendancePage() {
  const [loading, setLoading] = useState(false)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Load data when page loads
  useEffect(() => {
    loadTodayData()
  }, [])
  
  async function loadTodayData() {
    // Get employee (hardcoded for now - we'll add auth later)
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
      .single()
    
    setEmployee(empData)
    
     if (empError) {
      console.error('Employee error:', empError)
      setError(`Database error: ${empError.message}. Make sure RLS policies are configured.`)
      return
    }

    if (empData) {
      // Get today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empData.id)
        .gte('check_in', today)
        .maybeSingle()
      
       if (attError) {
        console.log('Attendance error:', attError)
        setError(`Attendance error: ${attError.message}`)
      } else {
        setTodayRecord(attendance)
      }
    }
  }
  
  async function handleCheckIn() {
    setLoading(true)
    
    const { error } = await supabase
      .from('attendance')
      .insert({
        employee_id: employee.id,
        check_in: new Date().toISOString()
      })
    
    if (error) {
      alert('Error checking in: ' + error.message)
    } else {
      alert('Checked in successfully!')
      await loadTodayData() // Refresh data
    }
    
    setLoading(false)
  }
  
  async function handleCheckOut() {
    setLoading(true)
    
    const { error } = await supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', todayRecord.id)
    
    if (error) {
      alert('Error checking out: ' + error.message)
    } else {
      alert('Checked out successfully!')
      await loadTodayData()
    }
    
    setLoading(false)
  }
  
  if (!employee) return <div className='text-cyan-400'>Loading...</div>
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Attendance Tracker</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {new Date().toLocaleDateString()}
        </h2>
        
        {!todayRecord ? (
          // Not checked in yet
          <div>
            <p className="text-gray-600 mb-4">You haven't checked in today</p>
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Check In'}
            </button>
          </div>
        ) : !todayRecord.check_out ? (
          // Checked in but not out
          <div>
            <p className="text-green-600 mb-2">
              ✓ Checked in at {new Date(todayRecord.check_in).toLocaleTimeString()}
            </p>
            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Check Out'}
            </button>
          </div>
        ) : (
          // Completed day
          <div>
            <p className="text-green-600">
              ✓ Checked in: {new Date(todayRecord.check_in).toLocaleTimeString()}
            </p>
            <p className="text-green-600">
              ✓ Checked out: {new Date(todayRecord.check_out).toLocaleTimeString()}
            </p>
            <p className="text-gray-500 mt-4">Great work today!</p>
          </div>
        )}
      </div>
      
      {/* Explanation of what's happening */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">How this works:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Check-in creates a new attendance record for today</li>
          <li>• Check-out updates that same record</li>
          <li>• Each day can only have one check-in/out pair</li>
          <li>• All times are stored in UTC but displayed in your local time</li>
        </ul>
      </div>
    </div>
  )
}