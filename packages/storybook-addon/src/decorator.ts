/**
 * Pactwork Storybook Decorator
 *
 * Applies pactwork runtime transformations based on story parameters.
 * Integrates with MSW's browser worker to swap handlers.
 */

import type { DecoratorFunction } from 'storybook/internal/types';
import type { HttpHandler } from 'msw';
import type {
  PactworkParameters,
  PactworkGlobalConfig,
  ScenarioChangePayload,
  LatencyChangePayload,
  NetworkChangePayload,
} from './types.js';
import { PARAM_KEY } from './constants.js';

// Pactwork runtime imports (lazy loaded to avoid bundling issues)
let pactworkRuntime: typeof import('pactwork/runtime') | null = null;

async function loadRuntime(): Promise<typeof import('pactwork/runtime')> {
  if (!pactworkRuntime) {
    pactworkRuntime = await import('pactwork/runtime');
  }
  return pactworkRuntime;
}

// MSW worker reference (set by preview.ts)
let mswWorker: { use: (...handlers: HttpHandler[]) => void; resetHandlers: () => void } | null = null;

// Global config (set by preview.ts)
let globalConfig: PactworkGlobalConfig | null = null;

// Current applied transformations for reset
let currentHandlers: HttpHandler[] | null = null;

/**
 * Sets the MSW worker instance for handler swapping.
 */
export function setWorker(
  worker: { use: (...handlers: HttpHandler[]) => void; resetHandlers: () => void }
): void {
  mswWorker = worker;
}

/**
 * Sets the global pactwork configuration.
 */
export function setGlobalConfig(config: PactworkGlobalConfig): void {
  globalConfig = config;
}

/**
 * Gets the current global configuration.
 */
export function getGlobalConfig(): PactworkGlobalConfig | null {
  return globalConfig;
}

/**
 * Parses a scenario string into operationId and scenarioName.
 * Format: 'operationId.scenarioName' or 'scenarioName'
 */
function parseScenario(scenario: string): { operationId: string | null; scenarioName: string } {
  const dotIndex = scenario.lastIndexOf('.');
  if (dotIndex === -1) {
    return { operationId: null, scenarioName: scenario };
  }
  return {
    operationId: scenario.substring(0, dotIndex),
    scenarioName: scenario.substring(dotIndex + 1),
  };
}

/**
 * Applies pactwork transformations based on parameters.
 */
async function applyTransformations(params: PactworkParameters): Promise<HttpHandler[]> {
  if (!globalConfig) {
    console.warn('[pactwork/storybook] No global config set. Call setGlobalConfig in preview.ts');
    return [];
  }

  if (params.disabled) {
    return globalConfig.handlers;
  }

  const runtime = await loadRuntime();
  const { handlers, handlerMeta, scenarios } = globalConfig;

  let transformedHandlers = [...handlers];

  // Apply single scenario
  if (params.scenario) {
    const { operationId, scenarioName } = parseScenario(params.scenario);

    if (operationId && scenarios[operationId]?.[scenarioName]) {
      transformedHandlers = runtime.applyScenario(
        transformedHandlers,
        handlerMeta,
        operationId,
        scenarios[operationId][scenarioName]
      );
    } else if (globalConfig.debug) {
      console.warn(`[pactwork/storybook] Scenario not found: ${params.scenario}`);
    }
  }

  // Apply multiple scenarios
  if (params.scenarios?.length) {
    for (const scenarioStr of params.scenarios) {
      const { operationId, scenarioName } = parseScenario(scenarioStr);
      if (operationId && scenarios[operationId]?.[scenarioName]) {
        transformedHandlers = runtime.applyScenario(
          transformedHandlers,
          handlerMeta,
          operationId,
          scenarios[operationId][scenarioName]
        );
      }
    }
  }

  // Apply latency
  if (params.latency !== undefined) {
    const latencyValue =
      typeof params.latency === 'number' ? params.latency : params.latency;

    if (params.operations?.length) {
      // Apply to specific operations
      for (const operationId of params.operations) {
        transformedHandlers = runtime.withLatency(
          transformedHandlers,
          handlerMeta,
          operationId,
          latencyValue
        );
      }
    } else {
      // Apply to all handlers
      transformedHandlers = runtime.withLatency(transformedHandlers, handlerMeta, latencyValue);
    }
  }

  // Apply network error
  if (params.networkError) {
    const errorOptions: import('pactwork/runtime').NetworkErrorOptions =
      typeof params.networkError === 'string'
        ? { type: params.networkError }
        : params.networkError;

    if (params.operations?.length) {
      for (const operationId of params.operations) {
        transformedHandlers = runtime.withNetworkError(
          transformedHandlers,
          handlerMeta,
          operationId,
          errorOptions
        );
      }
    } else {
      transformedHandlers = runtime.withAllNetworkErrors(
        transformedHandlers,
        handlerMeta,
        errorOptions
      );
    }
  }

  if (globalConfig.debug) {
    console.log('[pactwork/storybook] Applied transformations:', {
      scenario: params.scenario,
      scenarios: params.scenarios,
      latency: params.latency,
      networkError: params.networkError,
      operations: params.operations,
    });
  }

  return transformedHandlers;
}

