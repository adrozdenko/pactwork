import type { ParsedSpec, Endpoint, Schema } from '../parser/types.js'

export type BreakingChangeType =
  | 'endpoint-removed'
  | 'method-changed'
  | 'required-field-added'
  | 'required-field-removed'
  | 'field-type-changed'
  | 'enum-value-removed'
  | 'parameter-removed'
  | 'parameter-required'
  | 'response-removed'
  | 'schema-removed'

export type BreakingChangeSeverity = 'breaking' | 'warning' | 'info'

export interface BreakingChange {
  type: BreakingChangeType
  severity: BreakingChangeSeverity
  path: string
  method?: string
  field?: string
  message: string
  details?: string
}

export interface BreakingChangeResult {
  hasBreakingChanges: boolean
  changes: BreakingChange[]
  summary: {
    breaking: number
    warning: number
    info: number
  }
}

/**
 * Detect breaking changes between two OpenAPI specifications
 */
export function detectBreakingChanges(
  oldSpec: ParsedSpec,
  newSpec: ParsedSpec
): BreakingChangeResult {
  const changes: BreakingChange[] = []

  // Build lookup maps for efficient comparison
  const oldEndpoints = new Map(
    oldSpec.endpoints.map(e => [`${e.method}:${e.path}`, e])
  )
  const newEndpoints = new Map(
    newSpec.endpoints.map(e => [`${e.method}:${e.path}`, e])
  )

  // Check for removed endpoints
  for (const [key, oldEndpoint] of oldEndpoints) {
    if (!newEndpoints.has(key)) {
      changes.push({
        type: 'endpoint-removed',
        severity: 'breaking',
        path: oldEndpoint.path,
        method: oldEndpoint.method,
        message: `Endpoint removed: ${oldEndpoint.method.toUpperCase()} ${oldEndpoint.path}`,
      })
    }
  }

  // Check for changes in existing endpoints
  for (const [key, newEndpoint] of newEndpoints) {
    const oldEndpoint = oldEndpoints.get(key)
    if (oldEndpoint) {
      // Compare parameters
      compareParameters(oldEndpoint, newEndpoint, changes)

      // Compare request body
      compareRequestBody(oldEndpoint, newEndpoint, changes, oldSpec.schemas, newSpec.schemas)

      // Compare responses
      compareResponses(oldEndpoint, newEndpoint, changes, oldSpec.schemas, newSpec.schemas)
    }
  }

  // Check for removed schemas that were referenced
  for (const [name, oldSchema] of Object.entries(oldSpec.schemas)) {
    const newSchema = newSpec.schemas[name]
    if (newSchema) {
      compareSchemas(oldSchema, newSchema, changes, `#/components/schemas/${name}`, oldSpec.schemas, newSpec.schemas, false)
    } else {
      changes.push({
        type: 'schema-removed',
        severity: 'breaking',
        path: `#/components/schemas/${name}`,
        message: `Schema removed: ${name}`,
      })
    }
  }

  const summary = {
    breaking: changes.filter(c => c.severity === 'breaking').length,
    warning: changes.filter(c => c.severity === 'warning').length,
    info: changes.filter(c => c.severity === 'info').length,
  }

  return {
    hasBreakingChanges: summary.breaking > 0,
    changes,
    summary,
  }
}

