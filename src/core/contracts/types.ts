export interface Contract {
  /** Pactwork version */
  pactwork: '1.0'
  /** Generation timestamp */
  generatedAt: string
  /** Consumer information */
  consumer: {
    name: string
    version?: string
  }
  /** Provider information */
  provider: {
    name: string
    version?: string
  }
  /** Contract interactions */
  interactions: Interaction[]
  /** Source spec reference */
  spec: {
    path: string
    hash: string
    version: string
  }
}

export interface Interaction {
  /** Human-readable description */
  description: string
  /** Provider state required for this interaction */
  providerState?: string
  /** Request specification */
  request: RequestSpec
  /** Expected response */
  response: ResponseSpec
}

export interface RequestSpec {
  method: string
  path: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
}

export interface ResponseSpec {
  status: number
  headers?: Record<string, string>
  body?: unknown
  /** Matching rules for flexible assertions */
  matchingRules?: MatchingRules
}

export interface MatchingRules {
  [jsonPath: string]: MatchingRule
}

export interface MatchingRule {
  match: 'type' | 'regex' | 'equality'
  regex?: string
  min?: number
  max?: number
}

export interface ContractSummary {
  id: string
  consumer: string
  provider: string
  version: string
  createdAt: string
  interactionCount: number
}
