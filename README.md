<p align="center">
  <img src="./docs/logo.png" alt="Pactwork" width="200" />
</p>

<h1 align="center">Pactwork</h1>

<p align="center">
  <strong>Contract-first API mocking. Your mocks stay in sync automatically.</strong>
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

**The Problem:** API mocks drift from reality. You write handlers manually, the API evolves, and suddenly your tests pass but production fails.

**The Solution:** Generate mocks from your OpenAPI spec. Validate continuously. Never drift again.

| Without Pactwork | With Pactwork |
|------------------|---------------|
| Manually write mock handlers | Generate from spec |
| Hope mocks match the API | Validate automatically |
| Miss edge cases | Test every error state |
| Debug production failures | Catch issues in development |

```bash
# One command. Mocks that match your API.
npx pactwork generate --spec ./openapi.yaml
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Handler Generation** | MSW handlers generated from OpenAPI 2.0, 3.0, 3.1 |
| **Drift Detection** | Validate mocks match spec, catch breaking changes |
| **Scenario Catalog** | Error states extracted from spec (404, 500, etc.) |
| **Runtime Utilities** | Apply scenarios, latency, network errors at runtime |
| **Storybook Addon** | Control API states directly from your stories |
| **CI Gates** | Deployment safety with `can-i-deploy` |
| **Type Generation** | TypeScript types from your spec |

---

## Quick Start

### Install

```bash
npm install -D pactwork msw
```

### Generate Handlers

```bash
# Generate MSW handlers from your OpenAPI spec
npx pactwork generate --spec ./openapi.yaml --output ./src/mocks

# Include scenario catalog for error state testing
npx pactwork generate --spec ./openapi.yaml --with-scenarios
```

### Use with MSW

**Browser (Storybook, Development):**
```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './mocks/handlers'

const worker = setupWorker(...handlers)
await worker.start()
```

**Node (Tests):**
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

**1. Register the addon:**

```typescript
// .storybook/main.ts
export default {
  addons: ['@pactwork/storybook-addon'],
}
```

**2. Set up MSW and toolbar controls:**

```typescript
// .storybook/preview.ts
import React from 'react'
import { setupWorker } from 'msw/browser'
import { handlers, handlerMeta, scenarios } from '../src/mocks/generated/handlers'
import {
  setScenario,
  setLatency,
  setNetworkState,
  resetState,
} from '../src/mocks/generated/handlers'

// Start MSW
const worker = setupWorker(...handlers)
await worker.start({ onUnhandledRequest: 'bypass' })

// Decorator applies toolbar state to handlers
const pactworkDecorator = (Story, context) => {
  const [globals] = useGlobals()

  resetState()

  if (globals.pactworkScenario) {
    const [operationId, scenarioName] = globals.pactworkScenario.split('.')
    setScenario(operationId, scenarioName)
  }

  if (globals.pactworkLatency > 0) {
    setLatency(globals.pactworkLatency)
  }

  if (globals.pactworkNetwork === 'offline') {
    setNetworkState(true)
  }

  return React.createElement(Story)
}

