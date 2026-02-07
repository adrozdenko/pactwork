/**
 * Pactwork Storybook Addon Preview Entry
 *
 * Provides the decorator and preview annotations for story rendering.
 * This file runs in the preview iframe where stories render.
 */

import type { DecoratorFunction } from 'storybook/internal/types';
import { addons } from 'storybook/internal/preview-api';
import {
  pactworkDecorator,
  setWorker,
  setGlobalConfig,
  getGlobalConfig,
  handleScenarioChange,
  handleLatencyChange,
  handleNetworkChange,
  resetHandlers,
} from './decorator.js';
import { EVENTS } from './constants.js';
import type { PactworkGlobalConfig, HandlerInfo } from './types.js';
import type { HandlerMetadata } from 'pactwork/runtime';

/**
 * Addon annotations for Storybook preview configuration.
 */
export const addonAnnotations = {
  decorators: [pactworkDecorator as DecoratorFunction],
};

/**
 * Initialize pactwork addon with MSW worker and configuration.
 *
 * Call this in your preview.ts after setting up MSW:
 *
 * @example
 * ```typescript
 * // preview.ts
 * import { initPactwork } from '@pactwork/storybook-addon';
 * import { handlers, handlerMeta, scenarios } from './mocks';
 *
 * // After setting up MSW worker
 * await worker.start();
 *
 * initPactwork(worker, {
 *   handlers,
 *   handlerMeta,
 *   scenarios,
 * });
 * ```
 */
export function initPactwork(
  worker: { use: (...handlers: unknown[]) => void; resetHandlers: () => void },
  config: PactworkGlobalConfig
): void {
  // Set up worker and config
  setWorker(worker as Parameters<typeof setWorker>[0]);
  setGlobalConfig(config);

  // Set up channel listeners for panel communication
  const channel = addons.getChannel();

  channel.on(EVENTS.SCENARIO_CHANGE, handleScenarioChange);
  channel.on(EVENTS.LATENCY_CHANGE, handleLatencyChange);
  channel.on(EVENTS.NETWORK_CHANGE, handleNetworkChange);
  channel.on(EVENTS.RESET, resetHandlers);

  // Handle state request from panel
  channel.on(EVENTS.STATE_REQUEST, () => {
    const currentConfig = getGlobalConfig();
    if (!currentConfig) return;

    // Build handler info for panel
    const handlerInfos: HandlerInfo[] = Object.entries(currentConfig.handlerMeta).map(
      ([operationId, meta]) => {
        const handlerMeta = meta as HandlerMetadata;
        return {
          operationId,
          method: handlerMeta.method,
          path: handlerMeta.path,
          availableScenarios: Object.keys(currentConfig.scenarios[operationId] || {}),
        };
      }
    );

    // Build flat scenario list
    const allScenarios: string[] = [];
    for (const [operationId, scenarioMap] of Object.entries(currentConfig.scenarios)) {
      for (const scenarioName of Object.keys(scenarioMap)) {
        allScenarios.push(`${operationId}.${scenarioName}`);
      }
    }

    // Emit handlers ready event
    channel.emit(EVENTS.HANDLERS_READY, {
      handlers: handlerInfos,
      scenarios: allScenarios,
    });
  });

  // Log initialization in debug mode
  if (config.debug) {
    console.log('[pactwork/storybook] Initialized with', {
      handlerCount: config.handlers.length,
      operationCount: Object.keys(config.handlerMeta).length,
      scenarioCount: Object.values(config.scenarios).reduce(
        (sum, s) => sum + Object.keys(s).length,
        0
      ),
    });
  }
}

/**
 * Export decorators array for manual registration.
 */
export const decorators = [pactworkDecorator];

/**
 * Re-export decorator setup functions for advanced use.
 */
export { setWorker, setGlobalConfig, getGlobalConfig } from './decorator.js';
