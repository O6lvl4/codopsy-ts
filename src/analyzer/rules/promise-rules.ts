import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

/** Collect names of all `async function` declarations in the file */
function collectAsyncFunctionNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      names.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          init.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        names.add(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

const PROMISE_STATIC_METHODS = new Set(['resolve', 'reject', 'all', 'race', 'allSettled', 'any']);

function isPromiseCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) &&
      callee.expression.text === 'Promise' && PROMISE_STATIC_METHODS.has(callee.name.text)) {
    return true;
  }
  return false;
}

const HANDLED_PARENT_KINDS = new Set([
  ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.VoidExpression,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.VariableDeclaration,
]);

const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

function isHandled(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (HANDLED_PARENT_KINDS.has(parent.kind)) return true;
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) return true;
  if (ts.isPropertyAccessExpression(parent) && PROMISE_CHAIN_METHODS.has(parent.name.text) &&
      parent.parent && ts.isCallExpression(parent.parent)) {
    return true;
  }
  return false;
}

export function checkNoFloatingPromises(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  const asyncNames = collectAsyncFunctionNames(sourceFile);

  function visit(node: ts.Node) {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      // Call to known async function
      const callee = call.expression;
      let isAsyncCall = false;
      if (ts.isIdentifier(callee) && asyncNames.has(callee.text)) isAsyncCall = true;
      if (isPromiseCall(call)) isAsyncCall = true;

      if (isAsyncCall && !isHandled(call)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-floating-promises',
          message: 'Promise returned by this call must be handled (await, .then/.catch, void, or assignment)',
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const LOGICAL_OPS = new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken]);

function isConditionPosition(node: ts.Node, parent: ts.Node): boolean {
  if (ts.isIfStatement(parent)) return parent.expression === node;
  if (ts.isWhileStatement(parent)) return parent.expression === node;
  if (ts.isDoStatement(parent)) return parent.expression === node;
  if (ts.isConditionalExpression(parent)) return parent.condition === node;
  if (ts.isForStatement(parent)) return parent.condition === node;
  return false;
}

function isInCondition(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (isConditionPosition(node, parent)) return true;
  if (ts.isBinaryExpression(parent) && LOGICAL_OPS.has(parent.operatorToken.kind)) return true;
  if (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken) {
    return isInCondition(parent);
  }
  return false;
}

const ARRAY_METHODS = new Set(['filter', 'some', 'every', 'find', 'findIndex', 'map', 'forEach']);

function isAsyncCallback(node: ts.Node): boolean {
  return (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
}

export function checkNoMisusedPromises(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  const asyncNames = collectAsyncFunctionNames(sourceFile);

  function checkAsyncArrayCallback(node: ts.CallExpression): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    const method = node.expression.name.text;
    if (!ARRAY_METHODS.has(method) || node.arguments.length === 0) return;
    const callback = node.arguments[0];
    if (!isAsyncCallback(callback)) return;
    const { line, column } = getLineAndColumn(sourceFile, callback.getStart(sourceFile));
    issues.push(createIssue({
      file: filePath, line, column, severity, rule: 'no-misused-promises',
      message: `Async function passed to ${method}() which expects a synchronous callback`,
    }));
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && asyncNames.has(node.expression.text) && isInCondition(node)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-misused-promises',
          message: 'Promise-returning function used in a boolean context (always truthy)',
        }));
      }
      checkAsyncArrayCallback(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const LITERAL_KINDS = new Set([
  ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword, ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.RegularExpressionLiteral,
]);

export function checkAwaitThenable(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  function visit(node: ts.Node) {
    if (ts.isAwaitExpression(node)) {
      const operand = node.expression;
      // await "string", await 42, await true, etc.
      if (LITERAL_KINDS.has(operand.kind)) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'await-thenable',
          message: 'Unexpected await of a non-Promise (non-Thenable) value',
        }));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
