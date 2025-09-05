import { describe, it, expect } from 'vitest'
import { stableStringify } from '../canonical'

describe('stableStringify', () => {
  it('orders keys deterministically', () => {
    const a = { b:2, a:1, c:{ d:4, a:3 } }
    const b = { c:{ a:3, d:4 }, a:1, b:2 }
    expect(stableStringify(a)).toEqual(stableStringify(b))
  })
})
