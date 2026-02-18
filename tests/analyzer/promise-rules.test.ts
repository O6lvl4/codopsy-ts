import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('promise-rules', () => {
  describe('no-floating-promises', () => {
    it('async関数の未処理呼び出しを検出', () => {
      const code = 'async function foo() {} foo();';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(true);
    });
    it('await付きは報告しない', () => {
      const code = 'async function foo() {} async function bar() { await foo(); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(false);
    });
    it('void付きは報告しない', () => {
      const code = 'async function foo() {} void foo();';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(false);
    });
    it('Promise.resolve() の未処理を検出', () => {
      const code = 'Promise.resolve(1);';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(true);
    });
    it('変数に代入されていれば報告しない', () => {
      const code = 'async function foo() {} const p = foo();';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(false);
    });
    it('.catch()チェーンは報告しない', () => {
      const code = 'async function foo() {} foo().catch(console.error);';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-floating-promises')).toBe(false);
    });
  });

  describe('no-misused-promises', () => {
    it('if(asyncFunc()) を検出', () => {
      const code = 'async function foo() { return true; } if (foo()) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-misused-promises')).toBe(true);
    });
    it('await付きの条件は報告しない', () => {
      const code = 'async function foo() { return true; } async function bar() { if (await foo()) {} }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-misused-promises')).toBe(false);
    });
    it('配列メソッドへのasyncコールバックを検出', () => {
      const code = '[1, 2, 3].filter(async (x) => x > 1);';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-misused-promises')).toBe(true);
    });
    it('同期コールバックは報告しない', () => {
      const code = '[1, 2, 3].filter((x) => x > 1);';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-misused-promises')).toBe(false);
    });
  });

  describe('await-thenable', () => {
    it('await "string" を検出', () => {
      const code = 'async function f() { await "hello"; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'await-thenable')).toBe(true);
    });
    it('await 42 を検出', () => {
      const code = 'async function f() { await 42; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'await-thenable')).toBe(true);
    });
    it('await true を検出', () => {
      const code = 'async function f() { await true; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'await-thenable')).toBe(true);
    });
    it('await promise は報告しない', () => {
      const code = 'async function f() { await Promise.resolve(1); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'await-thenable')).toBe(false);
    });
    it('await asyncFunc() は報告しない', () => {
      const code = 'async function foo() {} async function bar() { await foo(); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'await-thenable')).toBe(false);
    });
  });
});
