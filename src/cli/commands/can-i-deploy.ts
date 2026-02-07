import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { validateHandlers } from '../../core/validator/index.js'
import { EXIT_CODES, DEFAULTS, CLI_LIMITS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface CanIDeployOptions {
  version?: string
  environment?: string
  ci?: boolean
  skipValidation?: boolean
}

export async function canIDeployCommand(options: CanIDeployOptions): Promise<void> {
  const spinner = ora('Checking deployment readiness...').start()

  try {
    const config = await loadConfig()

    const specPath = config?.spec?.path
    const handlersDir = config?.generate?.output ?? DEFAULTS.OUTPUT_DIR

    if (!specPath) {
      spinner.fail('No OpenAPI spec configured')
      if (!options.ci) {
        console.log(chalk.dim('Run pactwork init first'))
      }
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Run validation
    spinner.text = 'Validating handlers against spec...'
    const result = await validateHandlers(specPath, handlersDir, {
      skipValidation: options.skipValidation,
    })

    spinner.stop()

    if (result.valid) {
      if (options.ci) {
        // CI mode: minimal output
        console.log('PASS')
      } else {
        console.log('')
        console.log(chalk.green.bold('✓ Safe to deploy'))
        console.log('')
        console.log(chalk.dim('All handlers match the OpenAPI specification.'))
        console.log(chalk.dim('No drift detected.'))
      }
      process.exit(EXIT_CODES.SUCCESS)
    } else {
      if (options.ci) {
        // CI mode: minimal output
        console.log('FAIL')
        console.log(`Drift: ${result.drift.length} issues`)
      } else {
        console.log('')
        console.log(chalk.red.bold('✗ Not safe to deploy'))
        console.log('')
        console.log(chalk.dim(`Found ${result.drift.length} drift issue(s):`))
        console.log('')

        for (const item of result.drift.slice(0, CLI_LIMITS.MAX_SUMMARY_ITEMS)) {
          const icon = item.type === 'missing' ? '−' : item.type === 'extra' ? '+' : '~'
          console.log(`  ${icon} [${item.method.toUpperCase()}] ${item.endpoint}`)
        }

        if (result.drift.length > CLI_LIMITS.MAX_SUMMARY_ITEMS) {
          console.log(chalk.dim(`  ... and ${result.drift.length - CLI_LIMITS.MAX_SUMMARY_ITEMS} more`))
        }

        console.log('')
        console.log(chalk.bold('To fix:'))
        console.log(chalk.dim('  Run'), chalk.cyan('pactwork validate --fix'), chalk.dim('to regenerate handlers'))
        console.log(chalk.dim('  Or'), chalk.cyan('pactwork diff'), chalk.dim('to see detailed changes'))
      }
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

  } catch (error) {
    handleCommandError(spinner, 'Check failed', error, EXIT_CODES.EXCEPTION)
  }
}
