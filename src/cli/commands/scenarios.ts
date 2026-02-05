import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { generateScenarios, formatScenariosList, getScenarioCoverage } from '../../core/scenarios/index.js'
import { EXIT_CODES } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface ScenariosOptions {
  spec?: string
  coverage?: boolean
  format?: 'console' | 'json'
  skipValidation?: boolean
}

export async function scenariosCommand(options: ScenariosOptions): Promise<void> {
  const spinner = ora('Loading scenarios...').start()

  try {
    // Load config
    const config = await loadConfig()

    const specPath = options.spec || config?.spec?.path
    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or configure in pactwork.config.ts'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Parse spec
    spinner.text = 'Parsing OpenAPI spec...'
    const spec = options.skipValidation
      ? await parseSpecFast(specPath)
      : await parseSpec(specPath)

    // Generate scenarios catalog
    spinner.text = 'Extracting scenarios...'
    const catalog = generateScenarios(spec)

    spinner.succeed(`Found ${catalog.summary.totalScenarios} scenarios in ${catalog.summary.totalOperations} operations`)

    console.log('')

    // Output based on options
    if (options.format === 'json') {
      console.log(JSON.stringify(catalog, null, 2))
      return
    }

    if (options.coverage) {
      const coverage = getScenarioCoverage(catalog)
      console.log(chalk.bold('Scenario Coverage'))
      console.log('')
      console.log(`  Total:        ${coverage.total}`)
      console.log(`  ${chalk.green('Success (2xx)')}:  ${coverage.success}`)
      console.log(`  ${chalk.yellow('Client (4xx)')}:  ${coverage.clientError}`)
      console.log(`  ${chalk.red('Server (5xx)')}:  ${coverage.serverError}`)
      if (coverage.other > 0) {
        console.log(`  Other:        ${coverage.other}`)
      }
      console.log('')

      // Show status breakdown
      console.log(chalk.bold('By Status Code'))
      console.log('')
      for (const [status, count] of Object.entries(catalog.summary.byStatus).sort()) {
        const bar = '█'.repeat(Math.min(count, 20))
        console.log(`  ${status}: ${bar} ${count}`)
      }
      return
    }

    // Default: list all scenarios (always show unless coverage was already displayed)
    if (!options.coverage) {
      console.log(formatScenariosList(catalog))
    }

  } catch (error) {
    handleCommandError(spinner, 'Failed to load scenarios', error, EXIT_CODES.EXCEPTION)
  }
}
