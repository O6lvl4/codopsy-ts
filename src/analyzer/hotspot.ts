import * as path from 'path';
import { FileAnalysis } from './types.js';
import { getFileChurnStats } from '../utils/git.js';

export interface HotspotInfo {
  file: string;
  commits: number;
  authors: number;
  complexity: number;
  cognitiveComplexity: number;
  score: number;
  risk: 'high' | 'medium' | 'low';
}

export interface HotspotResult {
  period: string;
  hotspots: HotspotInfo[];
}

function classifyRisk(score: number): 'high' | 'medium' | 'low' {
  if (score > 100) return 'high';
  if (score > 30) return 'medium';
  return 'low';
}

export function detectHotspots(
  targetDir: string,
  fileAnalyses: FileAnalysis[],
  options?: { months?: number; top?: number },
): HotspotResult {
  const months = options?.months ?? 6;
  const top = options?.top ?? 10;
  const since = `${months} months ago`;

  const gitStats = getFileChurnStats(targetDir, since);

  const hotspots: HotspotInfo[] = fileAnalyses
    .map(fa => {
      const relPath = path.relative(targetDir, fa.file);
      const churn = gitStats.get(relPath) ?? { commits: 0, authors: 0 };
      const maxCyclomatic = fa.complexity.functions.reduce((m, f) => Math.max(m, f.complexity), 0);
      const maxCognitive = fa.complexity.functions.reduce((m, f) => Math.max(m, f.cognitiveComplexity), 0);
      const score = churn.commits * (maxCyclomatic + maxCognitive * 0.5);

      return {
        file: relPath,
        commits: churn.commits,
        authors: churn.authors,
        complexity: maxCyclomatic,
        cognitiveComplexity: maxCognitive,
        score,
        risk: classifyRisk(score),
      };
    })
    .filter(h => h.commits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top);

  return { period: `${months} months`, hotspots };
}
