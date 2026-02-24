import * as ts from 'typescript';
import { Issue, Severity } from './types.js';
import { createIssue, getLineAndColumn } from './lint-utils.js';
import { collectBindingNames } from './ast-utils.js';
import { ASSIGNMENT_OPERATORS, UPDATE_OPERATORS, SCOPE_NODE_KINDS } from './syntax-kinds.js';

interface LetBinding {
  name: string;
  decl: ts.VariableDeclaration;
  reassigned: boolean;
}

type Scope = Map<string, LetBinding>;


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


function isScopeNode(node: ts.Node): boolean {
  return SCOPE_NODE_KINDS.has(node.kind);
}

function resolveBinding(scopeStack: Scope[], name: string): LetBinding | undefined {
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    const binding = scopeStack[i].get(name);
    if (binding) return binding;
  }
  return undefined;
}

function markReassigned(scopeStack: Scope[], names: string[]): void {
  for (const name of names) {
    const binding = resolveBinding(scopeStack, name);
    if (binding) binding.reassigned = true;
  }
}

export function checkPreferConst(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  const allBindings: LetBinding[] = [];
  const scopeStack: Scope[] = [];

  function pushScope(): Scope {
    const scope: Scope = new Map();
    scopeStack.push(scope);
    return scope;
  }

  function popScope(): void {
    scopeStack.pop();
  }

  function registerLetDecl(node: ts.VariableDeclarationList): void {
    if (!(node.flags & ts.NodeFlags.Let) || (node.flags & ts.NodeFlags.Const)) return;

    const parent = node.parent;
    if (parent && (ts.isForInStatement(parent) || ts.isForOfStatement(parent))) return;

    const currentScope = scopeStack[scopeStack.length - 1];
    for (const decl of node.declarations) {
      for (const name of collectBindingNames(decl.name)) {
        const binding: LetBinding = { name, decl, reassigned: false };
        currentScope.set(name, binding);
        allBindings.push(binding);
      }
    }
  }

  function checkBinaryReassignment(node: ts.Node): void {
    if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)) {
      markReassigned(scopeStack, collectAssignmentTargetNames(node.left));
    }
  }

  function checkUnaryReassignment(node: ts.Node): void {
    if (!ts.isPrefixUnaryExpression(node) && !ts.isPostfixUnaryExpression(node)) return;
    if (!UPDATE_OPERATORS.has(node.operator)) return;
    if (ts.isIdentifier(node.operand)) {
      markReassigned(scopeStack, [node.operand.text]);
    }
  }

  function checkForReassignment(node: ts.Node): void {
    if (!(ts.isForInStatement(node) || ts.isForOfStatement(node))) return;
    if (ts.isIdentifier(node.initializer)) {
      markReassigned(scopeStack, [node.initializer.text]);
    }
  }

  function checkReassignment(node: ts.Node): void {
    checkBinaryReassignment(node);
    checkUnaryReassignment(node);
    checkForReassignment(node);
  }

  function visit(node: ts.Node): void {
    const needsScope = isScopeNode(node) && !ts.isSourceFile(node);

    if (needsScope) pushScope();

    // Register let declarations in current scope
    if (ts.isVariableDeclarationList(node)) {
      registerLetDecl(node);
    }

    // Check for reassignments
    checkReassignment(node);

    ts.forEachChild(node, visit);

    if (needsScope) popScope();
  }

  // Start with the root scope
  pushScope();
  ts.forEachChild(sourceFile, visit);
  popScope();

  // Report unreassigned let declarations
  for (const binding of allBindings) {
    if (!binding.reassigned) {
      const { line, column } = getLineAndColumn(sourceFile, binding.decl.getStart(sourceFile));
      issues.push(
        createIssue({
          file: filePath,
          line,
          column,
          severity,
          rule: 'prefer-const',
          message: `'${binding.name}' is declared with let; consider using const if not reassigned`,
        }),
      );
    }
  }
}
