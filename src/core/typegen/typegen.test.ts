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

  it('should handle allOf composition', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        Base: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
        Extended: {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { type: 'object', properties: { name: { type: 'string' } } },
          ],
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('Base')
    // allOf generates intersection type
    expect(result.code).toContain('&')
  })

  it('should handle oneOf composition', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        Cat: { type: 'object', properties: { purrs: { type: 'boolean' } } },
        Dog: { type: 'object', properties: { barks: { type: 'boolean' } } },
        Pet: {
          oneOf: [
            { $ref: '#/components/schemas/Cat' },
            { $ref: '#/components/schemas/Dog' },
          ],
        },
      },
    }

    const result = generateTypes(spec)

    // oneOf generates union type
    expect(result.code).toContain('|')
    expect(result.code).toContain('Cat')
    expect(result.code).toContain('Dog')
  })

  it('should handle anyOf composition', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        StringOrNumber: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('string | number')
  })

  it('should handle empty schemas', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        Empty: { type: 'object' },
      },
    }

    const result = generateTypes(spec)

    expect(result.code).toContain('Record<string, unknown>')
  })

  it('should respect includeRequestTypes option', () => {
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
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } },
              },
            },
          },
          responses: {},
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec, { includeRequestTypes: false })

    expect(result.types).not.toContain('CreateUserRequest')
  })

  it('should use first 2xx status as primary response', () => {
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
              description: 'OK',
              content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } },
            },
            '201': {
              description: 'Created',
              content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } } } } },
            },
            '404': {
              description: 'Not found',
              content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
            },
          },
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec)

    // 200 is the first 2xx, so it gets no suffix (primary)
    expect(result.types).toContain('ListUsersResponse')
    // 201 and 404 get suffixed
    expect(result.types).toContain('ListUsersResponse_201')
    expect(result.types).toContain('ListUsersResponse_404')
  })

  it('should handle requestBody without application/json content', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/upload',
          method: 'post',
          operationId: 'upload',
          parameters: [],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {},
        },
      ],
      schemas: {},
    }

    // Should not throw
    const result = generateTypes(spec)
    expect(result.types).not.toContain('UploadRequest')
  })

  it('should not generate request types for non-JSON content types', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [
        {
          path: '/form',
          method: 'post',
          operationId: 'submitForm',
          parameters: [],
          requestBody: {
            content: {
              'application/x-www-form-urlencoded': {
                schema: { type: 'object', properties: { name: { type: 'string' } } },
              },
            },
          },
          responses: {},
        },
        {
          path: '/text',
          method: 'post',
          operationId: 'submitText',
          parameters: [],
          requestBody: {
            content: {
              'text/plain': {
                schema: { type: 'string' },
              },
            },
          },
          responses: {},
        },
      ],
      schemas: {},
    }

    const result = generateTypes(spec)
    expect(result.types).not.toContain('SubmitFormRequest')
    expect(result.types).not.toContain('SubmitTextRequest')
  })

  it('should handle pascalCase edge cases', () => {
    const spec: ParsedSpec = {
      version: '3.0',
      info: { title: 'Test', version: '1.0.0' },
      endpoints: [],
      schemas: {
        'my-kebab-case': {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
        'snake_case_name': {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
    }

    const result = generateTypes(spec)

    expect(result.types).toContain('MyKebabCase')
    expect(result.types).toContain('SnakeCaseName')
  })
})
