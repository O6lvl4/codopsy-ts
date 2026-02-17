import * as fs from 'fs';
import { FileAnalysis } from './types.js';
import { analyzeComplexity } from './complexity.js';
import { lintFile } from './linter.js';
import { CodopsyConfig } from '../config.js';
import type { RuleDefinition } from '../plugin.js';

export function analyzeFile(
  filePath: string,
  config?: CodopsyConfig,
  externalRules?: RuleDefinition[],
): FileAnalysis {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    const complexityResult = analyzeComplexity(filePath, sourceCode);
    const issues = lintFile(filePath, sourceCode, config, externalRules);

    return {
      file: filePath,
      complexity: {
        cyclomatic: complexityResult.cyclomatic,
        cognitive: complexityResult.cognitive,
        functions: complexityResult.functions,
      },
      issues,
    };
  } catch (error) {
    return {
      file: filePath,
      complexity: { cyclomatic: 0, cognitive: 0, functions: [] },
      issues: [{
        file: filePath,
        line: 0,
        column: 0,
        severity: 'error',
        rule: 'parse-error',
        message: `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }
}

export { analyzeComplexity } from './complexity.js';
export { lintFile } from './linter.js';
export type { FileAnalysis, AnalysisResult, Issue, Severity } from './types.js';
