export function stableStringify(value: any): string {
  return JSON.stringify(sort(value))
  function sort(v: any): any {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.keys(v).sort().reduce((o,k) => { (o as any)[k] = sort(v[k]); return o }, {} as any)
    }
    return v
  }
}
