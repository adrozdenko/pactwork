export interface GeneratorOptions {
  /** Path to OpenAPI specification */
  specPath: string
  /** Output directory for generated handlers */
  outputDir: string
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
  /** Skip OpenAPI spec validation (for specs with minor issues) */
  skipValidation?: boolean
  /** Enable verbose logging (surfaces fallback behavior) */
  verbose?: boolean
  /** AI configuration */
  ai?: AIConfig
}

export interface AIConfig {
  /** Enable AI generation */
  enable: boolean
  /** AI provider */
  provider: 'openai' | 'anthropic' | 'azure'
  /** Model name */
  model?: string
  /** API key */
  apiKey?: string
}

export interface GeneratorResult {
  /** Output directory */
  outputDir: string
  /** Generated handler information */
  handlers: HandlerInfo[]
  /** Hash of the spec file */
  specHash: string
  /** Parsed spec (for reuse, avoids double parsing) */
  spec?: import('../parser/types.js').ParsedSpec
}

export interface HandlerInfo {
  /** Endpoint path */
  path: string
  /** HTTP method */
  method: string
  /** Operation ID (if available) */
  operationId?: string
  /** File where handler is defined */
  file?: string
}
