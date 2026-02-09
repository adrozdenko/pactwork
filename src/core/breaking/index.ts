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
  const oldParams = new Map((oldEndpoint.parameters || []).map(p => [`${p.in}:${p.name}`, p]))
  const newParams = new Map((newEndpoint.parameters || []).map(p => [`${p.in}:${p.name}`, p]))

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
  const oldContent = oldEndpoint.requestBody?.content || {}
  const newContent = newEndpoint.requestBody?.content || {}

  // Compare all media types
  const allMediaTypes = new Set([...Object.keys(oldContent), ...Object.keys(newContent)])

  for (const mediaType of allMediaTypes) {
    const oldSchema = oldContent[mediaType]?.schema
    const newSchema = newContent[mediaType]?.schema

    if (oldSchema && !newSchema) {
      changes.push({
        type: 'response-removed',
        severity: 'warning',
        path: newEndpoint.path,
        method: newEndpoint.method,
        message: `Request media type removed: ${mediaType}`,
      })
    } else if (oldSchema && newSchema) {
      compareSchemas(
        oldSchema,
        newSchema,
        changes,
        `${newEndpoint.method.toUpperCase()} ${newEndpoint.path} request (${mediaType})`,
        oldSchemas,
        newSchemas,
        true
      )
    }
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
  const oldResponses = oldEndpoint.responses || {}
  const newResponses = newEndpoint.responses || {}

  // Check for removed response codes
  for (const status of Object.keys(oldResponses)) {
    if (!newResponses[status]) {
      changes.push({
        type: 'response-removed',
        severity: 'warning',
        path: oldEndpoint.path,
        method: oldEndpoint.method,
        message: `Response ${status} removed`,
      })
    }
  }

  // Compare response schemas for all media types
  for (const [status, oldResponse] of Object.entries(oldResponses)) {
    const newResponse = newResponses[status]
    if (newResponse) {
      const oldContent = oldResponse.content || {}
      const newContent = newResponse.content || {}

      // Compare all media types for this response
      const allMediaTypes = new Set([...Object.keys(oldContent), ...Object.keys(newContent)])

      for (const mediaType of allMediaTypes) {
        const oldSchema = oldContent[mediaType]?.schema
        const newSchema = newContent[mediaType]?.schema

        if (oldSchema && !newSchema) {
          changes.push({
            type: 'response-removed',
            severity: 'warning',
            path: oldEndpoint.path,
            method: oldEndpoint.method,
            message: `Response ${status} media type removed: ${mediaType}`,
          })
        } else if (oldSchema && newSchema) {
          compareSchemas(
            oldSchema,
            newSchema,
            changes,
            `${newEndpoint.method.toUpperCase()} ${newEndpoint.path} response ${status} (${mediaType})`,
            oldSchemas,
            newSchemas,
            false
          )
        }
      }
    }
  }
}

/** Context for schema comparison */
interface SchemaCompareContext {
  changes: BreakingChange[]
  oldSchemas: Record<string, Schema>
  newSchemas: Record<string, Schema>
  isRequestContext: boolean
  visitedOld: Set<string>
  visitedNew: Set<string>
}

function compareSchemas(
  oldSchema: Schema,
  newSchema: Schema,
  changes: BreakingChange[],
  context: string,
  oldSchemas: Record<string, Schema>,
  newSchemas: Record<string, Schema>,
  isRequestContext: boolean,
  visitedOld: Set<string> = new Set(),
  visitedNew: Set<string> = new Set()
): void {
  const ctx: SchemaCompareContext = { changes, oldSchemas, newSchemas, isRequestContext, visitedOld, visitedNew }

  const resolvedOld = resolveRef(oldSchema, oldSchemas, visitedOld)
  const resolvedNew = resolveRef(newSchema, newSchemas, visitedNew)
  if (!resolvedOld || !resolvedNew) return

  if (checkTypeChange(resolvedOld, resolvedNew, context, changes, isRequestContext)) return
  checkEnumChanges(resolvedOld, resolvedNew, context, changes, isRequestContext)
  checkPropertyChanges(resolvedOld, resolvedNew, context, ctx)
  checkArrayItems(resolvedOld, resolvedNew, context, ctx)
}

/** Normalize schema type to comparable string (handles OpenAPI 3.1 array types) */
function normalizeType(type: string | string[] | undefined): string {
  if (!type) return ''
  if (Array.isArray(type)) {
    return [...type].sort().join('|')
  }
  return type
}

