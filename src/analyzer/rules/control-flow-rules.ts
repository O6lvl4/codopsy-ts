import * as ts from 'typescript';
import { Issue, Severity } from '../types.js';
import { createIssue, getLineAndColumn } from '../lint-utils.js';

const TERMINATOR_KINDS = new Set([
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement,
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
]);

export function checkNoUnreachable(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function checkBlock(statements: ts.NodeArray<ts.Statement>): void {
    let terminated = false;
    for (const stmt of statements) {
      if (terminated) {
        const { line, column } = getLineAndColumn(sourceFile, stmt.getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-unreachable',
          message: 'Unreachable code detected',
        }));
        return; // Report only the first unreachable statement
      }
      if (TERMINATOR_KINDS.has(stmt.kind)) terminated = true;
    }
  }

  function visit(node: ts.Node) {
    if (ts.isBlock(node)) checkBlock(node.statements);
    if (ts.isSourceFile(node)) checkBlock(node.statements);
    if (ts.isCaseClause(node)) checkBlock(node.statements);
    if (ts.isDefaultClause(node)) checkBlock(node.statements);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function hasTerminator(stmts: ts.NodeArray<ts.Statement>): boolean {
  if (stmts.length === 0) return false;
  const last = stmts[stmts.length - 1];
  if (TERMINATOR_KINDS.has(last.kind)) return true;
  // Check if block ends with terminator
  if (ts.isBlock(last)) return hasTerminator(last.statements);
  // Check if-else where both branches terminate
  if (ts.isIfStatement(last) && last.elseStatement) {
    const thenTerminates = ts.isBlock(last.thenStatement)
      ? hasTerminator(last.thenStatement.statements)
      : TERMINATOR_KINDS.has(last.thenStatement.kind);
    const elseTerminates = ts.isBlock(last.elseStatement)
      ? hasTerminator(last.elseStatement.statements)
      : TERMINATOR_KINDS.has(last.elseStatement.kind);
    return thenTerminates && elseTerminates;
  }
  return false;
}

function hasFallsThrough(text: string, commentRanges: ts.CommentRange[] | undefined): boolean {
  if (!commentRanges) return false;
  return commentRanges.some(range => {
    const comment = text.substring(range.pos, range.end).toLowerCase();
    return comment.includes('falls through') || comment.includes('fallthrough') ||
           comment.includes('fall through') || comment.includes('no break');
  });
}

function isFallthroughClause(clause: ts.CaseOrDefaultClause, nextClause: ts.CaseOrDefaultClause, text: string): boolean {
  if (clause.statements.length === 0) return false;
  if (hasTerminator(clause.statements)) return false;
  const trailingRanges = ts.getTrailingCommentRanges(text, clause.end);
  const leadingRanges = ts.getLeadingCommentRanges(text, nextClause.getFullStart());
  return !hasFallsThrough(text, trailingRanges) && !hasFallsThrough(text, leadingRanges);
}

export function checkNoFallthrough(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  const text = sourceFile.getFullText();

  function checkSwitch(node: ts.SwitchStatement): void {
    const clauses = node.caseBlock.clauses;
    for (let i = 0; i < clauses.length - 1; i++) {
      if (isFallthroughClause(clauses[i], clauses[i + 1], text)) {
        const { line, column } = getLineAndColumn(sourceFile, clauses[i].getStart(sourceFile));
        issues.push(createIssue({
          file: filePath, line, column, severity, rule: 'no-fallthrough',
          message: 'Expected a break, return, or throw statement before the next case',
        }));
      }
    }
  }

  function visit(node: ts.Node) {
    if (ts.isSwitchStatement(node)) checkSwitch(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const UNSAFE_FINALLY_KINDS = new Set([
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement,
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
]);

export function checkNoUnsafeFinally(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    if (ts.isTryStatement(node) && node.finallyBlock) {
      function checkFinally(n: ts.Node) {
        if (UNSAFE_FINALLY_KINDS.has(n.kind)) {
          const { line, column } = getLineAndColumn(sourceFile, n.getStart(sourceFile));
          issues.push(createIssue({
            file: filePath, line, column, severity, rule: 'no-unsafe-finally',
            message: 'Unsafe use of control flow statement in finally block',
          }));
          return;
        }
        // Don't recurse into nested try/function (their finally is separate)
        if (n !== node.finallyBlock && (ts.isTryStatement(n) || ts.isFunctionDeclaration(n) ||
            ts.isFunctionExpression(n) || ts.isArrowFunction(n))) return;
        ts.forEachChild(n, checkFinally);
      }
      checkFinally(node.finallyBlock);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
