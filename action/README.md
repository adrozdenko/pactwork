# Pactwork GitHub Action

Validate that your MSW handlers match your OpenAPI spec. Catch mock drift before it breaks production.

## Usage

### Basic Validation

```yaml
- uses: adrozdenko/pactwork@v1
```

### With Options

```yaml
- uses: adrozdenko/pactwork@v1
  with:
    command: validate
    spec: ./api/openapi.yaml
    handlers: ./src/mocks
    format: github
    fail-on-warning: true
```

### Full Workflow Example

```yaml
name: API Contract Check

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Validate API contracts
        uses: adrozdenko/pactwork@v1
        with:
          spec: ./openapi.yaml
          fail-on-warning: true
```

### Generate + Validate

```yaml
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: Generate handlers
        uses: adrozdenko/pactwork@v1
        with:
          command: generate

      - name: Validate handlers
        uses: adrozdenko/pactwork@v1
        with:
          command: validate
```

### Deployment Gate

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: Check if safe to deploy
        uses: adrozdenko/pactwork@v1
        with:
          command: can-i-deploy

      - name: Deploy
        if: success()
        run: ./deploy.sh
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `command` | Command: `validate`, `generate`, `can-i-deploy`, `diff` | `validate` |
| `spec` | Path to OpenAPI spec | (from config) |
| `handlers` | Path to handlers directory | (from config) |
| `format` | Output format: `console`, `json`, `markdown`, `github` | `github` |
| `fail-on-warning` | Treat warnings as errors | `false` |
| `fix` | Auto-regenerate handlers (validate only) | `false` |
| `working-directory` | Working directory | `.` |
| `node-version` | Node.js version | `20` |

## Outputs

| Output | Description |
|--------|-------------|
| `valid` | Whether validation passed (`true`/`false`) |
| `drift-count` | Number of drift issues found |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — handlers match spec |
| `1` | Validation failed — drift detected |
| `2` | Warnings treated as errors |

## Configuration

The action respects `pactwork.config.ts` (or `.js`, `.json`) in your repository:

```typescript
import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: { path: './api/openapi.yaml' },
  generate: { output: './src/mocks' },
})
```

## License

MIT
