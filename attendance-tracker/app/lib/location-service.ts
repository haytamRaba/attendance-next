// Office locations (from database)
interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
}

// Cache office locations
let cachedOffices: OfficeLocation[] | null = null

export async function getOfficeLocations(): Promise<OfficeLocation[]> {
  if (cachedOffices) return cachedOffices
  
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await supabase
    .from('office_locations')
    .select('*')
    .eq('is_active', true)
  
  cachedOffices = data || []
  return cachedOffices
}

// Calculate distance between two points in meters (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Get user's current location (browser geolocation)
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    })
  })
}

// Get user's IP address (using free IP API)
export async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.error('Failed to get IP:', error)
    return 'unknown'
  }
}

// Get IP location (approximate city-level)
export async function getIPLocation(ip: string): Promise<{ city: string; country: string; lat: number; lon: number } | null> {
  try {
    // Using free ip-api.com (limited to 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`)
    const data = await response.json()
    
    if (data.status === 'success') {
      return {
        city: data.city,
        country: data.country,
        lat: data.lat,
        lon: data.lon
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get IP location:', error)
    return null
  }
}

// Verify if user is within any office location
export async function verifyLocation(
  latitude: number,
  longitude: number
): Promise<{
  verified: boolean
  officeName?: string
  distance?: number
  message: string
}> {
  const offices = await getOfficeLocations()
  
  if (offices.length === 0) {
    return {
      verified: false,
      message: 'No office locations configured. Please contact administrator.'
    }
  }
  
  // Check each office
  for (const office of offices) {
    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude)
    
    if (distance <= office.radius_meters) {
      return {
        verified: true,
        officeName: office.name,
        distance: Math.round(distance),
        message: `Verified: You are within ${office.name} (${Math.round(distance)}m away)`
      }
    }
  }
  
  // Not verified - find closest office for message
  let closestOffice = offices[0]
  let closestDistance = calculateDistance(
    latitude,
    longitude,
    offices[0].latitude,
    offices[0].longitude
  )
  
  for (const office of offices) {
    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude)
    if (distance < closestDistance) {
      closestDistance = distance
      closestOffice = office
    }
  }
  
  return {
    verified: false,
    distance: Math.round(closestDistance),
    officeName: closestOffice.name,
    message: `You are ${Math.round(closestDistance)}m away from ${closestOffice.name}. Please check in from the office location.`
  }
}

// Get location verification for check-in page
export async function getLocationStatus(): Promise<{
  hasLocationSupport: boolean
  verificationMethod: 'gps' | 'ip' | 'none'
  isVerified: boolean
  location?: { lat: number; lon: number }
  officeName?: string
  message: string
}> {
  // Check if browser supports geolocation
  if (!navigator.geolocation) {
    // Fallback to IP-based location
    try {
      const ip = await getUserIP()
      const ipLocation = await getIPLocation(ip)
      
      if (ipLocation && ipLocation.lat && ipLocation.lon) {
        const verification = await verifyLocation(ipLocation.lat, ipLocation.lon)
        return {
          hasLocationSupport: false,
          verificationMethod: 'ip',
          isVerified: verification.verified,
          location: { lat: ipLocation.lat, lon: ipLocation.lon },
          officeName: verification.officeName,
          message: verification.message
        }
      }
    } catch (error) {
      console.error('IP fallback failed:', error)
    }
    
    return {
      hasLocationSupport: false,
      verificationMethod: 'none',
      isVerified: false,
      message: 'Location services not available. Please enable GPS or contact administrator.'
    }
  }
  
  // Use GPS
  try {
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords
    const verification = await verifyLocation(latitude, longitude)
    
    return {
      hasLocationSupport: true,
      verificationMethod: 'gps',
      isVerified: verification.verified,
      location: { lat: latitude, lon: longitude },
      officeName: verification.officeName,
      message: verification.message
    }
  } catch (error: any) {
    return {
      hasLocationSupport: true,
      verificationMethod: 'gps',
      isVerified: false,
      message: error.message || 'Unable to get your location. Please ensure location access is enabled.'
    }
  }
}