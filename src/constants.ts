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
