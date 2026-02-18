import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

const CONSTANT_LITERAL_KINDS = new Set([
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.RegularExpressionLiteral,
]);

const CONSTANT_UNARY_OPS = new Set([
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.TildeToken,
]);

const UNWRAP_EXPRESSION_KINDS = new Set([
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.TypeOfExpression,
  ts.SyntaxKind.VoidExpression,
]);

function isConstantExpression(node: ts.Node): boolean {
  if (CONSTANT_LITERAL_KINDS.has(node.kind)) return true;
  if (ts.isPrefixUnaryExpression(node)) {
    return CONSTANT_UNARY_OPS.has(node.operator) && isConstantExpression(node.operand);
  }
  if (ts.isBinaryExpression(node)) return isConstantExpression(node.left) && isConstantExpression(node.right);
  if (UNWRAP_EXPRESSION_KINDS.has(node.kind)) return isConstantExpression((node as ts.ParenthesizedExpression).expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(e => isConstantExpression(e));
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every(p => ts.isPropertyAssignment(p) && isConstantExpression(p.initializer));
  }
  if (ts.isTemplateExpression(node)) return node.templateSpans.every(s => isConstantExpression(s.expression));
  return false;
}

const VALID_TYPEOF_VALUES = new Set([
  'undefined', 'object', 'boolean', 'number', 'string', 'function', 'symbol', 'bigint',
]);

function hasAssignmentInExpression(node: ts.Node): ts.BinaryExpression | undefined {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return node;
  }
  let found: ts.BinaryExpression | undefined;
  ts.forEachChild(node, (child) => {
    if (!found) found = hasAssignmentInExpression(child);
  });
  return found;
}

export function checkNoCondAssign(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function checkCondition(condition: ts.Expression): void {
    if (ts.isParenthesizedExpression(condition) &&
        ts.isBinaryExpression(condition.expression) &&
        condition.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return;
    }
    const assign = hasAssignmentInExpression(condition);
    if (assign) {
      const { line, column } = getLineAndColumn(sourceFile, assign.getStart(sourceFile));
      issues.push(
        createIssue({ file: filePath, line, column, severity, rule: 'no-cond-assign', message: 'Unexpected assignment in condition' }),
      );
    }
  }

  function visit(node: ts.Node) {
    if (ts.isIfStatement(node)) checkCondition(node.expression);
    if (ts.isWhileStatement(node)) checkCondition(node.expression);
    if (ts.isDoStatement(node)) checkCondition(node.expression);
    if (ts.isForStatement(node) && node.condition) checkCondition(node.condition);
    if (ts.isConditionalExpression(node)) checkCondition(node.condition);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const TYPEOF_EQUALITY_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

function getTypeofValueSide(node: ts.BinaryExpression): ts.Node | undefined {
  if (ts.isTypeOfExpression(node.left)) return node.right;
  if (ts.isTypeOfExpression(node.right)) return node.left;
  return undefined;
}

export function checkValidTypeof(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function checkTypeofBinaryExpr(node: ts.BinaryExpression): void {
    if (!TYPEOF_EQUALITY_OPS.has(node.operatorToken.kind)) return;
    const valueSide = getTypeofValueSide(node);
    if (!valueSide || !ts.isStringLiteral(valueSide)) return;
    if (VALID_TYPEOF_VALUES.has(valueSide.text)) return;
    const { line, column } = getLineAndColumn(sourceFile, valueSide.getStart(sourceFile));
    issues.push(
      createIssue({ file: filePath, line, column, severity, rule: 'valid-typeof', message: `Invalid typeof comparison value: "${valueSide.text}"` }),
    );
  }

  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node)) checkTypeofBinaryExpr(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoConstantCondition(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function checkCondition(condition: ts.Expression, allowWhileTrue: boolean): void {
    if (isConstantExpression(condition)) {
      if (allowWhileTrue && (condition.kind === ts.SyntaxKind.TrueKeyword)) return;
      const { line, column } = getLineAndColumn(sourceFile, condition.getStart(sourceFile));
      issues.push(
        createIssue({ file: filePath, line, column, severity, rule: 'no-constant-condition', message: 'Unexpected constant condition' }),
      );
    }
  }

  function visit(node: ts.Node) {
    if (ts.isIfStatement(node)) checkCondition(node.expression, false);
    if (ts.isWhileStatement(node)) checkCondition(node.expression, true);
    if (ts.isDoStatement(node)) checkCondition(node.expression, true);
    if (ts.isForStatement(node) && node.condition) checkCondition(node.condition, true);
    if (ts.isConditionalExpression(node)) checkCondition(node.condition, false);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
