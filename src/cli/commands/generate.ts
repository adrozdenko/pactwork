import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../../core/config/index.js'
import { generateHandlers } from '../../core/generator/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { generateScenariosWithCode } from '../../core/scenarios/index.js'
import { EXIT_CODES, DEFAULTS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

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
  withScenarios?: boolean
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const spinner = ora('Loading configuration...').start()

  try {
    // Load config
    const config = await loadConfig()

    // Merge CLI options with config
    const specPath = options.spec ?? config?.spec?.path
    const outputDir = options.output ?? config?.generate?.output ?? DEFAULTS.OUTPUT_DIR
    const typescript = options.typescript ?? config?.generate?.typescript ?? true

    if (!specPath) {
      spinner.fail('No OpenAPI spec specified')
      console.log(chalk.dim('Use --spec <path> or run pactwork init first'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
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

    // Generate scenarios if requested
    let scenariosGenerated = false
    if (options.withScenarios) {
      spinner.start('Generating scenario catalog...')

      const spec = options.skipValidation
        ? await parseSpecFast(specPath)
        : await parseSpec(specPath)

      const scenarioResult = generateScenariosWithCode(spec)
      const ext = typescript ? 'ts' : 'js'
      const scenariosPath = path.join(outputDir, `scenarios.${ext}`)

      await fs.writeFile(scenariosPath, scenarioResult.code)
      scenariosGenerated = true

      spinner.succeed(`Generated ${scenarioResult.catalog.summary.totalScenarios} scenarios`)
    }

    console.log('')
    console.log(chalk.bold('Generated files:'))
    console.log(chalk.dim('  Output:'), result.outputDir)
    console.log(chalk.dim('  Handlers:'), result.handlers.length)
    if (scenariosGenerated) {
      console.log(chalk.dim('  Scenarios:'), 'scenarios.ts')
    }

    console.log('')
    console.log(chalk.bold('Next steps:'))
    console.log(chalk.dim('  1.'), 'Import handlers in your test setup or browser entry')
    if (scenariosGenerated) {
      console.log(chalk.dim('  2.'), 'Import scenarios for error state testing')
      console.log(chalk.dim('  3.'), 'Run', chalk.cyan('pactwork validate'), 'to verify handlers match spec')
    } else {
      console.log(chalk.dim('  2.'), 'Run', chalk.cyan('pactwork validate'), 'to verify handlers match spec')
      console.log(chalk.dim('  Tip:'), 'Use', chalk.cyan('--with-scenarios'), 'to generate error/edge case scenarios')
    }

  } catch (error) {
    handleCommandError(spinner, 'Failed to generate handlers', error, EXIT_CODES.EXCEPTION)
  }
}
