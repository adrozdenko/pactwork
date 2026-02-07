/**
 * Hash utilities for spec fingerprinting
 * Used by generator and contracts modules
 */

import { createHash } from 'node:crypto'

/** Default length for spec hash (12 hex characters = 48 bits) */
export const SPEC_HASH_LENGTH = 12

/**
 * Create a short hash fingerprint from content.
 * Used to track spec versions in contracts and generated code.
 *
 * @param content - Content to hash
 * @param length - Hash length (default: SPEC_HASH_LENGTH)
 * @returns Truncated hex hash string
 */
export function createSpecHash(content: string, length: number = SPEC_HASH_LENGTH): string {
  return createHash('sha256').update(content).digest('hex').slice(0, length)
}
