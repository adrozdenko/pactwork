/**
 * Pactwork Runtime Utilities
 *
 * Composable, pure functions for transforming MSW handlers at runtime.
 * Use these utilities to simulate various API states in tests, Storybook, and development.
 *
 * @example
 * ```typescript
 * import { handlers, handlerMeta, scenarios } from './mocks';
 * import { applyScenario, withLatency, withSequence, pipe } from 'pactwork/runtime';
 *
 * // Apply error scenario
 * const errorHandlers = applyScenario(handlers, handlerMeta, 'getUser', scenarios.getUser.notFound);
 *
 * // Compose multiple transformations
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   h => withLatency(h, handlerMeta, 100),
 *   h => applyScenario(h, handlerMeta, 'getUser', scenarios.getUser.notFound),
 * );
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  HandlerMetadata,
  HandlerMetaMap,
  Scenario,
  ScenarioMap,
  LatencyOptions,
  RateLimitOptions,
  SequenceStep,
  NetworkErrorOptions,
  SeedOptions,
  HandlerTransformer,
  TransformResult,
  SequenceState,
  RateLimitState,
  RuntimeState,
  HandlerFactory,
} from './types.js';

// Core utilities - Scenario application
export {
  applyScenario,
  applyScenarios,
  createScenarioApplicator,
  ScenarioHelpers,
} from './apply-scenario.js';

// Latency simulation
export {
  withLatency,
  createLatencyTransformer,
} from './with-latency.js';

// Sequence/Flaky API simulation
export {
  withSequence,
  withFailThenSucceed,
  withSucceedThenFail,
  resetSequence,
  getSequenceState,
  createSequenceTransformer,
} from './with-sequence.js';

// Rate limiting
export {
  withRateLimit,
  withGlobalRateLimit,
  withBurstRateLimit,
  resetRateLimit,
  getRateLimitState,
  createRateLimitTransformer,
} from './with-rate-limit.js';

// Network error simulation
export {
  withNetworkError,
  withTimeout,
  withAbort,
  withConnectionError,
  withAllNetworkErrors,
  withIntermittentError,
  createNetworkErrorTransformer,
} from './with-network-error.js';

// Deterministic data generation
export {
  withSeed,
  withGlobalSeed,
  SeededRandom,
  getSeededRandom,
  resetSeededRandom,
  DeterministicGenerators,
  createSeedTransformer,
} from './with-seed.js';

// Composition utilities
export {
  pipe,
  createPipeline,
  combinePipelines,
  when,
  whenFn,
  ifElse,
  times,
  filter,
  identity,
  debug,
  tap,
  createNamedPipeline,
} from './pipe.js';
export type { NamedPipeline } from './pipe.js';

// Internal utilities (exported for advanced use cases)
export {
  findHandlerMeta,
  replaceHandler,
  wrapHandler,
  createHandler,
  createScenarioHandler,
  createLatencyHandler,
  delay,
  randomDelay,
  validateOperationId,
  getOperationIds,
  validateHandlers,
  validateMetaMap,
} from './handler-utils.js';
