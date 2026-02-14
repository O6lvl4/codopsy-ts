import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../analyzer/types.js';

export function formatJsonReport(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function generateJsonReport(result: AnalysisResult, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, formatJsonReport(result), 'utf-8');
}