function compareParameters(
  oldEndpoint: Endpoint,
  newEndpoint: Endpoint,
  changes: BreakingChange[]
): void {
  const oldParams = new Map(oldEndpoint.parameters.map(p => [`${p.in}:${p.name}`, p]))
  const newParams = new Map(newEndpoint.parameters.map(p => [`${p.in}:${p.name}`, p]))

  // Check for removed parameters
  for (const [key, oldParam] of oldParams) {
    const newParam = newParams.get(key)
    if (!newParam) {
      changes.push({
        type: 'parameter-removed',
        severity: oldParam.required ? 'breaking' : 'warning',
        path: oldEndpoint.path,
        method: oldEndpoint.method,
        field: oldParam.name,
        message: `Parameter removed: ${oldParam.name} (${oldParam.in})`,
      })
    }
  }

  // Check for newly required parameters (including new parameters)
  for (const [key, newParam] of newParams) {
    const oldParam = oldParams.get(key)
    if (newParam.required) {
      if (!oldParam) {
        // New required parameter added
        changes.push({
          type: 'parameter-required',
          severity: 'breaking',
          path: newEndpoint.path,
          method: newEndpoint.method,
          field: newParam.name,
          message: `New required parameter added: ${newParam.name} (${newParam.in})`,
        })
      } else if (!oldParam.required) {
        // Existing parameter became required
        changes.push({
          type: 'parameter-required',
          severity: 'breaking',
          path: newEndpoint.path,
          method: newEndpoint.method,
          field: newParam.name,
          message: `Parameter now required: ${newParam.name}`,
        })
      }
    }
  }
}

function compareRequestBody(
  oldEndpoint: Endpoint,
  newEndpoint: Endpoint,
  changes: BreakingChange[],
  oldSchemas: Record<string, Schema>,
  newSchemas: Record<string, Schema>
): void {
  const oldBody = oldEndpoint.requestBody?.content?.['application/json']?.schema
  const newBody = newEndpoint.requestBody?.content?.['application/json']?.schema

  if (oldBody && newBody) {
    compareSchemas(
      oldBody,
      newBody,
      changes,
      `${newEndpoint.method.toUpperCase()} ${newEndpoint.path} request`,
      oldSchemas,
      newSchemas,
      true
    )
  }

  // New required request body is breaking
  if (!oldEndpoint.requestBody?.required && newEndpoint.requestBody?.required) {
    changes.push({
      type: 'required-field-added',
      severity: 'breaking',
      path: newEndpoint.path,
      method: newEndpoint.method,
      message: `Request body now required`,
    })
  }
}

function compareResponses(
  oldEndpoint: Endpoint,
  newEndpoint: Endpoint,
  changes: BreakingChange[],
  oldSchemas: Record<string, Schema>,
  newSchemas: Record<string, Schema>
): void {
  // Check for removed response codes
  for (const status of Object.keys(oldEndpoint.responses)) {
    if (!newEndpoint.responses[status]) {
      changes.push({
        type: 'response-removed',
        severity: 'warning',
        path: oldEndpoint.path,
        method: oldEndpoint.method,
        message: `Response ${status} removed`,
      })
    }
  }

  // Compare response schemas
  for (const [status, oldResponse] of Object.entries(oldEndpoint.responses)) {
    const newResponse = newEndpoint.responses[status]
    if (newResponse) {
      const oldSchema = oldResponse.content?.['application/json']?.schema
      const newSchema = newResponse.content?.['application/json']?.schema

      if (oldSchema && newSchema) {
        compareSchemas(
          oldSchema,
          newSchema,
          changes,
          `${newEndpoint.method.toUpperCase()} ${newEndpoint.path} response ${status}`,
          oldSchemas,
          newSchemas,
          false
        )
      }
    }
  }
}

