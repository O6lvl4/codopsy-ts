import { describe, it, expect } from 'vitest';
import { analyzeCognitiveComplexity } from '../../src/analyzer/cognitive-complexity.js';

describe('analyzeCognitiveComplexity', () => {
  it('空の関数は認知的複雑度0', () => {
    const code = 'function foo() {}';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(0);
  });

  it('単一のif文は+1', () => {
    const code = 'function foo(x: number) { if (x > 0) { return x; } return 0; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('if-elseは+2（if:+1, else:+1）', () => {
    const code = 'function foo(x: number) { if (x > 0) { return x; } else { return 0; } }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(2);
  });

  it('if-elseif-elseは+3', () => {
    const code = 'function foo(x: number) { if (x > 0) { return 1; } else if (x < 0) { return -1; } else { return 0; } }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(3);
  });

  it('ネストしたifはネストペナルティ付き', () => {
    // outer if: +1 (nesting=0), inner if: +1+1 (nesting=1) = 3
    const code = 'function foo(x: number, y: number) { if (x > 0) { if (y > 0) { return 1; } } return 0; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(3);
  });

  it('for + ネストしたifでネストペナルティ', () => {
    // for: +1 (nesting=0), if: +1+1 (nesting=1) = 3
    const code = `function foo(arr: number[]) {
      for (const x of arr) {
        if (x > 0) { console.log(x); }
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(3);
  });

  it('同じ論理演算子の連鎖は最初のみ+1', () => {
    const code = 'function foo(a: boolean, b: boolean, c: boolean) { return a && b && c; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('異なる論理演算子への切り替えで+1', () => {
    // a && b: +1 (first &&), || c: +1 (switch to ||) = 2
    const code = 'function foo(a: boolean, b: boolean, c: boolean) { return a && b || c; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(2);
  });

  it('a || b && cで+2', () => {
    const code = 'function foo(a: boolean, b: boolean, c: boolean) { return a || b && c; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(2);
  });

  it('switchは全体で+1（caseごとではない）', () => {
    const code = `function foo(x: string) {
      switch(x) {
        case 'a': return 1;
        case 'b': return 2;
        case 'c': return 3;
        default: return 0;
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('深いネストでペナルティが累積', () => {
    // if: +1 (nesting=0), for: +1+1 (nesting=1), if: +1+2 (nesting=2) = 6
    const code = `function foo(x: number) {
      if (x > 0) {
        for (let i = 0; i < x; i++) {
          if (i % 2 === 0) {
            console.log(i);
          }
        }
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(6);
  });

  it('catchは+1', () => {
    const code = `function foo() {
      try { doSomething(); }
      catch (e) { handleError(e); }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('ラベル付きbreakは+1', () => {
    // outer for: +1 (nesting=0)
    // inner for: +1+1 (nesting=1) = 2
    // if: +1+2 (nesting=2) = 3
    // break outer: +1
    // total: 1 + 2 + 3 + 1 = 7
    const code = `function foo() {
      outer: for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (j === 5) {
            break outer;
          }
        }
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(7);
  });

  it('whileは+1', () => {
    const code = `function foo() {
      let i = 0;
      while (i < 10) { i++; }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('do-whileは+1', () => {
    const code = `function foo() {
      let i = 0;
      do { i++; } while (i < 10);
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('ネストした関数は別カウント', () => {
    const code = `function outer() {
      if (true) {}
      function inner() {
        if (true) {}
        if (true) {}
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    const outer = result.functions.find(f => f.name === 'outer');
    const inner = result.functions.find(f => f.name === 'inner');
    expect(outer?.cognitiveComplexity).toBe(1);
    // inner is nested inside outer, so starts at nesting depth=1
    expect(inner?.cognitiveComplexity).toBe(4);
  });

  it('関数がないファイルはscore 0', () => {
    const code = 'const x = 1;\nconst y = 2;';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.score).toBe(0);
    expect(result.functions).toHaveLength(0);
  });

  it('scoreはファイル内の最大認知的複雑度', () => {
    const code = `
      function simple() {}
      function complex(x: number) {
        if (x > 0) {
          if (x > 10) { return x; }
        }
        return 0;
      }
    `;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.score).toBe(3);
    expect(result.functions.find(f => f.name === 'simple')?.cognitiveComplexity).toBe(0);
    expect(result.functions.find(f => f.name === 'complex')?.cognitiveComplexity).toBe(3);
  });

  it('for-inは+1', () => {
    const code = `function foo(obj: any) {
      for (const key in obj) {
        console.log(key);
      }
    }`;
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('三項演算子は+1+ネストペナルティ', () => {
    const code = 'function foo(x: number) { return x > 0 ? x : -x; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('ネストされた三項演算子はペナルティ累積', () => {
    // outer ternary: +1 (nesting=0), inner ternary: +1+1 (nesting=1) = 3
    const code = 'function foo(x: number, y: number) { return x > 0 ? (y > 0 ? 1 : 2) : 0; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(3);
  });

  it('nullish coalescing (??) は論理演算子と同様に扱う', () => {
    const code = 'function foo(a: any, b: any) { return a ?? b; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('?? と || の混在でスイッチごとに+1', () => {
    // a ?? b: +1 (first ??), || c: +1 (switch to ||) = 2
    const code = 'function foo(a: any, b: any, c: any) { return a ?? b || c; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(2);
  });

  it('optional chaining (?.) は+1', () => {
    const code = 'function foo(obj: any) { return obj?.prop; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('optional chaining チェーンは各?. ごとに+1', () => {
    const code = 'function foo(obj: any) { return obj?.a?.b?.c; }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(3);
  });

  it('optional call (?.) は+1', () => {
    const code = 'function foo(fn: any) { return fn?.(); }';
    const result = analyzeCognitiveComplexity('test.ts', code);
    expect(result.functions[0].cognitiveComplexity).toBe(1);
  });

  it('ネストされた関数はネスト深度分のペナルティを受ける', () => {
    const code = `
      function outer() {
        function middle() {
          function deepInner() {
            if (true) {}
          }
        }
      }
    `;
    const result = analyzeCognitiveComplexity('test.ts', code);
    const deepInner = result.functions.find(f => f.name === 'deepInner');
    // deepInner is nested 2 levels deep: if: +1 + 2(nesting) = 3
    expect(deepInner?.cognitiveComplexity).toBe(3);
  });

  it('ラムダのネスト深度が正しく反映される', () => {
    const code = `
      const outer = () => {
        const inner = () => {
          if (true) {}
        };
      };
    `;
    const result = analyzeCognitiveComplexity('test.ts', code);
    const inner = result.functions.find(f => f.name === 'inner');
    // inner is nested 1 level: if: +1 + 1(nesting) = 2
    expect(inner?.cognitiveComplexity).toBe(2);
  });
});
