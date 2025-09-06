export type RawRow = Record<string,string>
export type Tx = {
  postedDate: string
  description: string
  amountCents: number
  accountId: string
}

export type Mapper = (row: RawRow, ctx: { accountId: string }) => Tx | null

export const mappers: Record<string, Mapper> = {
  // Bank of America example
  boa: (r, ctx) => {
    // Input columns: "Date","Description","Amount"
    const d = r["Date"]?.trim()
    const desc = r["Description"]?.trim() ?? ""
    const amt = Number(r["Amount"]?.replace(/,/g, ""))
    if (!d || !Number.isFinite(amt)) return null
    return {
      postedDate: new Date(d).toISOString().slice(0,10),
      description: desc,
      amountCents: Math.round(amt * 100),
      accountId: ctx.accountId,
    }
  },
  // Generic (date, description, debit, credit)
  generic_dc: (r, ctx) => {
    const d = r.date || r.Date
    const desc = r.description || r.DESC || ""
    const debit = +(r.debit || r.DEBIT || 0)
    const credit = +(r.credit || r.CREDIT || 0)
    const amt = (credit || 0) - (debit || 0)
    if (!d) return null
    return {
      postedDate: new Date(d).toISOString().slice(0,10),
      description: String(desc).trim(),
      amountCents: Math.round(amt * 100),
      accountId: ctx.accountId,
    }
  },
}
