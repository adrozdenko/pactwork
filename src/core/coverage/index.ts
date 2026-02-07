/**
 * Coverage calculator and formatters for Pactwork Phase 5
 * Computes scenario coverage metrics and formats reports
 */

import chalk from 'chalk'
import fs from 'fs-extra'
import type { ScenarioCatalog } from '../scenarios/types.js'
import type { ReportFormat } from '../reporter/types.js'
import { escapeGitHubAnnotation } from '../utils/index.js'
import { COVERAGE_THRESHOLDS, SCHEMA } from '../../constants.js'
import type {
  CoverageReport,
  OperationCoverage,
  CoverageLevel,
  StoryScanResult,
} from './types.js'

export type {
  CoverageReport,
  OperationCoverage,
  CoverageLevel,
  CoverageOptions,
  CoverageCLIOptions,
  StoryScanResult,
  StoryScenarioRef,
  ScenarioCoverageItem,
} from './types.js'

export {
  scanStoriesDirectory,
  scanStoryFile,
  extractScenariosFromContent,
  findStoryFiles,
  isStoryFile,
} from './scanner.js'

/**
 * Get coverage level based on percentage
 */
export function getCoverageLevel(percentage: number): CoverageLevel {
  if (percentage >= COVERAGE_THRESHOLDS.GOOD) return 'good'
  if (percentage >= COVERAGE_THRESHOLDS.PARTIAL) return 'partial'
  return 'low'
}

/**
 * Calculate coverage report from scenario catalog and scan results
 */
export function calculateCoverage(
  catalog: ScenarioCatalog,
  scanResult: StoryScanResult
): CoverageReport {
  const operations: Record<string, OperationCoverage> = {}
  const uncoveredScenarios: string[] = []
  const coveredScenarioIds: string[] = []

  let totalScenarios = 0
  let totalCovered = 0

  for (const [operationId, operation] of Object.entries(catalog.operations)) {
    const scenarioNames = Object.keys(operation.scenarios)
    const coveredNames: string[] = []
    const uncoveredNames: string[] = []

    for (const scenarioName of scenarioNames) {
      const scenarioId = `${operationId}.${scenarioName}`
      totalScenarios++

      if (scanResult.scenarioToStory.has(scenarioId)) {
        totalCovered++
        coveredNames.push(scenarioName)
        coveredScenarioIds.push(scenarioId)
      } else {
        uncoveredNames.push(scenarioName)
        uncoveredScenarios.push(scenarioId)
      }
    }

    const total = scenarioNames.length
    const covered = coveredNames.length
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 100

    operations[operationId] = {
      operationId,
      method: operation.method,
      path: operation.path,
      total,
      covered,
      percentage,
      level: getCoverageLevel(percentage),
      uncovered: uncoveredNames,
      coveredScenarios: coveredNames,
    }
  }

  const globalPercentage = totalScenarios > 0
    ? Math.round((totalCovered / totalScenarios) * 100)
    : 100

  return {
    pactwork: SCHEMA.VERSION,
    generatedAt: new Date().toISOString(),
    spec: {
      title: catalog.spec.title,
      version: catalog.spec.version,
    },
    summary: {
      totalScenarios,
      coveredScenarios: totalCovered,
      percentage: globalPercentage,
      level: getCoverageLevel(globalPercentage),
      storiesScanned: scanResult.filesScanned,
    },
    operations,
    uncoveredScenarios,
    coveredScenarioIds,
  }
}

/**
 * Format coverage report for output
 */
export function formatCoverageReport(
  report: CoverageReport,
  format: ReportFormat,
  output?: string
): void {
  switch (format) {
    case 'console':
      formatConsole(report)
      break
    case 'json':
      formatJson(report, output)
      break
    case 'markdown':
      formatMarkdown(report, output)
      break
    case 'github':
      formatGitHub(report)
      break
    default:
      formatConsole(report)
  }
}

/**
 * Get color function based on coverage level
 */
function getLevelColor(level: CoverageLevel): typeof chalk.green {
  switch (level) {
    case 'good': return chalk.green
    case 'partial': return chalk.yellow
    case 'low': return chalk.red
  }
}

/**
 * Get label for coverage level
 */
function getLevelLabel(level: CoverageLevel): string {
  switch (level) {
    case 'good': return 'GOOD'
    case 'partial': return 'PARTIAL'
    case 'low': return 'LOW'
  }
}

/**
 * Format report for console output
 */
