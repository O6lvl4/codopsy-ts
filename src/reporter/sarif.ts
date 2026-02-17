import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, Issue, Severity } from '../analyzer/types.js';

const RULE_DESCRIPTIONS: Record<string, { description: string; level: string }> = {
  'no-any': { description: 'Disallow the use of any type', level: 'warning' },
  'no-console': { description: 'Disallow console statements', level: 'note' },
  'max-lines': { description: 'Enforce maximum file length', level: 'warning' },
  'max-complexity': { description: 'Enforce maximum cyclomatic complexity', level: 'warning' },
  'max-cognitive-complexity': { description: 'Enforce maximum cognitive complexity', level: 'warning' },
  'no-empty-function': { description: 'Disallow empty functions', level: 'warning' },
  'no-nested-ternary': { description: 'Disallow nested ternary expressions', level: 'warning' },
  'prefer-const': { description: 'Prefer const over let when not reassigned', level: 'note' },
  'no-var': { description: 'Disallow var declarations', level: 'warning' },
  'eqeqeq': { description: 'Require === and !==', level: 'warning' },
  'max-depth': { description: 'Enforce maximum block nesting depth', level: 'warning' },
  'max-params': { description: 'Enforce maximum function parameters', level: 'warning' },
  'no-param-reassign': { description: 'Disallow parameter reassignment', level: 'warning' },
  'parse-error': { description: 'File parse error', level: 'error' },
};

interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number; startColumn: number };
    };
  }>;
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: Array<{
        id: string;
        shortDescription: { text: string };
        defaultConfiguration: { level: string };
      }>;
    };
  };
  results: SarifResult[];
}

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

function severityToSarifLevel(severity: Severity): string {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'note';
    default:
      return 'none';
  }
}

function issueToSarifResult(issue: Issue, targetDir: string): SarifResult {
  const relativePath = path.relative(targetDir, issue.file);
  return {
    ruleId: issue.rule,
    level: severityToSarifLevel(issue.severity),
    message: { text: issue.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: relativePath },
          region: {
            startLine: issue.line,
            startColumn: issue.column,
          },
        },
      },
    ],
  };
}

function collectRules(result: AnalysisResult): Array<{
  id: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: string };
}> {
  const ruleIds = new Set<string>();

  for (const file of result.files) {
    for (const issue of file.issues) {
      ruleIds.add(issue.rule);
    }
  }

  return Array.from(ruleIds).sort().map((ruleId) => {
    const desc = RULE_DESCRIPTIONS[ruleId];
    return {
      id: ruleId,
      shortDescription: { text: desc?.description ?? ruleId.replace(/-/g, ' ') },
      defaultConfiguration: { level: desc?.level ?? 'warning' },
    };
  });
}

export function formatSarifReport(result: AnalysisResult): string {
  const allIssues = result.files.flatMap((f) => f.issues);
  const targetDir = result.targetDir;

  const sarifLog: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'codopsy-ts',
            version: '1.0.1',
            informationUri: 'https://github.com/O6lvl4/codopsy-ts',
            rules: collectRules(result),
          },
        },
        results: allIssues.map((issue) => issueToSarifResult(issue, targetDir)),
      },
    ],
  };

  return JSON.stringify(sarifLog, null, 2);
}

export function generateSarifReport(result: AnalysisResult, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, formatSarifReport(result), 'utf-8');
}
