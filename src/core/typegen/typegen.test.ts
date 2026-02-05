import { describe, it, expect } from 'vitest'
import { generateTypes } from './index.js'
import type { ParsedSpec } from '../parser/types.js'

describe('generateTypes', () => {
  it('should generate types from schemas', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['id', 'name'],
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('User')
    expect(result.code).toContain('export interface User')
    expect(result.code).toContain('id: string;')
    expect(result.code).toContain('name: string;')
    expect(result.code).toContain('age?: number;') // optional
  })

  it('should handle array types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        Tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('string[]')
  })

  it('should handle enum types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        Status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('"active"')
    expect(result.code).toContain('"inactive"')
    expect(result.code).toContain('"pending"')
  })

  it('should handle $ref references', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            author: { $ref: '#/components/schemas/User' },
          },
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('author?: User;')
  })

  it('should generate path parameter types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/users/{id}',
          method: 'get',
          operationId: 'getUser',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {},
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('GetUserPathParams')
    expect(result.code).toContain('id: string;')
  })

  it('should generate query parameter types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/users',
          method: 'get',
          operationId: 'listUsers',
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          ],
          responses: {},
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('ListUsersQueryParams')
    expect(result.code).toContain('page?: number;')
    expect(result.code).toContain('limit?: number;')
  })

  it('should generate request body types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/users',
          method: 'post',
          operationId: 'createUser',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                  required: ['name', 'email'],
                },
              },
            },
          },
          responses: {},
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('CreateUserRequest')
    expect(result.code).toContain('name: string;')
    expect(result.code).toContain('email: string;')
  })

  it('should generate response types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/users',
          method: 'get',
          operationId: 'listUsers',
          parameters: [],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      ],
      schemas: {
        User: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('ListUsersResponse')
    expect(result.code).toContain('User[]')
  })

  it('should include generation header', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {},
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('Generated by Pactwork')
    expect(result.code).toContain('OpenAPI 3.0')
  })
})
