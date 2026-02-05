# Changelog

All notable changes to Pactwork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
