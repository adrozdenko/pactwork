import chalk from 'chalk'
import chokidar from 'chokidar'
import { loadConfig } from '../../core/config/index.js'
import { generateHandlers } from '../../core/generator/index.js'
import { validateHandlers } from '../../core/validator/index.js'
import { reportValidation } from '../../core/reporter/index.js'

interface WatchOptions {
  validate?: boolean
  debounce?: string
  clear?: boolean
}

export async function watchCommand(options: WatchOptions): Promise<void> {
  try {
    const config = await loadConfig()

    const specPath = config?.spec?.path
    if (!specPath) {
      console.error(chalk.red('No OpenAPI spec configured'))
      console.log(chalk.dim('Run pactwork init first'))
      process.exit(1)
    }

    const outputDir = config?.generate?.output ?? './src/mocks'
    const debounceMs = parseInt(options.debounce ?? '300', 10)

    console.log(chalk.bold('Watching for changes...'))
    console.log(chalk.dim(`  Spec: ${specPath}`))
    console.log(chalk.dim(`  Output: ${outputDir}`))
    console.log('')

    let timeout: NodeJS.Timeout | null = null

    const regenerate = async () => {
      if (options.clear !== false) {
        console.clear()
      }

      console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`), 'Spec changed, regenerating...')

      try {
        const result = await generateHandlers({
          specPath,
          outputDir,
          typescript: config?.generate?.typescript ?? true,
        })

        console.log(chalk.green('✓'), `Generated ${result.handlers.length} handlers`)

        if (options.validate) {
          console.log('')
          console.log(chalk.dim('Validating...'))

          const validation = await validateHandlers(specPath, outputDir)
          reportValidation(validation, { format: 'console', verbose: false })
        }

      } catch (error) {
        console.error(chalk.red('✗'), 'Generation failed:', error instanceof Error ? error.message : String(error))
      }

      console.log('')
      console.log(chalk.dim('Watching for changes... (Ctrl+C to stop)'))
    }

    const watcher = chokidar.watch(specPath, {
      persistent: true,
      ignoreInitial: true,
    })

    watcher.on('change', () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(regenerate, debounceMs)
    })

    watcher.on('error', (error) => {
      console.error(chalk.red('Watch error:'), error)
    })

    // Initial generation
    await regenerate()

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('')
      console.log(chalk.dim('Stopping watch mode...'))
      watcher.close()
      process.exit(0)
    })

  } catch (error) {
    console.error(chalk.red('Watch failed:'), error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
