export function cn(...xs: Array<string | number | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}
