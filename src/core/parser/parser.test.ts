import { describe, it, expect } from 'vitest'
import { parseSpec } from './index.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

describe('parseSpec', () => {
  it('should parse a valid OpenAPI 3.0 spec', async () => {
    // Create a temporary spec file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pactwork-test-'))
    const specPath = path.join(tempDir, 'openapi.yaml')

    const specContent = `
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    name:
                      type: string
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: User details
`

    await fs.writeFile(specPath, specContent)

    try {
      const spec = await parseSpec(specPath)

      expect(spec.version).toBe('3.0')
      expect(spec.info.title).toBe('Test API')
      expect(spec.info.version).toBe('1.0.0')
      expect(spec.endpoints).toHaveLength(2)

      const getUsersEndpoint = spec.endpoints.find(e => e.operationId === 'getUsers')
      expect(getUsersEndpoint).toBeDefined()
      expect(getUsersEndpoint?.path).toBe('/users')
      expect(getUsersEndpoint?.method).toBe('get')

      const getUserEndpoint = spec.endpoints.find(e => e.operationId === 'getUser')
      expect(getUserEndpoint).toBeDefined()
      expect(getUserEndpoint?.path).toBe('/users/{id}')
      expect(getUserEndpoint?.parameters).toHaveLength(1)
      expect(getUserEndpoint?.parameters[0].name).toBe('id')
      expect(getUserEndpoint?.parameters[0].in).toBe('path')
      expect(getUserEndpoint?.parameters[0].required).toBe(true)
    } finally {
      await fs.remove(tempDir)
    }
  })

  it('should extract base URL from servers', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pactwork-test-'))
    const specPath = path.join(tempDir, 'openapi.yaml')

    const specContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
servers:
  - url: https://api.example.com/v1
paths:
  /health:
    get:
      responses:
        200:
          description: Health check
`

    await fs.writeFile(specPath, specContent)

    try {
      const spec = await parseSpec(specPath)
      expect(spec.baseUrl).toBe('https://api.example.com/v1')
    } finally {
      await fs.remove(tempDir)
    }
  })
})
