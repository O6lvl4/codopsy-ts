import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

interface Declaration {
  name: string;
  node: ts.Node;
  kind: 'variable' | 'function' | 'class' | 'import' | 'parameter' | 'enum';
  exported: boolean;
  used: boolean;
}

type Scope = Map<string, Declaration>;

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

const TYPE_LEVEL_KINDS = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.ConstructorType,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.ConstructSignature,
  ts.SyntaxKind.IndexSignature,
]);

const RUNTIME_BOUNDARY_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression,
]);

/** Check if a parameter is in a type-level construct (interface, type alias, abstract method) */
function isTypeLevelParameter(node: ts.Node): boolean {
  let current = node.parent;
  while (current) {
    if (TYPE_LEVEL_KINDS.has(current.kind)) return true;
    if (RUNTIME_BOUNDARY_KINDS.has(current.kind)) return false;
    current = current.parent;
  }
  return false;
}

const DECLARATION_POSITION_KINDS = new Set([
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.ImportSpecifier,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamespaceImport,
  ts.SyntaxKind.BindingElement,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.LabeledStatement,
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
]);

const LABEL_STATEMENT_KINDS = new Set([
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
]);

function isDeclarationPosition(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) return false;
  if (!DECLARATION_POSITION_KINDS.has(parent.kind)) return false;
  if ('name' in parent && (parent as { name: ts.Node }).name === node) return true;
  if ('label' in parent && (parent as { label: ts.Node }).label === node) return true;
  return LABEL_STATEMENT_KINDS.has(parent.kind);
}

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

const SCOPE_KINDS = new Set([
  ts.SyntaxKind.Block,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression,
]);

export function checkNoUnusedVars(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  const allDecls: Declaration[] = [];
  const scopeStack: Scope[] = [];

  function pushScope(): void { scopeStack.push(new Map()); }
  function popScope(): void { scopeStack.pop(); }
  function currentScope(): Scope { return scopeStack[scopeStack.length - 1]; }

  function register(name: string, node: ts.Node, kind: Declaration['kind'], exported: boolean): void {
    const scope = currentScope();
    if (scope.has(name)) return; // Already registered (e.g., hoisted pre-scan)
    const decl: Declaration = { name, node, kind, exported, used: exported };
    scope.set(name, decl);
    allDecls.push(decl);
  }

  function markUsed(name: string): void {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const decl = scopeStack[i].get(name);
      if (decl) { decl.used = true; return; }
    }
  }

  function registerHoisted(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      register(node.name.text, node, 'function', hasExportModifier(node));
    }
    if (ts.isClassDeclaration(node) && node.name) {
      register(node.name.text, node, 'class', hasExportModifier(node));
    }
    if (ts.isEnumDeclaration(node)) {
      register(node.name.text, node, 'enum', hasExportModifier(node));
    }
  }

  function registerVariable(node: ts.VariableDeclaration): void {
    const stmt = node.parent?.parent;
    const exported = !!stmt && hasExportModifier(stmt);
    for (const name of collectBindingNames(node.name)) {
      register(name, node, 'variable', exported);
    }
  }

  function registerParameter(node: ts.ParameterDeclaration): void {
    if (isTypeLevelParameter(node)) return;
    for (const name of collectBindingNames(node.name)) {
      const decl: Declaration = {
        name, node, kind: 'parameter', exported: false, used: name.startsWith('_'),
      };
      currentScope().set(name, decl);
      allDecls.push(decl);
    }
  }

  function registerImport(node: ts.ImportDeclaration): void {
    if (!node.importClause) return;
    const clause = node.importClause;
    if (clause.name) register(clause.name.text, clause.name, 'import', false);
    if (!clause.namedBindings) return;
    if (ts.isNamespaceImport(clause.namedBindings)) {
      register(clause.namedBindings.name.text, clause.namedBindings, 'import', false);
    }
    if (ts.isNamedImports(clause.namedBindings)) {
      for (const spec of clause.namedBindings.elements) {
        register(spec.name.text, spec, 'import', false);
      }
    }
  }

  function checkJsxUsage(node: ts.Node): void {
    if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))) return;
    if (ts.isIdentifier(node.tagName) && /^[A-Z]/.test(node.tagName.text)) {
      markUsed(node.tagName.text);
    }
  }

  function checkTypeUsage(node: ts.Node): void {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) markUsed(node.typeName.text);
    if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) markUsed(node.exprName.text);
  }

  function checkExportUsage(node: ts.Node): void {
    if (ts.isExportSpecifier(node)) markUsed(node.propertyName?.text ?? node.name.text);
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) markUsed(node.expression.text);
  }

  function checkUsage(node: ts.Node): void {
    if (ts.isIdentifier(node) && !isDeclarationPosition(node)) markUsed(node.text);
    checkJsxUsage(node);
    checkTypeUsage(node);
    checkExportUsage(node);
  }

  function visit(node: ts.Node): void {
    registerHoisted(node);
    const needsScope = SCOPE_KINDS.has(node.kind);
    if (needsScope) pushScope();

    if (ts.isVariableDeclaration(node) && !ts.isParameter(node.parent)) registerVariable(node);
    if (ts.isParameter(node)) registerParameter(node);
    if (ts.isImportDeclaration(node)) registerImport(node);
    checkUsage(node);

    ts.forEachChild(node, visit);
    if (needsScope) popScope();
  }

  pushScope();
  // Pre-scan module-level hoisted declarations (function hoisting)
  ts.forEachChild(sourceFile, (child) => registerHoisted(child));
  ts.forEachChild(sourceFile, visit);
  popScope();

  for (const decl of allDecls) {
    if (decl.used) continue;
    const { line, column } = getLineAndColumn(sourceFile, decl.node.getStart(sourceFile));
    const UNUSED_LABELS: Record<string, string> = {
      import: 'is imported but never used',
      parameter: 'is defined but never used',
    };
    const label = UNUSED_LABELS[decl.kind] ?? 'is declared but never used';
    issues.push(createIssue({
      file: filePath, line, column, severity,
      rule: 'no-unused-vars',
      message: `'${decl.name}' ${label}`,
    }));
  }
}
