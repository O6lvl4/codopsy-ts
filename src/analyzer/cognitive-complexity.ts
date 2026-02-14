// Re-export from complexity.ts for backwards compatibility
import { analyzeComplexity } from './complexity.js';

export interface CognitiveComplexityResult {
  score: number;
  functions: Array<{ name: string; line: number; cognitiveComplexity: number }>;
}

export function analyzeCognitiveComplexity(
  filePath: string,
  sourceCode: string,
): CognitiveComplexityResult {
  const result = analyzeComplexity(filePath, sourceCode);
  return {
    score: result.cognitive,
    functions: result.functions.map((f) => ({
      name: f.name,
      line: f.line,
      cognitiveComplexity: f.cognitiveComplexity,
    })),
  };
}
