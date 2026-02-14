import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

const ASSIGN_OPS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

function collectParamNames(params: ts.NodeArray<ts.ParameterDeclaration>): Set<string> {
  const names = new Set<string>();
  for (const param of params) {
    if (ts.isIdentifier(param.name)) {
      names.add(param.name.text);
    }
  }
  return names;
}

function isNestedFunction(node: ts.Node): boolean {
  return node.kind !== ts.SyntaxKind.SourceFile &&
    (ts.isFunctionDeclaration(node) ||
     ts.isFunctionExpression(node) ||
     ts.isArrowFunction(node) ||
     ts.isMethodDeclaration(node) ||
     ts.isConstructorDeclaration(node));
}

function findBinaryAssignmentTarget(node: ts.Node, paramNames: Set<string>): string | null {
  if (!ts.isBinaryExpression(node) || !ASSIGN_OPS.has(node.operatorToken.kind)) {
    return null;
  }
  if (ts.isIdentifier(node.left) && paramNames.has(node.left.text)) {
    return node.left.text;
  }
  return null;
}

function findUnaryAssignmentTarget(node: ts.Node, paramNames: Set<string>): string | null {
  if (!ts.isPrefixUnaryExpression(node) && !ts.isPostfixUnaryExpression(node)) {
    return null;
  }
  const op = node.operator;
  if (op !== ts.SyntaxKind.PlusPlusToken && op !== ts.SyntaxKind.MinusMinusToken) {
    return null;
  }
  if (ts.isIdentifier(node.operand) && paramNames.has(node.operand.text)) {
    return node.operand.text;
  }
  return null;
}

export function checkNoParamReassign(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function reportAssignment(name: string, pos: number): void {
    const { line, column } = getLineAndColumn(sourceFile, pos);
    issues.push(
      createIssue({ file: filePath, line, column, severity, rule: 'no-param-reassign', message: `Assignment to function parameter "${name}"` }),
    );
  }

  function checkAssignments(node: ts.Node, paramNames: Set<string>): void {
    if (isNestedFunction(node)) {
      return;
    }

    const binaryTarget = findBinaryAssignmentTarget(node, paramNames);
    if (binaryTarget !== null) {
      reportAssignment(binaryTarget, (node as ts.BinaryExpression).left.getStart(sourceFile));
    }

    const unaryTarget = findUnaryAssignmentTarget(node, paramNames);
    if (unaryTarget !== null) {
      const unary = node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression;
      reportAssignment(unaryTarget, unary.operand.getStart(sourceFile));
    }

    ts.forEachChild(node, (child) => checkAssignments(child, paramNames));
  }

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      const paramNames = collectParamNames(node.parameters);
      if (paramNames.size > 0 && node.body) {
        ts.forEachChild(node.body, (child) => checkAssignments(child, paramNames));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
