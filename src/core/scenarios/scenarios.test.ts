import { describe, it, expect } from 'vitest'
import {
  generateScenarios,
  generateScenariosCode,
  generateScenariosWithCode,
  formatScenariosList,
  getScenarioCoverage,
} from './index.js'
import type { ParsedSpec } from '../parser/types.js'

const mockSpec: ParsedSpec = {
  version: '3.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  baseUrl: 'https://api.example.com',
  schemas: {},
  endpoints: [
    {
      path: '/users',
      method: 'get',
      operationId: 'listUsers',
      summary: 'List all users',
      parameters: [],
      responses: {
        '200': { description: 'Success' },
        '401': { description: 'Unauthorized' },
        '500': { description: 'Server error' },
      },
    },
    {
      path: '/users/{id}',
      method: 'get',
      operationId: 'getUser',
      summary: 'Get user by ID',
      parameters: [{ name: 'id', in: 'path', required: true }],
      responses: {
        '200': { description: 'Success' },
        '404': { description: 'User not found' },
      },
    },
    {
      path: '/users',
      method: 'post',
      operationId: 'createUser',
      summary: 'Create user',
      parameters: [],
      responses: {
        '201': { description: 'Created' },
        '400': { description: 'Bad request' },
        '409': { description: 'Conflict' },
      },
    },
  ],
}

describe('generateScenarios', () => {
  it('should extract all response codes from spec', () => {
    const catalog = generateScenarios(mockSpec)

    expect(catalog.summary.totalOperations).toBe(3)
    expect(catalog.summary.totalScenarios).toBe(8)
  })

  it('should group scenarios by operationId', () => {
    const catalog = generateScenarios(mockSpec)

    expect(catalog.operations['listUsers']).toBeDefined()
    expect(catalog.operations['getUser']).toBeDefined()
    expect(catalog.operations['createUser']).toBeDefined()
  })

  it('should create named scenario keys for common status codes', () => {
    const catalog = generateScenarios(mockSpec)

    const listUsersScenarios = catalog.operations['listUsers'].scenarios
    expect(listUsersScenarios['success']).toBeDefined()
    expect(listUsersScenarios['success'].status).toBe('200')
    expect(listUsersScenarios['unauthorized']).toBeDefined()
    expect(listUsersScenarios['unauthorized'].status).toBe('401')
    expect(listUsersScenarios['serverError']).toBeDefined()
    expect(listUsersScenarios['serverError'].status).toBe('500')
  })

  it('should mark success scenarios correctly', () => {
    const catalog = generateScenarios(mockSpec)

    const scenarios = catalog.operations['listUsers'].scenarios
    expect(scenarios['success'].isSuccess).toBe(true)
    expect(scenarios['unauthorized'].isSuccess).toBe(false)
    expect(scenarios['serverError'].isSuccess).toBe(false)
  })

  it('should include description from spec', () => {
    const catalog = generateScenarios(mockSpec)

    const scenarios = catalog.operations['getUser'].scenarios
    expect(scenarios['notFound'].description).toBe('User not found')
  })

  it('should filter by includeSuccess option', () => {
    const catalog = generateScenarios(mockSpec, { includeSuccess: false })

    // Should only have error scenarios
    const scenarios = catalog.operations['listUsers'].scenarios
    expect(scenarios['success']).toBeUndefined()
    expect(scenarios['unauthorized']).toBeDefined()
  })

  it('should filter by includeErrors option', () => {
    const catalog = generateScenarios(mockSpec, { includeErrors: false })

    const scenarios = catalog.operations['listUsers'].scenarios
    expect(scenarios['success']).toBeDefined()
    expect(scenarios['unauthorized']).toBeUndefined()
    expect(scenarios['serverError']).toBeUndefined()
  })

  it('should track status counts in summary', () => {
    const catalog = generateScenarios(mockSpec)

    expect(catalog.summary.byStatus['200']).toBe(2)
    expect(catalog.summary.byStatus['201']).toBe(1)
    expect(catalog.summary.byStatus['404']).toBe(1)
  })

  it('should handle "default" status code', () => {
    const specWithDefault: ParsedSpec = {
      ...mockSpec,
      endpoints: [
        {
          path: '/health',
          method: 'get',
          operationId: 'healthCheck',
          parameters: [],
          responses: {
            '200': { description: 'OK' },
            'default': { description: 'Unexpected error' },
          },
        },
      ],
    }

    const catalog = generateScenarios(specWithDefault)
    const scenarios = catalog.operations['healthCheck'].scenarios

    expect(scenarios['default']).toBeDefined()
    expect(scenarios['default'].status).toBe('default')
  })

  it('should filter with 1xx and 3xx status ranges', () => {
    const specWithRedirects: ParsedSpec = {
      ...mockSpec,
      endpoints: [
        {
          path: '/redirect',
          method: 'get',
          operationId: 'redirect',
          parameters: [],
          responses: {
            '301': { description: 'Moved Permanently' },
            '200': { description: 'OK' },
          },
        },
      ],
    }

    const catalog = generateScenarios(specWithRedirects, {
      includeStatuses: ['3xx'],
    })

    const scenarios = catalog.operations['redirect'].scenarios
    expect(scenarios['status301']).toBeDefined()
    expect(Object.keys(scenarios)).toHaveLength(1)
  })
})

