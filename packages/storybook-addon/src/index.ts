/**
 * @pactwork/storybook-addon
 *
 * Storybook addon for Pactwork - Control API scenarios, latency,
 * and network states directly from stories and the Storybook UI panel.
 *
 * @example Basic usage with story parameters
 * ```typescript
 * // Button.stories.tsx
 * import type { Meta, StoryObj } from '@storybook/react';
 *
 * export const Loading: StoryObj = {
 *   parameters: {
 *     pactwork: {
 *       scenario: 'getUser.loading',
 *       latency: 2000
 *     }
 *   }
 * };
 *
 * export const Error: StoryObj = {
 *   parameters: {
 *     pactwork: { scenario: 'getUser.serverError' }
 *   }
 * };
 *
 * export const NetworkFailure: StoryObj = {
 *   parameters: {
 *     pactwork: { networkError: 'timeout' }
 *   }
 * };
 * ```
 *
 * @example Setup in preview.ts
 * ```typescript
 * // .storybook/preview.ts
 * import { initPactwork } from '@pactwork/storybook-addon';
 * import { handlers, handlerMeta, scenarios } from '../mocks';
 * import { worker } from '../mocks/browser';
 *
 * // Start MSW worker
 * await worker.start();
 *
 * // Initialize pactwork addon
 * initPactwork(worker, {
 *   handlers,
 *   handlerMeta,
 *   scenarios,
 *   debug: true // optional: log transformations to console
 * });
 * ```
 *
 * @packageDocumentation
 */

// Types - Public API
export type {
  PactworkParameters,
  PactworkGlobalConfig,
  PactworkPanelState,
  HandlerInfo,
  ScenarioChangePayload,
  LatencyChangePayload,
  NetworkChangePayload,
} from './types.js';

// Constants - For advanced customization
export { ADDON_ID, PANEL_ID, PARAM_KEY, EVENTS } from './constants.js';

// Decorator - For manual registration
export {
  pactworkDecorator,
  createPactworkDecorator,
  setWorker,
  setGlobalConfig,
  getGlobalConfig,
  resetHandlers,
} from './decorator.js';

// Preview - For setup
export { initPactwork, decorators, addonAnnotations } from './preview.js';
