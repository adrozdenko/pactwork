<p align="center">
  <img src="./docs/logo.svg" alt="Pactwork" width="200" />
</p>

<h1 align="center">Pactwork</h1>

<p align="center">
  <strong>Stop mock drift. Start shipping.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pactwork"><img src="https://img.shields.io/npm/v/pactwork.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/adrozdenko/pactwork/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/adrozdenko/pactwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/adrozdenko/pactwork/ci.yml?style=flat-square" alt="Build Status" /></a>
</p>

<p align="center">
  <a href="#the-problem">The Problem</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#ci-integration">CI Integration</a>
</p>

---

## The Problem

Your frontend mocks lie to you.

```
Backend adds field → Mock doesn't have it → Tests pass → Production breaks
```

**Pactwork fixes this.** It generates MSW handlers from your OpenAPI spec and catches drift before it reaches production.

| Before | After |
|--------|-------|
| Write mocks by hand | Generate from spec |
| Mocks drift silently | Drift detected in CI |
| Bugs found in prod | Bugs found in PR |

---

## Quick Start

```bash
npm install -D pactwork msw
npx pactwork init --spec ./openapi.yaml
npx pactwork generate
npx pactwork validate
```

Done. Your mocks stay in sync.

---

## How It Works

```
OpenAPI Spec → Pactwork → MSW Handlers + Validation + CI Gate
```

1. **Generate** — Create MSW handlers from your spec
2. **Validate** — Check handlers match the spec
3. **Gate** — Block deploys when mocks drift

---

## Commands

| Command | What it does |
|---------|--------------|
| `pactwork init` | Set up Pactwork in your project |
| `pactwork generate` | Create MSW handlers from spec |
| `pactwork validate` | Check handlers match spec |
| `pactwork types` | Generate TypeScript types from spec |
| `pactwork watch` | Auto-regenerate on spec changes |
| `pactwork diff` | Show what's different |
| `pactwork can-i-deploy` | CI gate — exit 0 if safe, 1 if not |

### Common Options

```bash
# Generate from specific spec
pactwork generate --spec ./api/openapi.yaml --output ./src/mocks

# Validate and auto-fix drift
pactwork validate --fix

# CI mode with strict exit codes
pactwork validate --ci --format github
```

---

## CI Integration

### GitHub Action (Recommended)

```yaml
- uses: adrozdenko/pactwork@v1
```

With options:

```yaml
- uses: adrozdenko/pactwork@v1
  with:
    spec: ./api/openapi.yaml
    fail-on-warning: true
```

See [action documentation](./action/README.md) for all options.

### CLI

```yaml
- run: npx pactwork validate --ci
- run: npx pactwork can-i-deploy
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Safe — handlers match spec |
| `1` | Drift detected |
| `2` | Warnings as errors |

---

## Configuration

Create `pactwork.config.ts`:

```typescript
import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: { path: './api/openapi.yaml' },
  generate: { output: './src/mocks', typescript: true },
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `spec.path` | — | Path to OpenAPI spec |
| `generate.output` | `./src/mocks` | Where to put handlers |
| `generate.typescript` | `true` | Generate .ts files |

---

## Using Generated Handlers

**Browser:**

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './mocks/handlers'
export const worker = setupWorker(...handlers)
```

**Node/Tests:**

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'
export const server = setupServer(...handlers)
```

---

## Requirements

- Node.js 18+
- MSW 2.x

---

## Contributing

```bash
git clone https://github.com/adrozdenko/pactwork.git
npm install
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

MIT © [adrozdenko](https://github.com/adrozdenko)
