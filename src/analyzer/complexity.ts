import * as ts from 'typescript';
import { getScriptKind } from '../utils/file.js';
import { isFunctionNode, getFunctionName } from './ast-utils.js';

export interface FunctionComplexity {
  name: string;
  line: number;
  complexity: number;
  cognitiveComplexity: number;
}

export interface ComplexityResult {
  cyclomatic: number;
  cognitive: number;
  functions: FunctionComplexity[];
}

const COMPLEXITY_INCREMENT_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.CatchClause,
]);

function isLogicalBinaryExpression(node: ts.Node): boolean {
  if (!ts.isBinaryExpression(node)) return false;
  return (
    node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
    node.operatorToken.kind === ts.SyntaxKind.BarBarToken
  );
}

function calculateComplexity(node: ts.Node): number {
  let complexity = 0;

  function walk(child: ts.Node) {
    if (child !== node && isFunctionNode(child)) return;
    if (COMPLEXITY_INCREMENT_KINDS.has(child.kind) || isLogicalBinaryExpression(child)) {
      complexity++;
    }
    ts.forEachChild(child, walk);
  }

  ts.forEachChild(node, walk);
  return complexity;
}

// --- Cognitive complexity helpers ---

const COGNITIVE_NESTING_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ConditionalExpression,
]);

function isLoopOrSwitch(node: ts.Node): boolean {
  return ts.isForStatement(node) || ts.isForInStatement(node) ||
    ts.isForOfStatement(node) || ts.isWhileStatement(node) ||
    ts.isDoStatement(node) || ts.isSwitchStatement(node);
}

function isNestingConstruct(node: ts.Node): boolean {
  return isLoopOrSwitch(node) || ts.isCatchClause(node) || ts.isConditionalExpression(node);
}

function isLabeledJump(node: ts.Node): node is (ts.BreakStatement | ts.ContinueStatement) & { label: ts.Identifier } {
  return (ts.isBreakStatement(node) || ts.isContinueStatement(node)) && node.label !== undefined;
}

function collectLogicalOps(node: ts.Node, ops: ts.SyntaxKind[]): void {
  if (ts.isBinaryExpression(node)) {
    const kind = node.operatorToken.kind;
    if (kind === ts.SyntaxKind.AmpersandAmpersandToken || kind === ts.SyntaxKind.BarBarToken) {
      collectLogicalOps(node.left, ops);
      ops.push(kind);
      collectLogicalOps(node.right, ops);
      return;
    }
  }
}

function countLogicalOpSwitches(expr: ts.Node): number {
  const ops: ts.SyntaxKind[] = [];
  collectLogicalOps(expr, ops);
  let count = 0;
  let prevOp: ts.SyntaxKind | null = null;
  for (const op of ops) {
    if (op !== prevOp) count++;
    prevOp = op;
  }
  return count;
}

function handleIfStatement(
  node: ts.IfStatement,
  nesting: number,
  walkFn: (n: ts.Node, d: number) => void,
  addComplexity: (n: number) => void,
): void {
  const isElseIf = ts.isIfStatement(node.parent) && node.parent.elseStatement === node;

  addComplexity(isElseIf ? 1 : 1 + nesting);
  addComplexity(countLogicalOpSwitches(node.expression));

  ts.forEachChild(node.thenStatement, (child) => walkFn(child, nesting + 1));

  if (node.elseStatement) {
    if (ts.isIfStatement(node.elseStatement)) {
      walkFn(node.elseStatement, nesting);
    } else {
      addComplexity(1);
      ts.forEachChild(node.elseStatement, (child) => walkFn(child, nesting + 1));
    }
  }
}

function calculateCognitiveComplexity(funcNode: ts.Node): number {
  let complexity = 0;

  function walk(node: ts.Node, nesting: number): void {
    if (node !== funcNode && isFunctionNode(node)) return;

    if (ts.isIfStatement(node)) {
      handleIfStatement(node, nesting, walk, (n) => { complexity += n; });
      return;
    }

    if (isNestingConstruct(node)) {
      complexity += 1 + nesting;
      ts.forEachChild(node, (child) => walk(child, nesting + 1));
      return;
    }

    if (isLogicalBinaryExpression(node) && !isLogicalBinaryExpression(node.parent)) {
      complexity += countLogicalOpSwitches(node);
      return;
    }

    if (isLabeledJump(node)) {
      complexity++;
      return;
    }

    ts.forEachChild(node, (child) => walk(child, nesting));
  }

  ts.forEachChild(funcNode, (child) => walk(child, 0));
  return complexity;
}

export function analyzeComplexity(filePath: string, sourceCode: string): ComplexityResult {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );

  const functions: FunctionComplexity[] = [];

  function visit(node: ts.Node) {
    if (isFunctionNode(node)) {
      const name = getFunctionName(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      functions.push({
        name,
        line,
        complexity: 1 + calculateComplexity(node),
        cognitiveComplexity: calculateCognitiveComplexity(node),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const cyclomatic = functions.length > 0 ? Math.max(...functions.map((f) => f.complexity)) : 0;
  const cognitive = functions.length > 0 ? Math.max(...functions.map((f) => f.cognitiveComplexity)) : 0;

  return { cyclomatic, cognitive, functions };
}
