import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  extractScenariosFromContent,
  isStoryFile,
  findStoryFiles,
  scanStoriesDirectory,
  calculateCoverage,
  getCoverageLevel,
  meetsCoverageThreshold,
} from './index.js'
import type { ScenarioCatalog } from '../scenarios/types.js'
import type { StoryScanResult } from './types.js'

describe('isStoryFile', () => {
  it('should return true for .stories.ts files', () => {
    expect(isStoryFile('Button.stories.ts')).toBe(true)
    expect(isStoryFile('path/to/Button.stories.ts')).toBe(true)
  })

  it('should return true for .stories.tsx files', () => {
    expect(isStoryFile('Button.stories.tsx')).toBe(true)
  })

  it('should return true for .stories.js files', () => {
    expect(isStoryFile('Button.stories.js')).toBe(true)
  })

  it('should return true for .stories.jsx files', () => {
    expect(isStoryFile('Button.stories.jsx')).toBe(true)
  })

  it('should return false for non-story files', () => {
    expect(isStoryFile('Button.ts')).toBe(false)
    expect(isStoryFile('Button.tsx')).toBe(false)
    expect(isStoryFile('Button.test.ts')).toBe(false)
    expect(isStoryFile('stories.ts')).toBe(false)
  })
})

describe('extractScenariosFromContent', () => {
  it('should extract single scenario with single quotes', () => {
    const content = `
      export const Error: Story = {
        parameters: {
          pactwork: { scenario: 'getUser.notFound' }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('getUser.notFound')
  })

  it('should extract single scenario with double quotes', () => {
    const content = `
      export const Error: Story = {
        parameters: {
          pactwork: { scenario: "getUser.notFound" }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('getUser.notFound')
  })

  it('should extract multiple scenarios from array', () => {
    const content = `
      export const MultiError: Story = {
        parameters: {
          pactwork: { scenarios: ['getUser.notFound', 'listUsers.serverError'] }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('getUser.notFound')
    expect(scenarios).toContain('listUsers.serverError')
  })

  it('should extract scenarios with mixed quotes in array', () => {
    const content = `
      export const MixedQuotes: Story = {
        parameters: {
          pactwork: { scenarios: ["getUser.notFound", 'listUsers.serverError'] }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('getUser.notFound')
    expect(scenarios).toContain('listUsers.serverError')
  })

  it('should extract from multiple stories in one file', () => {
    const content = `
      export const Story1: Story = {
        parameters: {
          pactwork: { scenario: 'op1.success' }
        }
      }
      export const Story2: Story = {
        parameters: {
          pactwork: { scenario: 'op2.error' }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('op1.success')
    expect(scenarios).toContain('op2.error')
  })

  it('should deduplicate scenarios', () => {
    const content = `
      export const Story1: Story = {
        parameters: { pactwork: { scenario: 'getUser.success' } }
      }
      export const Story2: Story = {
        parameters: { pactwork: { scenario: 'getUser.success' } }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios.filter(s => s === 'getUser.success').length).toBe(1)
  })

  it('should return empty array when no scenarios found', () => {
    const content = `
      export const Default: Story = {
        args: { label: 'Click me' }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toEqual([])
  })

  it('should handle scenario with other pactwork properties', () => {
    const content = `
      export const WithLatency: Story = {
        parameters: {
          pactwork: {
            scenario: 'getUser.success',
            latency: 1000
          }
        }
      }
    `
    const scenarios = extractScenariosFromContent(content)
    expect(scenarios).toContain('getUser.success')
  })
})

describe('getCoverageLevel', () => {
  it('should return "good" for >= 80%', () => {
    expect(getCoverageLevel(80)).toBe('good')
    expect(getCoverageLevel(100)).toBe('good')
    expect(getCoverageLevel(95)).toBe('good')
  })

  it('should return "partial" for >= 50% and < 80%', () => {
    expect(getCoverageLevel(50)).toBe('partial')
    expect(getCoverageLevel(79)).toBe('partial')
    expect(getCoverageLevel(65)).toBe('partial')
  })

  it('should return "low" for < 50%', () => {
    expect(getCoverageLevel(0)).toBe('low')
    expect(getCoverageLevel(49)).toBe('low')
    expect(getCoverageLevel(25)).toBe('low')
  })
})

describe('meetsCoverageThreshold', () => {
  const mockReport = {
    pactwork: '1.0' as const,
    generatedAt: new Date().toISOString(),
    spec: { title: 'Test API', version: '1.0.0' },
    summary: {
      totalScenarios: 10,
      coveredScenarios: 8,
      percentage: 80,
      level: 'good' as const,
      storiesScanned: 5,
    },
    operations: {},
    uncoveredScenarios: [],
    coveredScenarioIds: [],
  }

  it('should return true when coverage meets threshold', () => {
    expect(meetsCoverageThreshold(mockReport, 80)).toBe(true)
    expect(meetsCoverageThreshold(mockReport, 70)).toBe(true)
  })

  it('should return false when coverage is below threshold', () => {
    expect(meetsCoverageThreshold(mockReport, 81)).toBe(false)
    expect(meetsCoverageThreshold(mockReport, 90)).toBe(false)
  })
})

describe('calculateCoverage', () => {
  const mockCatalog: ScenarioCatalog = {
    pactwork: '1.0',
    generatedAt: new Date().toISOString(),
    spec: { title: 'Test API', version: '1.0.0' },
    operations: {
      getUser: {
        operationId: 'getUser',
        method: 'get',
        path: '/users/{id}',
        scenarios: {
          success: { status: '200', isSuccess: true },
          notFound: { status: '404', isSuccess: false },
          serverError: { status: '500', isSuccess: false },
        },
      },
      listUsers: {
        operationId: 'listUsers',
        method: 'get',
        path: '/users',
        scenarios: {
          success: { status: '200', isSuccess: true },
        },
      },
    },
    summary: {
      totalOperations: 2,
      totalScenarios: 4,
      byStatus: { '200': 2, '404': 1, '500': 1 },
    },
  }

  it('should calculate correct global coverage', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map([
        ['getUser.success', '/path/to/User.stories.ts'],
        ['getUser.notFound', '/path/to/User.stories.ts'],
        ['listUsers.success', '/path/to/Users.stories.ts'],
      ]),
      filesScanned: 2,
      filesWithScenarios: 2,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.summary.totalScenarios).toBe(4)
    expect(report.summary.coveredScenarios).toBe(3)
    expect(report.summary.percentage).toBe(75)
    expect(report.summary.level).toBe('partial')
  })

  it('should calculate correct per-operation coverage', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map([
        ['getUser.success', '/path/to/User.stories.ts'],
      ]),
      filesScanned: 1,
      filesWithScenarios: 1,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.operations['getUser'].total).toBe(3)
    expect(report.operations['getUser'].covered).toBe(1)
    expect(report.operations['getUser'].percentage).toBe(33)
    expect(report.operations['getUser'].level).toBe('low')
    expect(report.operations['getUser'].uncovered).toContain('notFound')
    expect(report.operations['getUser'].uncovered).toContain('serverError')
  })

  it('should list uncovered scenarios', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map([
        ['getUser.success', '/path/to/User.stories.ts'],
      ]),
      filesScanned: 1,
      filesWithScenarios: 1,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.uncoveredScenarios).toContain('getUser.notFound')
    expect(report.uncoveredScenarios).toContain('getUser.serverError')
    expect(report.uncoveredScenarios).toContain('listUsers.success')
    expect(report.uncoveredScenarios).not.toContain('getUser.success')
  })

  it('should handle 100% coverage', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map([
        ['getUser.success', '/path/to/User.stories.ts'],
        ['getUser.notFound', '/path/to/User.stories.ts'],
        ['getUser.serverError', '/path/to/User.stories.ts'],
        ['listUsers.success', '/path/to/Users.stories.ts'],
      ]),
      filesScanned: 2,
      filesWithScenarios: 2,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.summary.percentage).toBe(100)
    expect(report.summary.level).toBe('good')
    expect(report.uncoveredScenarios).toHaveLength(0)
  })

  it('should handle 0% coverage', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map(),
      filesScanned: 0,
      filesWithScenarios: 0,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.summary.percentage).toBe(0)
    expect(report.summary.level).toBe('low')
    expect(report.uncoveredScenarios).toHaveLength(4)
  })

  it('should include spec info in report', () => {
    const scanResult: StoryScanResult = {
      scenarioToStory: new Map(),
      filesScanned: 0,
      filesWithScenarios: 0,
    }

    const report = calculateCoverage(mockCatalog, scanResult)

    expect(report.spec.title).toBe('Test API')
    expect(report.spec.version).toBe('1.0.0')
    expect(report.pactwork).toBe('1.0')
  })
})

describe('findStoryFiles and scanStoriesDirectory', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `pactwork-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mkdirSync(join(testDir, 'components'), { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should find story files in directory', () => {
    writeFileSync(join(testDir, 'Button.stories.ts'), '// story file')
    writeFileSync(join(testDir, 'Button.tsx'), '// component file')
    writeFileSync(join(testDir, 'components', 'Card.stories.tsx'), '// story file')

    const files = findStoryFiles(testDir)

    expect(files.length).toBe(2)
    expect(files.some(f => f.includes('Button.stories.ts'))).toBe(true)
    expect(files.some(f => f.includes('Card.stories.tsx'))).toBe(true)
  })

  it('should skip node_modules directory', () => {
    mkdirSync(join(testDir, 'node_modules'), { recursive: true })
    writeFileSync(join(testDir, 'node_modules', 'pkg.stories.ts'), '// should skip')
    writeFileSync(join(testDir, 'Real.stories.ts'), '// should find')

    const files = findStoryFiles(testDir)

    expect(files.length).toBe(1)
    expect(files[0]).toContain('Real.stories.ts')
  })

  it('should skip hidden directories', () => {
    mkdirSync(join(testDir, '.storybook'), { recursive: true })
    writeFileSync(join(testDir, '.storybook', 'hidden.stories.ts'), '// should skip')
    writeFileSync(join(testDir, 'Visible.stories.ts'), '// should find')

    const files = findStoryFiles(testDir)

    expect(files.length).toBe(1)
    expect(files[0]).toContain('Visible.stories.ts')
  })

  it('should scan stories and extract scenarios', () => {
    const storyContent = `
      export const Error: Story = {
        parameters: {
          pactwork: { scenario: 'getUser.notFound' }
        }
      }
    `
    writeFileSync(join(testDir, 'User.stories.ts'), storyContent)

    const result = scanStoriesDirectory(testDir)

    expect(result.filesScanned).toBe(1)
    expect(result.filesWithScenarios).toBe(1)
    expect(result.scenarioToStory.has('getUser.notFound')).toBe(true)
  })

  it('should handle files without scenarios', () => {
    const storyContent = `
      export const Default: Story = {
        args: { label: 'Test' }
      }
    `
    writeFileSync(join(testDir, 'Button.stories.ts'), storyContent)

    const result = scanStoriesDirectory(testDir)

    expect(result.filesScanned).toBe(1)
    expect(result.filesWithScenarios).toBe(0)
    expect(result.scenarioToStory.size).toBe(0)
  })
})
