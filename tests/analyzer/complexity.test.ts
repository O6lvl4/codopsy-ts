import { describe, it, expect } from 'vitest';
import { analyzeComplexity } from '../../src/analyzer/complexity.js';

describe('analyzeComplexity', () => {
  it('空の関数は複雑度1', () => {
    const code = 'function foo() {}';
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(1);
  });

  it('if文で+1', () => {
    const code = 'function foo(x: number) { if (x > 0) { return x; } return 0; }';
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(2);
  });

  it('for + if で+2', () => {
    const code = `function foo(arr: number[]) {
      for (const x of arr) {
        if (x > 0) { console.log(x); }
      }
    }`;
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(3);
  });

  it('&& || で+2', () => {
    const code = 'function foo(a: boolean, b: boolean) { return a && b || !a; }';
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(3);
  });

  it('三項演算子で+1', () => {
    const code = 'function foo(x: number) { return x > 0 ? x : -x; }';
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(2);
  });

  it('switch caseで各case+1', () => {
    const code = `function foo(x: string) {
      switch(x) {
        case 'a': return 1;
        case 'b': return 2;
        case 'c': return 3;
        default: return 0;
      }
    }`;
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(4);
  });

  it('catch節で+1', () => {
    const code = `function foo() {
      try { doSomething(); }
      catch (e) { handleError(e); }
    }`;
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(2);
  });

  it('ネストした関数は別カウント', () => {
    const code = `function outer() {
      if (true) {}
      function inner() {
        if (true) {}
        if (true) {}
      }
    }`;
    const result = analyzeComplexity('test.ts', code);
    const outer = result.functions.find(f => f.name === 'outer');
    const inner = result.functions.find(f => f.name === 'inner');
    expect(outer?.complexity).toBe(2);
    expect(inner?.complexity).toBe(3);
  });

  it('アロー関数の名前を変数名から取得', () => {
    const code = 'const foo = () => {};';
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].name).toBe('foo');
  });

  it('関数がないファイルはcyclomatic 0', () => {
    const code = 'const x = 1;\nconst y = 2;';
    const result = analyzeComplexity('test.ts', code);
    expect(result.cyclomatic).toBe(0);
    expect(result.functions).toHaveLength(0);
  });

  it('while + do-while で+2', () => {
    const code = `function foo() {
      let i = 0;
      while (i < 10) { i++; }
      do { i--; } while (i > 0);
    }`;
    const result = analyzeComplexity('test.ts', code);
    expect(result.functions[0].complexity).toBe(3);
  });

  it('cyclomaticはファイル内の最大複雑度', () => {
    const code = `
      function simple() {}
      function complex(x: number) {
        if (x > 0) { if (x > 10) { return x; } }
        return 0;
      }
    `;
    const result = analyzeComplexity('test.ts', code);
    expect(result.cyclomatic).toBe(3);
  });
});
