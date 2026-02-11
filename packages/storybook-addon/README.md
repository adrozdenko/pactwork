# @pactwork/storybook-addon

> Storybook addon for [Pactwork](https://github.com/adrozdenko/pactwork) - Control API scenarios, latency, and network states directly from stories

[![npm version](https://img.shields.io/npm/v/@pactwork/storybook-addon)](https://www.npmjs.com/package/@pactwork/storybook-addon)
[![Storybook 10](https://img.shields.io/badge/Storybook-10-ff4785)](https://storybook.js.org/)
[![ESM only](https://img.shields.io/badge/ESM-only-blue)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

## Features

- **Toolbar Controls** - Scenario picker, latency presets, and network state toggle directly in Storybook's top toolbar
- **Scenario Selection** - Switch between API response scenarios in stories via parameters
- **Latency Control** - Add artificial delay to simulate slow networks (None, 200ms, 1s, 3s presets)
- **Network Simulation** - Test online, offline, and timeout states
- **Addon Panel** - Observability panel showing current state, request logs, and available handlers
- **TypeScript Support** - Full type safety with autocomplete for parameters
- **CSF Factories** - Storybook 10 compatible with `definePreviewAddon`

## Requirements

- Storybook 10.x (ESM-only)
- Node.js >=20.11.0
- [Pactwork](https://github.com/adrozdenko/pactwork) 1.1.0+
- MSW 2.0+

## Installation

```bash
npm install -D @pactwork/storybook-addon
```

## Setup

### 1. Add to Storybook configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@pactwork/storybook-addon', // Add pactwork addon
  ],
  // ... other config
};

export default config;
```

### 2. Initialize in preview.ts

```typescript
// .storybook/preview.ts
import { initPactwork } from '@pactwork/storybook-addon';
import { handlers, handlerMeta, scenarios } from '../mocks';
import { worker } from '../mocks/browser';

// Start MSW worker
await worker.start({ onUnhandledRequest: 'bypass' });

// Initialize pactwork addon
initPactwork(worker, {
  handlers,
  handlerMeta,
  scenarios,
  debug: true, // Optional: log transformations to console
});

export default {
  // ... your preview config
};
```

### 3. (Alternative) CSF Factories Setup

For Storybook 10's recommended CSF Factories pattern:

```typescript
// .storybook/preview.ts
import pactworkAddon from '@pactwork/storybook-addon';
import { definePreview } from '@storybook/react';

export default definePreview({
  addons: [pactworkAddon()],
});
```

## Usage

### Story Parameters

Control API behavior per-story using `parameters.pactwork`:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default story - uses normal API responses
export const Default: Story = {};

// Loading state - 2 second delay
export const Loading: Story = {
  parameters: {
    pactwork: {
      scenario: 'getUser.loading',
      latency: 2000,
    },
  },
};

// Error state
export const Error: Story = {
  parameters: {
    pactwork: {
      scenario: 'getUser.serverError',
    },
  },
};

// Not found state
export const NotFound: Story = {
  parameters: {
    pactwork: {
      scenario: 'getUser.notFound',
    },
  },
};

// Empty list
export const EmptyList: Story = {
  parameters: {
    pactwork: {
      scenario: 'listUsers.empty',
    },
  },
};

// Network timeout
export const NetworkTimeout: Story = {
  parameters: {
    pactwork: {
      networkError: 'timeout',
    },
  },
};

// Multiple scenarios
export const ComplexState: Story = {
  parameters: {
    pactwork: {
      scenarios: ['getUser.loading', 'listUsers.empty'],
      latency: 500,
    },
  },
};
```

### Toolbar

When Storybook is running, you'll see a Pactwork icon in the top toolbar. Click it to open the controls dropdown:

- **Scenario** - Select from available scenarios or reset to default
- **Latency** - Quick presets: None, 200ms, 1s, 3s
- **Network** - Toggle between Online, Offline, and Timeout states
- **Reset All** - Clear all active transformations

The toolbar button shows a status summary when any transformation is active.

### Addon Panel

The "Pactwork" tab in the addon panel provides observability:

- **Current State** - Shows active scenario, latency, and network state
- **Request Log** - Live log of intercepted API requests with method, path, status, and timing
- **Handler List** - View all available handlers and their scenario counts

## API Reference

### PactworkParameters

| Property | Type | Description |
|----------|------|-------------|
| `scenario` | `string` | Scenario to apply. Format: `'operationId.scenarioName'` |
| `scenarios` | `string[]` | Multiple scenarios to apply simultaneously |
| `latency` | `number \| LatencyOptions` | Delay in ms or `{ min, max }` for random range |
| `networkError` | `'timeout' \| 'abort' \| 'network-error'` | Network error to simulate |
| `operations` | `string[]` | Specific operations to apply transformations to |
| `disabled` | `boolean` | Disable all pactwork transformations |

### initPactwork(worker, config)

Initialize the addon with your MSW worker and pactwork configuration.

```typescript
initPactwork(worker, {
  handlers: HttpHandler[],      // MSW handlers from pactwork generate
  handlerMeta: HandlerMetaMap,  // Handler metadata for O(1) lookups
  scenarios: Record<string, ScenarioMap>, // Available scenarios by operationId
  defaultLatency?: number,      // Default latency for all handlers
  debug?: boolean,              // Log transformations to console
});
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `initPactwork` | Initialize addon with MSW worker and config |
| `setWorker` | Manually set MSW worker reference |
| `setGlobalConfig` | Manually set global configuration |
| `getGlobalConfig` | Get current global configuration |
| `resetHandlers` | Reset all handlers to original state |
| `pactworkDecorator` | The Storybook decorator instance |

### Channel Events

For advanced integrations, the addon uses these channel events:

| Event | Direction | Description |
|-------|-----------|-------------|
| `pactwork/scenario-change` | Toolbar → Preview | Scenario selection changed |
| `pactwork/latency-change` | Toolbar → Preview | Latency value changed |
| `pactwork/network-change` | Toolbar → Preview | Network state changed |
| `pactwork/state-update` | Preview → Panel | Current state updated |
| `pactwork/handlers-ready` | Preview → Toolbar/Panel | Handler info available |
| `pactwork/reset` | Toolbar → Preview | Reset all transformations |

## Storybook 10 Migration

This addon is built specifically for Storybook 10.x. Key changes from previous Storybook versions:

| Change | Before (SB 8/9) | After (SB 10) |
|--------|-----------------|---------------|
| Module format | CJS + ESM dual | ESM-only |
| Entry points | `exportEntries` | `previewEntries` + `managerEntries` |
| Path resolution | `require.resolve()` | `import.meta.resolve()` |
| Addon export | Manual annotations | `definePreviewAddon()` |
| Node target | 18.0 | 20.19+ |

### Upgrading from MSW addon

If you're migrating from `msw-storybook-addon`:

```typescript
// Before (msw-storybook-addon)
export const handlers = [
  http.get('/api/user', () => HttpResponse.json({ name: 'John' })),
];

// After (pactwork)
// 1. Generate handlers with pactwork CLI
npx pactwork generate --spec openapi.yaml --output ./mocks

// 2. Use generated handlers with scenarios
import { handlers, handlerMeta, scenarios } from './mocks';

// 3. Configure addon
initPactwork(worker, { handlers, handlerMeta, scenarios });

// 4. Use scenarios in stories
parameters: {
  pactwork: { scenario: 'getUser.notFound' }
}
```

## Troubleshooting

### Panel not showing handlers

Make sure `initPactwork` is called **after** `worker.start()` in preview.ts.

### Scenarios not applying

Check that the scenario string matches the format `operationId.scenarioName` exactly.

### TypeScript errors

Ensure you have the correct peer dependencies:

```bash
npm install -D storybook@^10.0.0 msw@^2.0.0 pactwork@^1.1.0
```

### ESM errors

This package is ESM-only. Make sure your project supports ES modules:

```json
// package.json
{
  "type": "module"
}
```

## License

MIT
