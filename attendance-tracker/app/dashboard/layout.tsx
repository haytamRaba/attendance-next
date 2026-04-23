// This is a Server Component that wraps all dashboard pages
export default function DashboardLayout({children,}: {children: React.ReactNode}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <a href="/dashboard" className="inline-flex items-center px-1 pt-1 text-gray-900">
                Home
              </a>
              <a href="/dashboard/attendance" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-900">
                Attendance
              </a>
              <a href="/dashboard/vacations" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-900">
                Vacations
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Page content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}