import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn, ThresholdCheckOptions } from '../lint-utils.js';

export function checkMaxLines(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  opts?: ThresholdCheckOptions,
): void {
  const severity = opts?.severity ?? 'warning';
  const maxLines = opts?.max ?? 300;
  const lineCount = sourceFile.getLineStarts().length;
  if (lineCount > maxLines) {
    issues.push(
      createIssue({
        file: filePath,
        line: lineCount,
        column: 1,
        severity,
        rule: 'max-lines',
        message: `File has ${lineCount} lines, exceeds maximum of ${maxLines}`,
      }),
    );
  }
}

export function checkMaxDepth(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  opts?: ThresholdCheckOptions,
): void {
  const severity = opts?.severity ?? 'warning';
  const maxDepth = opts?.max ?? 4;

  const NESTING_KINDS = new Set([
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.SwitchStatement,
  ]);

  function visit(node: ts.Node, depth: number) {
    let currentDepth = depth;
    if (NESTING_KINDS.has(node.kind)) {
      currentDepth = depth + 1;
      if (currentDepth > maxDepth) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({
            file: filePath,
            line,
            column,
            severity,
            rule: 'max-depth',
            message: `Blocks are nested too deeply (${currentDepth}). Maximum allowed is ${maxDepth}`,
          }),
        );
      }
    }
    ts.forEachChild(node, (child) => visit(child, currentDepth));
  }
  visit(sourceFile, 0);
}

function getFunctionName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }
  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return '(anonymous)';
}

export function checkMaxParams(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  opts?: ThresholdCheckOptions,
): void {
  const severity = opts?.severity ?? 'warning';
  const maxParams = opts?.max ?? 4;

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      const params = node.parameters;
      if (params.length > maxParams) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        const name = getFunctionName(node);
        issues.push(
          createIssue({
            file: filePath,
            line,
            column,
            severity,
            rule: 'max-params',
            message: `Function "${name}" has ${params.length} parameters. Maximum allowed is ${maxParams}`,
          }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
