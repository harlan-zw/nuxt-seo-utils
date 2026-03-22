import { describe, expect, it } from 'vitest'

describe('error page titleTemplate', () => {
  it('returns template string when no error', () => {
    const err = { value: null }
    const titleTemplate = () => err.value ? null : '%s %separator %siteName'
    expect(titleTemplate()).toBe('%s %separator %siteName')
  })

  it('returns null when error is present', () => {
    const err = { value: { statusCode: 404, message: 'Not Found' } }
    const titleTemplate = () => err.value ? null : '%s %separator %siteName'
    expect(titleTemplate()).toBeNull()
  })

  it('returns null for any truthy error value', () => {
    const err = { value: true }
    const titleTemplate = () => err.value ? null : '%s %separator %siteName'
    expect(titleTemplate()).toBeNull()
  })

  it('returns template when error is cleared', () => {
    const err = { value: { statusCode: 500 } as any }
    const titleTemplate = () => err.value ? null : '%s %separator %siteName'
    expect(titleTemplate()).toBeNull()

    // Simulate error being cleared
    err.value = null
    expect(titleTemplate()).toBe('%s %separator %siteName')
  })
})
