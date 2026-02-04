import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { validateHandlers } from '../../core/validator/index.js'

interface CanIDeployOptions {
  version?: string
  environment?: string
  ci?: boolean
}

export async function canIDeployCommand(options: CanIDeployOptions): Promise<void> {
  const spinner = ora('Checking deployment readiness...').start()

  try {
    const config = await loadConfig()

    const specPath = config?.spec?.path
    const handlersDir = config?.generate?.output ?? './src/mocks'

    if (!specPath) {
      spinner.fail('No OpenAPI spec configured')
      if (!options.ci) {
        console.log(chalk.dim('Run pactwork init first'))
      }
      process.exit(1)
    }

    // Run validation
    spinner.text = 'Validating handlers against spec...'
    const result = await validateHandlers(specPath, handlersDir)

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
      process.exit(0)
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

        for (const item of result.drift.slice(0, 5)) {
          const icon = item.type === 'missing' ? '−' : item.type === 'extra' ? '+' : '~'
          console.log(`  ${icon} [${item.method.toUpperCase()}] ${item.endpoint}`)
        }

        if (result.drift.length > 5) {
          console.log(chalk.dim(`  ... and ${result.drift.length - 5} more`))
        }

        console.log('')
        console.log(chalk.bold('To fix:'))
        console.log(chalk.dim('  Run'), chalk.cyan('pactwork validate --fix'), chalk.dim('to regenerate handlers'))
        console.log(chalk.dim('  Or'), chalk.cyan('pactwork diff'), chalk.dim('to see detailed changes'))
      }
      process.exit(1)
    }

  } catch (error) {
    spinner.fail('Check failed')
    if (!options.ci) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    }
    process.exit(10)
  }
}
