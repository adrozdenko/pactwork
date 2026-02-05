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

program.parse()
