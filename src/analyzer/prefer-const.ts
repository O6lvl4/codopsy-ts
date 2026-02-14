import * as ts from 'typescript';
import { Issue, Severity } from './types.js';
import { createIssue, getLineAndColumn } from './lint-utils.js';

function collectNamesFromBinding(node: ts.BindingName): string[] {
  if (ts.isIdentifier(node)) {
    return [node.text];
  }
  const names: string[] = [];
  if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
    for (const element of node.elements) {
      if (ts.isBindingElement(element)) {
        names.push(...collectNamesFromBinding(element.name));
      }
    }
  }
  return names;
}

function collectAssignmentTargetNames(node: ts.Node): string[] {
  if (ts.isIdentifier(node)) {
    return [node.text];
  }
  if (ts.isArrayLiteralExpression(node)) {
    const names: string[] = [];
    for (const elem of node.elements) {
      names.push(...collectAssignmentTargetNames(elem));
    }
    return names;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const names: string[] = [];
    for (const prop of node.properties) {
      if (ts.isShorthandPropertyAssignment(prop)) {
        names.push(prop.name.text);
      } else if (ts.isPropertyAssignment(prop)) {
        names.push(...collectAssignmentTargetNames(prop.initializer));
      }
    }
    return names;
  }
  return [];
}

const ASSIGNMENT_OPERATORS = new Set([
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

function collectLetDeclarations(sourceFile: ts.SourceFile): Map<string, ts.VariableDeclaration> {
  const letDeclarations = new Map<string, ts.VariableDeclaration>();

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclarationList(node) &&
      !(node.flags & ts.NodeFlags.Const) &&
      node.flags & ts.NodeFlags.Let
    ) {
      const parent = node.parent;
      if (parent && (ts.isForInStatement(parent) || ts.isForOfStatement(parent))) {
        return;
      }
      for (const decl of node.declarations) {
        for (const name of collectNamesFromBinding(decl.name)) {
          letDeclarations.set(name, decl);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return letDeclarations;
}

function isCompoundAssignment(node: ts.Node, varNames: Map<string, ts.VariableDeclaration>): string[] {
  if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)) {
    return collectAssignmentTargetNames(node.left).filter(name => varNames.has(name));
  }
  return [];
}

function getUnaryUpdateOperand(node: ts.Node): ts.Identifier | null {
  const isPrefix = ts.isPrefixUnaryExpression(node);
  const isPostfix = ts.isPostfixUnaryExpression(node);
  if (!isPrefix && !isPostfix) return null;

  const unary = node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression;
  if (unary.operator !== ts.SyntaxKind.PlusPlusToken && unary.operator !== ts.SyntaxKind.MinusMinusToken) return null;

  return ts.isIdentifier(unary.operand) ? unary.operand : null;
}

function isUpdateExpression(node: ts.Node, varNames: Map<string, ts.VariableDeclaration>): string | null {
  const operand = getUnaryUpdateOperand(node);
  if (operand && varNames.has(operand.text)) {
    return operand.text;
  }
  return null;
}

function checkForInOfReassignment(node: ts.Node, varNames: Map<string, ts.VariableDeclaration>, reassigned: Set<string>): void {
  if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
    const init = node.initializer;
    if (ts.isIdentifier(init)) {
      const name = init.text;
      if (varNames.has(name)) {
        reassigned.add(name);
      }
    }
  }
}

function detectReassignments(
  sourceFile: ts.SourceFile,
  letDeclarations: Map<string, ts.VariableDeclaration>,
): Set<string> {
  const reassigned = new Set<string>();

  function visit(node: ts.Node) {
    for (const name of isCompoundAssignment(node, letDeclarations)) {
      reassigned.add(name);
    }

    const updateName = isUpdateExpression(node, letDeclarations);
    if (updateName) {
      reassigned.add(updateName);
    }

    checkForInOfReassignment(node, letDeclarations, reassigned);

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return reassigned;
}

export function checkPreferConst(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  const letDeclarations = collectLetDeclarations(sourceFile);
  if (letDeclarations.size === 0) return;

  const reassigned = detectReassignments(sourceFile, letDeclarations);

  for (const [name, decl] of letDeclarations) {
    if (!reassigned.has(name)) {
      const { line, column } = getLineAndColumn(sourceFile, decl.getStart(sourceFile));
      issues.push(
        createIssue({
          file: filePath,
          line,
          column,
          severity,
          rule: 'prefer-const',
          message: `'${name}' is declared with let; consider using const if not reassigned`,
        }),
      );
    }
  }
}
