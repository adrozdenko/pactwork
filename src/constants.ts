/**
 * Pactwork Constants
 *
 * Centralized constants for consistent behavior across CLI and core modules.
 */

/**
 * Exit codes for CLI commands.
 * Using constants ensures predictable CI behavior.
 */
export const EXIT_CODES = {
  /** Command completed successfully */
  SUCCESS: 0,
  /** Validation failed - handlers don't match spec */
  VALIDATION_FAILED: 1,
  /** Warnings treated as errors (--fail-on-warning) */
  WARNINGS_AS_ERRORS: 2,
  /** Unexpected exception occurred */
  EXCEPTION: 10,
} as const

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES]

/**
 * Common locations to search for OpenAPI specifications.
 * Checked in order during `pactwork init` auto-detection.
 */
export const OPENAPI_SPEC_CANDIDATES = [
  'openapi.yaml',
  'openapi.yml',
  'openapi.json',
  'api/openapi.yaml',
  'api/openapi.yml',
  'api/openapi.json',
  'spec/openapi.yaml',
  'spec/openapi.yml',
  'spec/openapi.json',
  'docs/openapi.yaml',
  'docs/openapi.yml',
  'docs/openapi.json',
  'swagger.yaml',
  'swagger.yml',
  'swagger.json',
] as const

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default output directory for generated handlers */
  OUTPUT_DIR: './src/mocks',
  /** Default debounce delay for watch mode (ms) */
  WATCH_DEBOUNCE_MS: 300,
  /** Default contracts directory */
  CONTRACTS_DIR: '.pactwork',
  /** Default consumer name */
  CONSUMER: 'frontend',
  /** Default provider name */
  PROVIDER: 'api',
} as const

/**
 * Schema versioning for pactwork artifacts
 */
export const SCHEMA = {
  /** Current pactwork schema version for contracts, catalogs, and reports */
  VERSION: '1.0',
  /** Default API version when spec doesn't provide one */
  DEFAULT_API_VERSION: '1.0.0',
} as const

/**
 * Coverage thresholds for scenario coverage reports
 */
export const COVERAGE_THRESHOLDS = {
  /** Percentage at or above which coverage is considered "good" */
  GOOD: 80,
  /** Percentage at or above which coverage is considered "partial" */
  PARTIAL: 50,
} as const

/**
 * CLI display limits for output formatting
 */
export const CLI_LIMITS = {
  /** Maximum items to show in summary lists (drift, interactions) */
  MAX_SUMMARY_ITEMS: 5,
  /** Maximum types to show in type generation summary */
  MAX_TYPE_ITEMS: 10,
} as const
