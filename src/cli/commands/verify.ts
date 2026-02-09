import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { ContractStore } from '../../core/contracts/index.js'
import { verifyContract, formatVerificationResult, type VerificationResult } from '../../core/contracts/verifier.js'
import { EXIT_CODES, DEFAULTS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface VerifyOptions {
  spec?: string
  contract?: string
  format?: 'console' | 'json'
  ci?: boolean
  skipValidation?: boolean
}

export async function verifyCommand(options: VerifyOptions): Promise<void> {
  const spinner = ora('Verifying contract...').start()

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

    // Parse spec
    spinner.text = 'Parsing OpenAPI spec...'
    const spec = options.skipValidation
      ? await parseSpecFast(specPath)
      : await parseSpec(specPath)

    // Load contracts
    spinner.text = 'Loading contracts...'
    const store = new ContractStore(options.contract || DEFAULTS.CONTRACTS_DIR)
    const contractSummaries = await store.list()

    if (contractSummaries.length === 0) {
      spinner.fail('No contracts found')
      console.log(chalk.dim('Run `pactwork record` first to create a contract'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Verify each contract
    let allPassed = true
    const results: VerificationResult[] = []

    for (const summary of contractSummaries) {
      spinner.text = `Verifying ${summary.consumer} → ${summary.provider}...`
      const contract = await store.load(summary.consumer, summary.provider)
      if (!contract) {
        console.warn(chalk.yellow(`  ⚠ Could not load contract: ${summary.consumer} → ${summary.provider}`))
        allPassed = false
        results.push({
          status: 'failed' as const,
          contract: { consumer: summary.consumer, provider: summary.provider },
          results: [{
            description: 'Contract load',
            status: 'failed' as const,
            errors: ['Could not load contract file - it may be corrupted or have permission issues'],
          }],
          summary: { total: 1, passed: 0, failed: 1, pending: 0 },
        })
        continue
      }
      const result = verifyContract(contract, spec)
      results.push(result)

      if (result.status === 'failed') {
        allPassed = false
      }
    }

    // Output results
    if (allPassed) {
      spinner.succeed(`All ${results.length} contract(s) verified successfully`)
    } else {
      const failed = results.filter(r => r.status === 'failed').length
      spinner.fail(`${failed} of ${results.length} contract(s) failed verification`)
    }

    console.log('')

    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2))
    } else if (!options.ci) {
      for (const result of results) {
        console.log(formatVerificationResult(result))
        console.log('')
      }
    }

    if (!allPassed) {
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }
  } catch (error) {
    handleCommandError(spinner, 'Failed to verify contract', error, EXIT_CODES.EXCEPTION)
  }
}
