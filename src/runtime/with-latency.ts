/**
 * With Latency Utility
 *
 * Add artificial delay to handlers to simulate network latency.
 * Useful for testing loading states, spinners, and timeout handling.
 */

import { http, HttpHandler } from 'msw';
import type { HandlerMetaMap, LatencyOptions } from './types.js';
import {
  delay,
  findHandlerMeta,
  randomDelay,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Add latency to all handlers.
 *
 * @example
 * ```typescript
 * // Add 500ms delay to all handlers
 * const slowHandlers = withLatency(handlers, handlerMeta, 500);
 *
 * // Add random delay between 100-500ms
 * const randomSlowHandlers = withLatency(handlers, handlerMeta, { min: 100, max: 500 });
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param options - Delay in ms or LatencyOptions
 * @returns New handlers array with latency applied
 */
export function withLatency(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  options: number | LatencyOptions
): HttpHandler[];

/**
 * Add latency to a specific operation.
 *
 * @example
 * ```typescript
 * // Add 2000ms delay to getUser only
 * const slowGetUser = withLatency(handlers, handlerMeta, 'getUser', 2000);
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply latency to
 * @param options - Delay in ms or LatencyOptions
 * @returns New handlers array with latency applied
 */
export function withLatency(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: number | LatencyOptions
): HttpHandler[];

/**
 * Implementation of withLatency.
 */
export function withLatency(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationIdOrOptions: string | number | LatencyOptions,
  maybeOptions?: number | LatencyOptions
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);

  // Determine if we're applying to all handlers or a specific one
  const isSpecificOperation = typeof operationIdOrOptions === 'string';
  const operationId = isSpecificOperation ? operationIdOrOptions : undefined;
  const options = isSpecificOperation ? maybeOptions! : operationIdOrOptions;

  // Normalize options
  const latencyOptions = normalizeLatencyOptions(options);

  if (operationId) {
    // Apply to specific operation
    return applyLatencyToOperation(handlers, meta, operationId, latencyOptions);
  } else {
    // Apply to all handlers
    return applyLatencyToAll(handlers, meta, latencyOptions);
  }
}

/**
 * Normalize latency options to a consistent format.
 */
function normalizeLatencyOptions(options: number | LatencyOptions): Required<LatencyOptions> {
  if (typeof options === 'number') {
    return { delay: options, min: 0, max: 0 };
  }

  return {
    delay: options.delay ?? 0,
    min: options.min ?? 0,
    max: options.max ?? 0,
  };
}

/**
 * Calculate the actual delay value from options.
 */
function calculateDelay(options: Required<LatencyOptions>): number {
  if (options.min > 0 && options.max > 0) {
    return randomDelay(options.min, options.max);
  }
  return options.delay;
}

/**
 * Apply latency to a specific operation.
 */
function applyLatencyToOperation(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: Required<LatencyOptions>
): HttpHandler[] {
  validateOperationId(meta, operationId);

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;
  const originalHandler = handlers[index];

  const methodLower = method.toLowerCase() as keyof typeof http;
  const latencyHandler = http[methodLower](path, async (info: { request: Request }) => {
    const delayMs = calculateDelay(options);
    await delay(delayMs);

    // Call original handler's resolver
    // MSW stores resolver differently - we need to access it properly
    return callOriginalResolver(originalHandler, info);
  });

  return replaceHandler(handlers, index, latencyHandler);
}

/**
 * Apply latency to all handlers.
 */
function applyLatencyToAll(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  options: Required<LatencyOptions>
): HttpHandler[] {
  let result = [...handlers];

  for (const operationId of Object.keys(meta)) {
    result = applyLatencyToOperation(result, meta, operationId, options);
  }

  return result;
}

/**
 * Call the original handler's resolver.
 * This extracts and invokes the resolver from an existing MSW handler.
 */
async function callOriginalResolver(
  handler: HttpHandler,
  info: { request: Request; params?: unknown }
): Promise<Response> {
  // Access the handler's internal resolver
  // MSW HttpHandler stores the resolver in handler.resolver
  const anyHandler = handler as unknown as {
    resolver?: (info: { request: Request; params?: unknown }) => Promise<Response> | Response;
  };

  if (typeof anyHandler.resolver === 'function') {
    return anyHandler.resolver(info);
  }

  // Fallback: try to match and execute
  // This is a simplified approach - full implementation would use MSW's matching
  return new Response(JSON.stringify({ error: 'Original handler not callable' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a latency transformer function for use with pipe().
 *
 * @example
 * ```typescript
 * const addLatency = createLatencyTransformer(handlerMeta, 500);
 * const slowHandlers = addLatency(handlers);
 * ```
 */
export function createLatencyTransformer(
  meta: HandlerMetaMap,
  options: number | LatencyOptions
): (handlers: HttpHandler[]) => HttpHandler[];

export function createLatencyTransformer(
  meta: HandlerMetaMap,
  operationId: string,
  options: number | LatencyOptions
): (handlers: HttpHandler[]) => HttpHandler[];

export function createLatencyTransformer(
  meta: HandlerMetaMap,
  operationIdOrOptions: string | number | LatencyOptions,
  maybeOptions?: number | LatencyOptions
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => {
    if (typeof operationIdOrOptions === 'string' && maybeOptions !== undefined) {
      return withLatency(handlers, meta, operationIdOrOptions, maybeOptions);
    }
    return withLatency(handlers, meta, operationIdOrOptions as number | LatencyOptions);
  };
}
