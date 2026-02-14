import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeFile } from '../../src/analyzer/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('analyzeFile', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-test');
  const tmpFile = path.join(tmpDir, 'test.ts');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TypeScriptファイルを解析してFileAnalysisを返す', () => {
    fs.writeFileSync(tmpFile, `
      function add(a: number, b: number): number {
        if (a > 0) { return a + b; }
        return b;
      }
    `);
    const result = analyzeFile(tmpFile);
    expect(result.file).toBe(tmpFile);
    expect(result.complexity.functions.length).toBeGreaterThan(0);
    expect(result.issues).toBeInstanceOf(Array);
  });

  it('空のファイルでもエラーにならない', () => {
    fs.writeFileSync(tmpFile, '');
    const result = analyzeFile(tmpFile);
    expect(result.file).toBe(tmpFile);
    expect(result.complexity.functions).toHaveLength(0);
  });
});
