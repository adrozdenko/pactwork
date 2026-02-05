import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'
import type { ParsedSpec, Endpoint, HttpMethod, Parameter, Schema, ResponseSpec, RequestBody } from './types.js'

export type { ParsedSpec, Endpoint, Parameter, Schema } from './types.js'

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

/**
 * Parse and validate an OpenAPI specification
 */
export async function parseSpec(specPath: string): Promise<ParsedSpec> {
  // Validate and dereference the spec
  const api = await SwaggerParser.validate(specPath) as OpenAPI.Document

  return normalizeSpec(api)
}

/**
 * Parse without validation (faster, for watch mode)
 */
export async function parseSpecFast(specPath: string): Promise<ParsedSpec> {
  const api = await SwaggerParser.parse(specPath) as OpenAPI.Document

  return normalizeSpec(api)
}

function normalizeSpec(api: OpenAPI.Document): ParsedSpec {
  const version = detectVersion(api)
  const endpoints: Endpoint[] = []

  // Extract endpoints from paths
  if ('paths' in api && api.paths) {
    for (const [path, pathItem] of Object.entries(api.paths)) {
      if (!pathItem) continue

      for (const method of HTTP_METHODS) {
        const operation = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined

        if (operation) {
          endpoints.push(normalizeEndpoint(path, method, operation, pathItem as OpenAPIV3.PathItemObject))
        }
      }
    }
  }

  // Extract schemas
  const schemas: Record<string, Schema> = {}
  if ('components' in api && api.components?.schemas) {
    for (const [name, schema] of Object.entries(api.components.schemas)) {
      schemas[name] = normalizeSchema(schema as OpenAPIV3.SchemaObject)
    }
  }

  // Extract base URL
  let baseUrl: string | undefined
  if ('servers' in api && api.servers?.[0]?.url) {
    baseUrl = api.servers[0].url
  }

  return {
    version,
    info: {
      title: api.info?.title ?? 'Untitled API',
      version: api.info?.version ?? '1.0.0',
      description: api.info?.description,
    },
    endpoints,
    schemas,
    baseUrl,
  }
}

/**
 * Detect the OpenAPI specification version from the document.
 * Supports Swagger 2.0, OpenAPI 3.0, and OpenAPI 3.1.
 */
function detectVersion(api: OpenAPI.Document): '2.0' | '3.0' | '3.1' {
  if ('swagger' in api && api.swagger === '2.0') {
    return '2.0'
  }

  if ('openapi' in api) {
    const openapi = api as OpenAPIV3.Document | OpenAPIV3_1.Document

    if (openapi.openapi.startsWith('3.1')) {
      return '3.1'
    }
    return '3.0'
  }

  return '3.0'
}

/**
 * Extract and normalize parameters from path item and operation.
 * Combines path-level and operation-level parameters.
 */
function extractParameters(
  pathItem: OpenAPIV3.PathItemObject,
  operation: OpenAPIV3.OperationObject
): Parameter[] {
  const allParams = [
    ...(pathItem.parameters ?? []),
    ...(operation.parameters ?? []),
  ] as OpenAPIV3.ParameterObject[]

  return allParams.map(p => ({
    name: p.name,
    in: p.in as Parameter['in'],
    required: p.required,
    schema: p.schema ? normalizeSchema(p.schema as OpenAPIV3.SchemaObject) : undefined,
    description: p.description,
  }))
}

/**
 * Extract and normalize request body from operation.
 */
function extractRequestBody(operation: OpenAPIV3.OperationObject): RequestBody | undefined {
  if (!operation.requestBody) return undefined

  const rb = operation.requestBody as OpenAPIV3.RequestBodyObject
  return {
    required: rb.required,
    content: normalizeContent(rb.content),
  }
}

/**
 * Extract and normalize responses from operation.
 */
function extractResponses(operation: OpenAPIV3.OperationObject): Record<string, ResponseSpec> {
  const responses: Record<string, ResponseSpec> = {}

  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      const resp = response as OpenAPIV3.ResponseObject
      responses[statusCode] = {
        description: resp.description,
        content: resp.content ? normalizeContent(resp.content) : undefined,
      }
    }
  }

  return responses
}

/**
 * Normalize an OpenAPI operation into an Endpoint structure.
 */
function normalizeEndpoint(
  path: string,
  method: HttpMethod,
  operation: OpenAPIV3.OperationObject,
  pathItem: OpenAPIV3.PathItemObject
): Endpoint {
  return {
    path,
    method,
    operationId: operation.operationId,
    summary: operation.summary,
    tags: operation.tags,
    parameters: extractParameters(pathItem, operation),
    requestBody: extractRequestBody(operation),
    responses: extractResponses(operation),
  }
}

function normalizeContent(content: Record<string, OpenAPIV3.MediaTypeObject>): Record<string, { schema?: Schema }> {
  const result: Record<string, { schema?: Schema }> = {}

  for (const [mediaType, value] of Object.entries(content)) {
    result[mediaType] = {
      schema: value.schema ? normalizeSchema(value.schema as OpenAPIV3.SchemaObject) : undefined,
    }
  }

  return result
}

function normalizeSchema(schema: OpenAPIV3.SchemaObject): Schema {
  // Cast to any to access items property (exists on ArraySchemaObject)
  const schemaAny = schema as Record<string, unknown>

  return {
    type: schema.type as string | undefined,
    format: schema.format,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([k, v]) => [k, normalizeSchema(v as OpenAPIV3.SchemaObject)])
        )
      : undefined,
    items: schemaAny.items ? normalizeSchema(schemaAny.items as OpenAPIV3.SchemaObject) : undefined,
    required: schema.required,
    enum: schema.enum,
    allOf: schema.allOf?.map(s => normalizeSchema(s as OpenAPIV3.SchemaObject)),
    oneOf: schema.oneOf?.map(s => normalizeSchema(s as OpenAPIV3.SchemaObject)),
    anyOf: schema.anyOf?.map(s => normalizeSchema(s as OpenAPIV3.SchemaObject)),
    nullable: schema.nullable,
    description: schema.description,
    example: schema.example,
  }
}
