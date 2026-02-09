import chalk from 'chalk'
import fs from 'fs-extra'
import type { ValidationResult } from '../validator/types.js'
import type { ReporterOptions } from './types.js'
import { escapeGitHubAnnotation } from '../utils/index.js'

export type { ReportFormat, ReporterOptions } from './types.js'

/**
 * Report validation results in the specified format
 */
export function reportValidation(
  result: ValidationResult,
  options: ReporterOptions
): void {
  switch (options.format) {
    case 'console':
      reportToConsole(result, options.verbose)
      break
    case 'json':
      reportToJson(result, options.output)
      break
    case 'github':
      reportToGitHub(result)
      break
    case 'markdown':
      reportToMarkdown(result, options.output)
      break
    default:
      reportToConsole(result, options.verbose)
  }
}

function reportToConsole(result: ValidationResult, verbose?: boolean): void {
  if (result.valid && result.drift.length === 0) {
    console.log(chalk.green('✓'), 'All handlers match specification')
    return
  }

  const errors = result.drift.filter(d => d.severity === 'error')
  const warnings = result.drift.filter(d => d.severity === 'warning')

  if (errors.length > 0) {
    console.log(chalk.red(`✗ Found ${errors.length} error(s):\n`))

    for (const item of errors) {
      const icon = item.type === 'missing' ? '−' : item.type === 'extra' ? '+' : '~'
      console.log(chalk.red(`  ${icon}`), `[${item.method.toUpperCase()}]`, item.endpoint)
      if (verbose) {
        console.log(chalk.dim(`      ${item.details}`))
      }
    }
    console.log('')
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`⚠ Found ${warnings.length} warning(s):\n`))

    for (const item of warnings) {
      const icon = item.type === 'missing' ? '−' : item.type === 'extra' ? '+' : '~'
      console.log(chalk.yellow(`  ${icon}`), `[${item.method.toUpperCase()}]`, item.endpoint)
      if (verbose) {
        console.log(chalk.dim(`      ${item.details}`))
      }
    }
    console.log('')
  }

  if (result.suggestions.length > 0 && verbose) {
    console.log(chalk.bold('Suggestions:'))
    for (const suggestion of result.suggestions) {
      console.log(chalk.dim('  →'), suggestion.message)
    }
    console.log('')
  }
}

function reportToJson(result: ValidationResult, output?: string): void {
  const report = {
    valid: result.valid,
    timestamp: new Date().toISOString(),
    results: {
      passed: result.drift.filter(d => d.severity !== 'error').length,
      failed: result.drift.filter(d => d.severity === 'error').length,
      warnings: result.drift.filter(d => d.severity === 'warning').length,
    },
    drift: result.drift,
    suggestions: result.suggestions,
  }

  const json = JSON.stringify(report, null, 2)

  if (output) {
    fs.writeFileSync(output, json)
    console.log(`Report written to ${output}`)
  } else {
    console.log(json)
  }
}

// escapeGitHubAnnotation imported from ../utils/index.js

function reportToGitHub(result: ValidationResult): void {
  // GitHub Actions annotation format
  for (const item of result.drift) {
    const level = item.severity === 'error' ? 'error' : 'warning'
    console.log(`::${level}::${escapeGitHubAnnotation(item.details)}`)
  }

  // Summary
  if (result.valid) {
    console.log('::notice::All handlers match specification')
  } else {
    const errorCount = result.drift.filter(d => d.severity === 'error').length
    console.log(`::error::${escapeGitHubAnnotation(`Validation failed with ${errorCount} error(s)`)}`)
  }
}

function reportToMarkdown(result: ValidationResult, output?: string): void {
  const lines: string[] = []

  lines.push('# Pactwork Validation Report')
  lines.push('')
  lines.push(`**Status:** ${result.valid ? '✅ Passed' : '❌ Failed'}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push('')

  if (result.drift.length === 0) {
    lines.push('All handlers match the OpenAPI specification.')
  } else {
    lines.push('## Issues Found')
    lines.push('')
    lines.push('| Type | Method | Endpoint | Severity |')
    lines.push('|------|--------|----------|----------|')

    for (const item of result.drift) {
      const typeIcon = item.type === 'missing' ? '➖' : item.type === 'extra' ? '➕' : '🔄'
      lines.push(`| ${typeIcon} ${item.type} | ${item.method.toUpperCase()} | \`${item.endpoint}\` | ${item.severity} |`)
    }

    lines.push('')
  }

  if (result.suggestions.length > 0) {
    lines.push('## Suggestions')
    lines.push('')
    for (const suggestion of result.suggestions) {
      lines.push(`- ${suggestion.message}`)
      if (suggestion.command) {
        lines.push(`  \`\`\`bash`)
        lines.push(`  ${suggestion.command}`)
        lines.push(`  \`\`\``)
      }
    }
    lines.push('')
  }

  const markdown = lines.join('\n')

  if (output) {
    fs.writeFileSync(output, markdown)
    console.log(`Report written to ${output}`)
  } else {
    console.log(markdown)
  }
}