/** Check if schema type changed. Returns true if it did (to short-circuit). */
function checkTypeChange(
  oldSchema: Schema,
  newSchema: Schema,
  context: string,
  changes: BreakingChange[],
  isRequestContext: boolean
): boolean {
  const oldType = normalizeType(oldSchema.type)
  const newType = normalizeType(newSchema.type)

  // Type changed
  if (oldType && newType && oldType !== newType) {
    changes.push({
      type: 'field-type-changed',
      severity: 'breaking',
      path: context,
      message: `Type changed from ${oldSchema.type} to ${newSchema.type}`,
    })
    return true
  }

  // New type constraint added (old had no type, new has type)
  if (!oldType && newType) {
    changes.push({
      type: 'field-type-changed',
      severity: isRequestContext ? 'breaking' : 'warning',
      path: context,
      message: `Type constraint added: ${newSchema.type}`,
    })
    return true
  }

  return false
}

/** Check for removed enum values */
function checkEnumChanges(
  oldSchema: Schema,
  newSchema: Schema,
  context: string,
  changes: BreakingChange[],
  isRequestContext: boolean
): void {
  // New enum constraint added (old had no enum, new has enum)
  if (!oldSchema.enum && newSchema.enum) {
    changes.push({
      type: 'enum-value-removed',
      severity: isRequestContext ? 'breaking' : 'warning',
      path: context,
      message: `Enum constraint added: ${newSchema.enum.map(v => JSON.stringify(v)).join(', ')}`,
    })
    return
  }

  if (!oldSchema.enum || !newSchema.enum) return

  const oldValues = new Set(oldSchema.enum.map(v => JSON.stringify(v)))
  const newValues = new Set(newSchema.enum.map(v => JSON.stringify(v)))

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

/** Check for property changes (removed/added required fields) */
function checkPropertyChanges(
  oldSchema: Schema,
  newSchema: Schema,
  context: string,
  ctx: SchemaCompareContext
): void {
  if (!oldSchema.properties || !newSchema.properties) return

  const oldRequired = new Set(oldSchema.required || [])
  const newRequired = new Set(newSchema.required || [])

  checkRemovedRequiredFields(oldRequired, newSchema.properties, context, ctx.changes)
  checkNewlyRequiredFields(oldRequired, newRequired, oldSchema.properties, context, ctx)
  checkNestedProperties(oldSchema.properties, newSchema.properties, context, ctx)
}

/** Check for removed required fields */
function checkRemovedRequiredFields(
  oldRequired: Set<string>,
  newProperties: Record<string, Schema>,
  context: string,
  changes: BreakingChange[]
): void {
  for (const field of oldRequired) {
    if (!newProperties[field]) {
      changes.push({
        type: 'required-field-removed',
        severity: 'breaking',
        path: context,
        field,
        message: `Required field removed: ${field}`,
      })
    }
  }
}

/** Check for newly required fields */
function checkNewlyRequiredFields(
  oldRequired: Set<string>,
  newRequired: Set<string>,
  oldProperties: Record<string, Schema>,
  context: string,
  ctx: SchemaCompareContext
): void {
  for (const field of newRequired) {
    if (!oldRequired.has(field)) {
      const isNewField = !oldProperties[field]
      ctx.changes.push({
        type: 'required-field-added',
        severity: ctx.isRequestContext ? 'breaking' : 'warning',
        path: context,
        field,
        message: isNewField ? `New required field added: ${field}` : `Field now required: ${field}`,
      })
    }
  }
}

/** Recursively check nested properties */
function checkNestedProperties(
  oldProperties: Record<string, Schema>,
  newProperties: Record<string, Schema>,
  context: string,
  ctx: SchemaCompareContext
): void {
  for (const [field, oldProp] of Object.entries(oldProperties)) {
    const newProp = newProperties[field]
    if (newProp) {
      compareSchemas(oldProp, newProp, ctx.changes, `${context}.${field}`, ctx.oldSchemas, ctx.newSchemas, ctx.isRequestContext, ctx.visitedOld, ctx.visitedNew)
    }
  }
}

/** Check array item schema changes */
function checkArrayItems(
  oldSchema: Schema,
  newSchema: Schema,
  context: string,
  ctx: SchemaCompareContext
): void {
  if (oldSchema.items && newSchema.items) {
    compareSchemas(oldSchema.items, newSchema.items, ctx.changes, `${context}[]`, ctx.oldSchemas, ctx.newSchemas, ctx.isRequestContext, ctx.visitedOld, ctx.visitedNew)
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
    const resolved = schemas[refName]
    if (!resolved) {
      // Return null for missing refs to signal unresolved reference
      // (external refs or missing schema definitions)
      return null
    }
    return resolved
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
