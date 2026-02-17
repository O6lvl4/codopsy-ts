// Public programmatic API - import without triggering CLI
export { analyze } from './analyze.js';
export type { AnalyzeOptions } from './analyze.js';
export { analyzeFile, analyzeComplexity, lintFile } from './analyzer/index.js';
export type { FileAnalysis, AnalysisResult, Issue, Severity } from './analyzer/types.js';
export type { ComplexityResult, FunctionComplexity } from './analyzer/complexity.js';
export { loadConfig } from './config.js';
export type { CodopsyConfig, RuleSeverity } from './config.js';
export { findSourceFiles } from './utils/file.js';
export { formatReport, generateReport } from './reporter/index.js';
export type { ReportFormat } from './reporter/index.js';
export { calculateFileScore, calculateProjectScore } from './scorer.js';
export type { Grade, FileScore, ProjectScore } from './scorer.js';
export { loadPlugins } from './plugin.js';
export type { RuleCheckFn, RuleDefinition, CodopsyPlugin } from './plugin.js';
