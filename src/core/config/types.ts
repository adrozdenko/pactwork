export type ReportFormat = 'console' | 'json' | 'github' | 'markdown'

export interface PactworkConfig {
  /** OpenAPI specification configuration */
  spec: {
    /** Path to OpenAPI spec file */
    path: string
    /** Watch for changes */
    watch?: boolean
  }

  /** Handler generation options */
  generate: {
    /** Output directory for generated handlers */
    output: string
    /** Generate TypeScript files */
    typescript?: boolean
    /** Override base URL from spec */
    baseUrl?: string
    /** Endpoints to include (glob patterns) */
    includes?: string[]
    /** Endpoints to exclude (glob patterns) */
    excludes?: string[]
    /** Maximum array items in responses */
    maxArrayLength?: number
    /** Generate static (non-random) data */
    static?: boolean
  }

  /** AI mock generation (optional) */
  ai?: {
    /** Enable AI generation */
    enable: boolean
    /** AI provider */
    provider: 'openai' | 'anthropic' | 'azure'
    /** Model name */
    model?: string
    /** API key (prefer env vars) */
    apiKey?: string
  }

  /** Contract testing options */
  contracts: {
    /** Contract storage directory */
    dir: string
    /** Consumer name */
    consumer: string
    /** Provider name */
    provider: string
  }

  /** Broker configuration (optional) */
  broker?: {
    /** Broker URL */
    url: string
    /** Authentication token */
    token?: string
  }

  /** CI/CD options */
  ci?: {
    /** Fail validation on drift */
    failOnDrift?: boolean
    /** Fail on warnings */
    failOnWarning?: boolean
    /** Report format for CI */
    reportFormat?: ReportFormat
  }

  /** Type generation (optional) */
  types?: {
    /** Enable type generation */
    enable: boolean
    /** Output path for types */
    output?: string
  }
}
