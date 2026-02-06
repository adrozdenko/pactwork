---
id: pattern-typescript-regex-escape-before-path-matching
title: Escape Regex Metacharacters Before Path Matching
category: typescript
severity: critical
tags: [regex, security, path-matching, validation]

created: 2026-02-06

---

# Escape Regex Metacharacters Before Path Matching

## Context

When converting OpenAPI paths to regex patterns for matching

## Pattern

Replace path parameters with placeholder, escape ALL regex metacharacters, then restore placeholders as capture groups. This prevents dots, plus signs, etc. from being treated as regex operators.

## Example

```typescript
function pathsMatch(handlerPath: string, specPath: string): boolean {
  const PLACEHOLDER = '___PARAM___';
  const withPlaceholders = specPath.replace(/\{[^}]+\}/g, PLACEHOLDER);
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(new RegExp(PLACEHOLDER, 'g'), '([^/]+)');
  return new RegExp(`^${pattern}$`).test(handlerPath);
}
```

## Why

Without escaping, paths like /api/v1.0/users would incorrectly match /api/v1X0/users because dot means 'any character' in regex. This is a security and correctness issue.


