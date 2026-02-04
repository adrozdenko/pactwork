export interface ValidationResult {
  /** Whether handlers match the spec */
  valid: boolean
  /** List of drift issues */
  drift: DriftItem[]
  /** Suggestions for fixing issues */
  suggestions: Suggestion[]
}

export interface DriftItem {
  /** Type of drift */
  type: 'missing' | 'extra' | 'mismatch'
  /** Endpoint path */
  endpoint: string
  /** HTTP method */
  method: string
  /** Human-readable details */
  details: string
  /** Severity level */
  severity: 'error' | 'warning'
  /** Value from spec (for mismatches) */
  specValue?: unknown
  /** Value from handler (for mismatches) */
  handlerValue?: unknown
}

export interface Suggestion {
  /** Suggestion message */
  message: string
  /** Command to fix (if applicable) */
  command?: string
}

export interface HandlerAnalysis {
  /** Endpoint path */
  path: string
  /** HTTP method */
  method: string
  /** Operation ID (if extractable) */
  operationId?: string
  /** File location */
  file: string
  /** Line number */
  line?: number
}
