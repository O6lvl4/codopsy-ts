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
    it('console["log"]のcomputed accessを検出', () => {
      const issues = lintFile('test.ts', 'console["log"]("hello");');
      expect(issues.some(i => i.rule === 'no-console')).toBe(true);
    });
    it('console["warn"]のcomputed accessを検出', () => {
      const issues = lintFile('test.ts', "console['warn']('hello');");
      expect(issues.some(i => i.rule === 'no-console')).toBe(true);
    });
    it('分割代入 const { log } = console のエイリアスを検出', () => {
      const code = 'const { log } = console;\nlog("hello");';
      const issues = lintFile('test.ts', code);
      const noConsole = issues.filter(i => i.rule === 'no-console');
      expect(noConsole.length).toBe(1);
      expect(noConsole[0].message).toContain('log');
    });
    it('直接代入 const log = console.log のエイリアスを検出', () => {
      const code = 'const log = console.log;\nlog("hello");';
      const issues = lintFile('test.ts', code);
      const noConsole = issues.filter(i => i.rule === 'no-console');
      // console.log の代入自体は CallExpression ではないので報告されない
      // log("hello") がエイリアス経由で報告される
      expect(noConsole.length).toBe(1);
      expect(noConsole[0].message).toContain('log');
    });
    it('リネーム付き分割代入 const { log: myLog } = console を検出', () => {
      const code = 'const { log: myLog } = console;\nmyLog("hello");';
      const issues = lintFile('test.ts', code);
      const noConsole = issues.filter(i => i.rule === 'no-console');
      expect(noConsole.length).toBe(1);
      expect(noConsole[0].message).toContain('log');
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
    it('コメントのみの関数は意図的と見なし報告しない', () => {
      const issues = lintFile('test.ts', 'const foo = () => { /* keep-alive */ };');
      expect(issues.some(i => i.rule === 'no-empty-function')).toBe(false);
    });
    it('行コメントのみの関数も意図的と見なし報告しない', () => {
      const issues = lintFile('test.ts', 'function foo() { // intentionally empty\n}');
      expect(issues.some(i => i.rule === 'no-empty-function')).toBe(false);
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
    it('JSX内のスタイルternaryはネストと見なさない', () => {
      const code = `const el = cond ? <div style={{ color: flag ? 'red' : 'blue' }} /> : <span />;`;
      const issues = lintFile('test.tsx', code);
      expect(issues.some(i => i.rule === 'no-nested-ternary')).toBe(false);
    });
    it('JSX子要素内のternaryはネストと見なさない', () => {
      const code = `const el = show ? <div>{x ? 'a' : 'b'}</div> : null;`;
      const issues = lintFile('test.tsx', code);
      expect(issues.some(i => i.rule === 'no-nested-ternary')).toBe(false);
    });
    it('JSXを介さない純粋なネストは引き続き検出', () => {
      const code = `const x = a ? b ? 1 : 2 : 3;`;
      const issues = lintFile('test.tsx', code);
      expect(issues.some(i => i.rule === 'no-nested-ternary')).toBe(true);
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
    it('異なるスコープの同名変数を独立して判定', () => {
      const code = `
        let x = 1;
        function inner() {
          let x = 2;
          x = 3;
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // outer x は再代入されないので報告、inner x は再代入されるので報告しない
      expect(preferConst.length).toBe(1);
      expect(preferConst[0].message).toContain('x');
    });
    it('内側スコープの再代入が外側に影響しない', () => {
      const code = `
        let a = 1;
        {
          let a = 2;
          a = 3;
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // outer a: 再代入なし → 報告, inner a: 再代入あり → 報告しない
      expect(preferConst.length).toBe(1);
    });
    it('クロージャ経由の再代入を正しく検出', () => {
      const code = `
        let count = 0;
        function increment() {
          count = count + 1;
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // count はクロージャ内で再代入されるので報告しない
      expect(preferConst.length).toBe(0);
    });
    it('forループカウンタは再代入扱い', () => {
      const code = 'for (let i = 0; i < 10; i++) {}';
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const' && i.message.includes("'i'"));
      expect(preferConst.length).toBe(0);
    });
    it('分割代入で再代入なしのlet', () => {
      const code = 'let { a, b } = { a: 1, b: 2 };';
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      expect(preferConst.length).toBe(2);
    });
    it('分割代入で一部のみ再代入', () => {
      const code = 'let { a, b } = { a: 1, b: 2 };\na = 10;';
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // a は再代入、b は再代入なし → b のみ報告
      expect(preferConst.length).toBe(1);
      expect(preferConst[0].message).toContain('b');
    });
    it('catch句内のletが親スコープに漏れない', () => {
      const code = `
        let x = 1;
        try {
          throw new Error();
        } catch (e) {
          let x = 2;
          x = 3;
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // outer x は再代入なし → 報告、catch 内 x は再代入あり → 報告しない
      expect(preferConst.length).toBe(1);
    });
    it('switch case内のletがcase間で漏れない', () => {
      const code = `
        function test(x: string) {
          switch (x) {
            case 'a': { let y = 1; y = 2; break; }
            case 'b': { let y = 10; break; }
          }
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // case 'a' の y: 再代入あり → 報告しない, case 'b' の y: 再代入なし → 報告
      expect(preferConst.length).toBe(1);
    });
    it('classメソッド内のletが独立スコープ', () => {
      const code = `
        let x = 1;
        class Foo {
          method() {
            let x = 2;
            x = 3;
          }
        }
      `;
      const issues = lintFile('test.ts', code);
      const preferConst = issues.filter(i => i.rule === 'prefer-const');
      // outer x: 再代入なし → 報告, method 内 x: 再代入あり → 報告しない
      expect(preferConst.length).toBe(1);
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
    it('props有効時にparam.prop代入を検出', () => {
      const code = 'function foo(obj: any) { obj.prop = 1; }';
      const issues = lintFile('test.ts', code, { rules: { 'no-param-reassign': { props: true } } });
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
      expect(noParamReassign[0].message).toContain('property');
    });
    it('props有効時にparam[key]代入を検出', () => {
      const code = 'function foo(arr: any) { arr[0] = 1; }';
      const issues = lintFile('test.ts', code, { rules: { 'no-param-reassign': { props: true } } });
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
    });
    it('props有効時にdelete param.propを検出', () => {
      const code = 'function foo(obj: any) { delete obj.key; }';
      const issues = lintFile('test.ts', code, { rules: { 'no-param-reassign': { props: true } } });
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
    });
    it('propsデフォルト（無効）ではプロパティ変更を報告しない', () => {
      const code = 'function foo(obj: any) { obj.prop = 1; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(0);
    });
    it('分割代入パラメータへの再代入を検出', () => {
      const code = 'function foo({ x, y }: { x: number; y: number }) { x = 5; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
      expect(noParamReassign[0].message).toContain('x');
    });
    it('配列分割代入パラメータへの再代入を検出', () => {
      const code = 'function foo([a, b]: number[]) { a = 10; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
      expect(noParamReassign[0].message).toContain('a');
    });
    it('restパラメータへの再代入を検出', () => {
      const code = 'function foo(...args: number[]) { args = []; }';
      const issues = lintFile('test.ts', code);
      const noParamReassign = issues.filter(i => i.rule === 'no-param-reassign');
      expect(noParamReassign.length).toBe(1);
      expect(noParamReassign[0].message).toContain('args');
    });
  });

  describe('no-non-null-assertion', () => {
    it('非nullアサーション (!) を検出', () => {
      const code = 'const x: string | null = null;\nconst y = x!;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-non-null-assertion')).toBe(true);
    });
    it('メソッド呼び出しの ! を検出', () => {
      const code = 'const map = new Map<string, number>();\nconst v = map.get("key")!;';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-non-null-assertion')).toBe(true);
    });
    it('! がなければ報告しない', () => {
      const code = 'const x: string = "hello";';
      const issues = lintFile('test.ts', code);
      expect(issues.some(i => i.rule === 'no-non-null-assertion')).toBe(false);
    });
    it('false で無効化', () => {
      const code = 'const x: string | null = null;\nconst y = x!;';
      const issues = lintFile('test.ts', code, { rules: { 'no-non-null-assertion': false } });
      expect(issues.some(i => i.rule === 'no-non-null-assertion')).toBe(false);
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
