# Pactwork Roadmap

> Transforming from MSW handler generator to **the agentic API simulation platform**.

---

## Vision

Pactwork enables AI agents to keep API mocks perfectly in sync with OpenAPI specs. But generating handlers is just the foundation. The full vision is **bulletproof functional prototypes** — where every error state, loading state, and edge case is simulated before integration.

**The goal:** Agents don't interpret APIs. They enforce contracts and simulate every scenario.

---

## What's Available Now

| Feature | Version | Description |
|---------|---------|-------------|
| Handler generation | v1.0.0 | Generate MSW handlers from OpenAPI spec |
| Drift detection | v1.0.0 | Detect when handlers don't match spec |
| Breaking changes | v1.0.0 | Compare two spec versions for breaking changes |
| Contract testing | v1.0.0 | Record and verify API contracts |
| TypeScript types | v1.0.0 | Generate TypeScript types from spec |
| CI integration | v1.0.0 | GitHub Action `adrozdenko/pactwork@v1` |
| Scenario catalog | v1.1.0 | Generate typed scenarios from spec |
| Runtime utilities | v1.1.0 | `applyScenario`, `withLatency`, `withSequence`, etc. |
| Storybook addon | v1.2.0 | `@pactwork/storybook-addon` for scenario control |

---

## Completed

### Phase 4: Storybook Integration ✅

**Status:** Complete

**Objective:** First-class Storybook addon for scenario selection — toggle error states, latency, and edge cases from the Storybook UI.

#### Story API

```typescript
// Button.stories.tsx
export const Loading: Story = {
  parameters: {
    pactwork: {
      scenario: 'getUser.loading',
      latency: 2000
    }
  }
}

export const Error: Story = {
  parameters: {
    pactwork: { scenario: 'getUser.serverError' }
  }
}

export const Empty: Story = {
  parameters: {
    pactwork: { scenario: 'listUsers.empty' }
  }
}
```

#### Addon features

- **Scenario dropdown** — Select any scenario for current story ✅
- **Latency slider** — Adjust response delay in real-time ✅
- **Network toggles** — Simulate timeout/abort/network-error ✅
- **Handler list** — See which handlers are active ✅
- **Coverage badge** — Show which scenarios have stories (Phase 5)

#### Install

```bash
npm install -D @pactwork/storybook-addon
```

See the [addon README](packages/storybook-addon/README.md) for full documentation.

---

## Architecture Decisions

### OpenAPI Spec as Source of Truth

The spec is the neutral contract between frontend and backend. Neither "leads" — both conform to the spec.

```text
OpenAPI Spec (contract)
       ↓
Pactwork (generates handlers + scenarios)
       ↓
Frontend (consumes)    Backend (implements)
```

### Scenario Catalog as Data

Instead of generating separate handler files for each scenario (code explosion), we generate a single data structure that runtime utilities interpret.

**Why:**
- Smaller generated output
- Easy to enumerate for agents
- Flexible runtime application
- No regeneration needed to change scenarios

### Runtime vs Generation-time Simulation

Simulation (latency, sequences, network errors) is applied at **runtime**, not **generation-time**.

**Why:**
- Stories control their own scenarios
- No regeneration when changing simulation
- Same handlers, different behaviors per test

---

## Non-Goals

Things Pactwork intentionally does NOT do:

| Non-goal | Reason |
|----------|--------|
| Replace MSW | We build on MSW, not replace it |
| Full API server | Pactwork is for mocking, not serving |
| Backend code generation | Focus is frontend/testing mocks |
| GraphQL support | OpenAPI/REST focus (GraphQL may come later) |

---

## Contributing

Want to help build the Storybook addon? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Timeline

| Phase | Target | Status |
|-------|--------|--------|
| Phase 4: Storybook | Q1 2026 | ✅ Complete |
| Phase 5: Coverage Badge | Q2 2026 | 🔜 Next |

*Timelines are estimates. We ship when it's ready.*