export default {
  decorators: [pactworkDecorator],
  globalTypes: {
    pactworkScenario: {
      description: 'API Scenario',
      toolbar: {
        title: 'Scenario',
        icon: 'lightning',
        items: [
          { value: '', title: 'Default (success)' },
          { value: 'getUser.notFound', title: 'getUser → Not Found (404)' },
          { value: 'getUser.serverError', title: 'getUser → Server Error (500)' },
        ],
        dynamicTitle: true,
      },
    },
    pactworkLatency: {
      description: 'API Latency',
      toolbar: {
        title: 'Latency',
        icon: 'timer',
        items: [
          { value: 0, title: 'No delay' },
          { value: 500, title: '500ms' },
          { value: 1000, title: '1 second' },
          { value: 2000, title: '2 seconds' },
        ],
        dynamicTitle: true,
      },
    },
    pactworkNetwork: {
      description: 'Network State',
      toolbar: {
        title: 'Network',
        icon: 'globe',
        items: [
          { value: 'online', title: 'Online' },
          { value: 'offline', title: 'Offline (Error)' },
        ],
        dynamicTitle: true,
      },
    },
  },
}
```

### How It Works

| Component | Purpose |
|-----------|---------|
| **Toolbar Controls** | Switch scenarios, latency, and network state globally |
| **Addon Panel** | View request logs, current state, and available handlers |

**Toolbar (Control):**
- Scenario dropdown — switch between success, error, and edge case responses
- Latency selector — simulate slow networks (0ms to 5s)
- Network toggle — simulate offline/connection errors

**Panel (Observability):**
- Current state display — see active scenario, latency, network state
- Request log — track all API calls with method, path, status, timing
- Handler list — view available operations and their scenarios

### Story Parameters

You can also set scenarios per-story:

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

Apply scenarios and simulate conditions programmatically.

```typescript
import { handlers, handlerMeta, scenarios } from './mocks'
import { applyScenario, withLatency, withSequence, pipe } from 'pactwork/runtime'

// Apply error scenario
const errorHandlers = applyScenario(handlers, handlerMeta, 'getUser', scenarios.getUser.notFound)

// Add latency to all handlers
const slowHandlers = withLatency(handlers, handlerMeta, 500)

// Simulate flaky API (fail twice, then succeed)
const flakyHandlers = withSequence(handlers, handlerMeta, 'getUser', [500, 500, 200])

// Compose multiple utilities
const testHandlers = pipe(
  handlers,
  h => withLatency(h, handlerMeta, 100),
  h => applyScenario(h, handlerMeta, 'getUser', scenarios.getUser.notFound)
)
```

### Available Utilities

| Utility | Purpose |
|---------|---------|
| `applyScenario(handlers, meta, operationId, scenario)` | Replace response with scenario |
| `withLatency(handlers, meta, ms)` | Add delay to all responses |
| `withLatency(handlers, meta, operationId, ms)` | Add delay to specific operation |
| `withSequence(handlers, meta, operationId, statuses)` | Return different statuses in sequence |
| `withRateLimit(handlers, meta, operationId, opts)` | Simulate rate limiting (429) |
| `withNetworkError(handlers, meta, operationId, opts)` | Simulate timeout/abort/connection errors |
| `withSeed(handlers, meta, seed)` | Deterministic data generation |
| `pipe(handlers, ...transformers)` | Compose multiple transformers |

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `pactwork generate` | Generate MSW handlers from spec |
| `pactwork validate` | Check if mocks match spec |
| `pactwork breaking` | Compare two spec versions for breaking changes |
| `pactwork types` | Generate TypeScript types from spec |
| `pactwork scenarios` | List available scenarios from spec |
| `pactwork can-i-deploy` | CI deployment gate |
| `pactwork record` | Create contract from spec |
| `pactwork verify` | Verify contract against spec |

### Common Flags

```bash
# CI mode — minimal output, strict exit codes
pactwork validate --ci

# Auto-fix — regenerate when drift found
pactwork validate --fix

# Generate with scenarios for error testing
pactwork generate --with-scenarios

# Compare API versions for breaking changes
pactwork breaking --old v1.yaml --new v2.yaml

# GitHub Actions annotations
pactwork validate --format github
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

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Pass — mocks match spec |
| `1` | Fail — drift or breaking changes |
| `2` | Warnings treated as errors |

---

## The Agent Loop

For AI agents and automation, use this workflow:

```bash
# 1. Check for drift
pactwork validate --ci
# Exit 0 = mocks match, done
# Exit 1 = drift detected, continue

# 2. Fix drift
pactwork generate

# 3. Verify fix
pactwork validate --ci

# 4. Commit changes
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

- Node.js 18+
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
