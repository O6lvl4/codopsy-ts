import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

export function checkNoUselessCatch(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isCatchClause(node) && node.variableDeclaration &&
        ts.isIdentifier(node.variableDeclaration.name)) {
      const paramName = node.variableDeclaration.name.text;
      const block = node.block;
      if (block.statements.length === 1) {
        const stmt = block.statements[0];
        if (ts.isThrowStatement(stmt) && stmt.expression &&
            ts.isIdentifier(stmt.expression) && stmt.expression.text === paramName) {
          const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
          issues.push(createIssue({
            file: filePath, line, column, severity, rule: 'no-useless-catch',
            message: 'Unnecessary catch clause that only rethrows the caught error',
          }));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function isSelfRenamedSpecifier(node: ts.ImportSpecifier | ts.ExportSpecifier): boolean {
  return !!node.propertyName && node.propertyName.text === node.name.text;
}

function getUselessRenameParts(node: ts.Node): { name: string; kind: string } | undefined {
  if (ts.isImportSpecifier(node) && isSelfRenamedSpecifier(node)) {
    return { name: node.name.text, kind: 'Import' };
  }
  if (ts.isExportSpecifier(node) && isSelfRenamedSpecifier(node)) {
    return { name: node.name.text, kind: 'Export' };
  }
  if (ts.isBindingElement(node) && node.propertyName &&
      ts.isIdentifier(node.propertyName) && ts.isIdentifier(node.name) &&
      node.propertyName.text === node.name.text) {
    return { name: node.name.text, kind: 'Destructuring' };
  }
  return undefined;
}

export function checkNoUselessRename(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    const parts = getUselessRenameParts(node);
    if (parts) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      issues.push(createIssue({
        file: filePath, line, column, severity, rule: 'no-useless-rename',
        message: `${parts.kind} ${parts.name} is unnecessarily renamed to itself`,
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const PARAM_PROPERTY_MODIFIERS = new Set([
  ts.SyntaxKind.PublicKeyword,
  ts.SyntaxKind.PrivateKeyword,
  ts.SyntaxKind.ProtectedKeyword,
  ts.SyntaxKind.ReadonlyKeyword,
]);

function hasParameterProperties(node: ts.ConstructorDeclaration): boolean {
  return node.parameters.some(p => {
    const mods = ts.canHaveModifiers(p) ? ts.getModifiers(p) : undefined;
    return mods?.some(m => PARAM_PROPERTY_MODIFIERS.has(m.kind)) ?? false;
  });
}

function isPassthroughSuperCall(node: ts.ConstructorDeclaration): boolean {
  const body = node.body;
  if (!body || body.statements.length !== 1) return false;
  const stmt = body.statements[0];
  if (!ts.isExpressionStatement(stmt) || !ts.isCallExpression(stmt.expression)) return false;
  if (stmt.expression.expression.kind !== ts.SyntaxKind.SuperKeyword) return false;
  const callArgs = stmt.expression.arguments;
  const params = node.parameters;
  return callArgs.length === params.length &&
    callArgs.every((arg, i) =>
      ts.isIdentifier(arg) && ts.isIdentifier(params[i].name) &&
      arg.text === (params[i].name as ts.Identifier).text
    );
}

export function checkNoUselessConstructor(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isConstructorDeclaration(node) && node.body) {
      let message: string | undefined;
      if (node.body.statements.length === 0 && !hasParameterProperties(node)) {
        message = 'Unnecessary constructor';
      } else if (isPassthroughSuperCall(node)) {
        message = 'Unnecessary constructor that only passes through to super';
      }
      if (message) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({ file: filePath, line, column, severity, rule: 'no-useless-constructor', message }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
