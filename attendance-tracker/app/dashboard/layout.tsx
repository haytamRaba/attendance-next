'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    checkUserRole()
  }, [])

  async function checkUserRole() {
    try {
      // Get current user (using your email for now)
      const { data: employee } = await supabase
        .from('employees')
        .select('role, full_name')
        .eq('email', 'haytamemsi@raba.com')
        .single()
      
      if (employee) {
        setIsAdmin(employee.role === 'admin' || employee.role === 'rh')
        setUserName(employee.full_name)
      }
    } catch (error) {
      console.error('Error checking role:', error)
    } finally {
      setLoading(false)
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📋</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {/* Common links for all users */}
              <a 
                href="/dashboard" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  isActive('/dashboard') && !isActive('/dashboard/admin')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Home
              </a>
              <a 
                href="/dashboard/attendance" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  isActive('/dashboard/attendance')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                📍 Attendance
              </a>
              <a 
                href="/dashboard/vacations" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  isActive('/dashboard/vacations')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                🌴 Vacations
              </a>
              <a 
                href="/dashboard/promotions" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  isActive('/dashboard/promotions')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                📈 Promotions
              </a>
              <a 
                href="/dashboard/profile" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  isActive('/dashboard/profile')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                👤 Profile
              </a>
            </div>

            {/* User info */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {userName}
              </span>
            </div>
          </div>

          {/* Admin Section - Separate row for better visibility */}
          {isAdmin && (
            <div className="border-t border-gray-200 mt-1">
              <div className="flex space-x-8 py-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin Access:
                </span>
                <a 
                  href="/dashboard/admin" 
                  className={`inline-flex items-center text-sm ${
                    isActive('/dashboard/admin') && !isActive('/dashboard/admin/vacations') && !isActive('/dashboard/admin/reports') && !isActive('/dashboard/admin/locations')
                      ? 'text-red-700 font-medium'
                      : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  👑 RH Dashboard
                </a>
                <a 
                  href="/dashboard/admin/vacations" 
                  className={`inline-flex items-center text-sm ${
                    isActive('/dashboard/admin/vacations')
                      ? 'text-orange-700 font-medium'
                      : 'text-orange-500 hover:text-orange-700'
                  }`}
                >
                  📋 Approve Vacations
                </a>
                <a 
                  href="/dashboard/admin/reports" 
                  className={`inline-flex items-center text-sm ${
                    isActive('/dashboard/admin/reports')
                      ? 'text-purple-700 font-medium'
                      : 'text-purple-500 hover:text-purple-700'
                  }`}
                >
                  📊 Monthly Reports
                </a>
                <a 
                  href="/dashboard/admin/locations" 
                  className={`inline-flex items-center text-sm ${
                    isActive('/dashboard/admin/locations')
                      ? 'text-blue-700 font-medium'
                      : 'text-blue-500 hover:text-blue-700'
                  }`}
                >
                  📍 Office Locations
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}