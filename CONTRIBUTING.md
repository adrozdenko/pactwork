# Contributing to Pactwork

Thank you for considering contributing to Pactwork! This guide will help you get started.

## Quick Links

- [Issues](https://github.com/adrozdenko/pactwork/issues) — Report bugs or request features

---

## Development Setup

```bash
# Clone the repo
git clone https://github.com/adrozdenko/pactwork.git
cd pactwork

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode (development)
npm run dev
```

---

## Project Structure

```
pactwork/
├── bin/                # CLI entry point
├── src/
│   ├── cli/
│   │   ├── commands/   # Individual command implementations
│   │   ├── index.ts    # CLI setup with Commander.js
│   │   └── utils.ts    # Shared CLI utilities
│   ├── core/
│   │   ├── config/     # Configuration loader
│   │   ├── contracts/  # Contract storage (planned)
│   │   ├── generator/  # MSW handler generation
│   │   ├── parser/     # OpenAPI spec parsing
│   │   ├── reporter/   # Output formatting
│   │   └── validator/  # Drift detection
│   ├── constants.ts    # Shared constants (exit codes, defaults)
│   └── index.ts        # Public API exports
├── dist/               # Built output
└── docs/               # Documentation
```

---

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Type check
npm run typecheck

# Build to verify
npm run build
```

### 4. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new validation rule"
git commit -m "fix: handle empty spec file"
git commit -m "docs: update CLI examples"
```

### 5. Open a Pull Request

- Describe what changed and why
- Link related issues
- Include test results if relevant

---

## Code Style

- **TypeScript** — All source code is TypeScript
- **No `any`** — Use proper types
- **JSDoc** — Document public functions
- **Small functions** — Keep functions focused (<30 lines)
- **Meaningful names** — Variables and functions should be self-documenting

---

## Testing

Tests use [Vitest](https://vitest.dev/):

```bash
# Run tests once
npm run test:run

# Watch mode
npm test
```

When adding features:
- Add unit tests for new functions
- Add integration tests for CLI commands
- Test edge cases (empty input, invalid input, etc.)

---

## Reporting Bugs

When reporting bugs, please include:

1. **Pactwork version** (`npx pactwork --version`)
2. **Node.js version** (`node --version`)
3. **Operating system**
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **OpenAPI spec snippet** (if relevant)

---

## Feature Requests

Before requesting a feature:

1. Check existing [issues](https://github.com/adrozdenko/pactwork/issues)
2. Describe the use case
3. Explain why existing solutions don't work

---

## Code of Conduct

Be respectful. We're all here to build better tools.

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
