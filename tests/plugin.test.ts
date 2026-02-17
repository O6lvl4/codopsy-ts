import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { lintFile } from '../src/analyzer/linter.js';
import type { RuleDefinition } from '../src/plugin.js';
import type { Issue, Severity } from '../src/analyzer/types.js';

function makeRule(id: string, defaultSeverity: Severity = 'warning'): RuleDefinition {
  return {
    id,
    description: `Test rule: ${id}`,
    defaultSeverity,
    check: (sourceFile: ts.SourceFile, filePath: string, issues: Issue[], severity: Severity = defaultSeverity) => {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity,
        rule: id,
        message: `${id} triggered`,
      });
    },
  };
}

describe('Plugin rules in lintFile', () => {
  it('runs external rules alongside built-in rules', () => {
    const customRule = makeRule('custom/test-rule');
    const issues = lintFile('test.ts', 'const x = 1;', {}, [customRule]);

    expect(issues.some(i => i.rule === 'custom/test-rule')).toBe(true);
  });

  it('respects severity from config for plugin rules', () => {
    const customRule = makeRule('custom/test-rule', 'warning');
    const config = { rules: { 'custom/test-rule': 'error' as const } };
    const issues = lintFile('test.ts', 'const x = 1;', config, [customRule]);

    const pluginIssue = issues.find(i => i.rule === 'custom/test-rule');
    expect(pluginIssue).toBeDefined();
    expect(pluginIssue!.severity).toBe('error');
  });

  it('disables plugin rule when config sets it to false', () => {
    const customRule = makeRule('custom/disabled-rule');
    const config = { rules: { 'custom/disabled-rule': false as const } };
    const issues = lintFile('test.ts', 'const x = 1;', config, [customRule]);

    expect(issues.some(i => i.rule === 'custom/disabled-rule')).toBe(false);
  });

  it('uses default severity when config has no override', () => {
    const customRule = makeRule('custom/info-rule', 'info');
    const issues = lintFile('test.ts', 'const x = 1;', {}, [customRule]);

    const pluginIssue = issues.find(i => i.rule === 'custom/info-rule');
    expect(pluginIssue!.severity).toBe('info');
  });

  it('runs multiple plugin rules', () => {
    const rules = [makeRule('custom/rule-a'), makeRule('custom/rule-b')];
    const issues = lintFile('test.ts', 'const x = 1;', {}, rules);

    expect(issues.filter(i => i.rule.startsWith('custom/')).length).toBe(2);
  });

  it('works without external rules (backward compatible)', () => {
    const issues = lintFile('test.ts', 'var x = 1;');
    expect(issues.some(i => i.rule === 'no-var')).toBe(true);
  });
});
