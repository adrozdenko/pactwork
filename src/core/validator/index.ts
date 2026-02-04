import fs from 'fs-extra'
import { glob } from 'glob'
import { parseSpec } from '../parser/index.js'
import type { Endpoint } from '../parser/types.js'
import type { ValidationResult, DriftItem, Suggestion, HandlerAnalysis } from './types.js'

export type { ValidationResult, DriftItem, Suggestion } from './types.js'

/**
 * Validate that handlers match the OpenAPI specification
 */
export async function validateHandlers(
  specPath: string,
  handlersDir: string
): Promise<ValidationResult> {
  // Parse the spec
  const spec = await parseSpec(specPath)

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
 * Analyze handler files to extract endpoint information
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
 * Extract handler definitions from file content using regex
 */
function extractHandlersFromFile(content: string, file: string): HandlerAnalysis[] {
  const handlers: HandlerAnalysis[] = []

  // Match MSW http.* handlers
  // Pattern: http.get('/path', ...) or http.get('http://base/path', ...)
  const httpPattern = /http\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi

  let match: RegExpExecArray | null
  while ((match = httpPattern.exec(content)) !== null) {
    const method = match[1].toLowerCase()
    let urlPath = match[2]

    // Extract path from full URL if needed
    try {
      const url = new URL(urlPath, 'http://localhost')
      urlPath = url.pathname
    } catch {
      // Not a full URL, use as-is
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
 * Find a handler that matches an endpoint
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
 * Find an endpoint that matches a handler
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
 * Check if two paths match, handling path parameters
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
 * Generate helpful suggestions based on drift
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
