import { cosmiconfig } from 'cosmiconfig'
import type { PactworkConfig } from './types.js'

export type { PactworkConfig } from './types.js'

const explorer = cosmiconfig('pactwork', {
  searchPlaces: [
    'pactwork.config.ts',
    'pactwork.config.js',
    'pactwork.config.mjs',
    'pactwork.config.cjs',
    '.pactworkrc',
    '.pactworkrc.json',
    '.pactworkrc.yaml',
    '.pactworkrc.yml',
    'package.json',
  ],
})

let cachedConfig: PactworkConfig | null = null

/**
 * Configuration loading error with details about the source
 */
export class ConfigLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ConfigLoadError'
  }
}

/**
 * Load Pactwork configuration from the project
 * @throws {ConfigLoadError} When configuration file exists but cannot be parsed
 */
export async function loadConfig(): Promise<PactworkConfig | null> {
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    const result = await explorer.search()

    if (result?.config) {
      cachedConfig = result.config as PactworkConfig
      return cachedConfig
    }

    return null
  } catch (error) {
    // Re-throw with more context - helps users understand config syntax errors
    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigLoadError(`Failed to load pactwork configuration: ${message}`, error)
  }
}

/**
 * Clear the cached configuration
 */
export function clearConfigCache(): void {
  cachedConfig = null
}

/**
 * Helper for creating typed configuration
 */
export function defineConfig(config: PactworkConfig): PactworkConfig {
  return config
}
