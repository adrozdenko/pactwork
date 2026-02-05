<p align="center">
  <img src="./docs/logo.svg" alt="Pactwork" width="200" />
</p>

<h1 align="center">Pactwork</h1>

<p align="center">
  <strong>Generate MSW mocks from OpenAPI specs. Detect drift. Ship with confidence.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pactwork"><img src="https://img.shields.io/npm/v/pactwork.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/adrozdenko/pactwork/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/adrozdenko/pactwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/adrozdenko/pactwork/ci.yml?style=flat-square" alt="Build Status" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-pactwork">Why Pactwork</a> •
  <a href="#commands">Commands</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#ci-integration">CI Integration</a>
</p>

---

## Quick Start

```bash
# Install
npm install -D pactwork msw

# Initialize from your OpenAPI spec
npx pactwork init --spec ./openapi.yaml

# Generate MSW handlers
npx pactwork generate

# Validate handlers match spec
npx pactwork validate
```

That's it. Your mocks now stay in sync with your API.

---

## Why Pactwork?

**The problem:** Frontend mocks drift from reality.

```
Backend adds required field → Mock doesn't have it → Tests pass → Prod breaks
```

**The solution:** Treat your OpenAPI spec as the single source of truth.

```
OpenAPI Spec → Pactwork → MSW Handlers + Validation + CI Gates
```

| Without Pactwork | With Pactwork |
|------------------|---------------|
| Write mocks by hand | Generate from spec |
| Mocks drift silently | Drift detected instantly |
| Find bugs in production | Find bugs in CI |
| "Works on my machine" | Verified against contract |

---

## Commands

### `pactwork init`

Initialize Pactwork in your project.

```bash
npx pactwork init --spec ./api/openapi.yaml
```

Creates configuration file and sets up directory structure.

### `pactwork generate`

Generate MSW handlers from your OpenAPI spec.

```bash
npx pactwork generate
```

Options:
- `--spec <path>` — Path to OpenAPI spec
- `--output <dir>` — Output directory (default: `./src/mocks`)
- `--typescript` — Generate TypeScript files
- `--skip-validation` — Skip strict spec validation

### `pactwork validate`

Check that handlers match the spec. Catches drift before it causes problems.

```bash
npx pactwork validate
```

Options:
- `--fix` — Auto-fix by regenerating handlers
- `--ci` — CI mode with strict exit codes
- `--format <type>` — Output format: `console`, `json`, `markdown`, `github`

### `pactwork watch`

Watch spec for changes and regenerate handlers automatically.

```bash
npx pactwork watch
```

Options:
- `--validate` — Validate after each regeneration
- `--debounce <ms>` — Debounce delay (default: 300ms)

### `pactwork diff`

Show differences between spec and handlers.

```bash
npx pactwork diff
```

### `pactwork can-i-deploy`

CI gate for deployment safety. Returns exit code 0 if safe, 1 if not.

```bash
npx pactwork can-i-deploy
```

Options:
- `--ci` — CI mode (minimal output, exit codes only)

---

## Configuration

Create `pactwork.config.ts` (or `.js`, `.json`):

```typescript
import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: {
    path: './api/openapi.yaml',
  },
  generate: {
    output: './src/mocks',
    typescript: true,
  },
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spec.path` | `string` | — | Path to OpenAPI spec (required) |
| `generate.output` | `string` | `./src/mocks` | Output directory |
| `generate.typescript` | `boolean` | `true` | Generate TypeScript |
| `generate.baseUrl` | `string` | — | Override base URL from spec |

---

## CI Integration

### GitHub Actions

```yaml
name: API Contract Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx pactwork validate --ci
      - run: npx pactwork can-i-deploy --ci
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — handlers match spec |
| `1` | Validation failed — drift detected |
| `2` | Warnings treated as errors |
| `10` | Unexpected error |

---

## Using Generated Handlers

### Browser (Development)

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

```typescript
// src/main.ts
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return

  const { worker } = await import('./mocks/browser')
  return worker.start()
}

enableMocking().then(() => {
  // Start your app
})
```

### Node (Testing)

```typescript
// src/mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// test/setup.ts
import { server } from '../src/mocks/node'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Comparison

| Feature | msw-auto-mock | Pactwork |
|---------|---------------|----------|
| Generate handlers from spec | Yes | Yes |
| Drift detection | No | **Yes** |
| CI validation gate | No | **Yes** |
| Watch mode | No | **Yes** |
| Multiple output formats | No | **Yes** |
| Contract testing (planned) | No | **Yes** |

---

## Roadmap

- [x] Generate MSW handlers from OpenAPI
- [x] Validate handlers match spec
- [x] Watch mode with auto-regeneration
- [x] CI integration (`can-i-deploy`)
- [ ] GitHub Action
- [ ] TypeScript type generation
- [ ] Contract recording
- [ ] Contract verification
- [ ] Breaking change detection

---

## Requirements

- Node.js 18+
- MSW 2.x (peer dependency)

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Clone the repo
git clone https://github.com/adrozdenko/pactwork.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## License

MIT © [adrozdenko](https://github.com/adrozdenko)

---

<p align="center">
  <sub>Built with care for frontend teams who are tired of mock drift.</sub>
</p>
