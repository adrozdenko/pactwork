/**
 * Pactwork Storybook Addon Preset
 *
 * ESM preset for Storybook 8.x/10.x using import.meta.resolve()
 * for path resolution.
 *
 * @see https://storybook.js.org/docs/addons/addon-migration-guide
 */

/**
 * Provides the manager entry points for the addon panel.
 * This runs in the Storybook manager (sidebar/panel) context.
 */
export function managerEntries(entries: string[] = []): string[] {
  return [...entries, import.meta.resolve('./manager.js')];
}

/**
 * Provides the preview entry points for the decorator.
 * This runs in the preview iframe where stories render.
 */
export function previewAnnotations(entries: string[] = []): string[] {
  return [...entries, import.meta.resolve('./preview.js')];
}

/**
 * Addon metadata for Storybook's addon catalog.
 */
export const addons: string[] = [];
