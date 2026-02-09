<p align="center">
  <img src="./docs/logo.png" alt="Pactwork" width="200" />
</p>

<h1 align="center">Pactwork</h1>

<p align="center">
  <strong>Generate API mocks from your OpenAPI spec. They stay in sync automatically.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pactwork"><img src="https://img.shields.io/npm/v/pactwork.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/adrozdenko/pactwork/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/adrozdenko/pactwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/adrozdenko/pactwork/ci.yml?style=flat-square" alt="Build Status" /></a>
</p>

<p align="center">
  <a href="#why-pactwork">Why Pactwork</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#storybook-integration">Storybook</a> •
  <a href="#runtime-utilities">Runtime</a> •
  <a href="#ci-integration">CI/CD</a> •
  <a href="ROADMAP.md">Roadmap</a>
</p>

---

## Why Pactwork

**The problem:** API mocks drift from reality. You write them manually, the API evolves, and suddenly your tests pass but production breaks.

**The fix:** Point Pactwork at your OpenAPI spec. It generates [MSW](https://mswjs.io/) mocks, validates them continuously, and tells you the moment they fall out of sync.

| Without Pactwork | With Pactwork |
|------------------|---------------|
| Write mocks by hand | Generate from your spec |
| Hope they match the API | Validate automatically |
| Miss error states | Test every response your API can return |
| Debug in production | Catch drift in development |

```bash
# One command. Mocks that match your API.
npx pactwork generate --spec ./openapi.yaml
```

---

## Key Features

| Feature | What you get |
|---------|-------------|
| **Mock Generation** | Generate MSW mock handlers from any OpenAPI 2.0, 3.0, or 3.1 spec |
| **Drift Detection** | Know immediately when your mocks fall out of sync with the spec |
| **Scenario Catalog** | Test every error your API can return (404, 500, timeouts, etc.) |
| **Runtime Utilities** | Simulate latency, flaky networks, and error sequences in tests |
| **Storybook Addon** | Switch API states directly from the Storybook toolbar |
| **Coverage Reporting** | See which API scenarios your Storybook stories cover |
| **CI Gates** | Block deployments when mocks don't match the spec |
| **Type Generation** | Get TypeScript types from your spec, always up to date |

---

## Quick Start

### Install

```bash
npm install -D pactwork msw
```

### Generate mocks

```bash
# Generate MSW mock handlers from your OpenAPI spec
npx pactwork generate --spec ./openapi.yaml --output ./src/mocks

# Include error scenarios for testing
npx pactwork generate --spec ./openapi.yaml --with-scenarios
```

### What you get

Pactwork generates ready-to-use MSW handlers and a scenario catalog:

```
src/mocks/
├── handlers.ts      # MSW handlers for every endpoint in your spec
└── scenarios.ts     # Error/edge case responses (404, 500, etc.)
```

```typescript
// handlers.ts (generated)
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', () => {
    return HttpResponse.json({ id: 1, name: 'Jane Doe', email: 'jane@example.com' })
  }),
  http.post('/api/users', () => {
    return HttpResponse.json({ id: 2, name: 'New User' }, { status: 201 })
  }),
  // ... one handler per operation in your spec
]
```

### Use with MSW

**Browser (Storybook, development):**
```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './mocks/handlers'

const worker = setupWorker(...handlers)
await worker.start()
```

**Node (tests):**
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterAll(() => server.close())
```

---

## Storybook Integration

Test every API state visually with `@pactwork/storybook-addon`.

### Install

```bash
npm install -D @pactwork/storybook-addon
```

### Configure

Register the addon in your Storybook config:

```typescript
// .storybook/main.ts
export default {
  addons: ['@pactwork/storybook-addon'],
}
```

Then set up toolbar controls in your preview. See the [full Storybook setup guide](packages/storybook-addon/README.md) for the complete configuration.

### What it does

| Control | Purpose |
|---------|---------|
| **Scenario dropdown** | Switch between success, error, and edge case responses |
| **Latency selector** | Simulate slow networks (0ms to 5s) |
| **Network toggle** | Simulate offline and connection errors |
| **Addon panel** | See request logs, active state, and available mock handlers |

### Set scenarios per story

```typescript
// UserCard.stories.tsx
import { setScenario, resetState, setLatency } from '../mocks/handlers'

export const Loading: Story = {
  beforeEach: () => {
    resetState()
    setLatency(3000)
  },
}

export const NotFound: Story = {
  beforeEach: () => {
    resetState()
    setScenario('getUser', 'notFound')
  },
}

export const ServerError: Story = {
  beforeEach: () => {
    resetState()
    setScenario('getUser', 'serverError')
  },
}
```

---

## Runtime Utilities

Control API behavior programmatically in your tests.

```typescript
import { handlers, handlerMeta, scenarios } from './mocks'
import { applyScenario, withLatency, withSequence, pipe } from 'pactwork/runtime'

// Return a 404 for getUser
const errorHandlers = applyScenario(handlers, handlerMeta, 'getUser', scenarios.getUser.notFound)

// Slow down all responses by 500ms
const slowHandlers = withLatency(handlers, handlerMeta, 500)

// Simulate a flaky API: fail twice, then succeed
const flakyHandlers = withSequence(handlers, handlerMeta, 'getUser', [500, 500, 200])

// Compose multiple behaviors
const testHandlers = pipe(
  handlers,
  h => withLatency(h, handlerMeta, 100),
  h => applyScenario(h, handlerMeta, 'getUser', scenarios.getUser.notFound)
)
```

### Available utilities

| Utility | What it does |
|---------|-------------|
| `applyScenario(handlers, meta, operationId, scenario)` | Replace a response with an error or edge case |
| `withLatency(handlers, meta, ms)` | Add delay to all responses |
| `withLatency(handlers, meta, operationId, ms)` | Add delay to one operation |
| `withSequence(handlers, meta, operationId, statuses)` | Return different statuses in sequence |
| `withRateLimit(handlers, meta, operationId, opts)` | Simulate rate limiting (429) |
| `withNetworkError(handlers, meta, operationId, opts)` | Simulate timeout, abort, or connection errors |
| `withSeed(handlers, meta, seed)` | Deterministic response data |
| `pipe(handlers, ...transformers)` | Compose multiple utilities together |

---

## CLI Commands

| Command | What it does |
|---------|-------------|
| `pactwork generate` | Generate MSW mock handlers from your spec |
| `pactwork validate` | Check if mocks match the spec |
| `pactwork breaking` | Compare two spec versions for breaking changes |
| `pactwork types` | Generate TypeScript types from your spec |
| `pactwork scenarios` | List available error scenarios from your spec |
| `pactwork coverage` | Report which scenarios your Storybook stories cover |
| `pactwork can-i-deploy` | CI gate — block deploys when mocks drift |
| `pactwork record` | Create a contract from your spec |
| `pactwork verify` | Verify a contract against the current spec |

### Common flags

```bash
# CI mode — minimal output, strict exit codes
pactwork validate --ci

# Auto-fix — regenerate when drift is found
pactwork validate --fix

# Generate with error scenarios
pactwork generate --with-scenarios

# Compare API versions for breaking changes
pactwork breaking --old v1.yaml --new v2.yaml

# GitHub Actions annotations
pactwork validate --format github

# Coverage with minimum threshold
pactwork coverage --min-coverage 80
```

---

## CI Integration

### GitHub Action

```yaml
- uses: adrozdenko/pactwork@v1
  with:
    spec: ./openapi.yaml
```

### CLI in CI

```yaml
steps:
  - name: Validate mocks
    run: npx pactwork validate --ci --format github

  - name: Check deployment safety
    run: npx pactwork can-i-deploy
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Mocks match the spec |
| `1` | Drift or breaking changes detected |
| `2` | Warnings treated as errors |

---

## Automated Drift Repair

For CI pipelines and AI agents, use this workflow to auto-fix drift:

```bash
# 1. Check for drift
pactwork validate --ci
# Exit 0 = mocks match, done
# Exit 1 = drift detected, continue

# 2. Regenerate mocks
pactwork generate

# 3. Verify the fix
pactwork validate --ci

# 4. Commit
git add src/mocks
git commit -m "fix: regenerate mocks from updated spec"
```

---

## Configuration

Create `pactwork.config.ts` for project-wide settings:

```typescript
import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: { path: './api/openapi.yaml' },
  generate: {
    output: './src/mocks',
    typescript: true,
  },
})
```

---

## Requirements

- Node.js 20.11+
- MSW 2.x
- OpenAPI 2.0, 3.0, or 3.1 spec

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
