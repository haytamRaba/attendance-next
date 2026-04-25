export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
            </div>
            <div className="flex gap-4">
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-600 hover:text-gray-900"
              >
                sign in
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
log in              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
     <main>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            Professional Employee Attendance Management
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Track employee attendance with location verification, manage vacations, monitor promotions, and generate comprehensive HR reports.
          </p>
        
        </div>
     </main>
    </div>
  );
}
