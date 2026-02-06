<p align="center">
  <img src="./docs/logo.svg" alt="Pactwork" width="200" />
</p>

<h1 align="center">Pactwork</h1>

<p align="center">
  <strong>Agentic API mock management. Your mocks stay in sync automatically.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pactwork"><img src="https://img.shields.io/npm/v/pactwork.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/adrozdenko/pactwork/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/adrozdenko/pactwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/adrozdenko/pactwork/ci.yml?style=flat-square" alt="Build Status" /></a>
</p>

<p align="center">
  <a href="#for-ai-agents">For AI Agents</a> •
  <a href="#functional-prototypes-with-storybook">Storybook</a> •
  <a href="#the-agent-loop">The Agent Loop</a> •
  <a href="#commands">Commands</a> •
  <a href="#setup">Setup</a> •
  <a href="ROADMAP.md">Roadmap</a>
</p>

---

## For AI Agents

**You don't need to understand the API. You need to enforce the contract.**

Pactwork gives you a deterministic workflow to keep mocks aligned with the OpenAPI spec:

```text
validate → generate → commit
```

No manual diffing. No guessing response shapes. One loop, always correct.

---

## Why This Exists

Without Pactwork, keeping mocks in sync means:
- Reading the OpenAPI spec
- Finding the matching mock handlers
- Manually updating response shapes
- Missing edge cases

With Pactwork:
- Run `pactwork validate` — instant pass/fail signal
- If it fails, run `pactwork generate` — mocks regenerated
- Commit the diff — done

**Mocks become build artifacts, not hand-written code.**

---

## Functional Prototypes with Storybook

Pactwork + Storybook = bulletproof UI development.

The generated mocks power **functional prototypes** that behave like production — before integration.

### Available Now

| Feature | Status |
|---------|--------|
| Handler generation from spec | ✅ Ready |
| Drift detection | ✅ Ready |
| Breaking change detection | ✅ Ready |
| Contract testing | ✅ Ready |
| Scenario catalog (error states from spec) | ✅ Ready |
| Runtime utilities (`applyScenario`, `withLatency`, `withSequence`) | ✅ Ready |

### Coming Soon

| Feature | Status |
|---------|--------|
| Storybook addon | 🔮 Phase 4 |

See [ROADMAP.md](ROADMAP.md) for the full vision.

### Why this matters

Edge cases are **expensive** when found in production:
- Users encounter the bug first
- Support tickets pile up
- Developers context-switch to fix urgent issues

With Pactwork runtime utilities, you can now:
- Test every error state before integration
- Simulate latency and loading states
- Cover edge cases that are hard to reproduce with real APIs
- Create flaky API simulations for retry testing

**Ship components that already handle what production will throw at them.**

---

## The Agent Loop

Copy this workflow directly:

### 1. Check for drift
```bash
pactwork validate --ci
```
- Exit `0` = mocks match spec, nothing to do
- Exit `1` = drift detected, proceed to step 2

### 2. Fix drift
```bash
pactwork generate
```
Regenerates all handlers from the current spec.

### 3. Verify the fix
```bash
pactwork validate --ci
```
Should now exit `0`.

### 4. Commit
Create a PR with the updated handlers. Include:
- Which endpoints changed
- Pactwork validation output

---

## When to Run

| Trigger | Action |
|---------|--------|
| OpenAPI spec changed | Run the agent loop |
| PR includes spec changes | Validate in CI |
| Scheduled check | Run validate, alert on drift |
| Before deploy | Run `can-i-deploy` as gate |

---

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `pactwork validate` | Check if mocks match spec | Exit code + drift report |
| `pactwork generate` | Create mocks from spec | MSW handler files |
| `pactwork breaking` | Compare two spec versions | Breaking change report |
| `pactwork can-i-deploy` | CI deployment gate | Exit code (0 = safe) |
| `pactwork types` | Generate TypeScript types | Type definition files |
| `pactwork record` | Create contract from spec | Contract JSON |
| `pactwork verify` | Check contract against spec | Verification report |
| `pactwork scenarios` | List scenarios from spec | Scenario catalog |

### Key flags

```bash
# CI mode — minimal output, strict exit codes
pactwork validate --ci

# Auto-fix — regenerate when drift found
pactwork validate --fix

# Generate handlers + scenario catalog for error testing
pactwork generate --with-scenarios

# List all scenarios from spec
pactwork scenarios --list

# Show scenario coverage statistics
pactwork scenarios --coverage

# Compare API versions
pactwork breaking --old v1.yaml --new v2.yaml

# GitHub Actions annotation format
pactwork validate --format github
```

---

## Agent Playbooks

### When the OpenAPI spec changes

```bash
pactwork validate --ci
if [ $? -ne 0 ]; then
  pactwork generate
  pactwork validate --ci  # verify fix
  # commit changes
fi
```

### When validate fails in CI

The spec and mocks are out of sync. Run:
```bash
pactwork generate
```
Then commit the regenerated handlers.

### When breaking changes are detected

```bash
pactwork breaking --old main:openapi.yaml --new openapi.yaml
```
Review the report. Breaking changes need explicit approval before merge.

### Before deploying

```bash
pactwork can-i-deploy
```
Exit `0` means safe. Exit `1` means drift exists — fix before deploy.

---

## Exit Codes

Predictable signals for automation:

| Code | Meaning |
|------|---------|
| `0` | Pass — mocks match spec |
| `1` | Fail — drift or breaking changes |
| `2` | Fail — warnings treated as errors |

---

## Setup

One-time configuration by a human. Then agents take over.

### Install

```bash
npm install -D pactwork msw
```

### Initialize

```bash
npx pactwork init --spec ./openapi.yaml
```

### Configure (optional)

Create `pactwork.config.ts`:

```typescript
import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: { path: './api/openapi.yaml' },
  generate: { output: './src/mocks', typescript: true },
})
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
- run: npx pactwork validate --ci --format github
- run: npx pactwork can-i-deploy
```

---

## Using Generated Handlers

The generated handlers work with MSW (Mock Service Worker):

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

## Runtime Utilities

Apply scenarios and simulate conditions at runtime — in tests, Storybook, or development.

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

## How It Works

```text
OpenAPI Spec → Pactwork → MSW Handlers
     ↓                         ↓
  (source of truth)    (generated artifact)
     ↓                         ↓
     └──── validate ───────────┘
              ↓
         drift report
```

The spec is the source of truth. Handlers are generated, not authored. Validation catches drift. Agents close the loop.

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
