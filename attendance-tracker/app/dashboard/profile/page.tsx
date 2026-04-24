'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProfilePage() {
  const [employee, setEmployee] = useState<any>(null)
  const [stats, setStats] = useState({
    totalDaysWorked: 0,
    attendanceRate: 0,
    totalHours: 0,
    onTimeRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    // Get current employee (using your email for now)
    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'haytamemsi@raba.com')
      .single()
    
    if (emp) {
      setEmployee(emp)
      await calculateStats(emp.id)
    }
    setLoading(false)
  }

  async function calculateStats(employeeId: string) {
    // Get last 90 days of attendance
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('check_in', ninetyDaysAgo.toISOString())
    
    if (attendance && attendance.length > 0) {
      const totalDays = attendance.length
      const totalWorkHours = attendance.reduce((sum, a) => {
        if (a.check_out) {
          return sum + (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / (1000 * 60 * 60)
        }
        return sum
      }, 0)
      
      const onTimeDays = attendance.filter(a => {
        const checkIn = new Date(a.check_in)
        const threshold = new Date(checkIn)
        threshold.setHours(9, 15, 0)
        return checkIn <= threshold
      }).length
      
      // Calculate working days in last 90 days
      let workingDays = 0
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      const currentDate = new Date(startDate)
      while (currentDate <= new Date()) {
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      setStats({
        totalDaysWorked: totalDays,
        attendanceRate: Math.round((totalDays / workingDays) * 100),
        totalHours: Math.round(totalWorkHours * 10) / 10,
        onTimeRate: Math.round((onTimeDays / totalDays) * 100)
      })
    }
  }

  if (loading) return <div className="p-8 text-center">Loading profile...</div>
  if (!employee) return <div className="p-8 text-center">Employee not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-3xl font-bold">{employee.full_name}</h1>
        <p className="text-gray-600">{employee.position}</p>
        <p className="text-sm text-gray-500 mt-1">Since {new Date(employee.hire_date).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Attendance Rate (90 days)</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.attendanceRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">On-Time Rate</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">{stats.onTimeRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Days Worked (90 days)</h3>
          <p className="text-4xl font-bold text-orange-600 mt-2">{stats.totalDaysWorked}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Total Hours Worked</h3>
          <p className="text-4xl font-bold text-purple-600 mt-2">{stats.totalHours}h</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-2"> Tips for Better Attendance</h3>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• Set a reminder 15 minutes before your shift starts</li>
          <li>• Aim to check in before 9:00 AM to avoid lateness</li>
          <li>• Request vacations at least 2 weeks in advance</li>
          <li>• Maintain 90%+ attendance for promotion eligibility</li>
        </ul>
      </div>
    </div>
  )
}