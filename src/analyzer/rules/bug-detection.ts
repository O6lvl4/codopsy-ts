import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

export function checkNoDebugger(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.DebuggerStatement) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(
        createIssue({ file: filePath, line, column, severity, rule: 'no-debugger', message: 'Unexpected debugger statement' }),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoDuplicateCase(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isSwitchStatement(node)) {
      const seen = new Map<string, ts.CaseClause>();
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) {
          const text = clause.expression.getText(sourceFile);
          if (seen.has(text)) {
            const { line, column } = getLineAndColumn(sourceFile, clause.getStart(sourceFile));
            issues.push(
              createIssue({ file: filePath, line, column, severity, rule: 'no-duplicate-case', message: `Duplicate case label: ${text}` }),
            );
          } else {
            seen.set(text, clause);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const NAME_TEXT_KINDS = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
]);

function getNameText(name: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  if (NAME_TEXT_KINDS.has(name.kind)) return (name as ts.Identifier | ts.StringLiteral | ts.NumericLiteral).text;
  if (ts.isComputedPropertyName(name)) return undefined;
  return name.getText(sourceFile);
}

const NAMED_PROPERTY_KINDS = new Set([
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

function getPropertyName(node: ts.ObjectLiteralElementLike, sourceFile: ts.SourceFile): string | undefined {
  if (!NAMED_PROPERTY_KINDS.has(node.kind)) return undefined;
  const name = (node as ts.PropertyAssignment).name;
  if (!name) return undefined;
  return getNameText(name, sourceFile);
}

function getAccessorKind(prop: ts.ObjectLiteralElementLike): string {
  if (ts.isGetAccessorDeclaration(prop)) return 'get';
  if (ts.isSetAccessorDeclaration(prop)) return 'set';
  return 'value';
}

function isGetSetPair(existing: string, kind: string): boolean {
  return (existing === 'get' && kind === 'set') || (existing === 'set' && kind === 'get');
}

export function checkNoDupeKeys(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function checkObjectLiteral(node: ts.ObjectLiteralExpression): void {
    const seen = new Map<string, string>();
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) continue;
      const name = getPropertyName(prop, sourceFile);
      if (name === undefined) continue;
      const kind = getAccessorKind(prop);
      const existing = seen.get(name);
      if (existing && !isGetSetPair(existing, kind)) {
        const { line, column } = getLineAndColumn(sourceFile, prop.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'no-dupe-keys', message: `Duplicate key: "${name}"` }),
        );
      } else {
        seen.set(name, kind);
      }
    }
  }

  function visit(node: ts.Node) {
    if (ts.isObjectLiteralExpression(node)) checkObjectLiteral(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function isNaNIdentifier(node: ts.Node): boolean {
  return ts.isIdentifier(node) && node.text === 'NaN';
}

const EQUALITY_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

export function checkUseIsNaN(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function report(node: ts.Node, message: string): void {
    const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
    issues.push(createIssue({ file: filePath, line, column, severity, rule: 'use-isnan', message }));
  }

  function checkNaNComparison(node: ts.BinaryExpression): void {
    if (!EQUALITY_OPS.has(node.operatorToken.kind)) return;
    if (isNaNIdentifier(node.left) || isNaNIdentifier(node.right)) {
      report(node, 'Use Number.isNaN() instead of comparison with NaN');
    }
  }

  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node)) checkNaNComparison(node);
    if (ts.isSwitchStatement(node) && isNaNIdentifier(node.expression)) report(node, 'Use Number.isNaN() instead of switch(NaN)');
    if (ts.isCaseClause(node) && isNaNIdentifier(node.expression)) report(node, 'Use Number.isNaN() instead of case NaN');
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function expressionText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}

export function checkNoSelfAssign(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = expressionText(node.left, sourceFile);
      const right = expressionText(node.right, sourceFile);
      if (left === right) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'no-self-assign', message: `"${left}" is assigned to itself` }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoTemplateCurlyInString(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node)) {
      const text = node.text;
      if (/\$\{[^}]+\}/.test(text)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'no-template-curly-in-string', message: 'Unexpected template string expression in regular string' }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const COMPARISON_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
]);

export function checkNoSelfCompare(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node) && COMPARISON_OPS.has(node.operatorToken.kind)) {
      const left = expressionText(node.left, sourceFile);
      const right = expressionText(node.right, sourceFile);
      if (left === right) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'no-self-compare', message: `Comparing "${left}" to itself is always the same result` }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
