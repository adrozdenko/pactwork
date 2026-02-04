export type ReportFormat = 'console' | 'json' | 'github' | 'markdown'

export interface ReporterOptions {
  /** Output format */
  format: ReportFormat
  /** Verbose output */
  verbose?: boolean
  /** Output file path (for file-based formats) */
  output?: string
}
