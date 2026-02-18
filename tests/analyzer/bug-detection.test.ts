import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

describe('bug-detection rules', () => {
  describe('no-debugger', () => {
    it('debugger文を検出', () => {
      const issues = lintFile('test.ts', 'debugger;');
      expect(issues.some(i => i.rule === 'no-debugger')).toBe(true);
    });
    it('debuggerがなければ報告しない', () => {
      const issues = lintFile('test.ts', 'const x = 1;');
      expect(issues.some(i => i.rule === 'no-debugger')).toBe(false);
    });
    it('false で無効化', () => {
      const issues = lintFile('test.ts', 'debugger;', { rules: { 'no-debugger': false } });
      expect(issues.some(i => i.rule === 'no-debugger')).toBe(false);
    });
  });

  describe('no-duplicate-case', () => {
    it('重複するcaseラベルを検出', () => {
      const code = `switch (x) { case 1: break; case 1: break; }`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-duplicate-case')).toBe(true);
    });
    it('文字列caseの重複を検出', () => {
      const code = `switch (x) { case "a": break; case "a": break; }`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-duplicate-case')).toBe(true);
    });
    it('一意のcaseは報告しない', () => {
      const code = `switch (x) { case 1: break; case 2: break; }`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-duplicate-case')).toBe(false);
    });
  });

  describe('no-dupe-keys', () => {
    it('重複するオブジェクトキーを検出', () => {
      const code = `const obj = { a: 1, b: 2, a: 3 };`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-dupe-keys')).toBe(true);
    });
    it('一意のキーは報告しない', () => {
      const code = `const obj = { a: 1, b: 2, c: 3 };`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-dupe-keys')).toBe(false);
    });
    it('get/setペアは許可', () => {
      const code = `const obj = { get x() { return 1; }, set x(v: number) {} };`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-dupe-keys')).toBe(false);
    });
  });

  describe('use-isnan', () => {
    it('=== NaN を検出', () => {
      const code = 'if (x === NaN) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(true);
    });
    it('== NaN を検出', () => {
      const code = 'if (x == NaN) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(true);
    });
    it('NaN === x (左辺) を検出', () => {
      const code = 'if (NaN === x) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(true);
    });
    it('Number.isNaN() は報告しない', () => {
      const code = 'if (Number.isNaN(x)) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(false);
    });
    it('switch(NaN) を検出', () => {
      const code = 'switch (NaN) { case 1: break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(true);
    });
    it('case NaN を検出', () => {
      const code = 'switch (x) { case NaN: break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'use-isnan')).toBe(true);
    });
  });

  describe('no-self-assign', () => {
    it('自己代入を検出', () => {
      const code = 'let x = 1; x = x;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-assign')).toBe(true);
    });
    it('プロパティの自己代入を検出', () => {
      const code = 'obj.x = obj.x;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-assign')).toBe(true);
    });
    it('異なる値への代入は報告しない', () => {
      const code = 'let x = 1; x = 2;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-assign')).toBe(false);
    });
  });

  describe('no-template-curly-in-string', () => {
    it('通常文字列内の${...}を検出', () => {
      const code = `const msg = "Hello \${name}";`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-template-curly-in-string')).toBe(true);
    });
    it('テンプレートリテラルは報告しない', () => {
      const code = 'const msg = `Hello ${name}`;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-template-curly-in-string')).toBe(false);
    });
    it('$を含むが${...}でない文字列は報告しない', () => {
      const code = `const price = "$100";`;
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-template-curly-in-string')).toBe(false);
    });
  });

  describe('no-self-compare', () => {
    it('x === x を検出', () => {
      const code = 'if (x === x) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-compare')).toBe(true);
    });
    it('x !== x を検出', () => {
      const code = 'if (x !== x) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-compare')).toBe(true);
    });
    it('obj.a > obj.a を検出', () => {
      const code = 'if (obj.a > obj.a) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-compare')).toBe(true);
    });
    it('異なるオペランドは報告しない', () => {
      const code = 'if (x === y) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-self-compare')).toBe(false);
    });
  });

  describe('no-cond-assign', () => {
    it('if条件内の代入を検出', () => {
      const code = 'if (x = 1) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-cond-assign')).toBe(true);
    });
    it('while条件内の代入を検出', () => {
      const code = 'while (x = next()) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-cond-assign')).toBe(true);
    });
    it('do-while条件内の代入を検出', () => {
      const code = 'do {} while (x = next());';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-cond-assign')).toBe(true);
    });
    it('意図的な括弧付き代入 if ((x = getValue())) は許可', () => {
      const code = 'if ((x = getValue())) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-cond-assign')).toBe(false);
    });
    it('=== は報告しない', () => {
      const code = 'if (x === 1) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-cond-assign')).toBe(false);
    });
  });

  describe('valid-typeof', () => {
    it('無効なtypeof比較値を検出', () => {
      const code = 'if (typeof x === "strng") {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'valid-typeof')).toBe(true);
    });
    it('"undefned" のタイポを検出', () => {
      const code = 'if (typeof x === "undefned") {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'valid-typeof')).toBe(true);
    });
    it('有効な値 "string" は報告しない', () => {
      const code = 'if (typeof x === "string") {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'valid-typeof')).toBe(false);
    });
    it('有効な値 "bigint" は報告しない', () => {
      const code = 'if (typeof x === "bigint") {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'valid-typeof')).toBe(false);
    });
    it('右辺の typeof も検出', () => {
      const code = 'if ("numbr" === typeof x) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'valid-typeof')).toBe(true);
    });
  });

  describe('no-constant-condition', () => {
    it('if (true) を検出', () => {
      const code = 'if (true) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
    it('if (false) を検出', () => {
      const code = 'if (false) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
    it('if (1 === 1) を検出', () => {
      const code = 'if (1 === 1) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
    it('三項演算子の定数条件を検出', () => {
      const code = 'const x = true ? 1 : 2;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
    it('while(true) は意図的なので許可', () => {
      const code = 'while (true) { break; }';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(false);
    });
    it('while(false) は検出', () => {
      const code = 'while (false) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
    it('変数を含む条件は報告しない', () => {
      const code = 'if (x > 0) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(false);
    });
    it('if (!false) を検出', () => {
      const code = 'if (!false) {}';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-constant-condition')).toBe(true);
    });
  });
});
