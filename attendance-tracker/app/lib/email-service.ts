import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// For development (no actual email sending)
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export async function sendVacationRequestEmail(
  employeeName: string,
  employeeEmail: string,
  subject: string,
  reason: string,
  startDate: string,
  endDate: string,
  daysCount: number,
  managerEmail: string = 'rh@yourcompany.com' // Change to your RH email
) {
  // In development, just log to console
  if (IS_DEVELOPMENT) {
    console.log('Email would be sent:', {
      to: managerEmail,
      subject: `Vacation Request: ${employeeName} - ${subject}`,
      html: `
        <h2>New Vacation Request</h2>
        <p><strong>Employee:</strong> ${employeeName} (${employeeEmail})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Dates:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
        <p><strong>Days Requested:</strong> ${daysCount}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <hr />
        <p>Please log in to the RH dashboard to approve or reject this request.</p>
      `
    })
    return true
  }

  // In production, send actual email
  try {
    await resend.emails.send({
      from: 'Attendance System <onboarding@resend.dev>', // Replace with your verified domain
      to: managerEmail,
      subject: `Vacation Request: ${employeeName} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Vacation Request</h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Email:</strong> ${employeeEmail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Dates:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
            <p><strong>Days Requested:</strong> ${daysCount}</p>
            <div style="margin-top: 15px;">
              <strong>Reason for vacation:</strong>
              <p style="margin-top: 5px; padding: 10px; background-color: white; border-radius: 5px;">
                ${reason}
              </p>
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/vacations" 
               style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Review Request in Dashboard
            </a>
          </div>
          
          <hr style="margin: 20px 0;" />
          
          <p style="color: #666; font-size: 12px;">
            This is an automated message from your Attendance Tracking System.
          </p>
        </div>
      `
    })
    
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export async function sendVacationStatusEmail(
  employeeName: string,
  employeeEmail: string,
  status: 'approved' | 'rejected',
  startDate: string,
  endDate: string,
  reason?: string
) {
  if (IS_DEVELOPMENT) {
    console.log('Status email:', {
      to: employeeEmail,
      subject: `Vacation Request ${status}: ${employeeName}`,
      html: `<p>Your vacation request has been ${status}.</p>`
    })
    return true
  }

  try {
    const statusColor = status === 'approved' ? '#10B981' : '#EF4444'
    const statusText = status === 'approved' ? 'Approved' : 'Rejected'
    
    await resend.emails.send({
      from: 'Attendance System <onboarding@resend.dev>',
      to: employeeEmail,
      subject: `Vacation Request ${status}: ${employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Vacation Request Update</h2>
          
          <div style="background-color: ${statusColor}10; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${statusColor}">
            <p style="font-size: 18px; font-weight: bold; color: ${statusColor};">${statusText}</p>
            <p><strong>Dates:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
            ${reason ? `<p><strong>Manager Notes:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>You can view all your vacation requests in the dashboard.</p>
          
          <hr style="margin: 20px 0;" />
          
          <p style="color: #666; font-size: 12px;">
            This is an automated message from your Attendance Tracking System.
          </p>
        </div>
      `
    })
    
    return true
  } catch (error) {
    console.error('Failed to send status email:', error)
    return false
  }
}