function compareSchemas(
  oldSchema: Schema,
  newSchema: Schema,
  changes: BreakingChange[],
  context: string,
  oldSchemas: Record<string, Schema>,
  newSchemas: Record<string, Schema>,
  isRequestContext: boolean,
  visited: Set<string> = new Set()
): void {
  // Resolve refs with cycle detection
  const resolvedOld = resolveRef(oldSchema, oldSchemas, visited)
  const resolvedNew = resolveRef(newSchema, newSchemas, visited)

  // If either resolved to null due to cycle, bail out
  if (!resolvedOld || !resolvedNew) return

  // Check type changes
  if (resolvedOld.type && resolvedNew.type && resolvedOld.type !== resolvedNew.type) {
    changes.push({
      type: 'field-type-changed',
      severity: 'breaking',
      path: context,
      message: `Type changed from ${resolvedOld.type} to ${resolvedNew.type}`,
    })
    return
  }

  // Check enum value removal
  if (resolvedOld.enum && resolvedNew.enum) {
    const oldValues = new Set(resolvedOld.enum.map(v => JSON.stringify(v)))
    const newValues = new Set(resolvedNew.enum.map(v => JSON.stringify(v)))

    for (const oldValue of oldValues) {
      if (!newValues.has(oldValue)) {
        changes.push({
          type: 'enum-value-removed',
          severity: 'breaking',
          path: context,
          message: `Enum value removed: ${oldValue}`,
        })
      }
    }
  }

  // Check object properties
  if (resolvedOld.properties && resolvedNew.properties) {
    const oldRequired = new Set(resolvedOld.required || [])
    const newRequired = new Set(resolvedNew.required || [])

    // Check for removed required fields
    for (const field of oldRequired) {
      if (!resolvedNew.properties[field]) {
        changes.push({
          type: 'required-field-removed',
          severity: 'breaking',
          path: context,
          field,
          message: `Required field removed: ${field}`,
        })
      }
    }

    // Check for newly required fields
    for (const field of newRequired) {
      if (!oldRequired.has(field)) {
        const isNewField = !resolvedOld.properties[field]
        // For request bodies, new required fields are breaking
        // For responses, they're informational (servers can add fields)
        changes.push({
          type: 'required-field-added',
          severity: isRequestContext ? 'breaking' : 'warning',
          path: context,
          field,
          message: isNewField
            ? `New required field added: ${field}`
            : `Field now required: ${field}`,
        })
      }
    }

    // Recursively check nested properties
    for (const [field, oldProp] of Object.entries(resolvedOld.properties)) {
      const newProp = resolvedNew.properties[field]
      if (newProp) {
        compareSchemas(oldProp, newProp, changes, `${context}.${field}`, oldSchemas, newSchemas, isRequestContext, visited)
      }
    }
  }

  // Check array items
  if (resolvedOld.items && resolvedNew.items) {
    compareSchemas(resolvedOld.items, resolvedNew.items, changes, `${context}[]`, oldSchemas, newSchemas, isRequestContext, visited)
  }
}

function resolveRef(schema: Schema, schemas: Record<string, Schema>, visited: Set<string> = new Set()): Schema | null {
  if (schema.$ref) {
    // Cycle detection: if we've already visited this $ref, bail out
    if (visited.has(schema.$ref)) {
      return null
    }
    visited.add(schema.$ref)
    const refName = schema.$ref.replace('#/components/schemas/', '')
    return schemas[refName] || schema
  }
  return schema
}

/**
 * Format breaking changes for console output
 */
export function formatBreakingChanges(result: BreakingChangeResult): string {
  const lines: string[] = []

  if (!result.hasBreakingChanges && result.changes.length === 0) {
    return 'No breaking changes detected.'
  }

  if (result.hasBreakingChanges) {
    lines.push(`⚠️  ${result.summary.breaking} breaking change(s) detected!\n`)
  }

  const grouped = {
    breaking: result.changes.filter(c => c.severity === 'breaking'),
    warning: result.changes.filter(c => c.severity === 'warning'),
    info: result.changes.filter(c => c.severity === 'info'),
  }

  if (grouped.breaking.length > 0) {
    lines.push('BREAKING:')
    for (const change of grouped.breaking) {
      lines.push(`  ✗ ${change.message}`)
    }
    lines.push('')
  }

  if (grouped.warning.length > 0) {
    lines.push('WARNINGS:')
    for (const change of grouped.warning) {
      lines.push(`  ⚠ ${change.message}`)
    }
    lines.push('')
  }

  if (grouped.info.length > 0) {
    lines.push('INFO:')
    for (const change of grouped.info) {
      lines.push(`  ℹ ${change.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
