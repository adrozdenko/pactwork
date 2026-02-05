/**
 * With Seed Utility
 *
 * Enable deterministic mock data generation using seeded random number generators.
 * Essential for snapshot testing and reproducible test scenarios.
 */

import { http, HttpHandler, HttpResponse } from 'msw';
import type { HandlerMetaMap, SeedOptions } from './types.js';
import {
  findHandlerMeta,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Simple seeded random number generator (Mulberry32).
 * Fast and produces good distribution for testing purposes.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  /**
   * Generate next random number between 0 and 1.
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array.
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place.
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate random boolean with given probability.
   */
  nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Reset to initial state.
   */
  reset(seed?: number | string): void {
    if (seed !== undefined) {
      this.state = typeof seed === 'string' ? this.hashString(seed) : seed;
    }
  }

  /**
   * Hash a string to a number.
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Global seeded random instance for shared state.
 */
let globalSeededRandom: SeededRandom | null = null;

/**
 * Initialize or get the global seeded random instance.
 */
export function getSeededRandom(seed?: number | string): SeededRandom {
  if (!globalSeededRandom || seed !== undefined) {
    globalSeededRandom = new SeededRandom(seed ?? Date.now());
  }
  return globalSeededRandom;
}

/**
 * Reset the global seeded random.
 */
export function resetSeededRandom(seed?: number | string): void {
  if (globalSeededRandom && seed !== undefined) {
    globalSeededRandom.reset(seed);
  } else if (seed !== undefined) {
    globalSeededRandom = new SeededRandom(seed);
  } else {
    globalSeededRandom = null;
  }
}

/**
 * Apply seeded randomness to a specific operation.
 * The handler's response data will use the seeded random for any random values.
 *
 * @example
 * ```typescript
 * // Same seed = same response every time
 * const deterministicHandlers = withSeed(handlers, handlerMeta, 'listUsers', {
 *   seed: 12345,
 * });
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply seeding to
 * @param options - Seed configuration
 * @param dataGenerator - Function that generates response data using seeded random
 * @returns New handlers array with seeded responses
 */
export function withSeed<TData = unknown>(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  options: SeedOptions,
  dataGenerator: (random: SeededRandom) => TData
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;

  // Create seeded random for this operation
  const random = new SeededRandom(options.seed);

  const methodLower = method.toLowerCase() as keyof typeof http;
  const seededHandler = http[methodLower](path, () => {
    // Reset seed per request if configured
    if (options.resetPerRequest) {
      random.reset(options.seed);
    }

    const data = dataGenerator(random);
    return HttpResponse.json(data as Record<string, unknown>, { status: 200 });
  });

  return replaceHandler(handlers, index, seededHandler);
}

/**
 * Apply global seed to all handlers.
 * All handlers will share the same seeded random instance.
 *
 * @example
 * ```typescript
 * const deterministicHandlers = withGlobalSeed(handlers, handlerMeta, 42);
 * ```
 */
export function withGlobalSeed(
  handlers: HttpHandler[],
  _meta: HandlerMetaMap,
  seed: number | string
): HttpHandler[] {
  // Initialize global seeded random
  getSeededRandom(seed);

  // Return handlers as-is - they'll use the global seeded random
  // through faker or similar libraries configured to use it
  return [...handlers];
}

/**
 * Create deterministic data generators using seeded random.
 */
export const DeterministicGenerators = {
  /**
   * Generate deterministic user data.
   */
  user: (random: SeededRandom) => ({
    id: random.nextInt(1, 10000),
    name: random.pick(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']),
    email: `user${random.nextInt(1, 999)}@example.com`,
    active: random.nextBoolean(0.8),
  }),

  /**
   * Generate deterministic list of items.
   */
  list: <T>(
    random: SeededRandom,
    generator: (random: SeededRandom) => T,
    count: number
  ): T[] => {
    return Array.from({ length: count }, () => generator(random));
  },

  /**
   * Generate deterministic UUID-like string.
   */
  uuid: (random: SeededRandom): string => {
    const hex = () =>
      random
        .nextInt(0, 255)
        .toString(16)
        .padStart(2, '0');
    return `${hex()}${hex()}${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`;
  },

  /**
   * Generate deterministic date string.
   */
  date: (random: SeededRandom, startYear: number = 2020, endYear: number = 2024): string => {
    const year = random.nextInt(startYear, endYear);
    const month = random.nextInt(1, 12).toString().padStart(2, '0');
    const day = random.nextInt(1, 28).toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};

/**
 * Create a seed transformer for use with pipe().
 */
export function createSeedTransformer<TData = unknown>(
  meta: HandlerMetaMap,
  operationId: string,
  options: SeedOptions,
  dataGenerator: (random: SeededRandom) => TData
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => withSeed(handlers, meta, operationId, options, dataGenerator);
}
