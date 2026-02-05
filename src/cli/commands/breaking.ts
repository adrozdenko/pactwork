import ora from 'ora'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { detectBreakingChanges, formatBreakingChanges } from '../../core/breaking/index.js'
import { EXIT_CODES } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface BreakingOptions {
  old: string
  new: string
  skipValidation?: boolean
  format?: 'console' | 'json'
  ci?: boolean
}

export async function breakingCommand(options: BreakingOptions): Promise<void> {
  const spinner = ora('Detecting breaking changes...').start()

  try {
    if (!options.old || !options.new) {
      spinner.fail('Both --old and --new spec paths are required')
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Parse both specs
    spinner.text = 'Parsing old spec...'
    const oldSpec = options.skipValidation
      ? await parseSpecFast(options.old)
      : await parseSpec(options.old)

    spinner.text = 'Parsing new spec...'
    const newSpec = options.skipValidation
      ? await parseSpecFast(options.new)
      : await parseSpec(options.new)

    // Detect breaking changes
    spinner.text = 'Comparing specifications...'
    const result = detectBreakingChanges(oldSpec, newSpec)

    if (result.hasBreakingChanges) {
      spinner.fail(`Found ${result.summary.breaking} breaking change(s)`)
    } else if (result.changes.length > 0) {
      spinner.warn(`Found ${result.changes.length} change(s), none breaking`)
    } else {
      spinner.succeed('No breaking changes detected')
    }

    console.log('')

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2))
    } else if (!options.ci) {
      console.log(formatBreakingChanges(result))
    }

    // Exit with appropriate code
    if (result.hasBreakingChanges) {
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }
  } catch (error) {
    handleCommandError(spinner, 'Failed to detect breaking changes', error, EXIT_CODES.EXCEPTION)
  }
}