describe('generateScenariosCode', () => {
  it('should generate valid TypeScript code', () => {
    const catalog = generateScenarios(mockSpec)
    const code = generateScenariosCode(catalog)

    expect(code).toContain('// Generated by Pactwork')
    expect(code).toContain('export const scenarios = {')
    expect(code).toContain('} as const')
  })

  it('should include all operations', () => {
    const catalog = generateScenarios(mockSpec)
    const code = generateScenariosCode(catalog)

    expect(code).toContain('listUsers:')
    expect(code).toContain('getUser:')
    expect(code).toContain('createUser:')
  })

  it('should include scenario status codes as strings', () => {
    const catalog = generateScenarios(mockSpec)
    const code = generateScenariosCode(catalog)

    expect(code).toContain("success: { status: '200' }")
    expect(code).toContain("notFound: { status: '404' }")
    expect(code).toContain("created: { status: '201' }")
  })

  it('should export generic ScenarioKey type', () => {
    const catalog = generateScenarios(mockSpec)
    const code = generateScenariosCode(catalog)

    expect(code).toContain('export type OperationId')
    expect(code).toContain('export type ScenarioKey<T extends OperationId>')
  })
})

describe('generateScenariosWithCode', () => {
  it('should return both catalog and code', () => {
    const result = generateScenariosWithCode(mockSpec)

    expect(result.catalog).toBeDefined()
    expect(result.code).toBeDefined()
    expect(result.catalog.summary.totalScenarios).toBe(8)
    expect(result.code).toContain('export const scenarios')
  })
})

describe('formatScenariosList', () => {
  it('should format scenarios for console display', () => {
    const catalog = generateScenarios(mockSpec)
    const output = formatScenariosList(catalog)

    expect(output).toContain('Test API')
    expect(output).toContain('GET /users')
    expect(output).toContain('listUsers')
    expect(output).toContain('success (200)')
  })

  it('should show success/error markers', () => {
    const catalog = generateScenarios(mockSpec)
    const output = formatScenariosList(catalog)

    expect(output).toContain('✓ success')
    expect(output).toContain('✗ unauthorized')
  })
})

describe('getScenarioCoverage', () => {
  it('should calculate coverage statistics', () => {
    const catalog = generateScenarios(mockSpec)
    const coverage = getScenarioCoverage(catalog)

    expect(coverage.total).toBe(8)
    expect(coverage.success).toBe(3) // 200, 200, 201
    expect(coverage.clientError).toBe(4) // 401, 404, 400, 409
    expect(coverage.serverError).toBe(1) // 500
  })
})

describe('operationId fallback', () => {
  it('should generate operationId from method+path when not provided', () => {
    const specWithoutOperationId: ParsedSpec = {
      ...mockSpec,
      endpoints: [
        {
          path: '/products/{productId}/reviews',
          method: 'get',
          // no operationId
          parameters: [],
          responses: {
            '200': { description: 'Success' },
          },
        },
      ],
    }

    const catalog = generateScenarios(specWithoutOperationId)

    // Should have generated an operationId
    const operationIds = Object.keys(catalog.operations)
    expect(operationIds.length).toBe(1)
    expect(operationIds[0]).toContain('get')
    expect(operationIds[0]).toContain('products')
  })
})
