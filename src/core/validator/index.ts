import fs from 'fs-extra'
import { glob } from 'glob'
import { parseSpec, parseSpecFast } from '../parser/index.js'
import type { Endpoint } from '../parser/types.js'
import type { ValidationResult, DriftItem, Suggestion, HandlerAnalysis } from './types.js'

export type { ValidationResult, DriftItem, Suggestion } from './types.js'

export interface ValidateOptions {
  /** Skip OpenAPI spec validation */
  skipValidation?: boolean
}

/**
 * Validate that handlers match the OpenAPI specification
 */
export async function validateHandlers(
  specPath: string,
  handlersDir: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  // Parse the spec (use fast parsing if skipValidation is true)
  const spec = options.skipValidation
    ? await parseSpecFast(specPath)
    : await parseSpec(specPath)

  // Analyze existing handlers
  const handlers = await analyzeHandlers(handlersDir)

  const drift: DriftItem[] = []

  // Check for missing handlers (in spec but not in handlers)
  for (const endpoint of spec.endpoints) {
    const handler = findHandler(handlers, endpoint)

    if (!handler) {
      drift.push({
        type: 'missing',
        endpoint: endpoint.path,
        method: endpoint.method,
        details: `Handler missing for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        severity: 'error',
      })
    }
  }

  // Check for extra handlers (in handlers but not in spec)
  for (const handler of handlers) {
    const endpoint = findEndpoint(spec.endpoints, handler)

    if (!endpoint) {
      drift.push({
        type: 'extra',
        endpoint: handler.path,
        method: handler.method,
        details: `Handler exists but endpoint not in spec: ${handler.method.toUpperCase()} ${handler.path}`,
        severity: 'warning',
      })
    }
  }

  // Generate suggestions
  const suggestions = generateSuggestions(drift)

  return {
    valid: drift.filter(d => d.severity === 'error').length === 0,
    drift,
    suggestions,
  }
}

/**
 * Analyze handler files in a directory to extract endpoint information.
 * Recursively scans for .ts and .js files and extracts MSW handler patterns.
 * @param handlersDir - Directory containing MSW handlers
 * @returns Array of all handler definitions found
 */
async function analyzeHandlers(handlersDir: string): Promise<HandlerAnalysis[]> {
  const handlers: HandlerAnalysis[] = []

  // Check if directory exists
  if (!await fs.pathExists(handlersDir)) {
    return handlers
  }

  // Find all handler files
  const files = await glob('**/*.{ts,js}', {
    cwd: handlersDir,
    absolute: true,
  })

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    const extracted = extractHandlersFromFile(content, file)
    handlers.push(...extracted)
  }

  return handlers
}

/**
 * Extract MSW handler definitions from file content using regex patterns.
 * Parses http.get(), http.post(), etc. calls and extracts path information.
 * Handles template literals (${baseURL}/path) and full URLs.
 * @param content - File content to parse
 * @param file - File path for reference in results
 * @returns Array of extracted handler definitions
 */
function extractHandlersFromFile(content: string, file: string): HandlerAnalysis[] {
  const handlers: HandlerAnalysis[] = []

  // Match MSW http.* handlers
  // Patterns:
  //   http.get('/path', ...)
  //   http.get(`${baseURL}/path`, ...)
  //   http.get('http://base/path', ...)
  const httpPattern = /http\.(get|post|put|patch|delete|head|options)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi

  let match: RegExpExecArray | null
  while ((match = httpPattern.exec(content)) !== null) {
    const method = match[1].toLowerCase()
    let urlPath = match[2]

    // Strip template literal variables like ${baseURL}, ${BASE_URL}, etc.
    urlPath = urlPath.replace(/\$\{[^}]+\}/g, '')

    // Convert MSW path params :id to OpenAPI style {id} for comparison
    // (we'll handle this in pathsMatch, but normalize here too)
    urlPath = urlPath.replace(/^\/+/, '/') // Ensure single leading slash

    // Extract path from full URL if needed
    try {
      const url = new URL(urlPath, 'http://localhost')
      urlPath = url.pathname
    } catch {
      // Not a full URL, use as-is
    }

    // Skip empty paths
    if (!urlPath || urlPath === '/') {
      continue
    }

    handlers.push({
      path: urlPath,
      method,
      file,
    })
  }

  return handlers
}

/**
 * Find a handler that matches an endpoint by method and path.
 * Uses flexible path matching to handle both OpenAPI {param} and MSW :param styles.
 * @param handlers - Array of analyzed handlers from the codebase
 * @param endpoint - The OpenAPI endpoint to find a handler for
 * @returns The matching handler, or undefined if not found
 */
function findHandler(handlers: HandlerAnalysis[], endpoint: Endpoint): HandlerAnalysis | undefined {
  return handlers.find(h => {
    // Exact method match
    if (h.method !== endpoint.method) {
      return false
    }

    // Path matching (handle path parameters)
    return pathsMatch(h.path, endpoint.path)
  })
}

/**
 * Find an endpoint that matches a handler by method and path.
 * Inverse of findHandler - checks if a handler has a corresponding spec endpoint.
 * @param endpoints - Array of endpoints from the OpenAPI spec
 * @param handler - The handler to find an endpoint for
 * @returns The matching endpoint, or undefined if handler is extra
 */
function findEndpoint(endpoints: Endpoint[], handler: HandlerAnalysis): Endpoint | undefined {
  return endpoints.find(e => {
    if (e.method !== handler.method) {
      return false
    }

    return pathsMatch(handler.path, e.path)
  })
}

/**
 * Check if two paths match, handling different path parameter syntaxes.
 * Supports OpenAPI style {id}, MSW style :id, and exact matches.
 * @param handlerPath - Path from the MSW handler (e.g., "/users/:id")
 * @param specPath - Path from OpenAPI spec (e.g., "/users/{id}")
 * @returns true if paths match semantically
 */
function pathsMatch(handlerPath: string, specPath: string): boolean {
  // Convert OpenAPI path params {id} to MSW/regex style :id or *
  const specPattern = specPath
    .replace(/\{([^}]+)\}/g, '([^/]+)')  // {id} -> ([^/]+)
    .replace(/\//g, '\\/')               // Escape slashes

  const regex = new RegExp(`^${specPattern}$`)

  // Also check exact match for MSW-style params
  const mswStyleSpec = specPath.replace(/\{([^}]+)\}/g, ':$1')

  return regex.test(handlerPath) || handlerPath === mswStyleSpec || handlerPath === specPath
}

/**
 * Generate actionable suggestions based on detected drift.
 * Provides commands and guidance to fix missing or extra handlers.
 * @param drift - Array of drift items (missing, extra, or mismatched)
 * @returns Array of suggestions with messages and optional commands
 */
function generateSuggestions(drift: DriftItem[]): Suggestion[] {
  const suggestions: Suggestion[] = []

  const missingCount = drift.filter(d => d.type === 'missing').length
  const extraCount = drift.filter(d => d.type === 'extra').length

  if (missingCount > 0) {
    suggestions.push({
      message: `Run 'pactwork generate' to create ${missingCount} missing handler(s)`,
      command: 'pactwork generate',
    })
  }

  if (extraCount > 0) {
    suggestions.push({
      message: `${extraCount} handler(s) exist but are not in the spec. Remove them or add endpoints to the spec.`,
    })
  }

  if (missingCount > 0 && extraCount === 0) {
    suggestions.push({
      message: `Use 'pactwork validate --fix' to auto-regenerate handlers`,
      command: 'pactwork validate --fix',
    })
  }

  return suggestions
}
