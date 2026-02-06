# Changelog

All notable changes to Pactwork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-02-06

### Added

- **Phase 3: Runtime Utilities** — Apply scenarios at runtime in tests, Storybook, or development
  - `applyScenario(handlers, meta, operationId, scenario)` — Replace response with scenario
  - `withLatency(handlers, meta, ms)` — Add delay to all or specific handlers
  - `withSequence(handlers, meta, operationId, statuses)` — Return different statuses in sequence
  - `withRateLimit(handlers, meta, operationId, opts)` — Simulate rate limiting (429)
  - `withNetworkError(handlers, meta, operationId, opts)` — Simulate timeout/abort/connection errors
  - `withSeed(handlers, meta, seed)` — Deterministic data generation with seeded RNG
  - `pipe(handlers, ...transformers)` — Compose multiple handler transformers
  - Pure functions, no mutation — composable and predictable
  - Full TypeScript support with generics
  - 76 new tests for runtime utilities (144 total)
- **Handler Metadata Generation** — `handlerMeta` map for O(1) operation lookup
- **Scenario Catalog** — Generate typed scenarios from OpenAPI spec
  - `pactwork generate --with-scenarios` generates `scenarios.ts`
  - `pactwork scenarios --list` shows all available scenarios
  - `pactwork scenarios --coverage` displays coverage statistics

### Fixed

- Escape GitHub Actions annotation values (%, newlines, carriage returns)
- Escape regex metacharacters in path matching to prevent false matches
- Handle root path (`/`) in handler validation
- Add cycle detection in schema comparison to prevent infinite loops
- Store scenario status as string to preserve "default", "2XX" patterns
- First 2xx response treated as primary response type in typegen
- Guard against empty/digit-starting identifiers in pascalCase

### Changed

- Generator now returns parsed spec in result to avoid double parsing
- Constants centralized with DEFAULTS.CONSUMER and DEFAULTS.PROVIDER

## [1.0.0] - 2025-02-05

### Added

- **Agentic-First README** — Repositioned documentation for AI agent workflows
  - "For AI Agents" section with the validate → generate → commit loop
  - Agent playbooks for common scenarios
- **Product Roadmap** — Published ROADMAP.md with phased approach
- **GitHub Action** — Use `adrozdenko/pactwork@v1` in your workflows
- **TypeScript Type Generation** — New `pactwork types` command
  - Generate interfaces from OpenAPI schemas
  - Request/response types per endpoint
  - Path and query parameter types
- **Breaking Change Detection** — New `pactwork breaking` command
  - Compare two API versions for breaking changes
  - Detects: removed endpoints, new required parameters, type changes, removed enum values
  - Severity levels: breaking, warning, info
  - JSON output for CI integration
- **Contract Recording** — New `pactwork record` command
  - Generate Pact-style contracts from OpenAPI spec
  - Consumer/provider naming for contract identification
  - Spec hash tracking for change detection
- **Contract Verification** — New `pactwork verify` command
  - Verify contracts against current OpenAPI spec
  - Endpoint existence, parameter, and response validation
  - Formatted console and JSON output

## [1.0.0] - 2025-02-05

### Added

- **CLI Commands**
  - `pactwork init` — Initialize Pactwork in a project with auto-detection of OpenAPI specs
  - `pactwork generate` — Generate MSW handlers from OpenAPI specifications
  - `pactwork validate` — Validate handlers match the spec with drift detection
  - `pactwork watch` — Watch mode with auto-regeneration on spec changes
  - `pactwork diff` — Show differences between spec and handlers
  - `pactwork can-i-deploy` — CI gate for deployment safety

- **Core Features**
  - OpenAPI 2.0, 3.0, and 3.1 support via `@apidevtools/swagger-parser`
  - MSW 2.x handler generation via `msw-auto-mock`
  - Drift detection with missing/extra/mismatch categorization
  - Multiple output formats: console, JSON, Markdown, GitHub Actions annotations
  - Path parameter matching (OpenAPI `{id}` ↔ MSW `:id` syntax)
  - Template literal support in handler path matching (`${baseURL}/path`)

- **Developer Experience**
  - TypeScript-first with full type definitions
  - Configuration via `pactwork.config.ts`, `.js`, or `.json`
  - `--skip-validation` flag for non-standard OpenAPI specs
  - `--fix` flag to auto-regenerate handlers
  - Helpful suggestions for fixing drift issues
  - Colored terminal output with progress spinners

- **CI Integration**
  - Predictable exit codes (0=success, 1=validation failed, 2=warnings as errors, 10=exception)
  - CI mode with minimal output for machine parsing
  - GitHub Actions annotation format support

### Technical

- Centralized constants for exit codes and defaults
- Shared error handling utilities across CLI commands
- Clean code architecture with extracted helper functions
- JSDoc documentation on all public and key internal functions
- ESLint 9 with TypeScript support
- Dynamic version from package.json

### Documentation

- Professional README with UX writing principles
- Problem-first structure ("The Problem" leads)
- Scannable command reference table
- GitHub Actions CI workflow
- Issue and PR templates
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- MIT LICENSE

## [0.1.0] - 2025-02-04

### Added

- Initial project scaffolding
- Basic CLI structure with Commander.js
- OpenAPI parser integration
- MSW handler generation (basic fallback)

---

[1.0.0]: https://github.com/adrozdenko/pactwork/releases/tag/v1.0.0
[0.1.0]: https://github.com/adrozdenko/pactwork/releases/tag/v0.1.0
