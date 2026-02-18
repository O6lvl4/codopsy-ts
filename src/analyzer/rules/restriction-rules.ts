import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

export function checkNoEval(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // eval(...)
      if (ts.isIdentifier(callee) && callee.text === 'eval') {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({ file: filePath, line, column, severity, rule: 'no-eval', message: 'eval() is not allowed' }));
      }
      // window.eval(...), globalThis.eval(...)
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'eval' &&
          ts.isIdentifier(callee.expression) &&
          (callee.expression.text === 'window' || callee.expression.text === 'globalThis')) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({ file: filePath, line, column, severity, rule: 'no-eval', message: 'eval() is not allowed' }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const IMPLIED_EVAL_FUNCS = new Set(['setTimeout', 'setInterval', 'execScript']);

export function checkNoImpliedEval(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression;
      let funcName: string | undefined;
      if (ts.isIdentifier(callee)) funcName = callee.text;
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) funcName = callee.name.text;

      if (funcName && IMPLIED_EVAL_FUNCS.has(funcName) && ts.isStringLiteral(node.arguments[0])) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-implied-eval',
          message: `Implied eval via ${funcName}() with string argument`,
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoWith(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.WithStatement) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({ file: filePath, line, column, severity, rule: 'no-with', message: 'Unexpected use of with statement' }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoVoid(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isVoidExpression(node)) {
      // Allow void at statement level: void promise; (used to suppress floating promises)
      if (!ts.isExpressionStatement(node.parent)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({ file: filePath, line, column, severity, rule: 'no-void', message: 'Unexpected use of void operator' }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoLabel(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isLabeledStatement(node)) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-label',
        message: `Unexpected labeled statement: ${node.label.text}`,
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoCommaOperator(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      // Exclude comma in for-statement init and incrementor
      const parent = node.parent;
      if (parent && ts.isForStatement(parent) &&
          (parent.initializer === node || parent.incrementor === node)) {
        ts.forEachChild(node, visit);
        return;
      }
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-comma-operator',
        message: 'Unexpected use of comma operator',
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
