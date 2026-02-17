import { describe, it, expect } from 'vitest';
import { analyze, analyzeFile, lintFile, analyzeComplexity, loadConfig, formatReport } from '../src/api.js';
import * as path from 'path';

describe('Programmatic API', () => {
  it('exports analyze function', () => {
    expect(typeof analyze).toBe('function');
  });

  it('exports analyzeFile function', () => {
    expect(typeof analyzeFile).toBe('function');
  });

  it('exports lintFile function', () => {
    expect(typeof lintFile).toBe('function');
  });

  it('exports analyzeComplexity function', () => {
    expect(typeof analyzeComplexity).toBe('function');
  });

  it('exports loadConfig function', () => {
    expect(typeof loadConfig).toBe('function');
  });

  it('exports formatReport function', () => {
    expect(typeof formatReport).toBe('function');
  });

  it('analyze() returns AnalysisResult for a real directory', async () => {
    const srcDir = path.resolve(__dirname, '../src');
    const result = await analyze({ targetDir: srcDir });

    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('targetDir', srcDir);
    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('summary');
    expect(result.summary.totalFiles).toBeGreaterThan(0);
    expect(Array.isArray(result.files)).toBe(true);
  });
});
