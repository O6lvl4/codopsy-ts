import { describe, it, expect } from 'vitest';
import { lintFile } from '../../src/analyzer/linter.js';

function unusedIssues(code: string, config?: Parameters<typeof lintFile>[2]) {
  return lintFile('test.ts', code, config).filter(i => i.rule === 'no-unused-vars');
}

describe('no-unused-vars', () => {
  // --- Variables ---
  it('未使用のconstを検出', () => {
    expect(unusedIssues('const x = 1;').length).toBeGreaterThan(0);
  });
  it('未使用のletを検出', () => {
    expect(unusedIssues('let x = 1;').length).toBeGreaterThan(0);
  });
  it('使用された変数は報告しない', () => {
    const code = 'const x = 1; console.log(x);';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });
  it('export された変数は報告しない', () => {
    const code = 'export const x = 1;';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });

  // --- Functions ---
  it('未使用のfunction宣言を検出', () => {
    const code = 'function unused() {} const x = 1; console.log(x);';
    expect(unusedIssues(code).some(i => i.message.includes("'unused'"))).toBe(true);
  });
  it('使用されたfunctionは報告しない', () => {
    const code = 'function foo() {} foo();';
    expect(unusedIssues(code).some(i => i.message.includes("'foo'"))).toBe(false);
  });
  it('export されたfunctionは報告しない', () => {
    const code = 'export function foo() {}';
    expect(unusedIssues(code).some(i => i.message.includes("'foo'"))).toBe(false);
  });

  // --- Classes ---
  it('未使用のclass宣言を検出', () => {
    const code = 'class Unused {}';
    expect(unusedIssues(code).some(i => i.message.includes("'Unused'"))).toBe(true);
  });
  it('使用されたclassは報告しない', () => {
    const code = 'class Foo {} new Foo();';
    expect(unusedIssues(code).some(i => i.message.includes("'Foo'"))).toBe(false);
  });

  // --- Imports ---
  it('未使用のimportを検出', () => {
    const code = 'import { foo } from "bar";';
    expect(unusedIssues(code).some(i => i.message.includes("'foo'"))).toBe(true);
  });
  it('使用されたimportは報告しない', () => {
    const code = 'import { foo } from "bar"; foo();';
    expect(unusedIssues(code).some(i => i.message.includes("'foo'"))).toBe(false);
  });
  it('未使用のdefault importを検出', () => {
    const code = 'import Foo from "bar";';
    expect(unusedIssues(code).some(i => i.message.includes("'Foo'"))).toBe(true);
  });
  it('未使用のnamespace importを検出', () => {
    const code = 'import * as ns from "bar";';
    expect(unusedIssues(code).some(i => i.message.includes("'ns'"))).toBe(true);
  });

  // --- Parameters ---
  it('未使用のパラメータを検出', () => {
    const code = 'function foo(x: number) { return 1; }; foo(1);';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(true);
  });
  it('_プレフィックスのパラメータは報告しない', () => {
    const code = 'function foo(_x: number) { return 1; }; foo(1);';
    expect(unusedIssues(code).some(i => i.message.includes("'_x'"))).toBe(false);
  });
  it('使用されたパラメータは報告しない', () => {
    const code = 'function foo(x: number) { return x; }; foo(1);';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });

  // --- Type usage ---
  it('型参照で使用されたimportは報告しない', () => {
    const code = 'import { MyType } from "bar"; const x: MyType = {} as any; console.log(x);';
    expect(unusedIssues(code).some(i => i.message.includes("'MyType'"))).toBe(false);
  });
  it('typeof参照は使用とみなす', () => {
    const code = 'const x = 1; type T = typeof x; const y: T = 2; console.log(y);';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });

  // --- JSX ---
  it('JSXコンポーネントとして使用されたimportは報告しない', () => {
    const code = 'import React from "react"; import Comp from "comp"; const el = <Comp />;';
    expect(unusedIssues(code).some(i => i.message.includes("'Comp'"))).toBe(false);
  });

  // --- Export re-export ---
  it('export { X } でのローカル参照は使用とみなす', () => {
    const code = 'const x = 1; export { x };';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });
  it('export default で参照は使用とみなす', () => {
    const code = 'const x = 1; export default x;';
    expect(unusedIssues(code).some(i => i.message.includes("'x'"))).toBe(false);
  });

  // --- Enum ---
  it('未使用のenumを検出', () => {
    const code = 'enum Color { Red, Green }';
    expect(unusedIssues(code).some(i => i.message.includes("'Color'"))).toBe(true);
  });
  it('使用されたenumは報告しない', () => {
    const code = 'enum Color { Red, Green } const c = Color.Red; console.log(c);';
    expect(unusedIssues(code).some(i => i.message.includes("'Color'"))).toBe(false);
  });

  // --- Destructuring ---
  it('分割代入の未使用バインディングを検出', () => {
    const code = 'const { a, b } = { a: 1, b: 2 }; console.log(a);';
    expect(unusedIssues(code).some(i => i.message.includes("'b'"))).toBe(true);
  });

  // --- Config ---
  it('false で無効化', () => {
    const code = 'const unused = 1;';
    expect(unusedIssues(code, { rules: { 'no-unused-vars': false } }).length).toBe(0);
  });
});
