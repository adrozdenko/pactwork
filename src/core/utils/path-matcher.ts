/**
 * Path matching utility for OpenAPI and MSW path comparison
 * Used by validator and contracts modules
 */

/**
 * Check if two paths match, handling different path parameter syntaxes.
 * Supports OpenAPI style {id}, MSW style :id, and exact matches.
 *
 * @param specPath - Path from OpenAPI spec (e.g., "/users/{id}")
 * @param actualPath - Actual path to match (e.g., "/users/123" or "/users/:id")
 * @returns true if paths match semantically
 */
export function pathsMatch(specPath: string, actualPath: string): boolean {
  // Replace {param} with placeholder, escape remaining metacharacters, restore placeholders
  const PLACEHOLDER = '___PARAM___'
  const withPlaceholders = specPath.replace(/\{[^}]+\}/g, PLACEHOLDER)
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const specPattern = escaped.replace(
    new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    '([^/]+)'
  )

  const regex = new RegExp(`^${specPattern}$`)

  // Also check exact match for MSW-style params
  const mswStyleSpec = specPath.replace(/\{([^}]+)\}/g, ':$1')

  return regex.test(actualPath) || actualPath === mswStyleSpec || actualPath === specPath
}

/**
 * Simpler path matching for contract verification.
 * Only checks if actual path matches the spec path pattern.
 *
 * @param specPath - Path from OpenAPI spec with {param} placeholders
 * @param actualPath - Actual path with concrete values
 * @returns true if actual path matches the spec pattern
 */
export function pathMatchesPattern(specPath: string, actualPath: string): boolean {
  const PLACEHOLDER = '___PARAM___'
  const withPlaceholders = specPath.replace(/\{[^}]+\}/g, PLACEHOLDER)
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(
    new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    '[^/]+'
  )

  const regex = new RegExp(`^${pattern}$`)
  return regex.test(actualPath)
}
