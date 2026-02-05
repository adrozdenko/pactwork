/**
 * With Sequence Utility
 *
 * Return different responses in sequence for the same operation.
 * Perfect for simulating flaky APIs, retry scenarios, and state transitions.
 */

import { http, HttpHandler, HttpResponse } from 'msw';
import type { HandlerMetaMap, Scenario, SequenceState, SequenceStep } from './types.js';
import {
  findHandlerMeta,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Internal state tracking for sequences.
 * Uses WeakMap-like pattern to avoid memory leaks.
 */
const sequenceStates = new Map<string, SequenceState>();

/**
 * Apply a sequence of responses to an operation.
 * Each call returns the next response in the sequence.
 *
 * @example
 * ```typescript
 * // Simulate flaky API: fail twice, then succeed
 * const flakyHandlers = withSequence(handlers, handlerMeta, 'getUser', [500, 500, 200]);
 *
 * // With full scenario objects
 * const retryHandlers = withSequence(handlers, handlerMeta, 'getUser', [
 *   { name: 'timeout', status: 504, data: { error: 'Gateway Timeout' } },
 *   { name: 'success', status: 200, data: { id: 1, name: 'John' } },
 * ]);
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply sequence to
 * @param steps - Array of status codes or scenarios
 * @param options - Optional configuration
 * @returns New handlers array with sequence applied
 */
export function withSequence<TData = unknown>(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  steps: SequenceStep<TData>[],
  options: {
    /** Loop back to start when sequence is exhausted */
    loop?: boolean;
    /** Unique key for state tracking (defaults to operationId) */
    stateKey?: string;
  } = {}
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('steps must be a non-empty array');
  }

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;

  const { loop = false, stateKey = operationId } = options;

  // Initialize or get sequence state
  if (!sequenceStates.has(stateKey)) {
    sequenceStates.set(stateKey, { currentIndex: 0, totalCalls: 0 });
  }

  const methodLower = method.toLowerCase() as keyof typeof http;
  const sequenceHandler = http[methodLower](path, async () => {
    const state = sequenceStates.get(stateKey)!;

    // Get current step
    let stepIndex = state.currentIndex;
    if (stepIndex >= steps.length) {
      stepIndex = loop ? stepIndex % steps.length : steps.length - 1;
    }

    const step = steps[stepIndex];

    // Advance state
    state.currentIndex++;
    state.totalCalls++;
    sequenceStates.set(stateKey, state);

    // Return response based on step type
    return createResponseFromStep(step);
  });

  return replaceHandler(handlers, index, sequenceHandler);
}

/**
 * Create an HTTP response from a sequence step.
 */
function createResponseFromStep<TData>(step: SequenceStep<TData>): Response {
  if (typeof step === 'number') {
    // Just a status code - return appropriate response
    const status = step;
    if (status >= 200 && status < 300) {
      return HttpResponse.json({ success: true }, { status });
    } else if (status >= 400) {
      return HttpResponse.json(
        { error: getDefaultErrorMessage(status) },
        { status }
      );
    }
    return new Response(null, { status });
  }

  // Full scenario object
  const scenario = step as Scenario<TData>;
  return HttpResponse.json(scenario.data as Record<string, unknown>, {
    status: scenario.status,
    headers: scenario.headers,
  });
}

/**
 * Get default error message for common status codes.
 */
function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return messages[status] || 'Error';
}

/**
 * Reset sequence state for a specific operation or all operations.
 *
 * @example
 * ```typescript
 * // Reset specific operation
 * resetSequence('getUser');
 *
 * // Reset all sequences
 * resetSequence();
 * ```
 */
export function resetSequence(stateKey?: string): void {
  if (stateKey) {
    sequenceStates.delete(stateKey);
  } else {
    sequenceStates.clear();
  }
}

/**
 * Get current sequence state for debugging.
 */
export function getSequenceState(stateKey: string): SequenceState | undefined {
  return sequenceStates.get(stateKey);
}

/**
 * Apply a "fail then succeed" pattern - common for retry testing.
 *
 * @example
 * ```typescript
 * // Fail 2 times with 500, then succeed
 * const retryHandlers = withFailThenSucceed(handlers, handlerMeta, 'getUser', 2, 500);
 * ```
 */
export function withFailThenSucceed<TSuccess = unknown>(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  failCount: number,
  failStatus: number = 500,
  successData?: TSuccess
): HttpHandler[] {
  const steps: SequenceStep[] = [
    ...Array(failCount).fill(failStatus),
    successData
      ? { name: 'success', status: 200, data: successData }
      : 200,
  ];

  return withSequence(handlers, meta, operationId, steps);
}

/**
 * Apply a "succeed then fail" pattern - useful for testing degradation.
 *
 * @example
 * ```typescript
 * // Succeed 3 times, then start failing
 * const degradeHandlers = withSucceedThenFail(handlers, handlerMeta, 'getUser', 3, 503);
 * ```
 */
export function withSucceedThenFail(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  successCount: number,
  failStatus: number = 500
): HttpHandler[] {
  const steps: SequenceStep[] = [
    ...Array(successCount).fill(200),
    failStatus,
  ];

  return withSequence(handlers, meta, operationId, steps, { loop: false });
}

/**
 * Create a sequence transformer for use with pipe().
 */
export function createSequenceTransformer<TData = unknown>(
  meta: HandlerMetaMap,
  operationId: string,
  steps: SequenceStep<TData>[],
  options?: { loop?: boolean; stateKey?: string }
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => withSequence(handlers, meta, operationId, steps, options);
}
