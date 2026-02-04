import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { validateHandlers } from '../../core/validator/index.js'

interface DiffOptions {
  spec?: string
  from?: string
  to?: string
  format?: string
  skipValidation?: boolean
}

export async function diffCommand(options: DiffOptions): Promise<void> {
  const spinner = ora('Loading configuration...').start()

  try {
    const config = await loadConfig()

    const specPath = options.spec ?? config?.spec?.path
    const handlersDir = config?.generate?.output ?? './src/mocks'

    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or run pactwork init first'))
      process.exit(1)
    }

    spinner.text = 'Comparing spec with handlers...'

    const result = await validateHandlers(specPath, handlersDir, {
      skipValidation: options.skipValidation,
    })

    spinner.stop()

    if (result.valid && result.drift.length === 0) {
      console.log(chalk.green('✓'), 'Handlers match specification - no differences')
      return
    }

    console.log(chalk.bold('Differences found:\n'))

    // Group by type
    const missing = result.drift.filter(d => d.type === 'missing')
    const extra = result.drift.filter(d => d.type === 'extra')
    const mismatch = result.drift.filter(d => d.type === 'mismatch')

    if (missing.length > 0) {
      console.log(chalk.red('Missing handlers (in spec, not in handlers):'))
      for (const item of missing) {
        console.log(chalk.red('  −'), `[${item.method.toUpperCase()}]`, item.endpoint)
      }
      console.log('')
    }

    if (extra.length > 0) {
      console.log(chalk.yellow('Extra handlers (not in spec):'))
      for (const item of extra) {
        console.log(chalk.yellow('  +'), `[${item.method.toUpperCase()}]`, item.endpoint)
      }
      console.log('')
    }

    if (mismatch.length > 0) {
      console.log(chalk.blue('Schema mismatches:'))
      for (const item of mismatch) {
        console.log(chalk.blue('  ~'), `[${item.method.toUpperCase()}]`, item.endpoint)
        console.log(chalk.dim(`      ${item.details}`))
      }
      console.log('')
    }

    // Summary
    console.log(chalk.bold('Summary:'))
    console.log(chalk.dim('  Missing:'), missing.length)
    console.log(chalk.dim('  Extra:'), extra.length)
    console.log(chalk.dim('  Mismatched:'), mismatch.length)

    if (result.suggestions.length > 0) {
      console.log('')
      console.log(chalk.bold('Suggestions:'))
      for (const suggestion of result.suggestions) {
        console.log(chalk.dim('  →'), suggestion.message)
      }
    }

  } catch (error) {
    spinner.fail('Diff failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}
