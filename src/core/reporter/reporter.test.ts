import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportValidation } from './index.js'
import type { ValidationResult } from '../validator/types.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

describe('reportValidation', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let tempDir: string

  beforeEach(async () => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pactwork-reporter-test-'))
  })

  afterEach(async () => {
    consoleSpy.mockRestore()
    await fs.remove(tempDir)
  })

  describe('console format', () => {
    it('should report success when valid with no drift', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'console' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.stringContaining('All handlers match specification')
      )
    })

    it('should report errors with count', () => {
      const result: ValidationResult = {
        valid: false,
        drift: [
          {
            type: 'missing',
            endpoint: '/users',
            method: 'get',
            details: 'Handler missing for GET /users',
            severity: 'error',
          },
          {
            type: 'missing',
            endpoint: '/posts',
            method: 'post',
            details: 'Handler missing for POST /posts',
            severity: 'error',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'console' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 error(s)')
      )
    })

    it('should report warnings separately from errors', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [
          {
            type: 'extra',
            endpoint: '/debug',
            method: 'get',
            details: 'Handler exists but endpoint not in spec',
            severity: 'warning',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'console' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 warning(s)')
      )
    })
  })

  describe('json format', () => {
    it('should output valid JSON to console', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'json' })

      const output = consoleSpy.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.valid).toBe(true)
      expect(parsed.drift).toEqual([])
      expect(parsed.timestamp).toBeDefined()
    })

    it('should write JSON to file when output specified', async () => {
      const outputPath = path.join(tempDir, 'report.json')
      const result: ValidationResult = {
        valid: false,
        drift: [
          {
            type: 'missing',
            endpoint: '/users',
            method: 'get',
            details: 'Missing',
            severity: 'error',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'json', output: outputPath })

      const fileContent = await fs.readFile(outputPath, 'utf-8')
      const parsed = JSON.parse(fileContent)

      expect(parsed.valid).toBe(false)
      expect(parsed.drift).toHaveLength(1)
      expect(parsed.results.failed).toBe(1)
    })
  })

  describe('github format', () => {
    it('should output GitHub Actions annotations for errors', () => {
      const result: ValidationResult = {
        valid: false,
        drift: [
          {
            type: 'missing',
            endpoint: '/users',
            method: 'get',
            details: 'Handler missing for GET /users',
            severity: 'error',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'github' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^::error::/)
      )
    })

    it('should output GitHub Actions annotations for warnings', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [
          {
            type: 'extra',
            endpoint: '/debug',
            method: 'get',
            details: 'Extra handler',
            severity: 'warning',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'github' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^::warning::/)
      )
    })

    it('should output notice on success', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'github' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^::notice::/)
      )
    })
  })

  describe('markdown format', () => {
    it('should output markdown to console', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'markdown' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('# Pactwork Validation Report')
      )
    })

    it('should include issues table when drift exists', () => {
      const result: ValidationResult = {
        valid: false,
        drift: [
          {
            type: 'missing',
            endpoint: '/users',
            method: 'get',
            details: 'Missing',
            severity: 'error',
          },
        ],
        suggestions: [],
      }

      reportValidation(result, { format: 'markdown' })

      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('## Issues Found')
      expect(output).toContain('| Type | Method | Endpoint | Severity |')
      expect(output).toContain('/users')
    })

    it('should write markdown to file when output specified', async () => {
      const outputPath = path.join(tempDir, 'report.md')
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'markdown', output: outputPath })

      const fileContent = await fs.readFile(outputPath, 'utf-8')
      expect(fileContent).toContain('# Pactwork Validation Report')
      expect(fileContent).toContain('✅ Passed')
    })
  })

  describe('default format', () => {
    it('should use console format when format is unknown', () => {
      const result: ValidationResult = {
        valid: true,
        drift: [],
        suggestions: [],
      }

      reportValidation(result, { format: 'unknown' as any })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.stringContaining('All handlers match specification')
      )
    })
  })
})
