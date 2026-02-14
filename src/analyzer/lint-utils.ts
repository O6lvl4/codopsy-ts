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
