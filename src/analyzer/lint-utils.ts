import * as ts from 'typescript';
import { Issue, Severity } from './types.js';

export interface IssueInfo {
  file: string;
  line: number;
  column: number;
  severity: Severity;
  rule: string;
  message: string;
}

export function createIssue(info: IssueInfo): Issue {
  return { ...info };
}

export function getLineAndColumn(
  sourceFile: ts.SourceFile,
  pos: number,
): { line: number; column: number } {
  const lc = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: lc.line + 1, column: lc.character + 1 };
}

export interface ThresholdCheckOptions {
  severity?: Severity;
  max?: number;
}

/** 単一 SyntaxKind を訪問してイシューを追加するルールチェッカーを生成するファクトリ */
export function makeNodeKindChecker(
  kind: ts.SyntaxKind,
  rule: string,
  message: string,
): (sourceFile: ts.SourceFile, filePath: string, issues: Issue[], severity?: Severity) => void {
  return (sourceFile, filePath, issues, severity = 'warning') => {
    function visit(node: ts.Node): void {
      if (node.kind === kind) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({ file: filePath, line, column, severity, rule, message }));
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  };
}
