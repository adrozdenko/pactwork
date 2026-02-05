# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Pactwork, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainer directly
3. Include a description of the vulnerability
4. Allow time for a fix before public disclosure

We take security seriously and will respond promptly.

## Security Considerations

Pactwork:
- Uses `execFile` (not `exec`) to prevent shell injection when invoking subprocesses
- Does not execute user-provided code
- Reads and writes only to specified directories
- Does not make network requests except when explicitly configured