function formatConsole(report: CoverageReport): void {
  const { summary, operations, spec } = report
  const color = getLevelColor(summary.level)
  const label = getLevelLabel(summary.level)

  console.log('')
  console.log(chalk.bold(`Scenario Coverage for ${spec.title} v${spec.version}`))
  console.log('')
  console.log(
    `Coverage: ${color(`[${label}]`)} ${summary.percentage}% (${summary.coveredScenarios}/${summary.totalScenarios} scenarios)`
  )
  console.log(`Stories scanned: ${summary.storiesScanned}`)
  console.log('')

  console.log(chalk.bold('By Operation:'))
  console.log('')

  for (const op of Object.values(operations)) {
    const opColor = getLevelColor(op.level)
    const opLabel = getLevelLabel(op.level)

    console.log(`  ${chalk.cyan(op.method.toUpperCase())} ${op.path}`)
    console.log(`    ${opColor(`[${opLabel}]`)} ${op.percentage}% (${op.covered}/${op.total})`)

    if (op.uncovered.length > 0) {
      console.log(chalk.dim(`    Uncovered: ${op.uncovered.join(', ')}`))
    }
    console.log('')
  }
}

/**
 * Format report as JSON
 */
function formatJson(report: CoverageReport, output?: string): void {
  const json = JSON.stringify(report, null, 2)

  if (output) {
    fs.writeFileSync(output, json)
    console.log(`Coverage report written to ${output}`)
  } else {
    console.log(json)
  }
}

// escapeGitHubAnnotation imported from ../utils/index.js

/**
 * Format report for GitHub Actions
 */
function formatGitHub(report: CoverageReport): void {
  const { summary, operations, uncoveredScenarios } = report

  // Output uncovered scenarios as warnings
  for (const scenarioId of uncoveredScenarios) {
    console.log(`::warning::Uncovered scenario: ${escapeGitHubAnnotation(scenarioId)}`)
  }

  // Output per-operation coverage as notices
  for (const op of Object.values(operations)) {
    if (op.level === 'low') {
      console.log(
        `::error::${escapeGitHubAnnotation(`${op.method.toUpperCase()} ${op.path}: ${op.percentage}% coverage (${op.covered}/${op.total})`)}`
      )
    } else if (op.level === 'partial') {
      console.log(
        `::warning::${escapeGitHubAnnotation(`${op.method.toUpperCase()} ${op.path}: ${op.percentage}% coverage (${op.covered}/${op.total})`)}`
      )
    }
  }

  // Summary notice
  const level = summary.level === 'good' ? 'notice' : summary.level === 'partial' ? 'warning' : 'error'
  console.log(
    `::${level}::${escapeGitHubAnnotation(`Scenario coverage: ${summary.percentage}% (${summary.coveredScenarios}/${summary.totalScenarios})`)}`
  )
}

/**
 * Format report as Markdown
 */
function formatMarkdown(report: CoverageReport, output?: string): void {
  const { summary, operations, spec, uncoveredScenarios } = report
  const lines: string[] = []

  // Header
  lines.push(`# Scenario Coverage Report`)
  lines.push('')
  lines.push(`**Spec:** ${spec.title} v${spec.version}`)
  lines.push(`**Generated:** ${report.generatedAt}`)
  lines.push('')

  // Summary
  const emoji = summary.level === 'good' ? '🟢' : summary.level === 'partial' ? '🟡' : '🔴'
  lines.push(`## Summary`)
  lines.push('')
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Coverage | ${emoji} ${summary.percentage}% |`)
  lines.push(`| Scenarios | ${summary.coveredScenarios} / ${summary.totalScenarios} |`)
  lines.push(`| Stories Scanned | ${summary.storiesScanned} |`)
  lines.push('')

  // Per-operation table
  lines.push(`## Coverage by Operation`)
  lines.push('')
  lines.push(`| Method | Path | Coverage | Status |`)
  lines.push(`|--------|------|----------|--------|`)

  for (const op of Object.values(operations)) {
    const opEmoji = op.level === 'good' ? '🟢' : op.level === 'partial' ? '🟡' : '🔴'
    lines.push(`| ${op.method.toUpperCase()} | \`${op.path}\` | ${op.percentage}% (${op.covered}/${op.total}) | ${opEmoji} |`)
  }
  lines.push('')

  // Uncovered scenarios
  if (uncoveredScenarios.length > 0) {
    lines.push(`## Uncovered Scenarios`)
    lines.push('')
    for (const scenarioId of uncoveredScenarios) {
      lines.push(`- \`${scenarioId}\``)
    }
    lines.push('')
  }

  const markdown = lines.join('\n')

  if (output) {
    fs.writeFileSync(output, markdown)
    console.log(`Coverage report written to ${output}`)
  } else {
    console.log(markdown)
  }
}

/**
 * Format coverage for CI mode (minimal output)
 */
export function formatCoverageCI(report: CoverageReport): void {
  const { summary } = report
  console.log(`Coverage: ${summary.percentage}% (${summary.coveredScenarios}/${summary.totalScenarios})`)
}

/**
 * Check if coverage meets minimum threshold
 */
export function meetsCoverageThreshold(report: CoverageReport, minCoverage: number): boolean {
  return report.summary.percentage >= minCoverage
}
