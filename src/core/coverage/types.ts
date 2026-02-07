/**
 * Coverage types for Pactwork Phase 5
 * Tracks which OpenAPI scenarios have corresponding Storybook stories
 */

import type { ReportFormat } from '../reporter/types.js'

/** Coverage status thresholds */
export type CoverageLevel = 'good' | 'partial' | 'low'

/** Coverage for a single scenario */
export interface ScenarioCoverageItem {
  /** Full scenario ID (e.g., 'getPet.success') */
  scenarioId: string
  /** Operation ID */
  operationId: string
  /** Scenario name within operation */
  scenarioName: string
  /** Whether this scenario has a story */
  covered: boolean
  /** Path to story file (if covered) */
  storyFile?: string
}

/** Coverage metrics for a single operation */
export interface OperationCoverage {
  /** Operation ID */
  operationId: string
  /** HTTP method */
  method: string
  /** Path template */
  path: string
  /** Total scenarios for this operation */
  total: number
  /** Number of covered scenarios */
  covered: number
  /** Coverage percentage (0-100) */
  percentage: number
  /** Coverage level based on percentage */
  level: CoverageLevel
  /** List of uncovered scenario names */
  uncovered: string[]
  /** List of covered scenario names */
  coveredScenarios: string[]
}

/** Global coverage report */
export interface CoverageReport {
  /** Pactwork version */
  pactwork: '1.0'
  /** Report generation timestamp */
  generatedAt: string
  /** Spec info */
  spec: {
    title: string
    version: string
  }
  /** Global coverage metrics */
  summary: {
    /** Total scenarios across all operations */
    totalScenarios: number
    /** Number of covered scenarios */
    coveredScenarios: number
    /** Global coverage percentage (0-100) */
    percentage: number
    /** Coverage level based on percentage */
    level: CoverageLevel
    /** Number of story files scanned */
    storiesScanned: number
  }
  /** Per-operation coverage */
  operations: Record<string, OperationCoverage>
  /** All uncovered scenario IDs for quick reference */
  uncoveredScenarios: string[]
  /** All covered scenario IDs */
  coveredScenarioIds: string[]
}

/** Options for coverage calculation */
export interface CoverageOptions {
  /** Path to OpenAPI spec */
  spec?: string
  /** Directory to scan for stories */
  storiesDir?: string
  /** Glob patterns to include */
  include?: string[]
  /** Glob patterns to exclude */
  exclude?: string[]
}

/** Options for coverage CLI command */
export interface CoverageCLIOptions extends CoverageOptions {
  /** Output format */
  format?: ReportFormat
  /** Output file path */
  output?: string
  /** Minimum coverage percentage for CI gate */
  minCoverage?: number
  /** CI mode (minimal output) */
  ci?: boolean
  /** Skip OpenAPI spec validation */
  skipValidation?: boolean
}

/** Result of scanning story files */
export interface StoryScanResult {
  /** Map of scenario ID to story file path */
  scenarioToStory: Map<string, string>
  /** Total story files scanned */
  filesScanned: number
  /** Files with pactwork scenarios */
  filesWithScenarios: number
}

/** Extracted scenario reference from a story file */
export interface StoryScenarioRef {
  /** Full scenario ID (operationId.scenarioName) */
  scenarioId: string
  /** Path to story file */
  storyFile: string
}