/**
 * Resets handlers to the original state.
 */
export function resetHandlers(): void {
  if (mswWorker) {
    mswWorker.resetHandlers();
    currentHandlers = null;
  }
}

/**
 * Applies transformed handlers to MSW worker.
 */
async function applyToWorker(handlers: HttpHandler[]): Promise<void> {
  if (!mswWorker) {
    console.warn('[pactwork/storybook] MSW worker not set. Call setWorker in preview.ts');
    return;
  }

  // Reset first, then apply new handlers
  mswWorker.resetHandlers();
  mswWorker.use(...handlers);
  currentHandlers = handlers;
}

/**
 * Handles scenario change events from the panel.
 */
export async function handleScenarioChange(payload: ScenarioChangePayload): Promise<void> {
  if (!globalConfig) return;

  if (payload.scenario === null) {
    resetHandlers();
    return;
  }

  const handlers = await applyTransformations({ scenario: payload.scenario });
  await applyToWorker(handlers);
}

/**
 * Handles latency change events from the panel.
 */
export async function handleLatencyChange(payload: LatencyChangePayload): Promise<void> {
  if (!globalConfig) return;

  const handlers = await applyTransformations({
    latency: payload.latency,
    operations: payload.operations,
  });
  await applyToWorker(handlers);
}

/**
 * Handles network error change events from the panel.
 */
export async function handleNetworkChange(payload: NetworkChangePayload): Promise<void> {
  if (!globalConfig) return;

  if (payload.type === null) {
    resetHandlers();
    return;
  }

  const handlers = await applyTransformations({
    networkError: { type: payload.type, delay: payload.delay },
    operations: payload.operations,
  });
  await applyToWorker(handlers);
}

/**
 * Creates the pactwork decorator for Storybook.
 *
 * The decorator reads `parameters.pactwork` from each story and applies
 * the corresponding MSW handler transformations.
 */
export function createPactworkDecorator(): DecoratorFunction {
  return (storyFn, context) => {
    const params = context.parameters[PARAM_KEY] as PactworkParameters | undefined;

    // Early return if no pactwork parameters
    if (!params) {
      // Reset any previous transformations
      if (currentHandlers) {
        resetHandlers();
      }
      return storyFn();
    }

    // Apply transformations asynchronously
    // The decorator renders immediately; transformations apply after
    // This works because MSW handlers are applied before the next network request
    void applyTransformations(params).then((handlers) => {
      if (handlers.length > 0) {
        void applyToWorker(handlers);
      }
    });

    return storyFn();
  };
}

/**
 * The default pactwork decorator instance.
 */
export const pactworkDecorator = createPactworkDecorator();
