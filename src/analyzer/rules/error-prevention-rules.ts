import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

export function checkNoSparseArrays(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isArrayLiteralExpression(node)) {
      for (const elem of node.elements) {
        if (elem.kind === ts.SyntaxKind.OmittedExpression) {
          const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
          issues.push(createIssue({
            file: filePath, line, column, severity, rule: 'no-sparse-arrays',
            message: 'Unexpected comma in array literal creating a sparse array',
          }));
          break;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const PROTOTYPE_BUILTINS = new Set(['hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable']);

export function checkNoPrototypeBuiltins(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (PROTOTYPE_BUILTINS.has(method)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-prototype-builtins',
          message: `Do not access Object.prototype method '${method}' from target object`,
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoArrayConstructor(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Array') {
      // Allow new Array(size) with single numeric argument
      if (node.arguments && node.arguments.length === 1 && ts.isNumericLiteral(node.arguments[0])) {
        ts.forEachChild(node, visit);
        return;
      }
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-array-constructor',
        message: 'Use array literal notation [] instead of new Array()',
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoThrowLiteral(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  const LITERAL_KINDS = new Set([
    ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NumericLiteral,
    ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword,
    ts.SyntaxKind.NullKeyword, ts.SyntaxKind.UndefinedKeyword,
  ]);
  function visit(node: ts.Node) {
    if (ts.isThrowStatement(node) && node.expression && LITERAL_KINDS.has(node.expression.kind)) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-throw-literal',
        message: 'Expected an Error object to be thrown',
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoAsyncPromiseExecutor(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.text === 'Promise' && node.arguments && node.arguments.length > 0) {
      const executor = node.arguments[0];
      const isAsync = (ts.isArrowFunction(executor) || ts.isFunctionExpression(executor)) &&
        executor.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (isAsync) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-async-promise-executor',
          message: 'Promise executor should not be an async function',
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function checkNumericPrecision(node: ts.NumericLiteral): boolean {
  const text = node.text;
  if (/^0[xXoObB]/.test(text) || text.endsWith('n')) return false;
  const num = Number(text);
  if (!Number.isFinite(num)) return false;
  if (!Number.isInteger(num) || text.includes('.') || text.includes('e') || text.includes('E')) return false;
  return Math.abs(num) > Number.MAX_SAFE_INTEGER;
}

export function checkNoLossOfPrecision(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isNumericLiteral(node) && checkNumericPrecision(node)) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-loss-of-precision',
        message: `${node.text} exceeds Number.MAX_SAFE_INTEGER and loses precision`,
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const ALWAYS_TRUTHY_KINDS = new Set([
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression,
  ts.SyntaxKind.RegularExpressionLiteral,
]);

const ALWAYS_NULLISH_KINDS = new Set([
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.UndefinedKeyword,
]);

function isAlwaysTruthy(node: ts.Node): boolean {
  if (ALWAYS_TRUTHY_KINDS.has(node.kind)) return true;
  if (ts.isNewExpression(node)) return true;
  if (ts.isTemplateLiteralTypeNode(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  return false;
}

export function checkNoConstantBinaryExpression(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      // {} || x, [] && x — left is always truthy
      if ((op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.AmpersandAmpersandToken) &&
          isAlwaysTruthy(node.left)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-constant-binary-expression',
          message: 'Unexpected constant truthy value on the left-hand side of a logical expression',
        }));
      }
      // x ?? null, x ?? undefined — right side of ?? is always nullish (pointless)
      if (op === ts.SyntaxKind.QuestionQuestionToken && ALWAYS_NULLISH_KINDS.has(node.right.kind)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-constant-binary-expression',
          message: 'Unexpected nullish value as the right operand of ?? operator',
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoRegexConstructor(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  function visit(node: ts.Node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.text === 'RegExp' && node.arguments && node.arguments.length > 0) {
      const pattern = node.arguments[0];
      if (ts.isStringLiteral(pattern) || ts.isNoSubstitutionTemplateLiteral(pattern)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-regex-constructor',
          message: 'Use a regular expression literal instead of new RegExp() with a static pattern',
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
