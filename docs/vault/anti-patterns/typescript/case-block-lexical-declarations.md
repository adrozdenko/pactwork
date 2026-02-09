---
id: anti-pattern-typescript-case-block-lexical-declarations
title: Lexical Declarations in Case Blocks Without Braces
category: typescript
severity: warning
tags: [eslint, switch, const, let, lint]

created: 2026-02-06

---

# Lexical Declarations in Case Blocks Without Braces

## Context

This anti-pattern applies when using `const` or `let` inside `switch` case statements without wrapping the case body in braces.

## Anti-Pattern

ESLint no-case-declarations rule forbids const/let in case blocks without braces. The lexical scope is shared across all cases, which can cause unexpected behavior.

## Example (Bad)

```typescript
// ❌ Bad - lint error
case 'abort':
  const error = new Error('aborted');
  throw error;
```

## Example (Good)

```typescript
// ✅ Good - wrap in braces
case 'abort': {
  const error = new Error('aborted');
  throw error;
}
```

## Why It's Wrong

Without braces, const/let declarations are hoisted to the switch scope, potentially causing 'already declared' errors or accessing uninitialized variables from other cases.


