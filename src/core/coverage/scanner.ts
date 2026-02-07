/**
 * Story file scanner for Pactwork Phase 5
 * Extracts pactwork scenario references from Storybook story files using regex
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { StoryScanResult, StoryScenarioRef } from './types.js'

/** Story file extensions to scan */
const STORY_EXTENSIONS = ['.stories.ts', '.stories.tsx', '.stories.js', '.stories.jsx']

/**
 * Regex patterns to extract scenario references from story files
 *
 * Pattern 1: Single scenario
 *   pactwork: { scenario: 'operationId.scenarioName' }
 *
 * Pattern 2: Array of scenarios
 *   pactwork: { scenarios: ['op.s1', 'op.s2'] }
 */
const SINGLE_SCENARIO_PATTERN = /pactwork:\s*\{[^}]*scenario:\s*['"]([^'"]+)['"]/g
const ARRAY_SCENARIOS_PATTERN = /pactwork:\s*\{[^}]*scenarios:\s*\[([^\]]+)\]/g
const STRING_IN_ARRAY_PATTERN = /['"]([^'"]+)['"]/g

/**
 * Check if a file path is a story file
 */
export function isStoryFile(filePath: string): boolean {
  return STORY_EXTENSIONS.some(ext => filePath.endsWith(ext))
}

/**
 * Extract scenario references from story file content
 */
export function extractScenariosFromContent(content: string): string[] {
  const scenarios = new Set<string>()

  // Extract single scenario references
  let match: RegExpExecArray | null
  const singlePattern = new RegExp(SINGLE_SCENARIO_PATTERN.source, 'g')
  while ((match = singlePattern.exec(content)) !== null) {
    scenarios.add(match[1])
  }

  // Extract array scenario references
  const arrayPattern = new RegExp(ARRAY_SCENARIOS_PATTERN.source, 'g')
  while ((match = arrayPattern.exec(content)) !== null) {
    const arrayContent = match[1]
    const stringPattern = new RegExp(STRING_IN_ARRAY_PATTERN.source, 'g')
    let stringMatch: RegExpExecArray | null
    while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
      scenarios.add(stringMatch[1])
    }
  }

  return Array.from(scenarios)
}

/**
 * Scan a single story file for scenario references
 */
export function scanStoryFile(filePath: string): StoryScenarioRef[] {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const scenarios = extractScenariosFromContent(content)
    return scenarios.map(scenarioId => ({
      scenarioId,
      storyFile: filePath,
    }))
  } catch {
    // File read error - skip this file
    return []
  }
}

/**
 * Recursively find all story files in a directory
 */
export function findStoryFiles(dir: string, baseDir?: string): string[] {
  const files: string[] = []
  const base = baseDir ?? dir

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)

      try {
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry === 'node_modules' || entry.startsWith('.')) {
            continue
          }
          files.push(...findStoryFiles(fullPath, base))
        } else if (stat.isFile() && isStoryFile(entry)) {
          files.push(fullPath)
        }
      } catch {
        // Skip files/dirs we can't access
        continue
      }
    }
  } catch {
    // Directory read error - return empty
  }

  return files
}

/**
 * Scan a directory for all story files and extract scenario references
 */
export function scanStoriesDirectory(
  dir: string,
  options: { include?: string[]; exclude?: string[] } = {}
): StoryScanResult {
  const scenarioToStory = new Map<string, string>()
  let filesScanned = 0
  let filesWithScenarios = 0

  const storyFiles = findStoryFiles(dir)

  for (const filePath of storyFiles) {
    // Apply include/exclude filters
    const relativePath = relative(dir, filePath)

    if (options.exclude?.some(pattern => matchGlob(relativePath, pattern))) {
      continue
    }

    if (options.include?.length && !options.include.some(pattern => matchGlob(relativePath, pattern))) {
      continue
    }

    filesScanned++
    const refs = scanStoryFile(filePath)

    if (refs.length > 0) {
      filesWithScenarios++
      for (const ref of refs) {
        // First occurrence wins
        if (!scenarioToStory.has(ref.scenarioId)) {
          scenarioToStory.set(ref.scenarioId, ref.storyFile)
        }
      }
    }
  }

  return {
    scenarioToStory,
    filesScanned,
    filesWithScenarios,
  }
}

/**
 * Simple glob matching for include/exclude patterns
 * Supports * and ** wildcards
 */
function matchGlob(path: string, pattern: string): boolean {
  // Escape regex special chars except * and **
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')

  return new RegExp(`^${regexPattern}$`).test(path)
}
