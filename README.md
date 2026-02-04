# Pactwork

> Contract-first API simulation framework — Mocks you can trust

[![npm version](https://img.shields.io/npm/v/pactwork.svg)](https://www.npmjs.com/package/pactwork)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Pactwork?

Pactwork generates [MSW](https://mswjs.io/) handlers from OpenAPI specifications and validates that your mocks never drift from reality.

```
OpenAPI Spec → Pactwork → MSW Handlers + Validation + CI Gates
```

## The Problem

Frontend teams use mocks during development, but mocks drift:

- Backend adds a required field → your mock doesn't have it → integration breaks
- Backend changes response shape → your mock returns old shape → tests pass, prod fails
- Nobody notices until deployment

## The Solution

Pactwork treats your OpenAPI spec as **the single source of truth**:

1. **Generate** MSW handlers from spec (not by hand)
2. **Validate** handlers match spec (detect drift)
3. **Gate** deployments on validation (CI integration)

## Quick Start

```bash
# Initialize from OpenAPI spec
npx pactwork init --spec ./api/openapi.yaml

# Generate MSW handlers
npx pactwork generate

# Validate handlers match spec
npx pactwork validate

# CI gate: safe to deploy?
npx pactwork can-i-deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `pactwork init` | Initialize Pactwork in your project |
| `pactwork generate` | Generate MSW handlers from spec |
| `pactwork validate` | Check handlers match spec (drift detection) |
| `pactwork watch` | Watch spec and regenerate on changes |
| `pactwork diff` | Show differences between spec and handlers |
| `pactwork can-i-deploy` | CI gate for deployment safety |

## Configuration

```typescript
// pactwork.config.ts
export default {
  spec: {
    path: './api/openapi.yaml',
  },
  generate: {
    output: './src/mocks',
    typescript: true,
  },
}
```

## Why Pactwork?

| Feature | msw-auto-mock | Pactwork |
|---------|---------------|----------|
| Generate handlers | ✅ | ✅ |
| Drift detection | ❌ | ✅ |
| CI validation | ❌ | ✅ |
| Contract testing | ❌ | ✅ |
| Watch mode | ❌ | ✅ |

## Project Status

🚧 **Early Development** — Not yet published to npm.

## License

MIT
