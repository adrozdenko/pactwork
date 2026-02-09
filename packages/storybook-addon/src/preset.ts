/**
 * Pactwork Storybook Addon Preset
 *
 * ESM preset for Storybook 8.x/10.x.
 * Uses dirname + path.join to produce filesystem paths (not file:// URLs)
 * which are required by Storybook's esbuild bundler.
 *
 * Note: We intentionally do NOT export previewAnnotations here.
 * Users must manually call initPactwork() in their preview.ts to pass
 * the MSW worker instance. Auto-loading preview.js would cause duplicate
 * module loading since users import from '@pactwork/storybook-addon'.
 *
 * @see https://storybook.js.org/docs/addons/addon-migration-guide
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Provides the manager entry points for the addon panel.
 * This runs in the Storybook manager (sidebar/panel) context.
 */
export function managerEntries(entries: string[] = []): string[] {
  return [...entries, join(__dirname, 'manager.js')];
}

/**
 * Addon metadata for Storybook's addon catalog.
 */
export const addons: string[] = [];
