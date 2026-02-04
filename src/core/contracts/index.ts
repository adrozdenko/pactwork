import fs from 'fs-extra'
import path from 'path'
import { glob } from 'glob'
import type { Contract, ContractSummary } from './types.js'

export type { Contract, Interaction, RequestSpec, ResponseSpec } from './types.js'

/**
 * Contract storage and retrieval
 */
export class ContractStore {
  private baseDir: string

  constructor(baseDir: string = '.pactwork') {
    this.baseDir = baseDir
  }

  /**
   * Save a contract to the store
   */
  async save(contract: Contract): Promise<string> {
    const contractsDir = path.join(this.baseDir, 'contracts')
    await fs.ensureDir(contractsDir)

    const filename = this.generateFilename(contract)
    const filepath = path.join(contractsDir, filename)

    await fs.writeJSON(filepath, contract, { spaces: 2 })

    return filepath
  }

  /**
   * Load a contract by consumer and provider
   */
  async load(consumer: string, provider: string): Promise<Contract | null> {
    const pattern = path.join(this.baseDir, 'contracts', `${consumer}-${provider}-*.json`)
    const files = await glob(pattern)

    if (files.length === 0) {
      return null
    }

    // Return the most recent contract
    const sorted = files.sort().reverse()
    return fs.readJSON(sorted[0])
  }

  /**
   * Load a contract by ID
   */
  async loadById(id: string): Promise<Contract | null> {
    const pattern = path.join(this.baseDir, 'contracts', `*-${id}.json`)
    const files = await glob(pattern)

    if (files.length === 0) {
      return null
    }

    return fs.readJSON(files[0])
  }

  /**
   * List all contracts
   */
  async list(): Promise<ContractSummary[]> {
    const pattern = path.join(this.baseDir, 'contracts', '*.json')
    const files = await glob(pattern)

    const summaries: ContractSummary[] = []

    for (const file of files) {
      try {
        const contract = await fs.readJSON(file) as Contract
        summaries.push(this.summarize(contract, file))
      } catch {
        // Skip invalid files
      }
    }

    return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /**
   * Delete a contract
   */
  async delete(consumer: string, provider: string): Promise<boolean> {
    const pattern = path.join(this.baseDir, 'contracts', `${consumer}-${provider}-*.json`)
    const files = await glob(pattern)

    if (files.length === 0) {
      return false
    }

    for (const file of files) {
      await fs.remove(file)
    }

    return true
  }

  /**
   * Check if a contract exists
   */
  async exists(consumer: string, provider: string): Promise<boolean> {
    const contract = await this.load(consumer, provider)
    return contract !== null
  }

  private generateFilename(contract: Contract): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `${contract.consumer.name}-${contract.provider.name}-${timestamp}.json`
  }

  private summarize(contract: Contract, filepath: string): ContractSummary {
    const filename = path.basename(filepath, '.json')
    const parts = filename.split('-')
    const id = parts[parts.length - 1]

    return {
      id,
      consumer: contract.consumer.name,
      provider: contract.provider.name,
      version: contract.consumer.version ?? '0.0.0',
      createdAt: contract.generatedAt,
      interactionCount: contract.interactions.length,
    }
  }
}
