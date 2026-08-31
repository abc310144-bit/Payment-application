/** 模糊比對：不分大小寫、忽略空白與連字號，多關鍵字需全部命中 */
export function fuzzyMatch(source: string, query: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[\s\-_]/g, '')

  const haystack = normalize(source)
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => normalize(token))
    .filter(Boolean)

  if (tokens.length === 0) return true
  return tokens.every((token) => haystack.includes(token))
}
