import DashboardClient from '../DashboardClient'

// NOTE: This is a Server Component file. Import your client island directly.
// Do NOT use next/dynamic with { ssr:false } here — that’s forbidden in RSC.
export default function Page() {
  return <DashboardClient />
}
