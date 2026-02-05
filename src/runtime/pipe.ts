/**
 * Pipe Utility
 *
 * Compose multiple handler transformations in a readable, functional way.
 * Enables building complex mock configurations from simple primitives.
 */

import type { HttpHandler } from 'msw';
import type { HandlerMetaMap, HandlerTransformer } from './types.js';

/**
 * Pipe handlers through a series of transformations.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   h => withLatency(h, handlerMeta, 100),
 *   h => applyScenario(h, handlerMeta, 'getUser', scenarios.getUser.notFound),
 *   h => withRateLimit(h, handlerMeta, 'listUsers', { maxRequests: 5, windowMs: 1000 }),
 * );
 * ```
 *
 * @param handlers - Initial MSW handlers array
 * @param meta - Handler metadata map (passed for convenience, not used by pipe itself)
 * @param transformers - Functions that transform handlers
 * @returns Transformed handlers array
 */
export function pipe(
  handlers: HttpHandler[],
  _meta: HandlerMetaMap,
  ...transformers: HandlerTransformer[]
): HttpHandler[] {
  return transformers.reduce((h, transformer) => transformer(h), handlers);
}

/**
 * Create a reusable pipeline configuration.
 * Returns a function that applies all transformations when called.
 *
 * @example
 * ```typescript
 * const errorTestPipeline = createPipeline(
 *   handlerMeta,
 *   h => withLatency(h, handlerMeta, 50),
 *   h => applyScenario(h, handlerMeta, 'getUser', scenarios.getUser.serverError),
 * );
 *
 * // Later, apply to any handlers:
 * const errorHandlers = errorTestPipeline(handlers);
 * const otherErrorHandlers = errorTestPipeline(otherHandlers);
 * ```
 *
 * @param meta - Handler metadata map
 * @param transformers - Functions that transform handlers
 * @returns Function that applies all transformations
 */
export function createPipeline(
  meta: HandlerMetaMap,
  ...transformers: HandlerTransformer[]
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => pipe(handlers, meta, ...transformers);
}

/**
 * Combine multiple pipelines into one.
 *
 * @example
 * ```typescript
 * const latencyPipeline = createPipeline(meta, h => withLatency(h, meta, 100));
 * const errorPipeline = createPipeline(meta, h => applyScenario(h, meta, 'getUser', notFound));
 *
 * const combinedPipeline = combinePipelines(latencyPipeline, errorPipeline);
 * ```
 */
export function combinePipelines(
  ...pipelines: ((handlers: HttpHandler[]) => HttpHandler[])[]
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => pipelines.reduce((h, pipeline) => pipeline(h), handlers);
}

/**
 * Conditionally apply a transformation.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   when(isSlowNetwork, h => withLatency(h, handlerMeta, 2000)),
 *   when(isOffline, h => withAllNetworkErrors(h, handlerMeta, { type: 'network-error' })),
 * );
 * ```
 */
export function when(
  condition: boolean,
  transformer: HandlerTransformer
): HandlerTransformer {
  return (handlers) => (condition ? transformer(handlers) : handlers);
}

/**
 * Apply transformation based on condition function.
 * The condition function is called with the handlers.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   whenFn(
 *     h => h.length > 0,
 *     h => withLatency(h, handlerMeta, 100)
 *   ),
 * );
 * ```
 */
export function whenFn(
  condition: (handlers: HttpHandler[]) => boolean,
  transformer: HandlerTransformer
): HandlerTransformer {
  return (handlers) => (condition(handlers) ? transformer(handlers) : handlers);
}

/**
 * Apply one of two transformations based on condition.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   ifElse(
 *     isProduction,
 *     h => h, // no-op in production
 *     h => withLatency(h, handlerMeta, 500) // add latency in dev
 *   ),
 * );
 * ```
 */
export function ifElse(
  condition: boolean,
  ifTrue: HandlerTransformer,
  ifFalse: HandlerTransformer
): HandlerTransformer {
  return condition ? ifTrue : ifFalse;
}

/**
 * Apply a transformation N times.
 * Useful for stacking effects.
 *
 * @example
 * ```typescript
 * // Apply increasing latency to multiple operations
 * const operations = ['op1', 'op2', 'op3'];
 * const slowHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   ...times(operations.length, i =>
 *     h => withLatency(h, handlerMeta, operations[i], (i + 1) * 100)
 *   ),
 * );
 * ```
 */
export function times(
  n: number,
  factory: (index: number) => HandlerTransformer
): HandlerTransformer[] {
  return Array.from({ length: n }, (_, i) => factory(i));
}

/**
 * Apply transformations to specific handlers based on predicate.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   filter(
 *     (_, index, meta) => meta[Object.keys(meta)[index]]?.method === 'GET',
 *     h => withLatency(h, handlerMeta, 200)
 *   ),
 * );
 * ```
 */
export function filter(
  predicate: (handler: HttpHandler, index: number, meta: HandlerMetaMap) => boolean,
  transformer: HandlerTransformer,
  meta: HandlerMetaMap
): HandlerTransformer {
  return (handlers) => {
    return handlers.map((handler, index) =>
      predicate(handler, index, meta) ? transformer([handler])[0] : handler
    );
  };
}

/**
 * Identity transformer - returns handlers unchanged.
 * Useful as a default or placeholder.
 */
export const identity: HandlerTransformer = (handlers) => handlers;

/**
 * Debug transformer - logs handlers and returns them unchanged.
 * Useful for debugging pipelines.
 */
export function debug(label: string = 'handlers'): HandlerTransformer {
  return (handlers) => {
    console.log(`[pipe debug] ${label}:`, handlers.length, 'handlers');
    return handlers;
  };
}

/**
 * Tap transformer - execute side effect without modifying handlers.
 *
 * @example
 * ```typescript
 * const testHandlers = pipe(
 *   handlers,
 *   handlerMeta,
 *   tap(h => console.log('Before latency:', h.length)),
 *   h => withLatency(h, handlerMeta, 100),
 *   tap(h => console.log('After latency:', h.length)),
 * );
 * ```
 */
export function tap(
  sideEffect: (handlers: HttpHandler[]) => void
): HandlerTransformer {
  return (handlers) => {
    sideEffect(handlers);
    return handlers;
  };
}

/**
 * Create a named pipeline for better debugging and reusability.
 */
export interface NamedPipeline {
  name: string;
  description?: string;
  apply: (handlers: HttpHandler[]) => HttpHandler[];
}

/**
 * Create a named, documented pipeline.
 *
 * @example
 * ```typescript
 * const errorTestPipeline = createNamedPipeline({
 *   name: 'error-test',
 *   description: 'Simulates various error conditions',
 *   transformers: [
 *     h => applyScenario(h, meta, 'getUser', notFound),
 *     h => withLatency(h, meta, 100),
 *   ],
 *   meta: handlerMeta,
 * });
 *
 * console.log(errorTestPipeline.name); // 'error-test'
 * const handlers = errorTestPipeline.apply(baseHandlers);
 * ```
 */
export function createNamedPipeline(config: {
  name: string;
  description?: string;
  transformers: HandlerTransformer[];
  meta: HandlerMetaMap;
}): NamedPipeline {
  return {
    name: config.name,
    description: config.description,
    apply: createPipeline(config.meta, ...config.transformers),
  };
}
