'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OfficeLocationsPage() {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: '100'
  })

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    const { data } = await supabase
      .from('office_locations')
      .select('*')
      .order('name')
    
    setLocations(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase
      .from('office_locations')
      .insert({
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius_meters: parseInt(formData.radius_meters)
      })
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Office location added!')
      setShowForm(false)
      setFormData({ name: '', address: '', latitude: '', longitude: '', radius_meters: '100' })
      loadLocations()
    }
    
    setLoading(false)
  }

  async function toggleLocationStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('office_locations')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      loadLocations()
    }
  }

  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          })
          alert('Location captured! Adjust if needed.')
        },
        (error) => {
          alert('Could not get location: ' + error.message)
        }
      )
    } else {
      alert('Geolocation not supported')
    }
  }

  if (loading && locations.length === 0) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Office Locations</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Office
        </button>
      </div>

      {/* Add Location Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Office Location</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Office Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Casablanca Main Office"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., 33.5731"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., -7.5898"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Allowed Radius (meters)</label>
              <input
                type="number"
                required
                value={formData.radius_meters}
                onChange={(e) => setFormData({...formData, radius_meters: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">Employees must be within this distance to check in</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Use My Current Location
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Office
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Office</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Radius</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td className="px-6 py-4 font-medium">{loc.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{loc.address || '-'}</td>
                <td className="px-6 py-4 text-sm font-mono">
                  {loc.latitude}, {loc.longitude}
                </td>
                <td className="px-6 py-4">{loc.radius_meters}m</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    loc.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {loc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleLocationStatus(loc.id, loc.is_active)}
                    className={`text-sm ${
                      loc.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {loc.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}