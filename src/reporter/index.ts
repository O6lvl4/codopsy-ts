import { AnalysisResult } from '../analyzer/types.js';
import { generateJsonReport, formatJsonReport } from './json.js';
import { generateHtmlReport, formatHtmlReport } from './html.js';
import { generateSarifReport, formatSarifReport } from './sarif.js';

export type ReportFormat = 'json' | 'html' | 'sarif';

export function formatReport(result: AnalysisResult, format: ReportFormat): string {
  switch (format) {
    case 'json':
      return formatJsonReport(result);
    case 'html':
      return formatHtmlReport(result);
    case 'sarif':
      return formatSarifReport(result);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export function generateReport(
  result: AnalysisResult,
  outputPath: string,
  format: ReportFormat,
): void {
  switch (format) {
    case 'json':
      generateJsonReport(result, outputPath);
      break;
    case 'html':
      generateHtmlReport(result, outputPath);
      break;
    case 'sarif':
      generateSarifReport(result, outputPath);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export { generateJsonReport, formatJsonReport } from './json.js';
export { generateHtmlReport, formatHtmlReport } from './html.js';
export { generateSarifReport, formatSarifReport } from './sarif.js';
