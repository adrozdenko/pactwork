export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export interface ParsedSpec {
  /** OpenAPI version */
  version: '2.0' | '3.0' | '3.1'
  /** Spec info */
  info: SpecInfo
  /** All endpoints */
  endpoints: Endpoint[]
  /** All schemas */
  schemas: Record<string, Schema>
  /** Base URL from servers */
  baseUrl?: string
}

export interface SpecInfo {
  title: string
  version: string
  description?: string
}

export interface Endpoint {
  /** Path template (e.g., /users/{id}) */
  path: string
  /** HTTP method */
  method: HttpMethod
  /** Operation ID from spec */
  operationId?: string
  /** Summary from spec */
  summary?: string
  /** Tags for grouping */
  tags?: string[]
  /** Path and query parameters */
  parameters: Parameter[]
  /** Request body specification */
  requestBody?: RequestBody
  /** Response specifications by status code */
  responses: Record<string, ResponseSpec>
}

export interface Parameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  schema?: Schema
  description?: string
}

export interface RequestBody {
  required?: boolean
  content: Record<string, MediaType>
}

export interface ResponseSpec {
  description?: string
  content?: Record<string, MediaType>
}

export interface MediaType {
  schema?: Schema
}

export interface Schema {
  /** Type can be string or array of strings (OpenAPI 3.1) */
  type?: string | string[]
  format?: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  enum?: unknown[]
  $ref?: string
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  nullable?: boolean
  description?: string
  example?: unknown
}
