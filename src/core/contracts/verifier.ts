import type { Contract, Interaction } from './types.js'
import type { ParsedSpec, Endpoint } from '../parser/types.js'

export type VerificationStatus = 'passed' | 'failed' | 'pending'

export interface VerificationResult {
  status: VerificationStatus
  contract: {
    consumer: string
    provider: string
  }
  results: InteractionResult[]
  summary: {
    total: number
    passed: number
    failed: number
    pending: number
  }
}

export interface InteractionResult {
  description: string
  status: VerificationStatus
  errors: string[]
}

/**
 * Verify a contract against an OpenAPI specification
 */
export function verifyContract(contract: Contract, spec: ParsedSpec): VerificationResult {
  const results: InteractionResult[] = []

  for (const interaction of contract.interactions) {
    const result = verifyInteraction(interaction, spec)
    results.push(result)
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    pending: results.filter(r => r.status === 'pending').length,
  }

  return {
    status: summary.failed > 0 ? 'failed' : 'passed',
    contract: {
      consumer: contract.consumer.name,
      provider: contract.provider.name,
    },
    results,
    summary,
  }
}

function verifyInteraction(interaction: Interaction, spec: ParsedSpec): InteractionResult {
  const errors: string[] = []
  const { request, response } = interaction

  // Find matching endpoint
  const endpoint = findEndpoint(spec.endpoints, request.method, request.path)

  if (!endpoint) {
    return {
      description: interaction.description,
      status: 'failed',
      errors: [`Endpoint not found in spec: ${request.method.toUpperCase()} ${request.path}`],
    }
  }

  // Verify request method
  if (endpoint.method.toUpperCase() !== request.method.toUpperCase()) {
    errors.push(`Method mismatch: expected ${endpoint.method.toUpperCase()}, got ${request.method.toUpperCase()}`)
  }

  // Verify response status exists in spec
  const statusStr = String(response.status)
  if (!endpoint.responses[statusStr] && !endpoint.responses['default']) {
    errors.push(`Response status ${response.status} not defined in spec`)
  }

  // Verify required parameters are present
  for (const param of endpoint.parameters) {
    if (param.required) {
      const hasParam = checkParameter(param, request)
      if (!hasParam) {
        errors.push(`Required parameter missing: ${param.name} (${param.in})`)
      }
    }
  }

  return {
    description: interaction.description,
    status: errors.length > 0 ? 'failed' : 'passed',
    errors,
  }
}

function findEndpoint(
  endpoints: Endpoint[],
  method: string,
  path: string
): Endpoint | undefined {
  const normalizedMethod = method.toLowerCase()

  // Try exact match first
  let endpoint = endpoints.find(
    e => e.method === normalizedMethod && e.path === path
  )

  if (endpoint) return endpoint

  // Try pattern match (for path parameters)
  endpoint = endpoints.find(e => {
    if (e.method !== normalizedMethod) return false
    return pathMatches(e.path, path)
  })

  return endpoint
}

function pathMatches(specPath: string, actualPath: string): boolean {
  // Replace {param} with placeholder, escape remaining metacharacters, restore placeholders
  const PLACEHOLDER = '___PARAM___'
  const withPlaceholders = specPath.replace(/\{[^}]+\}/g, PLACEHOLDER)
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[^/]+')

  const regex = new RegExp(`^${pattern}$`)
  return regex.test(actualPath)
}

function checkParameter(
  param: { name: string; in: string },
  request: { path: string; query?: Record<string, string>; headers?: Record<string, string> }
): boolean {
  switch (param.in) {
    case 'path':
      // Path params are implicitly present if path matches
      return true
    case 'query':
      return request.query ? param.name in request.query : false
    case 'header':
      return request.headers ? param.name.toLowerCase() in
        Object.fromEntries(
          Object.entries(request.headers).map(([k, v]) => [k.toLowerCase(), v])
        ) : false
    default:
      return true
  }
}

/**
 * Format verification result for console output
 */
export function formatVerificationResult(result: VerificationResult): string {
  const lines: string[] = []

  lines.push(`Contract: ${result.contract.consumer} → ${result.contract.provider}`)
  lines.push(`Status: ${result.status === 'passed' ? '✓ PASSED' : '✗ FAILED'}`)
  lines.push('')

  lines.push(`Results: ${result.summary.passed}/${result.summary.total} passed`)
  lines.push('')

  if (result.summary.failed > 0) {
    lines.push('Failed interactions:')
    for (const r of result.results.filter(r => r.status === 'failed')) {
      lines.push(`  ✗ ${r.description}`)
      for (const error of r.errors) {
        lines.push(`      - ${error}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
