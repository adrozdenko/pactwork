/**
 * Pactwork Handler Utilities
 *
 * Internal helpers for manipulating MSW handler arrays.
 * These functions maintain immutability - they never mutate the input arrays.
 */

import { http, HttpHandler, HttpResponse } from 'msw';
import type { HandlerMetadata, HandlerMetaMap, Scenario } from './types.js';

/**
 * Find handler metadata by operationId.
 * O(1) lookup using the metadata map.
 *
 * @param meta - Handler metadata map
 * @param operationId - The operation to find
 * @returns The metadata if found, undefined otherwise
 */
export function findHandlerMeta(
  meta: HandlerMetaMap,
  operationId: string
): HandlerMetadata | undefined {
  return meta[operationId];
}

/**
 * Replace a handler at a specific index with a new handler.
 * Returns a new array - does not mutate the original.
 *
 * @param handlers - Original handlers array
 * @param index - Index to replace
 * @param newHandler - The replacement handler
 * @returns New array with the handler replaced
 */
export function replaceHandler(
  handlers: HttpHandler[],
  index: number,
  newHandler: HttpHandler
): HttpHandler[] {
  if (index < 0 || index >= handlers.length) {
    throw new Error(`Handler index ${index} out of bounds (0-${handlers.length - 1})`);
  }

  const result = [...handlers];
  result[index] = newHandler;
  return result;
}

/**
 * Create a new handler that wraps an existing one with additional behavior.
 * The wrapper receives the original handler and can call it or replace it entirely.
 *
 * @param handlers - Original handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to wrap
 * @param wrapper - Function that wraps the resolver
 * @returns New handlers array with wrapped handler
 */
export function wrapHandler(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  wrapper: (
    originalResolver: (info: { request: Request }) => Promise<Response>,
    info: { request: Request }
  ) => Promise<Response>
): HttpHandler[] {
  const handlerMeta = findHandlerMeta(meta, operationId);
  if (!handlerMeta) {
    throw new Error(`Unknown operationId: ${operationId}`);
  }

  const { method, path, index } = handlerMeta;
  const originalHandler = handlers[index];

  // Extract the original resolver behavior
  // MSW handlers store their resolver internally
  const wrappedHandler = createHandler(method, path, async (info) => {
    // Create a function that invokes the original handler's resolver
    const originalResolver = async (reqInfo: { request: Request }) => {
      // We need to simulate calling the original handler
      // This is a simplified approach - in practice, we'd need to extract the resolver
      const mockResponse = await simulateHandler(originalHandler, reqInfo.request);
      return mockResponse;
    };

    return wrapper(originalResolver, info);
  });

  return replaceHandler(handlers, index, wrappedHandler);
}

/**
 * Create an MSW HTTP handler for the given method and path.
 *
 * @param method - HTTP method
 * @param path - URL path pattern
 * @param resolver - Request resolver function
 * @returns MSW HttpHandler
 */
export function createHandler(
  method: string,
  path: string,
  resolver: (info: { request: Request }) => Promise<Response> | Response
): HttpHandler {
  const methodLower = method.toLowerCase() as keyof typeof http;

  if (!(methodLower in http)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return http[methodLower](path, resolver);
}

/**
 * Create a handler that returns a scenario response.
 *
 * @param method - HTTP method
 * @param path - URL path pattern
 * @param scenario - The scenario to apply
 * @returns MSW HttpHandler configured for the scenario
 */
export function createScenarioHandler<TData>(
  method: string,
  path: string,
  scenario: Scenario<TData>
): HttpHandler {
  return createHandler(method, path, async () => {
    // Apply delay if specified
    if (scenario.delay && scenario.delay > 0) {
      await delay(scenario.delay);
    }

    return HttpResponse.json(scenario.data as Record<string, unknown>, {
      status: scenario.status,
      headers: scenario.headers,
    });
  });
}

/**
 * Create a handler that adds latency before responding.
 *
 * @param method - HTTP method
 * @param path - URL path pattern
 * @param delayMs - Delay in milliseconds
 * @param originalResolver - Original resolver to call after delay
 * @returns MSW HttpHandler with latency
 */
export function createLatencyHandler(
  method: string,
  path: string,
  delayMs: number,
  originalResolver: (info: { request: Request }) => Promise<Response> | Response
): HttpHandler {
  return createHandler(method, path, async (info) => {
    await delay(delayMs);
    return originalResolver(info);
  });
}

/**
 * Simulate invoking an MSW handler and getting its response.
 * This is used when wrapping handlers to call the original behavior.
 *
 * Note: This is a simplified implementation. In production, you'd want
 * to use MSW's internal APIs or a more robust approach.
 *
 * @param handler - The handler to simulate
 * @param request - The request to send
 * @returns The handler's response
 */
export async function simulateHandler(
  handler: HttpHandler,
  request: Request
): Promise<Response> {
  // MSW handlers have a resolver property we can access
  // This extracts and calls the resolver directly
  const handlerInfo = handler.info as {
    resolver?: (info: { request: Request }) => Promise<Response> | Response;
  };

  if (handlerInfo.resolver) {
    return handlerInfo.resolver({ request });
  }

  // Fallback: return a default response
  return new Response(JSON.stringify({ error: 'Handler simulation failed' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Promise-based delay utility.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random delay within a range.
 *
 * @param min - Minimum delay in milliseconds
 * @param max - Maximum delay in milliseconds
 * @returns Random delay value
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Validate that an operationId exists in the metadata map.
 * Throws an error if not found.
 *
 * @param meta - Handler metadata map
 * @param operationId - Operation to validate
 */
export function validateOperationId(meta: HandlerMetaMap, operationId: string): void {
  if (!meta[operationId]) {
    const available = Object.keys(meta).join(', ');
    throw new Error(
      `Unknown operationId: "${operationId}". Available operations: ${available || 'none'}`
    );
  }
}

/**
 * Get all operation IDs from a metadata map.
 *
 * @param meta - Handler metadata map
 * @returns Array of operation IDs
 */
export function getOperationIds(meta: HandlerMetaMap): string[] {
  return Object.keys(meta);
}

/**
 * Check if handlers array is valid.
 *
 * @param handlers - Handlers to validate
 * @throws Error if handlers is not a valid array
 */
export function validateHandlers(handlers: HttpHandler[]): void {
  if (!Array.isArray(handlers)) {
    throw new Error('handlers must be an array');
  }
}

/**
 * Check if metadata map is valid.
 *
 * @param meta - Metadata to validate
 * @throws Error if meta is not a valid object
 */
export function validateMetaMap(meta: HandlerMetaMap): void {
  if (!meta || typeof meta !== 'object') {
    throw new Error('handlerMeta must be an object');
  }
}
