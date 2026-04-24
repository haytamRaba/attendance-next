export function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission()
  }
}

export function sendLateAlert(employeeName: string, minutesLate: number) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Late Arrival Alert', {
      body: `${employeeName} is ${minutesLate} minutes late today.`,
      icon: '/alert-icon.png',
      tag: 'late-alert'
    })
  }
}

export function sendAbsentAlert(employeeName: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Absent Alert', {
      body: `${employeeName} has not checked in today.`,
      icon: '/absent-icon.png',
      tag: 'absent-alert'
    })
  }
}