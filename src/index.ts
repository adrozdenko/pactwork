/**
 * Pactwork - Contract-first API simulation framework
 *
 * @packageDocumentation
 */

// Core exports for programmatic API
export { parseSpec } from './core/parser/index.js'
export type { ParsedSpec, Endpoint, Parameter, Schema } from './core/parser/types.js'

export { generateHandlers } from './core/generator/index.js'
export type { GeneratorOptions, GeneratorResult } from './core/generator/types.js'

export { validateHandlers } from './core/validator/index.js'
export type { ValidationResult, DriftItem, Suggestion } from './core/validator/types.js'

export { ContractStore } from './core/contracts/index.js'
export type { Contract, Interaction } from './core/contracts/types.js'

export { loadConfig, defineConfig } from './core/config/index.js'
export type { PactworkConfig } from './core/config/types.js'

// Runtime utilities for transforming handlers at runtime
// Also available via 'pactwork/runtime' for tree-shaking
export * from './runtime/index.js'
