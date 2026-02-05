import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import { loadConfig } from '../../core/config/index.js'
import { EXIT_CODES, OPENAPI_SPEC_CANDIDATES, DEFAULTS } from '../../constants.js'
import { handleCommandError } from '../utils.js'

interface InitOptions {
  spec?: string
  output?: string
  typescript?: boolean
  skipInstall?: boolean
  interactive?: boolean
  force?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  const spinner = ora('Initializing Pactwork...').start()

  try {
    // Check if already initialized
    const existingConfig = await loadConfig()
    if (existingConfig && !options.force) {
      spinner.fail('Pactwork is already initialized in this project')
      console.log(chalk.dim('Use --force to overwrite existing configuration'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Auto-detect OpenAPI spec if not provided
    let specPath = options.spec
    if (!specPath) {
      spinner.text = 'Looking for OpenAPI specification...'
      specPath = await findOpenAPISpec()
    }

    if (!specPath) {
      spinner.fail('No OpenAPI specification found')
      console.log(chalk.dim('Use --spec <path> to specify the location'))
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    // Verify spec exists
    if (!await fs.pathExists(specPath)) {
      spinner.fail(`OpenAPI spec not found: ${specPath}`)
      process.exit(EXIT_CODES.VALIDATION_FAILED)
    }

    spinner.text = 'Creating configuration...'

    // Detect TypeScript
    const useTypeScript = options.typescript ?? await detectTypeScript()

    // Create config file
    const configContent = generateConfigFile({
      specPath,
      outputDir: options.output ?? DEFAULTS.OUTPUT_DIR,
      typescript: useTypeScript,
    })

    const configFileName = useTypeScript ? 'pactwork.config.ts' : 'pactwork.config.js'
    await fs.writeFile(configFileName, configContent)

    // Create .pactwork directory
    await fs.ensureDir('.pactwork')
    await fs.ensureDir('.pactwork/contracts')
    await fs.ensureDir('.pactwork/reports')

    // Update .gitignore
    await updateGitignore()

    spinner.succeed('Pactwork initialized successfully!')

    console.log('')
    console.log(chalk.bold('Next steps:'))
    console.log(chalk.dim('  1.'), 'Run', chalk.cyan('pactwork generate'), 'to create MSW handlers')
    console.log(chalk.dim('  2.'), 'Run', chalk.cyan('pactwork validate'), 'to check for drift')
    console.log('')
    console.log(chalk.dim(`Configuration saved to ${configFileName}`))

  } catch (error) {
    handleCommandError(spinner, 'Failed to initialize Pactwork', error, EXIT_CODES.EXCEPTION)
  }
}

/**
 * Search for OpenAPI specification in common locations.
 * @returns Path to spec file if found, undefined otherwise
 */
async function findOpenAPISpec(): Promise<string | undefined> {
  for (const candidate of OPENAPI_SPEC_CANDIDATES) {
    if (await fs.pathExists(candidate)) {
      return candidate
    }
  }
  return undefined
}

async function detectTypeScript(): Promise<boolean> {
  // Check for tsconfig.json
  if (await fs.pathExists('tsconfig.json')) {
    return true
  }

  // Check package.json for typescript dependency
  if (await fs.pathExists('package.json')) {
    const pkg = await fs.readJSON('package.json')
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.typescript) {
      return true
    }
  }

  return false
}

interface ConfigOptions {
  specPath: string
  outputDir: string
  typescript: boolean
}

function generateConfigFile(options: ConfigOptions): string {
  const { specPath, outputDir, typescript } = options

  if (typescript) {
    return `import { defineConfig } from 'pactwork'

export default defineConfig({
  spec: {
    path: '${specPath}',
  },
  generate: {
    output: '${outputDir}',
    typescript: true,
  },
  contracts: {
    dir: '.pactwork/contracts',
    consumer: 'frontend',
    provider: 'api',
  },
})
`
  }

  return `/** @type {import('pactwork').PactworkConfig} */
export default {
  spec: {
    path: '${specPath}',
  },
  generate: {
    output: '${outputDir}',
    typescript: false,
  },
  contracts: {
    dir: '.pactwork/contracts',
    consumer: 'frontend',
    provider: 'api',
  },
}
`
}

async function updateGitignore(): Promise<void> {
  const gitignorePath = '.gitignore'
  const pactworkEntry = '\n# Pactwork local data\n.pactwork/\n'

  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf-8')
    if (!content.includes('.pactwork')) {
      await fs.appendFile(gitignorePath, pactworkEntry)
    }
  } else {
    await fs.writeFile(gitignorePath, pactworkEntry.trim() + '\n')
  }
}
