import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('error-prevention-rules', () => {
  describe('no-sparse-arrays', () => {
    it('[1,,3] を検出', () => {
      const issues = lintFile('test.ts', 'const a = [1,,3];');
      expect(issues.some(i => i.rule === 'no-sparse-arrays')).toBe(true);
    });
    it('[1,2,3] は報告しない', () => {
      const issues = lintFile('test.ts', 'const a = [1,2,3];');
      expect(issues.some(i => i.rule === 'no-sparse-arrays')).toBe(false);
    });
  });

  describe('no-prototype-builtins', () => {
    it('obj.hasOwnProperty() を検出', () => {
      const issues = lintFile('test.ts', 'obj.hasOwnProperty("key");');
      expect(issues.some(i => i.rule === 'no-prototype-builtins')).toBe(true);
    });
    it('Object.hasOwn() は報告しない', () => {
      const issues = lintFile('test.ts', 'Object.hasOwn(obj, "key");');
      expect(issues.some(i => i.rule === 'no-prototype-builtins')).toBe(false);
    });
  });

  describe('no-array-constructor', () => {
    it('new Array() を検出', () => {
      const issues = lintFile('test.ts', 'const a = new Array(1, 2, 3);');
      expect(issues.some(i => i.rule === 'no-array-constructor')).toBe(true);
    });
    it('new Array(10) はサイズ指定として許可', () => {
      const issues = lintFile('test.ts', 'const a = new Array(10);');
      expect(issues.some(i => i.rule === 'no-array-constructor')).toBe(false);
    });
    it('配列リテラルは報告しない', () => {
      const issues = lintFile('test.ts', 'const a = [1, 2, 3];');
      expect(issues.some(i => i.rule === 'no-array-constructor')).toBe(false);
    });
  });

  describe('no-throw-literal', () => {
    it('throw "error" を検出', () => {
      const issues = lintFile('test.ts', 'throw "something went wrong";');
      expect(issues.some(i => i.rule === 'no-throw-literal')).toBe(true);
    });
    it('throw 42 を検出', () => {
      const issues = lintFile('test.ts', 'throw 42;');
      expect(issues.some(i => i.rule === 'no-throw-literal')).toBe(true);
    });
    it('throw new Error() は報告しない', () => {
      const issues = lintFile('test.ts', 'throw new Error("msg");');
      expect(issues.some(i => i.rule === 'no-throw-literal')).toBe(false);
    });
  });

  describe('no-async-promise-executor', () => {
    it('new Promise(async () => ...) を検出', () => {
      const code = 'new Promise(async (resolve) => { resolve(1); });';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-async-promise-executor')).toBe(true);
    });
    it('new Promise((resolve) => ...) は報告しない', () => {
      const code = 'new Promise((resolve) => { resolve(1); });';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-async-promise-executor')).toBe(false);
    });
  });

  describe('no-loss-of-precision', () => {
    it('MAX_SAFE_INTEGER超過を検出', () => {
      const issues = lintFile('test.ts', 'const x = 9007199254740993;');
      expect(issues.some(i => i.rule === 'no-loss-of-precision')).toBe(true);
    });
    it('安全な整数は報告しない', () => {
      const issues = lintFile('test.ts', 'const x = 9007199254740991;');
      expect(issues.some(i => i.rule === 'no-loss-of-precision')).toBe(false);
    });
  });

  describe('no-constant-binary-expression', () => {
    it('{} || x を検出', () => {
      const issues = lintFile('test.ts', 'const a = {} || "default";');
      expect(issues.some(i => i.rule === 'no-constant-binary-expression')).toBe(true);
    });
    it('[] && x を検出', () => {
      const issues = lintFile('test.ts', 'const a = [] && doSomething();');
      expect(issues.some(i => i.rule === 'no-constant-binary-expression')).toBe(true);
    });
    it('x ?? null を検出', () => {
      const issues = lintFile('test.ts', 'const a = x ?? null;');
      expect(issues.some(i => i.rule === 'no-constant-binary-expression')).toBe(true);
    });
    it('x || y は報告しない', () => {
      const issues = lintFile('test.ts', 'const a = x || "default";');
      expect(issues.some(i => i.rule === 'no-constant-binary-expression')).toBe(false);
    });
  });

  describe('no-regex-constructor', () => {
    it('new RegExp("literal") を検出', () => {
      const issues = lintFile('test.ts', 'const re = new RegExp("abc");');
      expect(issues.some(i => i.rule === 'no-regex-constructor')).toBe(true);
    });
    it('new RegExp(variable) は報告しない', () => {
      const issues = lintFile('test.ts', 'const re = new RegExp(pattern);');
      expect(issues.some(i => i.rule === 'no-regex-constructor')).toBe(false);
    });
  });
});
