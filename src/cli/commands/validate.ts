import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { validateHandlers } from '../../core/validator/index.js'
import { reportValidation } from '../../core/reporter/index.js'
import { generateHandlers } from '../../core/generator/index.js'
import { EXIT_CODES, DEFAULTS } from '../../constants.js'
import { handleCommandError } from '../utils.js'
import type { ReportFormat } from '../../core/reporter/types.js'

export interface ValidateOptions {
  spec?: string
  handlers?: string
  fix?: boolean
  ci?: boolean
  format?: string
  output?: string
  failOnWarning?: boolean
  skipValidation?: boolean
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const spinner = ora('Loading configuration...').start()

  try {
    // Load config
    const config = await loadConfig()

    // Merge CLI options with config
    const specPath = options.spec ?? config?.spec?.path
    const handlersDir = options.handlers ?? config?.generate?.output ?? DEFAULTS.OUTPUT_DIR
    const format = (options.format ?? 'console') as ReportFormat

    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or run pactwork init first'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    spinner.text = 'Validating handlers against spec...'

    const result = await validateHandlers(specPath, handlersDir, {
      skipValidation: options.skipValidation,
    })

    spinner.stop()

    // Report results
    reportValidation(result, {
      format,
      verbose: !options.ci,
      output: options.output,
    })

    // Handle --fix option
    if (!result.valid && options.fix) {
      console.log('')
      const fixSpinner = ora('Regenerating handlers to fix drift...').start()

      await generateHandlers({
        specPath,
        outputDir: handlersDir,
        typescript: config?.generate?.typescript ?? true,
        skipValidation: options.skipValidation,
      })

      fixSpinner.succeed('Handlers regenerated')
      console.log(chalk.dim('Run validate again to confirm fixes'))
    }

    // Exit with appropriate code
    if (!result.valid) {
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    if (options.failOnWarning && result.drift.some(d => d.severity === 'warning')) {
      process.exit(EXIT_CODES.WARNINGS_AS_ERRORS)
    }

  } catch (error) {
    handleCommandError(spinner, 'Validation failed', error, EXIT_CODES.EXCEPTION)
  }
}
