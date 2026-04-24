'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { requestNotificationPermission, sendLateAlert, sendAbsentAlert } from '@/app/lib/notifications'



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Employee {
  id: string
  full_name: string
  email: string
  position: string
  role: string
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [todayAttendance, setTodayAttendance] = useState<any[]>([])
  const [lateEmployees, setLateEmployees] = useState<any[]>([])
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentAdmin, setCurrentAdmin] = useState<Employee | null>(null)

  useEffect(() => {
  requestNotificationPermission()
}, [])

useEffect(() => {
  if (!loading && lateEmployees.length > 0) {
    lateEmployees.forEach(emp => {
      sendLateAlert(emp.full_name, emp.minutesLate)
    })
  }
  if (!loading && absentEmployees.length > 0) {
    absentEmployees.forEach(emp => {
      sendAbsentAlert(emp.full_name)
    })
  }
}, [lateEmployees, absentEmployees, loading])
  
  
  
  useEffect(() => {
    loadAllData()
  }, [selectedDate])

  async function loadAllData() {
    setLoading(true)
    
    // Get current admin (using Haytam's email)
    const { data: admin } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'haytamemsi@raba.com')
      .single()
    
    if (admin) {
      setCurrentAdmin(admin)
    }
    
    // Get all employees
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('*')
      .order('full_name')
    
    if (allEmployees) {
      setEmployees(allEmployees)
      await checkAttendanceForDate(allEmployees, selectedDate)
    }
    
    setLoading(false)
  }

  async function checkAttendanceForDate(employeesList: Employee[], date: string) {
    // Get all attendance records for this date
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .gte('check_in', `${date}T00:00:00`)
      .lte('check_in', `${date}T23:59:59`)
    
    const late: any[] = []
    const present: any[] = []
    const absent: any[] = []
    
    // Check each employee
    for (const employee of employeesList) {
      const record = attendance?.find(a => a.employee_id === employee.id)
      
      if (record) {
        present.push({ ...employee, attendance: record })
        
        // Check if late (after 9:15 AM Moroccan time)
        const checkInTime = new Date(record.check_in)
        const lateThreshold = new Date(`${date}T09:15:00`)
        
        if (checkInTime > lateThreshold) {
          const minutesLate = Math.floor((checkInTime.getTime() - lateThreshold.getTime()) / 60000)
          late.push({ 
            ...employee, 
            attendance: record,
            minutesLate 
          })
        }
      } else {
        absent.push(employee)
      }
    }
    
    setTodayAttendance(present)
    setLateEmployees(late)
    setAbsentEmployees(absent)
  }

  function getStatusBadge(role: string) {
    if (role === 'admin') return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Admin</span>
    if (role === 'rh') return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">RH</span>
    return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Employee</span>
  }

  if (loading) return <div className="p-8 text-center">Loading team data...</div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RH Dashboard</h1>
          {currentAdmin && (
            <p className="text-gray-600 mt-1">Welcome, {currentAdmin.full_name} (Administrator)</p>
          )}
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Late Alert */}
        <div className={`rounded-lg shadow p-6 ${lateEmployees.length > 0 ? 'bg-red-50 border-2 border-red-500' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Late Today</p>
              <p className="text-3xl font-bold text-red-600">{lateEmployees.length}</p>
            </div>
          </div>
          {lateEmployees.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              {lateEmployees.map(e => `${e.full_name} (${e.minutesLate} min late)`).join(', ')}
            </div>
          )}
        </div>

        {/* Absent Alert */}
        <div className={`rounded-lg shadow p-6 ${absentEmployees.length > 0 ? 'bg-orange-50 border-2 border-orange-500' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Absent Today</p>
              <p className="text-3xl font-bold text-orange-600">{absentEmployees.length}</p>
            </div>
          </div>
          {absentEmployees.length > 0 && (
            <div className="mt-2 text-sm text-orange-600">
              {absentEmployees.map(e => e.full_name).join(', ')}
            </div>
          )}
        </div>

        {/* Present Today */}
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Present Today</p>
              <p className="text-3xl font-bold text-green-600">{todayAttendance.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Out of {employees.length} total employees
          </p>
        </div>
      </div>

      {/* All Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">Team Attendance - {new Date(selectedDate).toLocaleDateString()}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const attendance = todayAttendance.find(a => a.id === employee.id)
                const isLate = lateEmployees.find(l => l.id === employee.id)
                const isAbsent = absentEmployees.find(a => a.id === employee.id)
                
                return (
                  <tr key={employee.id} className={isLate ? 'bg-red-50' : isAbsent ? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 font-medium">{employee.full_name}</td>
                    <td className="px-6 py-4 text-sm">{employee.position}</td>
                    <td className="px-6 py-4">{getStatusBadge(employee.role)}</td>
                    <td className="px-6 py-4">
                      {isLate ? (
                        <span className="text-red-600 font-medium">Late ({isLate.minutesLate} min)</span>
                      ) : isAbsent ? (
                        <span className="text-orange-600 font-medium">Absent</span>
                      ) : attendance ? (
                        <span className="text-green-600 font-medium">Present</span>
                      ) : (
                        <span className="text-gray-500">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {attendance?.attendance?.check_in ? new Date(attendance.attendance.check_in).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {attendance?.attendance?.check_out ? new Date(attendance.attendance.check_out).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          alert(`Send reminder to ${employee.full_name} at ${employee.email}`)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Contact
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
           </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-3">RH Quick Actions</h3>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={() => {
              const lateList = lateEmployees.map(e => `${e.full_name} (${e.minutesLate} min late)`).join('\n')
              alert(`Late employees:\n${lateList || 'None'}\n\nAbsent employees:\n${absentEmployees.map(e => e.full_name).join('\n') || 'None'}`)
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Send Absent Alert
          </button>
          <button 
            onClick={() => {
              alert('Report generation would download CSV/PDF here')
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Download Today's Report
          </button>
          <a 
            href="/dashboard/admin/vacations"
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 inline-block"
          >
            Review Vacation Requests
          </a>
        </div>
      </div>
    </div>
  )
}