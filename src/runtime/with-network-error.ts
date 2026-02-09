/**
 * With Network Error Utility
 *
 * Simulate network-level errors like timeouts, aborted requests, and connection failures.
 * Critical for testing error boundaries, retry logic, and offline handling.
 */

import { http, HttpHandler } from 'msw';
import type { HandlerMetaMap, NetworkErrorOptions } from './types.js';
import {
  delay,
  findHandlerMeta,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Default timeout delay (30 seconds).
 */
const DEFAULT_TIMEOUT_DELAY = 30000;

/**
 * Apply a network error to a specific operation.
 *
 * @example
 * ```typescript
 * // Simulate timeout
 * const timeoutHandlers = withNetworkError(handlers, handlerMeta, 'getUser', {
 *   type: 'timeout',
 *   delay: 5000,
 * });
 *
 * // Simulate connection error
 * const errorHandlers = withNetworkError(handlers, handlerMeta, 'getUser', {
 *   type: 'network-error',
 * });
 *
 * // Simulate aborted request
 * const abortedHandlers = withNetworkError(handlers, handlerMeta, 'getUser', {
 *   type: 'abort',
 * });
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply error to
 * @param options - Network error configuration
 * @returns New handlers array with network error applied
 */
export function withNetworkError(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: NetworkErrorOptions
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);
  validateNetworkErrorOptions(options);

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;

  const methodLower = method.toLowerCase() as keyof typeof http;
  const errorHandler = http[methodLower](path, async () => {
    return createNetworkError(options);
  });

  return replaceHandler(handlers, index, errorHandler);
}

/**
 * Create the appropriate network error response.
 */
async function createNetworkError(options: NetworkErrorOptions): Promise<Response> {
  switch (options.type) {
    case 'timeout':
      // Delay forever (or until test timeout)
      await delay(options.delay ?? DEFAULT_TIMEOUT_DELAY);
      // After delay, throw timeout error
      throw new Error(options.message ?? 'Request timeout');

    case 'abort': {
      // Simulate an aborted request
      const abortError = new DOMException(
        options.message ?? 'The operation was aborted.',
        'AbortError'
      );
      throw abortError;
    }

    case 'network-error':
      // Simulate a network failure
      // MSW uses Response.error() for network errors
      return Response.error();

    default:
      throw new Error(`Unknown network error type: ${(options as NetworkErrorOptions).type}`);
  }
}

/**
 * Validate network error options.
 */
function validateNetworkErrorOptions(options: NetworkErrorOptions): void {
  if (!options || typeof options !== 'object') {
    throw new Error('NetworkErrorOptions must be an object');
  }

  const validTypes = ['timeout', 'abort', 'network-error'];
  if (!validTypes.includes(options.type)) {
    throw new Error(`Invalid error type: ${options.type}. Must be one of: ${validTypes.join(', ')}`);
  }
}

/**
 * Apply timeout error to a specific operation.
 * Convenience wrapper for withNetworkError with type: 'timeout'.
 *
 * @example
 * ```typescript
 * const slowHandlers = withTimeout(handlers, handlerMeta, 'heavyOperation', 10000);
 * ```
 */
export function withTimeout(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  delayMs: number = DEFAULT_TIMEOUT_DELAY
): HttpHandler[] {
  return withNetworkError(handlers, meta, operationId, {
    type: 'timeout',
    delay: delayMs,
  });
}

/**
 * Apply abort error to a specific operation.
 * Convenience wrapper for withNetworkError with type: 'abort'.
 */
export function withAbort(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string
): HttpHandler[] {
  return withNetworkError(handlers, meta, operationId, {
    type: 'abort',
  });
}

/**
 * Apply connection error to a specific operation.
 * Convenience wrapper for withNetworkError with type: 'network-error'.
 */
export function withConnectionError(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string
): HttpHandler[] {
  return withNetworkError(handlers, meta, operationId, {
    type: 'network-error',
  });
}

/**
 * Apply network errors to all handlers.
 *
 * @example
 * ```typescript
 * // Simulate complete network outage
 * const offlineHandlers = withAllNetworkErrors(handlers, handlerMeta, {
 *   type: 'network-error',
 * });
 * ```
 */
export function withAllNetworkErrors(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  options: NetworkErrorOptions
): HttpHandler[] {
  let result = [...handlers];

  for (const operationId of Object.keys(meta)) {
    result = withNetworkError(result, meta, operationId, options);
  }

  return result;
}

/**
 * Simulate intermittent network errors.
 * Randomly fails with specified probability.
 *
 * @example
 * ```typescript
 * // 30% chance of network error
 * const flakyHandlers = withIntermittentError(handlers, handlerMeta, 'getUser', 0.3);
 * ```
 */
export function withIntermittentError(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  failureProbability: number,
  errorType: NetworkErrorOptions['type'] = 'network-error'
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);

  if (!Number.isFinite(failureProbability) || failureProbability < 0 || failureProbability > 1) {
    throw new Error('failureProbability must be between 0 and 1');
  }

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;
  const originalHandler = handlers[index];

  const methodLower = method.toLowerCase() as keyof typeof http;
  const intermittentHandler = http[methodLower](path, async (info: { request: Request }) => {
    // Randomly decide to fail
    if (Math.random() < failureProbability) {
      return createNetworkError({ type: errorType });
    }

    // Call original handler
    return callOriginalResolver(originalHandler, info);
  });

  return replaceHandler(handlers, index, intermittentHandler);
}

/**
 * Call the original handler's resolver.
 */
async function callOriginalResolver(
  handler: HttpHandler,
  info: { request: Request; params?: unknown }
): Promise<Response> {
  const anyHandler = handler as unknown as {
    resolver?: (info: { request: Request; params?: unknown }) => Promise<Response> | Response;
  };

  if (typeof anyHandler.resolver === 'function') {
    return anyHandler.resolver(info);
  }

  return new Response(JSON.stringify({ error: 'Original handler not callable' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a network error transformer for use with pipe().
 */
export function createNetworkErrorTransformer(
  meta: HandlerMetaMap,
  operationId: string,
  options: NetworkErrorOptions
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => withNetworkError(handlers, meta, operationId, options);
}
