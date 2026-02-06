---
id: pattern-other-github-actions-escape-annotations
title: Escape GitHub Actions Annotation Values
category: other
severity: critical
tags: [github-actions, ci, escaping, annotations]

created: 2026-02-06

---

# Escape GitHub Actions Annotation Values

## Context

When outputting workflow commands like ::error:: or ::warning::

## Pattern

Escape %, newlines, and carriage returns in annotation values. Must escape % first to avoid double-encoding.

## Example

```typescript
function escapeGitHubAnnotation(str: string): string {
  return str
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}
console.log(`::error::${escapeGitHubAnnotation(message)}`);
```

## Why

GitHub Actions workflow commands use % encoding. Unescaped special characters cause malformed annotations that break CI output parsing.


