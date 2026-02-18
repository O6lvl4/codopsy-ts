import * as ts from 'typescript';
import { Issue, Severity } from './types.js';
import { getScriptKind } from '../utils/file.js';
import { CodopsyConfig } from '../config.js';
import { checkPreferConst } from './prefer-const.js';
import { checkNoParamReassign } from './rules/no-param-reassign.js';
import { checkMaxLines, checkMaxDepth, checkMaxParams } from './rules/threshold-rules.js';
import {
  checkNoAny, checkNoConsole, checkNoEmptyFunction, checkNoNestedTernary,
  checkNoVar, checkNoNonNullAssertion, checkEqeqeq,
} from './rules/style-rules.js';
import {
  checkNoDebugger, checkNoDuplicateCase, checkNoDupeKeys,
  checkUseIsNaN, checkNoSelfAssign, checkNoTemplateCurlyInString,
  checkNoSelfCompare,
} from './rules/bug-detection.js';
import {
  checkNoCondAssign, checkValidTypeof, checkNoConstantCondition,
} from './rules/condition-rules.js';
import { checkNoUnusedVars } from './rules/no-unused-vars.js';
import {
  checkNoEval, checkNoImpliedEval, checkNoWith, checkNoVoid,
  checkNoLabel, checkNoCommaOperator,
} from './rules/restriction-rules.js';
import {
  checkNoUselessCatch, checkNoUselessRename, checkNoUselessConstructor,
} from './rules/useless-code-rules.js';
import {
  checkNoSparseArrays, checkNoPrototypeBuiltins, checkNoArrayConstructor,
  checkNoThrowLiteral, checkNoAsyncPromiseExecutor, checkNoLossOfPrecision,
  checkNoConstantBinaryExpression, checkNoRegexConstructor,
} from './rules/error-prevention-rules.js';
import {
  checkNoUnreachable, checkNoFallthrough, checkNoUnsafeFinally,
} from './rules/control-flow-rules.js';
import {
  checkNoFloatingPromises, checkNoMisusedPromises, checkAwaitThenable,
} from './rules/promise-rules.js';
import type { RuleDefinition } from '../plugin.js';

type SimpleCheckFn = (sf: ts.SourceFile, fp: string, issues: Issue[], severity?: Severity) => void;
type SimpleRuleName = string;

const SIMPLE_RULES: Array<[SimpleRuleName, SimpleCheckFn]> = [
  ['no-any', checkNoAny],
  ['no-console', checkNoConsole],
  ['no-empty-function', checkNoEmptyFunction],
  ['no-nested-ternary', checkNoNestedTernary],
  ['prefer-const', checkPreferConst],
  ['no-var', checkNoVar],
  ['eqeqeq', checkEqeqeq],
  ['no-non-null-assertion', checkNoNonNullAssertion],
  ['no-debugger', checkNoDebugger],
  ['no-duplicate-case', checkNoDuplicateCase],
  ['no-dupe-keys', checkNoDupeKeys],
  ['use-isnan', checkUseIsNaN],
  ['no-self-assign', checkNoSelfAssign],
  ['no-template-curly-in-string', checkNoTemplateCurlyInString],
  ['no-self-compare', checkNoSelfCompare],
  ['no-cond-assign', checkNoCondAssign],
  ['valid-typeof', checkValidTypeof],
  ['no-constant-condition', checkNoConstantCondition],
  ['no-unused-vars', checkNoUnusedVars],
  ['no-eval', checkNoEval],
  ['no-implied-eval', checkNoImpliedEval],
  ['no-with', checkNoWith],
  ['no-void', checkNoVoid],
  ['no-label', checkNoLabel],
  ['no-comma-operator', checkNoCommaOperator],
  ['no-useless-catch', checkNoUselessCatch],
  ['no-useless-rename', checkNoUselessRename],
  ['no-useless-constructor', checkNoUselessConstructor],
  ['no-sparse-arrays', checkNoSparseArrays],
  ['no-prototype-builtins', checkNoPrototypeBuiltins],
  ['no-array-constructor', checkNoArrayConstructor],
  ['no-throw-literal', checkNoThrowLiteral],
  ['no-async-promise-executor', checkNoAsyncPromiseExecutor],
  ['no-loss-of-precision', checkNoLossOfPrecision],
  ['no-constant-binary-expression', checkNoConstantBinaryExpression],
  ['no-regex-constructor', checkNoRegexConstructor],
  ['no-unreachable', checkNoUnreachable],
  ['no-fallthrough', checkNoFallthrough],
  ['no-unsafe-finally', checkNoUnsafeFinally],
  ['no-floating-promises', checkNoFloatingPromises],
  ['no-misused-promises', checkNoMisusedPromises],
  ['await-thenable', checkAwaitThenable],
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

function getParamReassignOpts(ruleValue: unknown): { severity?: Severity; props?: boolean } {
  if (typeof ruleValue === 'string') return { severity: ruleValue as Severity };
  if (ruleValue && typeof ruleValue === 'object') {
    const obj = ruleValue as { severity?: Severity; props?: boolean };
    return { severity: obj.severity, props: obj.props };
  }
  return {};
}

interface RunChecksContext {
  sourceFile: ts.SourceFile;
  filePath: string;
  issues: Issue[];
  rules: CodopsyConfig['rules'];
  externalRules?: RuleDefinition[];
}

function runSimpleRules(ctx: RunChecksContext): void {
  const { sourceFile, filePath, issues, rules } = ctx;
  for (const [name, check] of SIMPLE_RULES) {
    if (rules?.[name] !== false) {
      check(sourceFile, filePath, issues, getRuleSeverity(rules?.[name]));
    }
  }
}

type ThresholdCheckFn = typeof checkMaxLines;
const THRESHOLD_RULES: Array<[string, ThresholdCheckFn]> = [
  ['max-lines', checkMaxLines],
  ['max-depth', checkMaxDepth],
  ['max-params', checkMaxParams],
];

function runThresholdRules(ctx: RunChecksContext): void {
  const { sourceFile, filePath, issues, rules } = ctx;
  for (const [name, check] of THRESHOLD_RULES) {
    if (rules?.[name] !== false) {
      check(sourceFile, filePath, issues, getThresholdOpts(rules?.[name]));
    }
  }
}

function runExternalRules(ctx: RunChecksContext): void {
  const { sourceFile, filePath, issues, rules, externalRules } = ctx;
  if (!externalRules) return;
  for (const rule of externalRules) {
    if (rules?.[rule.id] !== false) {
      const severity = getRuleSeverity(rules?.[rule.id]) ?? rule.defaultSeverity;
      rule.check(sourceFile, filePath, issues, severity);
    }
  }
}

function runChecks(ctx: RunChecksContext): void {
  const { sourceFile, filePath, issues, rules } = ctx;
  runSimpleRules(ctx);

  if (rules?.['no-param-reassign'] !== false) {
    const opts = getParamReassignOpts(rules?.['no-param-reassign']);
    checkNoParamReassign(sourceFile, filePath, issues, opts);
  }

  runThresholdRules(ctx);
  runExternalRules(ctx);
}

export function lintFile(
  filePath: string,
  sourceCode: string,
  config?: CodopsyConfig,
  externalRules?: RuleDefinition[],
): Issue[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );

  const issues: Issue[] = [];
  runChecks({ sourceFile, filePath, issues, rules: config?.rules, externalRules });
  return issues;
}
