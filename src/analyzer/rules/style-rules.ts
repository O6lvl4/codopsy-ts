import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

export function checkNoAny(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(
        createIssue({ file: filePath, line, column, severity, rule: 'no-any', message: 'Avoid using "any" type' }),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function collectDestructuredAliases(
  node: ts.VariableDeclaration,
  aliases: Map<string, string>,
): void {
  if (!ts.isObjectBindingPattern(node.name)) return;
  for (const element of node.name.elements) {
    if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
      const methodName = element.propertyName && ts.isIdentifier(element.propertyName)
        ? element.propertyName.text
        : element.name.text;
      aliases.set(element.name.text, methodName);
    }
  }
}

function collectConsoleAliases(sourceFile: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      // const { log, warn } = console;
      if (ts.isIdentifier(node.initializer) && node.initializer.text === 'console') {
        collectDestructuredAliases(node, aliases);
      }
      // const log = console.log;
      if (
        ts.isIdentifier(node.name) &&
        ts.isPropertyAccessExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === 'console'
      ) {
        aliases.set(node.name.text, node.initializer.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return aliases;
}

export function checkNoConsole(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  function report(node: ts.Node, method: string): void {
    const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
    issues.push(
      createIssue({
        file: filePath,
        line,
        column,
        severity,
        rule: 'no-console',
        message: `Unexpected console.${method} statement`,
      }),
    );
  }

  const consoleAliases = collectConsoleAliases(sourceFile);

  function checkConsoleCall(node: ts.CallExpression): void {
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'console') {
      report(node, callee.name.text);
      return;
    }
    if (ts.isElementAccessExpression(callee) && ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'console' && ts.isStringLiteral(callee.argumentExpression)) {
      report(node, callee.argumentExpression.text);
      return;
    }
    if (ts.isIdentifier(callee)) {
      const method = consoleAliases.get(callee.text);
      if (method) report(node, method);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) checkConsoleCall(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const FUNCTION_KINDS_WITH_BODY = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

function getFunctionBody(node: ts.Node): ts.Block | undefined {
  if (FUNCTION_KINDS_WITH_BODY.has(node.kind)) {
    const body = (node as ts.FunctionDeclaration).body;
    return body && ts.isBlock(body) ? body : undefined;
  }
  if (ts.isArrowFunction(node) && node.body && ts.isBlock(node.body)) {
    return node.body;
  }
  return undefined;
}

export function checkNoEmptyFunction(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    const body = getFunctionBody(node);

    if (body && body.statements.length === 0) {
      const bodyText = body.getText(sourceFile).slice(1, -1).trim();
      if (bodyText === '') {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({
            file: filePath,
            line,
            column,
            severity,
            rule: 'no-empty-function',
            message: 'Unexpected empty function',
          }),
        );
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

/** Check if a node is a JSX boundary (element, self-closing, or fragment). */
function isJsxBoundary(node: ts.Node): boolean {
  return ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node);
}

export function checkNoNestedTernary(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isConditionalExpression(node)) {
      function hasNestedTernary(child: ts.Node): boolean {
        if (child !== node && ts.isConditionalExpression(child)) {
          return true;
        }
        if (isJsxBoundary(child)) {
          return false;
        }
        return ts.forEachChild(child, (grandchild) => {
          if (hasNestedTernary(grandchild)) return true;
          return undefined;
        }) ?? false;
      }

      if (hasNestedTernary(node)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({
            file: filePath,
            line,
            column,
            severity,
            rule: 'no-nested-ternary',
            message: 'Do not nest ternary expressions',
          }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoVar(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isVariableDeclarationList(node)) {
      if (!(node.flags & ts.NodeFlags.Const) && !(node.flags & ts.NodeFlags.Let)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'no-var', message: 'Unexpected var, use let or const instead' }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkNoNonNullAssertion(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isNonNullExpression(node)) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(
        createIssue({ file: filePath, line, column, severity, rule: 'no-non-null-assertion', message: 'Forbidden non-null assertion' }),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkEqeqeq(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsEqualsToken) {
        const { line, column } = getLineAndColumn(sourceFile, node.operatorToken.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'eqeqeq', message: 'Expected "===" but found "=="' }),
        );
      } else if (op === ts.SyntaxKind.ExclamationEqualsToken) {
        const { line, column } = getLineAndColumn(sourceFile, node.operatorToken.getStart(sourceFile));
        issues.push(
          createIssue({ file: filePath, line, column, severity, rule: 'eqeqeq', message: 'Expected "!==" but found "!="' }),
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
