/**
 * With Rate Limit Utility
 *
 * Simulate API rate limiting (429 responses) based on request frequency.
 * Essential for testing rate limit handling, retry-after headers, and backoff logic.
 */

import { http, HttpHandler, HttpResponse } from 'msw';
import type { HandlerMetaMap, RateLimitOptions, RateLimitState } from './types.js';
import {
  findHandlerMeta,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Internal state tracking for rate limits.
 */
const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Default rate limit response body.
 */
const DEFAULT_RATE_LIMIT_RESPONSE = {
  error: 'Too Many Requests',
  message: 'Rate limit exceeded. Please retry after the specified time.',
};

/**
 * Apply rate limiting to a specific operation.
 *
 * @example
 * ```typescript
 * // Allow 5 requests per 10 seconds
 * const rateLimitedHandlers = withRateLimit(handlers, handlerMeta, 'listUsers', {
 *   maxRequests: 5,
 *   windowMs: 10000,
 * });
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to rate limit
 * @param options - Rate limit configuration
 * @returns New handlers array with rate limiting applied
 */
export function withRateLimit(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: RateLimitOptions
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);
  validateRateLimitOptions(options);

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;
  const originalHandler = handlers[index];

  const stateKey = `ratelimit:${operationId}`;

  // Initialize state
  if (!rateLimitStates.has(stateKey)) {
    rateLimitStates.set(stateKey, { requestTimestamps: [], limitedCount: 0 });
  }

  const methodLower = method.toLowerCase() as keyof typeof http;
  const rateLimitHandler = http[methodLower](path, async (info: { request: Request }) => {
    const state = rateLimitStates.get(stateKey)!;
    const now = Date.now();

    // Clean up old timestamps outside the window
    state.requestTimestamps = state.requestTimestamps.filter(
      (ts) => now - ts < options.windowMs
    );

    // Check if rate limited
    if (state.requestTimestamps.length >= options.maxRequests) {
      state.limitedCount++;
      rateLimitStates.set(stateKey, state);

      const retryAfter = calculateRetryAfter(state.requestTimestamps, options.windowMs);

      return HttpResponse.json(options.responseBody ?? DEFAULT_RATE_LIMIT_RESPONSE, {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(retryAfter / 1000)),
          'X-RateLimit-Limit': String(options.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((now + retryAfter) / 1000)),
          ...options.headers,
        },
      });
    }

    // Record this request
    state.requestTimestamps.push(now);
    rateLimitStates.set(stateKey, state);

    // Call original handler
    return callOriginalResolver(originalHandler, info);
  });

  return replaceHandler(handlers, index, rateLimitHandler);
}

/**
 * Apply rate limiting to all handlers with the same limits.
 *
 * @example
 * ```typescript
 * // Apply global rate limit of 100 requests per minute
 * const globalRateLimited = withGlobalRateLimit(handlers, handlerMeta, {
 *   maxRequests: 100,
 *   windowMs: 60000,
 * });
 * ```
 */
export function withGlobalRateLimit(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  options: RateLimitOptions
): HttpHandler[] {
  let result = [...handlers];

  for (const operationId of Object.keys(meta)) {
    result = withRateLimit(result, meta, operationId, options);
  }

  return result;
}

/**
 * Calculate time until rate limit resets.
 */
function calculateRetryAfter(timestamps: number[], windowMs: number): number {
  if (timestamps.length === 0) return 0;

  const oldestTimestamp = Math.min(...timestamps);
  const resetTime = oldestTimestamp + windowMs;
  const now = Date.now();

  return Math.max(0, resetTime - now);
}

/**
 * Validate rate limit options.
 */
function validateRateLimitOptions(options: RateLimitOptions): void {
  if (!options || typeof options !== 'object') {
    throw new Error('RateLimitOptions must be an object');
  }

  if (typeof options.maxRequests !== 'number' || options.maxRequests < 1) {
    throw new Error('maxRequests must be a positive number');
  }

  if (typeof options.windowMs !== 'number' || options.windowMs < 1) {
    throw new Error('windowMs must be a positive number');
  }
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
 * Reset rate limit state for a specific operation or all operations.
 */
export function resetRateLimit(operationId?: string): void {
  if (operationId) {
    rateLimitStates.delete(`ratelimit:${operationId}`);
  } else {
    // Clear all rate limit states
    for (const key of rateLimitStates.keys()) {
      if (key.startsWith('ratelimit:')) {
        rateLimitStates.delete(key);
      }
    }
  }
}

/**
 * Get current rate limit state for debugging.
 */
export function getRateLimitState(operationId: string): RateLimitState | undefined {
  return rateLimitStates.get(`ratelimit:${operationId}`);
}

/**
 * Create a rate limit transformer for use with pipe().
 */
export function createRateLimitTransformer(
  meta: HandlerMetaMap,
  operationId: string,
  options: RateLimitOptions
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => withRateLimit(handlers, meta, operationId, options);
}

/**
 * Simulate a burst rate limit - allow burst then limit.
 *
 * @example
 * ```typescript
 * // Allow burst of 10 requests, then limit to 2 per second
 * const burstLimited = withBurstRateLimit(handlers, handlerMeta, 'search', {
 *   burstSize: 10,
 *   sustainedRate: 2,
 *   sustainedWindowMs: 1000,
 * });
 * ```
 */
export function withBurstRateLimit(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: {
    burstSize: number;
    sustainedRate: number;
    sustainedWindowMs: number;
  }
): HttpHandler[] {
  // Implement as a sliding window that allows initial burst
  return withRateLimit(handlers, meta, operationId, {
    maxRequests: options.burstSize,
    windowMs: options.sustainedWindowMs * (options.burstSize / options.sustainedRate),
  });
}
