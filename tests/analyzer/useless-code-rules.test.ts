import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('useless-code-rules', () => {
  describe('no-useless-catch', () => {
    it('再throwのみのcatchを検出', () => {
      const code = 'try { x(); } catch (e) { throw e; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-catch')).toBe(true);
    });
    it('処理のあるcatchは報告しない', () => {
      const code = 'try { x(); } catch (e) { console.log(e); throw e; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-catch')).toBe(false);
    });
    it('異なるエラーをthrowするcatchは報告しない', () => {
      const code = 'try { x(); } catch (e) { throw new Error("wrapped"); }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-catch')).toBe(false);
    });
  });

  describe('no-useless-rename', () => {
    it('import { x as x } を検出', () => {
      const code = 'import { foo as foo } from "bar";';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-rename')).toBe(true);
    });
    it('import { x as y } は報告しない', () => {
      const code = 'import { foo as bar } from "baz";';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-rename')).toBe(false);
    });
    it('分割代入 { a: a } を検出', () => {
      const code = 'const { a: a } = obj;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-rename')).toBe(true);
    });
  });

  describe('no-useless-constructor', () => {
    it('空コンストラクタを検出', () => {
      const code = 'class Foo { constructor() {} }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-constructor')).toBe(true);
    });
    it('パラメータプロパティ付きは報告しない', () => {
      const code = 'class Foo { constructor(public name: string) {} }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-constructor')).toBe(false);
    });
    it('super透過のみのコンストラクタを検出', () => {
      const code = 'class Foo extends Bar { constructor(x: number) { super(x); } }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-constructor')).toBe(true);
    });
    it('処理のあるコンストラクタは報告しない', () => {
      const code = 'class Foo { constructor() { this.init(); } }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-useless-constructor')).toBe(false);
    });
  });
});
