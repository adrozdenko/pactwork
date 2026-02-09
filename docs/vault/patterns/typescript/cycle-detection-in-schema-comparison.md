<!-- markdownlint-disable MD041 -->
---
id: pattern-typescript-cycle-detection-in-schema-comparison
title: Cycle Detection in Recursive Schema Comparison
category: typescript
severity: critical
tags: [openapi, schemas, recursion, infinite-loop]

created: 2026-02-06

---

# Cycle Detection in Recursive Schema Comparison

## Context

When comparing or resolving OpenAPI schemas with `$ref` references, recursive structures can cause infinite loops if not handled properly.

## Pattern

Pass a Set<string> of visited $ref paths through recursive calls. Bail out when encountering an already-visited ref to prevent infinite loops on circular references.

## Example

```typescript
function resolveRef(
  schema: Schema,
  schemas: Record<string, Schema>,
  visited: Set<string> = new Set()
): Schema | null {
  if (schema.$ref) {
    if (visited.has(schema.$ref)) return null; // Cycle detected
    visited.add(schema.$ref);
    const refName = schema.$ref.replace('#/components/schemas/', '');
    return schemas[refName] || null;
  }
  return schema;
}

// Recursive resolution: propagate the visited Set through nested schemas
function resolveAllRefs(
  schema: Schema,
  schemas: Record<string, Schema>,
  visited: Set<string> = new Set()
): Schema | null {
  const resolved = resolveRef(schema, schemas, visited);
  if (!resolved) return null; // Cycle or missing ref

  // Recursively resolve nested properties
  if (resolved.properties) {
    for (const [key, prop] of Object.entries(resolved.properties)) {
      const resolvedProp = resolveAllRefs(prop, schemas, visited);
      if (resolvedProp) resolved.properties[key] = resolvedProp;
    }
  }
  return resolved;
}

// Example: Tree has children: Tree[] — a circular reference.
// resolveAllRefs(treeSchema, schemas) resolves children once,
// then returns null on the second visit, preventing infinite recursion.
```

## Why

OpenAPI schemas can have circular references (e.g., Tree with children: Tree[]). Without cycle detection, comparison functions will stack overflow.


