const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土']

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

/** Monday of the week containing `date`. */
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Returns the 7 ISO dates (Mon-Sun) for the week starting at weekStart. */
export function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)))
}

export function formatDateLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JP[d.getDay()]})`
}

export function isToday(isoDate) {
  return isoDate === todayISO()
}
