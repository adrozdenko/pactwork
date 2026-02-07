import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../../core/config/index.js'
import { parseSpec, parseSpecFast } from '../../core/parser/index.js'
import { generateTypes } from '../../core/typegen/index.js'
import { EXIT_CODES, DEFAULTS, CLI_LIMITS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface TypesOptions {
  spec?: string
  output?: string
  skipValidation?: boolean
  includeRequests?: boolean
  includeResponses?: boolean
  includeParams?: boolean
}

export async function typesCommand(options: TypesOptions): Promise<void> {
  const spinner = ora('Generating TypeScript types...').start()

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

    // Generate types
    spinner.text = 'Generating types...'
    const result = generateTypes(spec, {
      includeRequestTypes: options.includeRequests !== false,
      includeResponseTypes: options.includeResponses !== false,
      includePathParams: options.includeParams !== false,
      includeQueryParams: options.includeParams !== false,
    })

    // Determine output path
    const outputDir = options.output || config?.generate?.output || DEFAULTS.OUTPUT_DIR
    const outputPath = path.join(outputDir, 'types.ts')

    // Ensure directory exists
    await fs.ensureDir(path.dirname(outputPath))

    // Write types
    await fs.writeFile(outputPath, result.code)

    spinner.succeed(`Generated ${result.types.length} types`)
    console.log('')
    console.log(chalk.dim(`Output: ${outputPath}`))
    console.log('')
    console.log(chalk.bold('Generated types:'))
    for (const typeName of result.types.slice(0, CLI_LIMITS.MAX_TYPE_ITEMS)) {
      console.log(chalk.dim(`  - ${typeName}`))
    }
    if (result.types.length > CLI_LIMITS.MAX_TYPE_ITEMS) {
      console.log(chalk.dim(`  ... and ${result.types.length - CLI_LIMITS.MAX_TYPE_ITEMS} more`))
    }
  } catch (error) {
    handleCommandError(spinner, 'Failed to generate types', error, EXIT_CODES.EXCEPTION)
  }
}
