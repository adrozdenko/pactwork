/**
 * Scenario types for Pactwork Phase 2
 * Enables simulation of error states, empty states, and edge cases from OpenAPI spec
 */

export interface Scenario {
  /** HTTP status code (string to preserve 'default', '2XX', etc.) */
  status: string
  /** Human-readable description from spec */
  description?: string
  /** Reference to response schema (if defined) */
  schemaRef?: string
  /** Whether this is the default/success scenario */
  isSuccess: boolean
}

export interface OperationScenarios {
  /** Operation ID from spec (or generated from method+path) */
  operationId: string
  /** HTTP method */
  method: string
  /** Path template */
  path: string
  /** All scenarios for this operation, keyed by status code */
  scenarios: Record<string, Scenario>
}

export interface ScenarioCatalog {
  /** Pactwork version */
  pactwork: '1.0'
  /** Generation timestamp */
  generatedAt: string
  /** Spec info */
  spec: {
    title: string
    version: string
  }
  /** All operations with their scenarios */
  operations: Record<string, OperationScenarios>
  /** Summary statistics */
  summary: {
    totalOperations: number
    totalScenarios: number
    byStatus: Record<string, number>
  }
}

export interface ScenarioGeneratorOptions {
  /** Include only specific status codes (e.g., ['4xx', '5xx']) */
  includeStatuses?: string[]
  /** Exclude specific status codes */
  excludeStatuses?: string[]
  /** Include success scenarios (2xx) - default: true */
  includeSuccess?: boolean
  /** Include error scenarios (4xx, 5xx) - default: true */
  includeErrors?: boolean
}

export interface ScenarioGeneratorResult {
  /** The generated catalog */
  catalog: ScenarioCatalog
  /** TypeScript code for scenarios.ts */
  code: string
}
