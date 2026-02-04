import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config/index.js'
import { generateHandlers } from '../../core/generator/index.js'

interface GenerateOptions {
  spec?: string
  output?: string
  typescript?: boolean
  baseUrl?: string
  includes?: string
  excludes?: string
  static?: boolean
  force?: boolean
  dryRun?: boolean
  skipValidation?: boolean
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const spinner = ora('Loading configuration...').start()

  try {
    // Load config
    const config = await loadConfig()

    // Merge CLI options with config
    const specPath = options.spec ?? config?.spec?.path
    const outputDir = options.output ?? config?.generate?.output ?? './src/mocks'
    const typescript = options.typescript ?? config?.generate?.typescript ?? true

    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or run pactwork init first'))
      process.exit(1)
    }

    spinner.text = `Parsing OpenAPI spec: ${specPath}`

    // Parse includes/excludes
    const includes = options.includes?.split(',').map(s => s.trim())
    const excludes = options.excludes?.split(',').map(s => s.trim())

    if (options.dryRun) {
      spinner.info('Dry run mode - no files will be written')
      console.log('')
      console.log(chalk.bold('Would generate handlers with:'))
      console.log(chalk.dim('  Spec:'), specPath)
      console.log(chalk.dim('  Output:'), outputDir)
      console.log(chalk.dim('  TypeScript:'), typescript)
      if (includes?.length) console.log(chalk.dim('  Includes:'), includes.join(', '))
      if (excludes?.length) console.log(chalk.dim('  Excludes:'), excludes.join(', '))
      return
    }

    spinner.text = 'Generating MSW handlers...'

    const result = await generateHandlers({
      specPath,
      outputDir,
      typescript,
      baseUrl: options.baseUrl,
      includes,
      excludes,
      static: options.static,
      skipValidation: options.skipValidation,
    })

    spinner.succeed(`Generated ${result.handlers.length} handlers`)

    console.log('')
    console.log(chalk.bold('Generated files:'))
    console.log(chalk.dim('  Output:'), result.outputDir)
    console.log(chalk.dim('  Handlers:'), result.handlers.length)

    console.log('')
    console.log(chalk.bold('Next steps:'))
    console.log(chalk.dim('  1.'), 'Import handlers in your test setup or browser entry')
    console.log(chalk.dim('  2.'), 'Run', chalk.cyan('pactwork validate'), 'to verify handlers match spec')

  } catch (error) {
    spinner.fail('Failed to generate handlers')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}
