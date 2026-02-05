import { createHash } from 'node:crypto'
import fs from 'fs-extra'
import type { Contract, Interaction, RequestSpec, ResponseSpec } from './types.js'
import type { ParsedSpec } from '../parser/types.js'
import { ContractStore } from './index.js'

export interface RecorderOptions {
  consumer: string
  provider: string
  consumerVersion?: string
  providerVersion?: string
  baseDir?: string
}

export interface RecordedInteraction {
  description: string
  providerState?: string
  request: {
    method: string
    path: string
    headers?: Record<string, string>
    query?: Record<string, string>
    body?: unknown
  }
  response: {
    status: number
    headers?: Record<string, string>
    body?: unknown
  }
}

/**
 * Records API interactions into Pact-style contracts
 */
export class ContractRecorder {
  private interactions: Interaction[] = []
  private options: RecorderOptions
  private store: ContractStore

  constructor(options: RecorderOptions) {
    this.options = options
    this.store = new ContractStore(options.baseDir)
  }

  /**
   * Record a single interaction
   */
  record(interaction: RecordedInteraction): void {
    this.interactions.push({
      description: interaction.description,
      providerState: interaction.providerState,
      request: interaction.request as RequestSpec,
      response: interaction.response as ResponseSpec,
    })
  }

  /**
   * Generate contract from recorded interactions
   */
  async generateContract(spec: ParsedSpec, specPath: string): Promise<Contract> {
    const specContent = await fs.readFile(specPath, 'utf-8')
    const specHash = createHash('sha256').update(specContent).digest('hex').slice(0, 12)

    return {
      pactwork: '1.0',
      generatedAt: new Date().toISOString(),
      consumer: {
        name: this.options.consumer,
        version: this.options.consumerVersion,
      },
      provider: {
        name: this.options.provider,
        version: this.options.providerVersion,
      },
      interactions: this.interactions,
      spec: {
        path: specPath,
        hash: specHash,
        version: spec.info.version,
      },
    }
  }

  /**
   * Save recorded contract to store
   */
  async save(spec: ParsedSpec, specPath: string): Promise<string> {
    const contract = await this.generateContract(spec, specPath)
    return this.store.save(contract)
  }

  /**
   * Clear recorded interactions
   */
  clear(): void {
    this.interactions = []
  }

  /**
   * Get count of recorded interactions
   */
  get count(): number {
    return this.interactions.length
  }
}

/**
 * Generate a contract from an OpenAPI spec (for baseline)
 */
export async function generateContractFromSpec(
  spec: ParsedSpec,
  specPath: string,
  options: RecorderOptions
): Promise<Contract> {
  const specContent = await fs.readFile(specPath, 'utf-8')
  const specHash = createHash('sha256').update(specContent).digest('hex').slice(0, 12)

  const interactions: Interaction[] = spec.endpoints.map(endpoint => {
    // Find first success response
    const successStatus = Object.keys(endpoint.responses).find(s => s.startsWith('2')) || '200'
    const response = endpoint.responses[successStatus]

    return {
      description: endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`,
      request: {
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
      },
      response: {
        status: parseInt(successStatus, 10),
        body: response?.content?.['application/json']?.schema
          ? { _schema: 'See OpenAPI spec' }
          : undefined,
      },
    }
  })

  return {
    pactwork: '1.0',
    generatedAt: new Date().toISOString(),
    consumer: {
      name: options.consumer,
      version: options.consumerVersion,
    },
    provider: {
      name: options.provider,
      version: options.providerVersion,
    },
    interactions,
    spec: {
      path: specPath,
      hash: specHash,
      version: spec.info.version,
    },
  }
}
