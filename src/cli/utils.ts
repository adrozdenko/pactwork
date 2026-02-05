/**
 * CLI Utilities
 *
 * Shared utilities for CLI commands to reduce duplication.
 */

import chalk from 'chalk'
import type { Ora } from 'ora'
import { EXIT_CODES, type ExitCode } from '../constants.js'

/**
 * Handle command errors consistently across all CLI commands.
 * Stops the spinner, displays error message, and exits with appropriate code.
 *
 * @param spinner - The ora spinner instance to stop
 * @param message - User-friendly error message for the spinner
 * @param error - The caught error (Error instance or unknown)
 * @param exitCode - Exit code to use (defaults to EXCEPTION)
 */
export function handleCommandError(
  spinner: Ora,
  message: string,
  error: unknown,
  exitCode: ExitCode = EXIT_CODES.EXCEPTION
): never {
  spinner.fail(message)
  console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  process.exit(exitCode)
}

/**
 * Handle command errors in CI mode (minimal output).
 * Only outputs essential information for machine parsing.
 *
 * @param message - Short status message
 * @param exitCode - Exit code to use
 */
export function handleCommandErrorCI(
  message: string,
  exitCode: ExitCode = EXIT_CODES.EXCEPTION
): never {
  console.error(message)
  process.exit(exitCode)
}

/**
 * Format error for display, extracting message from Error instances.
 *
 * @param error - The error to format
 * @returns Formatted error string
 */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
