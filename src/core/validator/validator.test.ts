import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateHandlers } from './index.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

describe('validateHandlers', () => {
  let tempDir: string
  let specPath: string
  let handlersDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pactwork-validator-test-'))
    specPath = path.join(tempDir, 'openapi.yaml')
    handlersDir = path.join(tempDir, 'handlers')
    await fs.ensureDir(handlersDir)
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should return valid when handlers match spec', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: List of users
`
    await fs.writeFile(specPath, spec)

    const handlers = `
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users', () => {
    return HttpResponse.json([])
  }),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(true)
    expect(result.drift).toHaveLength(0)
  })

  it('should detect missing handlers', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: List of users
  /users/{id}:
    get:
      operationId: getUser
      responses:
        200:
          description: User details
`
    await fs.writeFile(specPath, spec)

    // Only one handler, missing the second endpoint
    const handlers = `
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users', () => {
    return HttpResponse.json([])
  }),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(false)
    expect(result.drift).toHaveLength(1)
    expect(result.drift[0].type).toBe('missing')
    expect(result.drift[0].endpoint).toBe('/users/{id}')
    expect(result.drift[0].method).toBe('get')
    expect(result.drift[0].severity).toBe('error')
  })

  it('should detect extra handlers', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: List of users
`
    await fs.writeFile(specPath, spec)

    // Extra handler not in spec
    const handlers = `
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users', () => {
    return HttpResponse.json([])
  }),
  http.delete('/users/:id', () => {
    return HttpResponse.json({ deleted: true })
  }),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(true) // Extra handlers are warnings, not errors
    expect(result.drift).toHaveLength(1)
    expect(result.drift[0].type).toBe('extra')
    expect(result.drift[0].endpoint).toBe('/users/:id')
    expect(result.drift[0].method).toBe('delete')
    expect(result.drift[0].severity).toBe('warning')
  })

  it('should match OpenAPI {id} style with MSW :id style', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users/{userId}/posts/{postId}:
    get:
      operationId: getUserPost
      responses:
        200:
          description: Post details
`
    await fs.writeFile(specPath, spec)

    const handlers = `
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users/:userId/posts/:postId', () => {
    return HttpResponse.json({})
  }),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(true)
    expect(result.drift).toHaveLength(0)
  })

  it('should handle template literal paths with baseURL', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /products:
    get:
      operationId: getProducts
      responses:
        200:
          description: List of products
`
    await fs.writeFile(specPath, spec)

    const handlers = `
import { http, HttpResponse } from 'msw'

const baseURL = 'https://api.example.com'

export const handlers = [
  http.get(\`\${baseURL}/products\`, () => {
    return HttpResponse.json([])
  }),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(true)
    expect(result.drift).toHaveLength(0)
  })

  it('should generate suggestions for missing handlers', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      responses:
        200:
          description: OK
    post:
      responses:
        201:
          description: Created
`
    await fs.writeFile(specPath, spec)

    // Empty handlers file
    const handlers = `
import { http, HttpResponse } from 'msw'
export const handlers = []
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(false)
    expect(result.drift).toHaveLength(2)
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.some(s => s.command === 'pactwork generate')).toBe(true)
  })

  it('should return valid when handlers directory does not exist', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /health:
    get:
      responses:
        200:
          description: OK
`
    await fs.writeFile(specPath, spec)

    const nonExistentDir = path.join(tempDir, 'non-existent')
    const result = await validateHandlers(specPath, nonExistentDir)

    // Missing handlers should be detected
    expect(result.valid).toBe(false)
    expect(result.drift).toHaveLength(1)
    expect(result.drift[0].type).toBe('missing')
  })

  it('should handle multiple HTTP methods on same path', async () => {
    const spec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      responses:
        200:
          description: List users
    post:
      responses:
        201:
          description: Create user
    delete:
      responses:
        204:
          description: Delete all users
`
    await fs.writeFile(specPath, spec)

    const handlers = `
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/users', () => HttpResponse.json([])),
  http.post('/users', () => HttpResponse.json({}, { status: 201 })),
  http.delete('/users', () => new HttpResponse(null, { status: 204 })),
]
`
    await fs.writeFile(path.join(handlersDir, 'handlers.ts'), handlers)

    const result = await validateHandlers(specPath, handlersDir)

    expect(result.valid).toBe(true)
    expect(result.drift).toHaveLength(0)
  })
})
