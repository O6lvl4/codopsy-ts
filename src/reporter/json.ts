import { AnalysisResult } from '../analyzer/types.js';
import { writeReportFile } from './index.js';

export function formatJsonReport(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function generateJsonReport(result: AnalysisResult, outputPath: string): void {
  writeReportFile(outputPath, formatJsonReport(result));
}
