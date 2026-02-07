#!/usr/bin/env node

import { Command } from 'commander'
import { createRequire } from 'node:module'
import { initCommand } from './commands/init.js'
import { generateCommand } from './commands/generate.js'
import { validateCommand } from './commands/validate.js'
import { watchCommand } from './commands/watch.js'
import { diffCommand } from './commands/diff.js'
import { canIDeployCommand } from './commands/can-i-deploy.js'
import { typesCommand } from './commands/types.js'
import { breakingCommand } from './commands/breaking.js'
import { recordCommand } from './commands/record.js'
import { verifyCommand } from './commands/verify.js'
import { scenariosCommand } from './commands/scenarios.js'
import { coverageCommand } from './commands/coverage.js'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json') as { version: string }

const program = new Command()

program
  .name('pactwork')
  .description('Contract-first API simulation framework - Mocks you can trust')
  .version(pkg.version)

program
  .command('init')
  .description('Initialize Pactwork in current project')
  .option('--spec <path>', 'Path to OpenAPI specification')
  .option('--output <dir>', 'Output directory for handlers', './src/mocks')
  .option('--typescript', 'Generate TypeScript files')
  .option('--skip-install', 'Skip installing dependencies')
  .option('--interactive', 'Run interactive setup wizard')
  .option('--force', 'Overwrite existing configuration')
  .action(initCommand)

program
  .command('generate')
  .description('Generate MSW handlers from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--output <dir>', 'Output directory')
  .option('--typescript', 'Generate TypeScript')
  .option('--base-url <url>', 'Override base URL')
  .option('--includes <paths>', 'Comma-separated paths to include')
  .option('--excludes <paths>', 'Comma-separated paths to exclude')
  .option('--static', 'Generate static (non-random) data')
  .option('--force', 'Overwrite without confirmation')
  .option('--dry-run', 'Show what would be generated')
  .option('--skip-validation', 'Skip OpenAPI spec validation (for specs with minor issues)')
  .option('--with-scenarios', 'Generate scenario catalog for error/edge case testing')
  .action(generateCommand)

program
  .command('validate')
  .description('Validate handlers match the OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--handlers <dir>', 'Handlers directory')
  .option('--fix', 'Auto-fix by regenerating')
  .option('--ci', 'CI mode (strict exit codes)')
  .option('--format <type>', 'Output format (console, json, markdown, github)', 'console')
  .option('--output <path>', 'Output file for reports')
  .option('--fail-on-warning', 'Treat warnings as errors')
  .option('--skip-validation', 'Skip OpenAPI spec validation (for specs with minor issues)')
  .action(validateCommand)

program
  .command('watch')
  .description('Watch for spec changes and regenerate handlers')
  .option('--validate', 'Validate after regeneration')
  .option('--debounce <ms>', 'Debounce delay in milliseconds', '300')
  .option('--no-clear', 'Do not clear terminal on regeneration')
  .action(watchCommand)

program
  .command('diff')
  .description('Show differences between spec and handlers')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--from <version>', 'Compare from version')
  .option('--to <version>', 'Compare to version')
  .option('--format <type>', 'Output format', 'console')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(diffCommand)

program
  .command('can-i-deploy')
  .description('Check if it is safe to deploy')
  .option('--version <ver>', 'Version to check')
  .option('--environment <env>', 'Target environment')
  .option('--ci', 'CI mode (exit codes only)')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(canIDeployCommand)

program
  .command('types')
  .description('Generate TypeScript types from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--output <dir>', 'Output directory')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .option('--no-requests', 'Skip request body types')
  .option('--no-responses', 'Skip response types')
  .option('--no-params', 'Skip parameter types')
  .action(typesCommand)

program
  .command('breaking')
  .description('Detect breaking changes between two API versions')
  .requiredOption('--old <path>', 'Path to old OpenAPI spec')
  .requiredOption('--new <path>', 'Path to new OpenAPI spec')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .option('--format <type>', 'Output format (console, json)', 'console')
  .option('--ci', 'CI mode (exit codes only)')
  .action(breakingCommand)

program
  .command('record')
  .description('Record a contract from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--consumer <name>', 'Consumer name')
  .option('--provider <name>', 'Provider name')
  .option('--output <dir>', 'Output directory for contracts', '.pactwork')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(recordCommand)

program
  .command('verify')
  .description('Verify contracts against OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--contract <dir>', 'Contract directory', '.pactwork')
  .option('--format <type>', 'Output format (console, json)', 'console')
  .option('--ci', 'CI mode (exit codes only)')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(verifyCommand)

program
  .command('scenarios')
  .description('List and analyze scenarios from OpenAPI spec')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--list', 'List all scenarios (default)')
  .option('--coverage', 'Show scenario coverage statistics')
  .option('--format <type>', 'Output format (console, json)', 'console')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(scenariosCommand)

program
  .command('coverage')
  .description('Analyze Storybook story coverage of OpenAPI scenarios')
  .option('--spec <path>', 'Path to OpenAPI spec')
  .option('--stories <dir>', 'Directory to scan for stories', './src')
  .option('--format <type>', 'Output format (console, json, markdown, github)', 'console')
  .option('--output <path>', 'Write report to file')
  .option('--min-coverage <n>', 'Minimum coverage percentage (CI gate)', parseFloat)
  .option('--ci', 'CI mode (minimal output)')
  .option('--skip-validation', 'Skip OpenAPI spec validation')
  .action(coverageCommand)

program.parse()
