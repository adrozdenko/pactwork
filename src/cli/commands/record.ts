import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { generateContractFromSpec } from '../../core/contracts/recorder.js'
import { ContractStore } from '../../core/contracts/index.js'
import { EXIT_CODES, DEFAULTS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface RecordOptions {
  spec?: string
  consumer?: string
  provider?: string
  output?: string
  skipValidation?: boolean
}

export async function recordCommand(options: RecordOptions): Promise<void> {
  const spinner = ora('Recording contract...').start()

  try {
    // Load config
    spinner.text = 'Loading configuration...'
    const config = await loadConfig()

    const specPath = options.spec || config?.spec?.path
    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or configure in pactwork.config.ts'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    const consumer = options.consumer || config?.contracts?.consumer || DEFAULTS.CONSUMER
    const provider = options.provider || config?.contracts?.provider || DEFAULTS.PROVIDER

    // Parse spec
    spinner.text = 'Parsing OpenAPI spec...'
    const spec = options.skipValidation
      ? await parseSpecFast(specPath)
      : await parseSpec(specPath)

    // Generate contract from spec
    spinner.text = 'Generating contract...'
    const contract = await generateContractFromSpec(spec, specPath, {
      consumer,
      provider,
    })

    // Save contract
    const store = new ContractStore(options.output || DEFAULTS.CONTRACTS_DIR)
    const filepath = await store.save(contract)

    spinner.succeed(`Recorded ${contract.interactions.length} interactions`)
    console.log('')
    console.log(chalk.dim(`Contract: ${filepath}`))
    console.log(chalk.dim(`Consumer: ${consumer}`))
    console.log(chalk.dim(`Provider: ${provider}`))
    console.log('')
    console.log(chalk.bold('Interactions:'))
    for (const interaction of contract.interactions.slice(0, 5)) {
      console.log(chalk.dim(`  - ${interaction.description}`))
    }
    if (contract.interactions.length > 5) {
      console.log(chalk.dim(`  ... and ${contract.interactions.length - 5} more`))
    }
  } catch (error) {
    handleCommandError(spinner, 'Failed to record contract', error, EXIT_CODES.EXCEPTION)
  }
}
