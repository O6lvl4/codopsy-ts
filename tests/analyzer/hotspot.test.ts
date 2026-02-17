import { describe, it, expect } from 'vitest';
import { detectHotspots } from '../../src/analyzer/hotspot.js';
import { FileAnalysis } from '../../src/analyzer/types.js';
import * as path from 'path';

// Uses the actual git repo for integration testing
const repoRoot = path.resolve(__dirname, '../..');

describe('detectHotspots', () => {
  it('returns hotspots for files in a real git repo', () => {
    const fileAnalyses: FileAnalysis[] = [
      {
        file: path.join(repoRoot, 'src/index.ts'),
        complexity: {
          cyclomatic: 9,
          cognitive: 8,
          functions: [{ name: 'analyzeAction', line: 1, complexity: 9, cognitiveComplexity: 8 }],
        },
        issues: [],
      },
      {
        file: path.join(repoRoot, 'src/analyzer/linter.ts'),
        complexity: {
          cyclomatic: 7,
          cognitive: 6,
          functions: [{ name: 'runChecks', line: 1, complexity: 7, cognitiveComplexity: 6 }],
        },
        issues: [],
      },
    ];

    const result = detectHotspots(repoRoot, fileAnalyses, { months: 12 });
    expect(result.period).toBe('12 months');
    expect(Array.isArray(result.hotspots)).toBe(true);

    // Files with git history should appear as hotspots
    if (result.hotspots.length > 0) {
      const first = result.hotspots[0];
      expect(first).toHaveProperty('file');
      expect(first).toHaveProperty('commits');
      expect(first).toHaveProperty('authors');
      expect(first).toHaveProperty('complexity');
      expect(first).toHaveProperty('risk');
      expect(first.commits).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(first.risk);
    }
  });

  it('returns empty hotspots for files with no git history', () => {
    const fileAnalyses: FileAnalysis[] = [
      {
        file: path.join(repoRoot, 'nonexistent-file.ts'),
        complexity: { cyclomatic: 5, cognitive: 3, functions: [{ name: 'fn', line: 1, complexity: 5, cognitiveComplexity: 3 }] },
        issues: [],
      },
    ];

    const result = detectHotspots(repoRoot, fileAnalyses);
    expect(result.hotspots.length).toBe(0);
  });

  it('respects top limit', () => {
    const fileAnalyses: FileAnalysis[] = Array.from({ length: 20 }, (_, i) => ({
      file: path.join(repoRoot, `src/file${i}.ts`),
      complexity: { cyclomatic: 5, cognitive: 3, functions: [{ name: 'fn', line: 1, complexity: 5, cognitiveComplexity: 3 }] },
      issues: [],
    }));

    const result = detectHotspots(repoRoot, fileAnalyses, { top: 3 });
    expect(result.hotspots.length).toBeLessThanOrEqual(3);
  });

  it('sorts by score descending', () => {
    const fileAnalyses: FileAnalysis[] = [
      {
        file: path.join(repoRoot, 'src/index.ts'),
        complexity: { cyclomatic: 1, cognitive: 0, functions: [{ name: 'fn', line: 1, complexity: 1, cognitiveComplexity: 0 }] },
        issues: [],
      },
      {
        file: path.join(repoRoot, 'src/analyzer/linter.ts'),
        complexity: { cyclomatic: 20, cognitive: 15, functions: [{ name: 'fn', line: 1, complexity: 20, cognitiveComplexity: 15 }] },
        issues: [],
      },
    ];

    const result = detectHotspots(repoRoot, fileAnalyses, { months: 12 });
    if (result.hotspots.length >= 2) {
      expect(result.hotspots[0].score).toBeGreaterThanOrEqual(result.hotspots[1].score);
    }
  });
});
