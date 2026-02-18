import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('restriction-rules', () => {
  describe('no-eval', () => {
    it('eval()を検出', () => {
      const issues = lintFile('test.ts', 'eval("code");');
      expect(issues.some(i => i.rule === 'no-eval')).toBe(true);
    });
    it('window.eval()を検出', () => {
      const issues = lintFile('test.ts', 'window.eval("code");');
      expect(issues.some(i => i.rule === 'no-eval')).toBe(true);
    });
    it('globalThis.eval()を検出', () => {
      const issues = lintFile('test.ts', 'globalThis.eval("code");');
      expect(issues.some(i => i.rule === 'no-eval')).toBe(true);
    });
    it('eval以外の関数は報告しない', () => {
      const issues = lintFile('test.ts', 'myFunc("code");');
      expect(issues.some(i => i.rule === 'no-eval')).toBe(false);
    });
  });

  describe('no-implied-eval', () => {
    it('setTimeout(string)を検出', () => {
      const issues = lintFile('test.ts', 'setTimeout("alert(1)", 100);');
      expect(issues.some(i => i.rule === 'no-implied-eval')).toBe(true);
    });
    it('setInterval(string)を検出', () => {
      const issues = lintFile('test.ts', 'setInterval("code", 100);');
      expect(issues.some(i => i.rule === 'no-implied-eval')).toBe(true);
    });
    it('setTimeout(function)は報告しない', () => {
      const issues = lintFile('test.ts', 'setTimeout(() => {}, 100);');
      expect(issues.some(i => i.rule === 'no-implied-eval')).toBe(false);
    });
  });

  describe('no-with', () => {
    it('with文を検出', () => {
      const issues = lintFile('test.js', 'with (obj) { x = 1; }');
      expect(issues.some(i => i.rule === 'no-with')).toBe(true);
    });
  });

  describe('no-void', () => {
    it('式の中のvoidを検出', () => {
      const issues = lintFile('test.ts', 'const x = void 0;');
      expect(issues.some(i => i.rule === 'no-void')).toBe(true);
    });
    it('文レベルのvoidは許可（Promise suppression）', () => {
      const issues = lintFile('test.ts', 'void asyncFunc();');
      expect(issues.some(i => i.rule === 'no-void')).toBe(false);
    });
  });

  describe('no-label', () => {
    it('ラベル付き文を検出', () => {
      const issues = lintFile('test.ts', 'outer: for (;;) { break outer; }');
      expect(issues.some(i => i.rule === 'no-label')).toBe(true);
    });
  });

  describe('no-comma-operator', () => {
    it('カンマ演算子を検出', () => {
      const issues = lintFile('test.ts', 'const x = (1, 2);');
      expect(issues.some(i => i.rule === 'no-comma-operator')).toBe(true);
    });
    it('for文内のカンマは許可', () => {
      const issues = lintFile('test.ts', 'for (let i = 0, j = 0; i < 10; i++, j++) {}');
      expect(issues.some(i => i.rule === 'no-comma-operator')).toBe(false);
    });
  });
});
