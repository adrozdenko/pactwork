/**
 * Coverage CLI Command for Pactwork Phase 5
 * Analyzes scenario coverage in Storybook stories
 */

import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { generateScenarios } from '../../core/scenarios/index.js'
import {
  scanStoriesDirectory,
  calculateCoverage,
  formatCoverageReport,
  formatCoverageCI,
  meetsCoverageThreshold,
} from '../../core/coverage/index.js'
import { EXIT_CODES } from '../../constants.js'
import { handleCommandError, handleCommandErrorCI } from '../utils.js'
import type { CoverageCLIOptions } from '../../core/coverage/types.js'

export async function coverageCommand(options: CoverageCLIOptions): Promise<void> {
  const spinner = ora('Analyzing scenario coverage...').start()

  try {
    // Load config
    const config = await loadConfig()

    // Resolve spec path
    const specPath = options.spec || config?.spec?.path
    if (!specPath) {
      if (options.ci) {
        handleCommandErrorCI('No OpenAPI spec specified', EXIT_CODES.EXCEPTION)
      }
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or configure in pactwork.config.ts'))
      process.exit(EXIT_CODES.EXCEPTION)
    }

    // Resolve stories directory
    const storiesDir = options.storiesDir || './src'

    // Parse OpenAPI spec
    spinner.text = 'Parsing OpenAPI spec...'
    const spec = options.skipValidation
      ? await parseSpecFast(specPath)
      : await parseSpec(specPath)

    // Generate scenario catalog
    spinner.text = 'Extracting scenarios from spec...'
    const catalog = generateScenarios(spec)

    // Scan story files
    spinner.text = `Scanning stories in ${storiesDir}...`
    const scanResult = scanStoriesDirectory(storiesDir, {
      include: options.include,
      exclude: options.exclude,
    })

    // Calculate coverage
    spinner.text = 'Calculating coverage...'
    const report = calculateCoverage(catalog, scanResult)

    // Check threshold if specified
    const threshold = options.minCoverage
    const meetsThreshold = threshold ? meetsCoverageThreshold(report, threshold) : true

    // Spinner feedback
    if (meetsThreshold) {
      spinner.succeed(
        `Coverage: ${report.summary.percentage}% (${report.summary.coveredScenarios}/${report.summary.totalScenarios} scenarios)`
      )
    } else {
      spinner.fail(
        `Coverage ${report.summary.percentage}% is below minimum threshold of ${threshold}%`
      )
    }

    // Output based on format and mode
    if (options.ci) {
      formatCoverageCI(report)
    } else {
      const format = options.format || 'console'
      formatCoverageReport(report, format, options.output)
    }

    // Exit with appropriate code
    if (!meetsThreshold) {
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    process.exit(EXIT_CODES.SUCCESS)

  } catch (error) {
    if (options.ci) {
      handleCommandErrorCI(
        `Coverage analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        EXIT_CODES.EXCEPTION
      )
    }
    handleCommandError(spinner, 'Failed to analyze coverage', error, EXIT_CODES.EXCEPTION)
  }
}
