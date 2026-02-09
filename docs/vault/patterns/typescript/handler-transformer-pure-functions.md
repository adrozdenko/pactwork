---
id: pattern-typescript-handler-transformer-pure-functions
title: Pure Handler Transformer Pattern
category: typescript
severity: critical
tags: [msw, handlers, functional, composable, immutable]

created: 2026-02-06

---

# Pure Handler Transformer Pattern

## Context

When building runtime utilities that modify MSW handlers, mutations cause unpredictable behavior and testing difficulties.

## Pattern

Create pure functions that take handlers array and return new handlers array. Never mutate the original. Use metadata map for O(1) lookup by operationId.

## Example

```typescript
export function withLatency(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  delayMs: number
): HttpHandler[] {
  const { method, path, index } = findHandlerMeta(meta, operationId)!;
  const originalHandler = handlers[index];
  const newHandler = http[method as keyof typeof http](path, async (info) => {
    await delay(delayMs);
    return callOriginalResolver(originalHandler, info);
  });
  return replaceHandler(handlers, index, newHandler);
}
```

## Why

Pure functions enable composition with pipe(), make testing predictable, and prevent side effects. The metadata map avoids O(n) path matching on every call.


