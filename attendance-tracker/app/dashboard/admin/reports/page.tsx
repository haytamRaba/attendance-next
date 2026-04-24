'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalPresentDays: 0,
    totalLateDays: 0,
    totalAbsentDays: 0,
    averageAttendance: 0
  })

  useEffect(() => {
    generateReport()
  }, [selectedMonth])

  async function generateReport() {
    setLoading(true)
    
    // Get all employees
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .order('full_name')
    
    if (!employees) {
      setLoading(false)
      return
    }
    
    // Get date range for selected month
    const [year, month] = selectedMonth.split('-')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)
    
    // Get all attendance for this month
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .gte('check_in', startDate.toISOString())
      .lte('check_in', endDate.toISOString())
    
    // Calculate working days in this month (Monday-Friday)
    let workingDays = 0
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Build report for each employee
    const report = employees.map(employee => {
      const employeeAttendance = attendance?.filter(a => a.employee_id === employee.id) || []
      const presentDays = employeeAttendance.length
      const lateDays = employeeAttendance.filter(a => {
        const checkIn = new Date(a.check_in)
        const threshold = new Date(checkIn)
        threshold.setHours(9, 15, 0)
        return checkIn > threshold
      }).length
      const absentDays = workingDays - presentDays
      const attendanceRate = workingDays > 0 ? (presentDays / workingDays) * 100 : 0
      
      return {
        ...employee,
        presentDays,
        lateDays,
        absentDays,
        attendanceRate: Math.round(attendanceRate),
        totalHours: employeeAttendance.reduce((sum, a) => {
          if (a.check_out) {
            const hours = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / (1000 * 60 * 60)
            return sum + hours
          }
          return sum
        }, 0).toFixed(1)
      }
    })
    
    setReportData(report)
    
    // Calculate summary
    setSummary({
      totalEmployees: employees.length,
      totalPresentDays: report.reduce((sum, r) => sum + r.presentDays, 0),
      totalLateDays: report.reduce((sum, r) => sum + r.lateDays, 0),
      totalAbsentDays: report.reduce((sum, r) => sum + r.absentDays, 0),
      averageAttendance: Math.round(report.reduce((sum, r) => sum + r.attendanceRate, 0) / employees.length)
    })
    
    setLoading(false)
  }

  function downloadCSV() {
    const headers = ['Employee', 'Position', 'Present Days', 'Late Days', 'Absent Days', 'Attendance Rate %', 'Total Hours']
    const rows = reportData.map(r => [
      r.full_name,
      r.position,
      r.presentDays,
      r.lateDays,
      r.absentDays,
      r.attendanceRate,
      r.totalHours
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Attendance Report</h1>
          <p className="text-gray-600 mt-1">RH analytics and team performance</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={downloadCSV}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            📥 Download CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Total Employees</p>
          <p className="text-3xl font-bold text-blue-600">{summary.totalEmployees}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Present Days (Total)</p>
          <p className="text-3xl font-bold text-green-600">{summary.totalPresentDays}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Late Days (Total)</p>
          <p className="text-3xl font-bold text-orange-600">{summary.totalLateDays}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Avg Attendance Rate</p>
          <p className="text-3xl font-bold text-purple-600">{summary.averageAttendance}%</p>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">
            {monthNames[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]} Report
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">Generating report...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Late</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 font-medium">{employee.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{employee.position}</td>
                    <td className="px-6 py-4 text-center text-green-600 font-medium">{employee.presentDays}</td>
                    <td className="px-6 py-4 text-center text-orange-600">{employee.lateDays}</td>
                    <td className="px-6 py-4 text-center text-red-600">{employee.absentDays}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-16 text-center font-semibold ${
                          employee.attendanceRate >= 90 ? 'text-green-600' :
                          employee.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {employee.attendanceRate}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{employee.totalHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">📊 RH Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800">Top Performers</h4>
            <ul className="mt-2 space-y-1">
              {reportData.filter(r => r.attendanceRate >= 95).slice(0, 3).map(r => (
                <li key={r.id} className="text-sm text-blue-700">🏆 {r.full_name} - {r.attendanceRate}% attendance</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-orange-800">Needs Improvement</h4>
            <ul className="mt-2 space-y-1">
              {reportData.filter(r => r.attendanceRate < 80).map(r => (
                <li key={r.id} className="text-sm text-orange-700">⚠️ {r.full_name} - {r.attendanceRate}% attendance ({r.absentDays} absent days)</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}