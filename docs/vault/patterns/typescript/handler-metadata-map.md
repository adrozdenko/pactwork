---
id: pattern-typescript-handler-metadata-map
title: Handler Metadata Map for O(1) Lookup
category: typescript
severity: critical
tags: [msw, performance, operationId, lookup]

created: 2026-02-06

---

# Handler Metadata Map for O(1) Lookup

## Context

When needing to find/replace specific handlers by operation ID at runtime, linear search is inefficient and error-prone.

## Pattern

Generate a metadata map alongside handlers that maps operationId to {method, path, index}. This enables O(1) handler lookup instead of O(n) path matching.

## Example

```typescript
export const handlerMeta: HandlerMetaMap = {
  getUser: { operationId: 'getUser', method: 'GET', path: '/users/:id', index: 0 },
  listUsers: { operationId: 'listUsers', method: 'GET', path: '/users', index: 1 },
} as const;
```

## Why

Path matching with regex is expensive and error-prone. OperationId is a stable identifier from OpenAPI spec. Index enables direct array access for replacement.


