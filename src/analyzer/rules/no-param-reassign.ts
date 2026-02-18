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

function collectBindingNames(node: ts.BindingName): string[] {
  if (ts.isIdentifier(node)) return [node.text];
  const names: string[] = [];
  if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
    for (const element of node.elements) {
      if (ts.isBindingElement(element)) {
        names.push(...collectBindingNames(element.name));
      }
    }
  }
  return names;
}

function collectParamNames(params: ts.NodeArray<ts.ParameterDeclaration>): Set<string> {
  const names = new Set<string>();
  for (const param of params) {
    for (const name of collectBindingNames(param.name)) {
      names.add(name);
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

function getRootIdentifier(node: ts.Node): ts.Identifier | null {
  if (ts.isIdentifier(node)) return node;
  if (ts.isPropertyAccessExpression(node)) return getRootIdentifier(node.expression);
  if (ts.isElementAccessExpression(node)) return getRootIdentifier(node.expression);
  return null;
}

function isPropertyAccess(node: ts.Node): boolean {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

function findBinaryAssignmentTarget(node: ts.Node, paramNames: Set<string>, checkProps: boolean): string | null {
  if (!ts.isBinaryExpression(node) || !ASSIGN_OPS.has(node.operatorToken.kind)) {
    return null;
  }
  const left = node.left;
  if (ts.isIdentifier(left) && paramNames.has(left.text)) {
    return left.text;
  }
  if (checkProps && isPropertyAccess(left)) {
    const root = getRootIdentifier(left);
    if (root && paramNames.has(root.text)) {
      return root.text;
    }
  }
  return null;
}

const UNARY_UPDATE_OPS = new Set([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken]);

function findUnaryAssignmentTarget(node: ts.Node, paramNames: Set<string>, checkProps: boolean): string | null {
  if (!ts.isPrefixUnaryExpression(node) && !ts.isPostfixUnaryExpression(node)) return null;
  if (!UNARY_UPDATE_OPS.has(node.operator)) return null;
  return findAssignmentTargetName(node.operand, paramNames, checkProps);
}

function findAssignmentTargetName(operand: ts.Node, paramNames: Set<string>, checkProps: boolean): string | null {
  if (ts.isIdentifier(operand) && paramNames.has(operand.text)) return operand.text;
  if (checkProps && isPropertyAccess(operand)) {
    const root = getRootIdentifier(operand);
    if (root && paramNames.has(root.text)) return root.text;
  }
  return null;
}

function findDeleteTarget(node: ts.Node, paramNames: Set<string>): string | null {
  if (ts.isDeleteExpression(node) && isPropertyAccess(node.expression)) {
    const root = getRootIdentifier(node.expression);
    if (root && paramNames.has(root.text)) {
      return root.text;
    }
  }
  return null;
}

export interface NoParamReassignOptions {
  severity?: Severity;
  props?: boolean;
}

export function checkNoParamReassign(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  opts?: NoParamReassignOptions,
): void {
  const severity = opts?.severity ?? 'warning';
  const checkProps = opts?.props ?? false;

  function reportAssignment(name: string, pos: number, isPropMutation: boolean): void {
    const { line, column } = getLineAndColumn(sourceFile, pos);
    const message = isPropMutation
      ? `Assignment to property of function parameter "${name}"`
      : `Assignment to function parameter "${name}"`;
    issues.push(
      createIssue({ file: filePath, line, column, severity, rule: 'no-param-reassign', message }),
    );
  }

  function checkAssignments(node: ts.Node, paramNames: Set<string>): void {
    if (isNestedFunction(node)) return;

    const binaryTarget = findBinaryAssignmentTarget(node, paramNames, checkProps);
    if (binaryTarget !== null) {
      const left = (node as ts.BinaryExpression).left;
      reportAssignment(binaryTarget, left.getStart(sourceFile), isPropertyAccess(left));
    }

    const unaryTarget = findUnaryAssignmentTarget(node, paramNames, checkProps);
    if (unaryTarget !== null) {
      const operand = (node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression).operand;
      reportAssignment(unaryTarget, operand.getStart(sourceFile), isPropertyAccess(operand));
    }

    if (checkProps) {
      const deleteTarget = findDeleteTarget(node, paramNames);
      if (deleteTarget !== null) {
        reportAssignment(deleteTarget, node.getStart(sourceFile), true);
      }
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
