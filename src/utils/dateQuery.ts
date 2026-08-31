export interface DateQuery {
  from: string
  to: string
}

export const EMPTY_DATE_QUERY: DateQuery = {
  from: '',
  to: '',
}

export function matchDateQuery(
  isoDate: string | null | undefined,
  query: DateQuery,
) {
  const hasFrom = Boolean(query.from)
  const hasTo = Boolean(query.to)
  if (!hasFrom && !hasTo) return true
  const day = (isoDate || '').slice(0, 10)
  if (!day) return false
  if (hasFrom && hasTo) {
    const start = query.from <= query.to ? query.from : query.to
    const end = query.from <= query.to ? query.to : query.from
    return day >= start && day <= end
  }
  return hasFrom ? day === query.from : day === query.to
}
