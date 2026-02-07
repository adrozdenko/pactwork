/**
 * GitHub Actions annotation escaping utility
 * Used by reporter and coverage modules for GitHub Actions output format
 */

/**
 * Escape special characters for GitHub Actions annotation format.
 * Must escape % first to avoid double-encoding.
 *
 * @param str - String to escape
 * @returns Escaped string safe for GitHub Actions annotations
 */
export function escapeGitHubAnnotation(str: string): string {
  return str
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}
