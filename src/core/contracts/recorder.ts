import fs from 'fs-extra'
import type { Contract, Interaction, RequestSpec, ResponseSpec } from './types.js'
import type { ParsedSpec } from '../parser/types.js'
import { ContractStore } from './index.js'
import { createSpecHash } from '../utils/index.js'
import { SCHEMA } from '../../constants.js'

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
    const specHash = createSpecHash(specContent)

    return {
      pactwork: SCHEMA.VERSION,
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
  const specHash = createSpecHash(specContent)

  const interactions: Interaction[] = spec.endpoints.map(endpoint => {
    // Find the best 2xx success response: prefer '200', then lowest numeric 2xx, then 'default' as 200
    const responseKeys = Object.keys(endpoint.responses)
    const numericSuccessKeys = responseKeys
      .filter(s => /^2\d{2}$/.test(s))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

    let successStatus: string
    let statusCode: number

    if (numericSuccessKeys.includes('200')) {
      successStatus = '200'
      statusCode = 200
    } else if (numericSuccessKeys.length > 0) {
      successStatus = numericSuccessKeys[0]
      statusCode = parseInt(successStatus, 10)
    } else if (responseKeys.includes('default')) {
      successStatus = 'default'
      statusCode = 200
    } else {
      successStatus = '200'
      statusCode = 200
    }

    const response = endpoint.responses[successStatus]

    return {
      description: endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`,
      request: {
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
      },
      response: {
        status: statusCode,
        body: response?.content?.['application/json']?.schema
          ? { _schema: 'See OpenAPI spec' }
          : undefined,
      },
    }
  })

  return {
    pactwork: SCHEMA.VERSION,
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
