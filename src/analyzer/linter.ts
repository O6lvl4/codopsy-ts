import * as ts from 'typescript';
import { Issue, Severity } from './types.js';
import { createIssue, getLineAndColumn } from './lint-utils.js';
import { getScriptKind } from '../utils/file.js';
import { CodopsyConfig } from '../config.js';
import { checkPreferConst } from './prefer-const.js';
import { checkNoParamReassign } from './rules/no-param-reassign.js';
import { checkMaxLines, checkMaxDepth, checkMaxParams } from './rules/threshold-rules.js';

function checkNoAny(
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

function checkNoConsole(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'info',
): void {
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const expr = node.expression;
      if (
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === 'console'
      ) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        issues.push(
          createIssue({
            file: filePath,
            line,
            column,
            severity,
            rule: 'no-console',
            message: `Unexpected console.${expr.name.text} statement`,
          }),
        );
      }
    }
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

function checkNoEmptyFunction(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity: Severity = 'warning',
): void {
  function visit(node: ts.Node) {
    const body = getFunctionBody(node);

    if (body && body.statements.length === 0) {
      const bodyText = body.getText(sourceFile).slice(1, -1).trim();
      // Only flag truly empty functions (no content at all).
      // Functions with comments are considered intentional (e.g. event handlers, keep-alive callbacks).
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

function checkNoNestedTernary(
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
        // Stop recursion at JSX boundaries — ternaries inside JSX elements
        // (e.g. style props, child expressions) are in a separate visual context
        // and should not be treated as nested ternaries.
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

function checkNoVar(
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

function checkEqeqeq(
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

type SimpleCheckFn = (sf: ts.SourceFile, fp: string, issues: Issue[], severity?: Severity) => void;
type SimpleRuleName = 'no-any' | 'no-console' | 'no-empty-function' | 'no-nested-ternary' | 'prefer-const' | 'no-var' | 'eqeqeq' | 'no-param-reassign';

const SIMPLE_RULES: Array<[SimpleRuleName, SimpleCheckFn]> = [
  ['no-any', checkNoAny],
  ['no-console', checkNoConsole],
  ['no-empty-function', checkNoEmptyFunction],
  ['no-nested-ternary', checkNoNestedTernary],
  ['prefer-const', checkPreferConst],
  ['no-var', checkNoVar],
  ['eqeqeq', checkEqeqeq],
  ['no-param-reassign', checkNoParamReassign],
];

function getRuleSeverity(ruleValue: undefined | false | string | { severity?: string }): Severity | undefined {
  if (typeof ruleValue === 'string') return ruleValue as Severity;
  return undefined;
}

function getThresholdOpts(ruleValue: unknown): { severity?: Severity; max?: number } {
  if (ruleValue && typeof ruleValue === 'object') {
    const obj = ruleValue as { severity?: Severity; max?: number };
    return { severity: obj.severity, max: obj.max };
  }
  return {};
}

function runChecks(
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  rules: CodopsyConfig['rules'],
): void {
  for (const [name, check] of SIMPLE_RULES) {
    if (rules?.[name] !== false) {
      check(sourceFile, filePath, issues, getRuleSeverity(rules?.[name]));
    }
  }

  if (rules?.['max-lines'] !== false) {
    checkMaxLines(sourceFile, filePath, issues, getThresholdOpts(rules?.['max-lines']));
  }

  if (rules?.['max-depth'] !== false) {
    checkMaxDepth(sourceFile, filePath, issues, getThresholdOpts(rules?.['max-depth']));
  }

  if (rules?.['max-params'] !== false) {
    checkMaxParams(sourceFile, filePath, issues, getThresholdOpts(rules?.['max-params']));
  }
}

export function lintFile(filePath: string, sourceCode: string, config?: CodopsyConfig): Issue[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );

  const issues: Issue[] = [];
  runChecks(sourceFile, filePath, issues, config?.rules);
  return issues;
}
