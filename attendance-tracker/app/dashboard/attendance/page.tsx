'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getLocationStatus, getUserIP, verifyLocation } from '@/app/lib/location-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AttendancePage() {
  const [loading, setLoading] = useState(false)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<{
    isVerifying: boolean
    verified: boolean
    message: string
    officeName?: string
    method?: string
  }>({
    isVerifying: true,
    verified: false,
    message: 'Verifying your location...'
  })

  useEffect(() => {
    loadTodayData()
    verifyEmployeeLocation()
  }, [])

  async function verifyEmployeeLocation() {
    setLocationStatus(prev => ({ ...prev, isVerifying: true }))
    
    try {
      const status = await getLocationStatus()
      
      setLocationStatus({
        isVerifying: false,
        verified: status.isVerified,
        message: status.message,
        officeName: status.officeName,
        method: status.verificationMethod
      })
      
      // If not verified, show error but don't block (just warn)
      if (!status.isVerified) {
        setError(`⚠️ Location Warning: ${status.message}`)
      }
    } catch (err: any) {
      setLocationStatus({
        isVerifying: false,
        verified: false,
        message: 'Could not verify location',
        method: 'none'
      })
      setError('Location verification failed. You can still check in, but it will be noted.')
    }
  }

  async function loadTodayData() {
    // Get employee (using your email)
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'haytamemsi@raba.com')
      .single()
    
    if (empError) {
      console.error('Employee error:', empError)
      setError(`Database error: ${empError.message}`)
      return
    }
    
    setEmployee(empData)
    
    if (empData) {
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empData.id)
        .gte('check_in', today)
        .maybeSingle()
      
      if (attError) {
        console.error('Attendance error:', attError)
      } else {
        setTodayRecord(attendance)
      }
    }
  }

  async function handleCheckIn() {
    setLoading(true)
    setError(null)
    
    try {
      // Get location data for check-in
      let latitude: number | null = null
      let longitude: number | null = null
      let locationVerified = false
      let checkInIP = await getUserIP()
      
      // Try to get GPS location
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            })
          })
          
          latitude = position.coords.latitude
          longitude = position.coords.longitude
          
          // Verify location against office
          const verification = await verifyLocation(latitude, longitude)
          locationVerified = verification.verified
          
          if (!locationVerified) {
            setError(`⚠️ Warning: ${verification.message}. Check-in will be recorded with location data.`)
          }
        } catch (geoError) {
          console.warn('GPS failed, continuing with IP only:', geoError)
          setError('GPS location unavailable. Check-in will use IP address only.')
        }
      }
      
      // Prepare check-in data
      const checkInData: any = {
        employee_id: employee.id,
        check_in: new Date().toISOString(),
        check_in_ip: checkInIP,
        check_in_method: latitude ? 'gps' : 'web',
        location_verified: locationVerified
      }
      
      if (latitude && longitude) {
        checkInData.check_in_latitude = latitude
        checkInData.check_in_longitude = longitude
      }
      
      const { error } = await supabase
        .from('attendance')
        .insert(checkInData)
      
      if (error) {
        alert('Error checking in: ' + error.message)
      } else {
        const message = locationVerified 
          ? 'Checked in successfully! Location verified.'
          : 'Checked in successfully! (Location could not be verified)'
        alert(message)
        await loadTodayData()
      }
    } catch (err: any) {
      alert('Error during check-in: ' + err.message)
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

  if (!employee) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Attendance Tracker</h1>
      
      {/* Location Status Card */}
      <div className={`rounded-lg shadow p-4 mb-6 ${
        locationStatus.verified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {locationStatus.isVerifying ? '📍' : locationStatus.verified ? '✅' : '⚠️'}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${locationStatus.verified ? 'text-green-800' : 'text-yellow-800'}`}>
              {locationStatus.isVerifying ? 'Verifying location...' : locationStatus.message}
            </p>
            {locationStatus.officeName && (
              <p className="text-sm text-gray-600 mt-1">
                📍 Office: {locationStatus.officeName}
              </p>
            )}
            {locationStatus.method && (
              <p className="text-xs text-gray-500 mt-1">
                Method: {locationStatus.method.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Attendance Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {new Date().toLocaleDateString()}
        </h2>
        
        {!todayRecord ? (
          <div>
            <p className="text-gray-600 mb-4">You haven't checked in today</p>
            <button
              onClick={handleCheckIn}
              disabled={loading || locationStatus.isVerifying}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : '📍 Check In with Location'}
            </button>
            {!locationStatus.verified && !locationStatus.isVerifying && (
              <p className="text-xs text-yellow-600 mt-3">
                ⚠️ You're not at an office location. Check-in will be recorded but marked as unverified.
              </p>
            )}
          </div>
        ) : !todayRecord.check_out ? (
          <div>
            <p className="text-green-600 mb-2">
              ✓ Checked in at {new Date(todayRecord.check_in).toLocaleTimeString()}
            </p>
            {todayRecord.location_verified ? (
              <p className="text-xs text-green-500">✓ Location verified</p>
            ) : (
              <p className="text-xs text-yellow-500">⚠️ Location not verified</p>
            )}
            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 disabled:opacity-50 mt-4"
            >
              {loading ? 'Processing...' : 'Check Out'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-green-600">
              ✓ Checked in: {new Date(todayRecord.check_in).toLocaleTimeString()}
            </p>
            <p className="text-green-600">
              ✓ Checked out: {new Date(todayRecord.check_out).toLocaleTimeString()}
            </p>
            {todayRecord.location_verified ? (
              <p className="text-xs text-green-500 mt-2">✓ Location verified at check-in</p>
            ) : (
              <p className="text-xs text-yellow-500 mt-2">⚠️ Location was not verified at check-in</p>
            )}
          </div>
        )}
      </div>
      
      {/* Admin Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">📍 Location Check Requirements:</h3>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• • You must be within 100m of configured office location</li>
          <li>• GPS location is required for verification</li>
          <li>• IP address is logged as backup</li>
          <li>• Unverified check-ins are flagged for RH review</li>
        </ul>
      </div>
    </div>
  )
}