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
 * Load Pactwork configuration from the project
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
  } catch {
    return null
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
