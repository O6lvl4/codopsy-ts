import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('lintFile', () => {
  describe('no-any', () => {
    it('any型を検出', () => {
      const issues = lintFile('test.ts', 'const x: any = 1;');
      expect(issues.some(i => i.rule === 'no-any')).toBe(true);
    });
    it('具体型は報告しない', () => {
      const issues = lintFile('test.ts', 'const x: number = 1;');
      expect(issues.some(i => i.rule === 'no-any')).toBe(false);
    });
  });

  describe('no-console', () => {
    it('console.logを検出', () => {
      const issues = lintFile('test.ts', 'console.log("hello");');
      expect(issues.some(i => i.rule === 'no-console')).toBe(true);
    });
    it('console.errorを検出', () => {
      const issues = lintFile('test.ts', 'console.error("error");');
      expect(issues.some(i => i.rule === 'no-console')).toBe(true);
    });
  });

  describe('max-lines', () => {
    it('300行以下は報告しない', () => {
      const code = Array(300).fill('// line').join('\n');
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'max-lines')).toBe(false);
    });
    it('301行以上で報告', () => {
      const code = Array(301).fill('// line').join('\n');
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'max-lines')).toBe(true);
    });
  });

  describe('no-empty-function', () => {
    it('空の関数を検出', () => {
      const issues = lintFile('test.ts', 'function foo() {}');
      expect(issues.some(i => i.rule === 'no-empty-function')).toBe(true);
    });
    it('中身がある関数は報告しない', () => {
      const issues = lintFile('test.ts', 'function foo() { return 1; }');
      expect(issues.some(i => i.rule === 'no-empty-function')).toBe(false);
    });
    it('空のアロー関数を検出', () => {
      const issues = lintFile('test.ts', 'const foo = () => {};');
      expect(issues.some(i => i.rule === 'no-empty-function')).toBe(true);
    });
  });

  describe('no-nested-ternary', () => {
    it('ネストした三項演算子を検出', () => {
      const code = 'const x = a ? (b ? 1 : 2) : 3;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-nested-ternary')).toBe(true);
    });
    it('単独の三項演算子は報告しない', () => {
      const code = 'const x = a ? 1 : 2;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-nested-ternary')).toBe(false);
    });
  });

  describe('prefer-const', () => {
    it('再代入されないlet宣言を検出', () => {
      const issues = lintFile('test.ts', 'let x = 1;');
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      expect(preferConst.length).toBe(1);
      expect(preferConst[0].message).toContain('x');
    });
    it('再代入されるlet宣言は報告しない', () => {
      const code = 'let x = 1;\nx = 2;';
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      expect(preferConst.length).toBe(0);
    });
  });

  describe('no-var', () => {
    it('var宣言を検出', () => {
      const issues = lintFile('test.ts', 'var x = 1;');
      const noVar = issues.filter(i => i.rule === 'no-var');
      expect(noVar.length).toBe(1);
    });
    it('let/constは報告しない', () => {
      const issues = lintFile('test.ts', 'let x = 1;\nconst y = 2;');
      const noVar = issues.filter(i => i.rule === 'no-var');
      expect(noVar.length).toBe(0);
    });
  });

  describe('eqeqeq', () => {
    it('==を検出', () => {
      const issues = lintFile('test.ts', 'if (x == 1) {}');
      const eqeqeq = issues.filter(i => i.rule === 'eqeqeq');
      expect(eqeqeq.length).toBe(1);
      expect(eqeqeq[0].message).toContain('===');
    });
    it('===は報告しない', () => {
      const issues = lintFile('test.ts', 'if (x === 1) {}');
      const eqeqeq = issues.filter(i => i.rule === 'eqeqeq');
      expect(eqeqeq.length).toBe(0);
    });
  });

  describe('max-depth', () => {
    it('深いネストを検出', () => {
      const code = `
        function foo() {
          if (true) {
            if (true) {
              if (true) {
                if (true) {
                  if (true) {}
                }
              }
            }
          }
        }
      `;
      const issues = lintFile('test.ts', code);
      const maxDepth = issues.filter(i => i.rule === 'max-depth');
      expect(maxDepth.length).toBeGreaterThanOrEqual(1);
    });
    it('浅いネストは報告しない', () => {
      const code = `
        function foo() {
          if (true) {
            if (true) {}
          }
        }
      `;
      const issues = lintFile('test.ts', code);
      const maxDepth = issues.filter(i => i.rule === 'max-depth');
      expect(maxDepth.length).toBe(0);
    });
  });

  describe('max-params', () => {
    it('パラメータ数超過を検出', () => {
      const code = 'function foo(a: number, b: number, c: number, d: number, e: number) {}';
      const issues = lintFile('test.ts', code);
      const maxParams = issues.filter(i => i.rule === 'max-params');
      expect(maxParams.length).toBe(1);
    });
    it('パラメータ数が閾値以内なら報告しない', () => {
      const code = 'function foo(a: number, b: number) {}';
      const issues = lintFile('test.ts', code);
      const maxParams = issues.filter(i => i.rule === 'max-params');
      expect(maxParams.length).toBe(0);
    });
  });

  describe('no-param-reassign', () => {
    it('パラメータへの再代入を検出', () => {
      const code = 'function foo(x: number) { x = 2; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
      expect(noParamReassign[0].message).toContain('x');
    });
    it('パラメータを読むだけなら報告しない', () => {
      const code = 'function foo(x: number) { return x + 1; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(0);
    });
  });

  describe('ルール設定', () => {
    it('no-any を false で無効化', () => {
      const issues = lintFile('test.ts', 'const x: any = 1;', { rules: { 'no-any': false } });
      expect(issues.some(i => i.rule === 'no-any')).toBe(false);
    });
    it('no-console を false で無効化', () => {
      const issues = lintFile('test.ts', 'console.log("hello");', { rules: { 'no-console': false } });
      expect(issues.some(i => i.rule === 'no-console')).toBe(false);
    });
    it('prefer-const を false で無効化', () => {
      const issues = lintFile('test.ts', 'let x = 1;', { rules: { 'prefer-const': false } });
      expect(issues.some(i => i.rule === 'prefer-const')).toBe(false);
    });
    it('no-var を false で無効化', () => {
      const issues = lintFile('test.ts', 'var x = 1;', { rules: { 'no-var': false } });
      expect(issues.some(i => i.rule === 'no-var')).toBe(false);
    });
    it('eqeqeq を false で無効化', () => {
      const issues = lintFile('test.ts', 'if (x == 1) {}', { rules: { 'eqeqeq': false } });
      expect(issues.some(i => i.rule === 'eqeqeq')).toBe(false);
    });
    it('max-depth を false で無効化', () => {
      const code = `
        function foo() {
          if (true) { if (true) { if (true) { if (true) { if (true) {} } } } }
        }
      `;
      const issues = lintFile('test.ts', code, { rules: { 'max-depth': false } });
      expect(issues.some(i => i.rule === 'max-depth')).toBe(false);
    });
    it('max-params を false で無効化', () => {
      const code = 'function foo(a: number, b: number, c: number, d: number, e: number) {}';
      const issues = lintFile('test.ts', code, { rules: { 'max-params': false } });
      expect(issues.some(i => i.rule === 'max-params')).toBe(false);
    });
    it('no-param-reassign を false で無効化', () => {
      const code = 'function foo(x: number) { x = 2; }';
      const issues = lintFile('test.ts', code, { rules: { 'no-param-reassign': false } });
      expect(issues.some(i => i.rule === 'no-param-reassign')).toBe(false);
    });
    it('severityをカスタマイズ', () => {
      const issues = lintFile('test.ts', 'const x: any = 1;', { rules: { 'no-any': 'error' } });
      const noAny = issues.filter(i => i.rule === 'no-any');
      expect(noAny[0].severity).toBe('error');
    });
  });
});
