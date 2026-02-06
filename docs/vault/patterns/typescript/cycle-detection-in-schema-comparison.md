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

When comparing or resolving OpenAPI schemas with $ref

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
    return schemas[refName] || schema;
  }
  return schema;
}
```

## Why

OpenAPI schemas can have circular references (e.g., Tree with children: Tree[]). Without cycle detection, comparison functions will stack overflow.


