import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('control-flow-rules', () => {
  describe('no-unreachable', () => {
    it('return後のコードを検出', () => {
      const code = 'function f() { return 1; const x = 2; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unreachable')).toBe(true);
    });
    it('throw後のコードを検出', () => {
      const code = 'function f() { throw new Error(); const x = 2; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unreachable')).toBe(true);
    });
    it('break後のコードを検出', () => {
      const code = 'for (;;) { break; console.log("x"); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unreachable')).toBe(true);
    });
    it('到達可能なコードは報告しない', () => {
      const code = 'function f() { const x = 1; return x; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unreachable')).toBe(false);
    });
  });

  describe('no-fallthrough', () => {
    it('breakなしのcaseを検出', () => {
      const code = 'switch (x) { case 1: foo(); case 2: bar(); break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-fallthrough')).toBe(true);
    });
    it('breakありは報告しない', () => {
      const code = 'switch (x) { case 1: foo(); break; case 2: bar(); break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-fallthrough')).toBe(false);
    });
    it('returnありは報告しない', () => {
      const code = 'function f(x: number) { switch (x) { case 1: return 1; case 2: return 2; } }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-fallthrough')).toBe(false);
    });
    it('空のcaseは意図的なグループとして許可', () => {
      const code = 'switch (x) { case 1: case 2: foo(); break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-fallthrough')).toBe(false);
    });
    it('/* falls through */ コメントで許可', () => {
      const code = 'switch (x) { case 1: foo(); /* falls through */ case 2: bar(); break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-fallthrough')).toBe(false);
    });
  });

  describe('no-unsafe-finally', () => {
    it('finally内のreturnを検出', () => {
      const code = 'try { x(); } finally { return 1; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unsafe-finally')).toBe(true);
    });
    it('finally内のthrowを検出', () => {
      const code = 'try { x(); } finally { throw new Error(); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unsafe-finally')).toBe(true);
    });
    it('finallyなしは報告しない', () => {
      const code = 'try { x(); } catch (e) { return 1; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unsafe-finally')).toBe(false);
    });
    it('finally内に制御文がなければ報告しない', () => {
      const code = 'try { x(); } finally { cleanup(); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-unsafe-finally')).toBe(false);
    });
  });
});
