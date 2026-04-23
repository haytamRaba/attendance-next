'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Moroccan business standards
const MIN_MONTHS_BEFORE_PROMOTION = 18 // 1.5 years minimum
const RECOMMENDED_MONTHS = 24 // 2 years recommended
const ATTENDANCE_THRESHOLD = 90 // Minimum 90% attendance rate
const MIN_PERFORMANCE_RATING = 3 // Need at least 3/5 rating

export default function PromotionsPage() {
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [promotionHistory, setPromotionHistory] = useState<any[]>([])
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([])
  const [eligibility, setEligibility] = useState({
    isEligible: false,
    reasons: [] as string[],
    blockers: [] as string[],
    nextReviewDate: null as Date | null,
    recommendation: ''
  })
  const [attendanceRate, setAttendanceRate] = useState(0)

  useEffect(() => {
    loadPromotionData()
  }, [])

  async function loadPromotionData() {
    setLoading(true)
    
    // Get employee
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
      .single()
    
    if (empData) {
      setEmployee(empData)
      await loadPromotionHistory(empData.id)
      await loadPerformanceReviews(empData.id)
      await calculateAttendanceRate(empData.id)
      calculateEligibility(empData)
    }
    
    setLoading(false)
  }

  async function loadPromotionHistory(employeeId: string) {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('promotion_date', { ascending: false })
    
    setPromotionHistory(data || [])
  }

  async function loadPerformanceReviews(employeeId: string) {
    const { data } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('employee_id', employeeId)
      .order('review_date', { ascending: false })
    
    setPerformanceReviews(data || [])
  }

  async function calculateAttendanceRate(employeeId: string) {
    // Get last 90 days of attendance
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('check_in', ninetyDaysAgo.toISOString())
    
    if (!attendance || attendance.length === 0) {
      setAttendanceRate(100) // No data = assume perfect attendance
      return
    }
    
    // Calculate working days in last 90 days (Monday-Friday)
    let workingDays = 0
    let currentDate = new Date(ninetyDaysAgo)
    const today = new Date()
    
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Calculate days present (have check-in and check-out)
    const daysPresent = attendance.filter(record => record.check_in && record.check_out).length
    
    const rate = workingDays > 0 ? (daysPresent / workingDays) * 100 : 100
    setAttendanceRate(Math.round(rate))
  }

  function calculateEligibility(emp: any) {
    const reasons: string[] = []
    const blockers: string[] = []
    
    // Factor 1: Time since last promotion or hire date
    const lastPromotion = promotionHistory[0]
    const referenceDate = lastPromotion 
      ? new Date(lastPromotion.promotion_date) 
      : new Date(emp.hire_date)
    
    const today = new Date()
    const monthsSince = (today.getFullYear() - referenceDate.getFullYear()) * 12 + 
                        (today.getMonth() - referenceDate.getMonth())
    
    if (monthsSince >= RECOMMENDED_MONTHS) {
      reasons.push(`${monthsSince} months since last promotion/hire - excellent timing (${RECOMMENDED_MONTHS}+ months recommended)`)
    } else if (monthsSince >= MIN_MONTHS_BEFORE_PROMOTION) {
      reasons.push(`${monthsSince} months since last promotion/hire - eligible but could wait longer (${RECOMMENDED_MONTHS} months ideal)`)
    } else {
      blockers.push(`Only ${monthsSince} months since last promotion/hire (need ${MIN_MONTHS_BEFORE_PROMOTION}+ months)`)
    }
    
    // Factor 2: Attendance rate
    if (attendanceRate >= ATTENDANCE_THRESHOLD) {
      reasons.push(`${attendanceRate}% attendance rate - excellent (${ATTENDANCE_THRESHOLD}% required)`)
    } else {
      blockers.push(`${attendanceRate}% attendance rate (need ${ATTENDANCE_THRESHOLD}% minimum)`)
    }
    
    // Factor 3: Performance reviews
    if (performanceReviews.length > 0) {
      const averageRating = performanceReviews.reduce((sum, r) => sum + r.rating, 0) / performanceReviews.length
      
      if (averageRating >= MIN_PERFORMANCE_RATING) {
        reasons.push(`Average performance rating: ${averageRating.toFixed(1)}/5 - good (need ${MIN_PERFORMANCE_RATING}+)`)
      } else {
        blockers.push(`Average performance rating: ${averageRating.toFixed(1)}/5 (need ${MIN_PERFORMANCE_RATING}+)`)
      }
      
      // Check when last review was
      const lastReview = new Date(performanceReviews[0].review_date)
      const monthsSinceReview = (today.getFullYear() - lastReview.getFullYear()) * 12 + 
                                 (today.getMonth() - lastReview.getMonth())
      
      if (monthsSinceReview > 6) {
        blockers.push(`Last performance review was ${monthsSinceReview} months ago (recommend quarterly reviews)`);
      } else {
        reasons.push(`Recent performance review (${monthsSinceReview} months ago)`)
      }
    } else {
      blockers.push('No performance reviews found - request a review first')
    }
    
    // Factor 4: Promotion history pattern
    if (promotionHistory.length >= 2) {
      const lastTwoPromotions = promotionHistory.slice(0, 2)
      const timeBetween = (new Date(lastTwoPromotions[0].promotion_date).getTime() - 
                          new Date(lastTwoPromotions[1].promotion_date).getTime()) / 
                          (1000 * 60 * 60 * 24 * 30) // months
      
      if (timeBetween < MIN_MONTHS_BEFORE_PROMOTION) {
        blockers.push(`Previous promotions were only ${Math.round(timeBetween)} months apart - company needs at least ${MIN_MONTHS_BEFORE_PROMOTION} months between promotions`)
      }
    }
    
    // Calculate next recommended review date
    const nextReview = new Date()
    if (performanceReviews.length > 0) {
      const lastReview = new Date(performanceReviews[0].review_date)
      nextReview.setMonth(lastReview.getMonth() + 3) // Quarterly reviews
    } else {
      nextReview.setMonth(nextReview.getMonth() + 1) // Schedule one soon
    }
    
    // Determine if eligible
    const isEligible = blockers.length === 0 && reasons.length > 0
    
    let recommendation = ''
    if (isEligible) {
      recommendation = " You are eligible for promotion! Schedule a meeting with your manager to discuss career progression. Prepare your achievements from the last year."
    } else if (blockers.some(b => b.includes('attendance'))) {
      recommendation = " Focus on improving attendance first. Set reminders for check-ins and communicate time off in advance."
    } else if (blockers.some(b => b.includes('performance'))) {
      recommendation = " Request a performance review meeting. Discuss areas of improvement and set clear goals for the next quarter."
    } else if (blockers.some(b => b.includes('months'))) {
      recommendation = " Wait a few more months. Use this time to take on additional responsibilities and document your achievements."
    } else {
      recommendation = " Start building your promotion case. Track your accomplishments, seek feedback, and discuss career goals with your manager."
    }
    
    setEligibility({
      isEligible,
      reasons,
      blockers,
      nextReviewDate: nextReview,
      recommendation
    })
  }

  if (loading) return <div className="p-8 text-center">Analyzing your promotion eligibility...</div>
  if (!employee) return <div className="p-8 text-center">No employee data found</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Promotion Eligibility Calculator</h1>
      <p className="text-gray-600 mb-6">For {employee.full_name} - {employee.position}</p>
      
      {/* Eligibility Card */}
      <div className={`rounded-lg shadow-lg p-6 mb-8 ${
        eligibility.isEligible ? 'bg-green-50 border-2 border-green-500' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">
            {eligibility.isEligible ? ' Eligible for Promotion!' : 'Promotion Readiness Assessment'}
          </h2>
          {!eligibility.isEligible && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              Not Yet Eligible
            </div>
          )}
        </div>
        
        {/* Recommendation */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <p className="text-gray-800">{eligibility.recommendation}</p>
        </div>
        
        {/* Reasons (What's going well) */}
        {eligibility.reasons.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-green-800 mb-2">What's working well:</h3>
            <ul className="space-y-1">
              {eligibility.reasons.map((reason, i) => (
                <li key={i} className="text-sm text-green-700">{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Blockers (What needs improvement) */}
        {eligibility.blockers.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Areas to improve:</h3>
            <ul className="space-y-1">
              {eligibility.blockers.map((blocker, i) => (
                <li key={i} className="text-sm text-red-700">{blocker}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">Time in current position</p>
            <p className="text-lg font-semibold">
              {Math.floor((new Date().getTime() - new Date(promotionHistory[0]?.promotion_date || employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Attendance Rate (90 days)</p>
            <p className={`text-lg font-semibold ${attendanceRate >= ATTENDANCE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
              {attendanceRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Performance Rating</p>
            <p className="text-lg font-semibold">
              {performanceReviews.length > 0 
                ? (performanceReviews.reduce((sum, r) => sum + r.rating, 0) / performanceReviews.length).toFixed(1) + '/5'
                : 'No reviews'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Performance History */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Performance Reviews</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performanceReviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No performance reviews yet
                  </td>
                </tr>
              ) : (
                performanceReviews.map((review) => (
                  <tr key={review.id}>
                    <td className="px-6 py-4">{new Date(review.review_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`font-semibold ${
                          review.rating >= 4 ? 'text-green-600' : 
                          review.rating >= 3 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {review.rating}/5
                        </span>
                        <span className="ml-2">
                          {review.rating === 5 && ''}
                          {review.rating === 4 && ''}
                          {review.rating === 3 && ''}
                          {review.rating <= 2 && ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{review.reviewer}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{review.comments || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
           </table>
        </div>
      </div>
      
      {/* Promotion History */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Promotion History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Increase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promotionHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No promotion history yet (started as {employee.position})
                  </td>
                </tr>
              ) : (
                promotionHistory.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-6 py-4">{new Date(promo.promotion_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{promo.previous_position}</td>
                    <td className="px-6 py-4 font-semibold text-green-600">{promo.new_position}</td>
                    <td className="px-6 py-4">+{promo.salary_increase}%</td>
                  </tr>
                ))
              )}
            </tbody>
           </table>
        </div>
      </div>
      
      {/* Action Plan & Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Next Steps for Promotion:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Short Term (1-3 months):</h4>
            <ul className="text-sm space-y-1 text-blue-700">
              <li>• {eligibility.blockers.some(b => b.includes('attendance')) ? 'Fix attendance issues first' : 'Maintain >90% attendance'}</li>
              <li>• {eligibility.blockers.some(b => b.includes('performance')) ? 'Request feedback from manager' : 'Document your achievements'}</li>
              <li>• Schedule a 1:1 with manager about career goals</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Long Term (3-6 months):</h4>
            <ul className="text-sm space-y-1 text-blue-700">
              <li>• Take on extra responsibilities</li>
              <li>• Complete any required certifications</li>
              <li>• Mentor junior team members</li>
              <li>• Prepare promotion packet with evidence</li>
            </ul>
          </div>
        </div>
        
        {eligibility.nextReviewDate && (
          <div className="mt-4 pt-3 border-t border-blue-200 text-sm text-blue-800">
             Next recommended performance review: {eligibility.nextReviewDate.toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  )
}