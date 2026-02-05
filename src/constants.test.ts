import { describe, it, expect } from 'vitest'
import { EXIT_CODES, OPENAPI_SPEC_CANDIDATES, DEFAULTS } from './constants.js'

describe('EXIT_CODES', () => {
  it('should have SUCCESS as 0', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0)
  })

  it('should have VALIDATION_FAILED as 1', () => {
    expect(EXIT_CODES.VALIDATION_FAILED).toBe(1)
  })

  it('should have WARNINGS_AS_ERRORS as 2', () => {
    expect(EXIT_CODES.WARNINGS_AS_ERRORS).toBe(2)
  })

  it('should have EXCEPTION as 10', () => {
    expect(EXIT_CODES.EXCEPTION).toBe(10)
  })

  it('should have unique exit codes', () => {
    const codes = Object.values(EXIT_CODES)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })
})

describe('OPENAPI_SPEC_CANDIDATES', () => {
  it('should include common OpenAPI filenames', () => {
    expect(OPENAPI_SPEC_CANDIDATES).toContain('openapi.yaml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('openapi.yml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('openapi.json')
  })

  it('should include swagger filenames for backwards compatibility', () => {
    expect(OPENAPI_SPEC_CANDIDATES).toContain('swagger.yaml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('swagger.yml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('swagger.json')
  })

  it('should include common subdirectory paths', () => {
    expect(OPENAPI_SPEC_CANDIDATES).toContain('api/openapi.yaml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('spec/openapi.yaml')
    expect(OPENAPI_SPEC_CANDIDATES).toContain('docs/openapi.yaml')
  })

  it('should have at least 10 candidates', () => {
    expect(OPENAPI_SPEC_CANDIDATES.length).toBeGreaterThanOrEqual(10)
  })
})

describe('DEFAULTS', () => {
  it('should have OUTPUT_DIR as ./src/mocks', () => {
    expect(DEFAULTS.OUTPUT_DIR).toBe('./src/mocks')
  })

  it('should have WATCH_DEBOUNCE_MS as 300', () => {
    expect(DEFAULTS.WATCH_DEBOUNCE_MS).toBe(300)
  })

  it('should have CONTRACTS_DIR defined', () => {
    expect(DEFAULTS.CONTRACTS_DIR).toBe('.pactwork')
  })

  it('should have CONSUMER defined', () => {
    expect(DEFAULTS.CONSUMER).toBe('frontend')
  })

  it('should have PROVIDER defined', () => {
    expect(DEFAULTS.PROVIDER).toBe('api')
  })
})
