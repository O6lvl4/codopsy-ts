import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, FileAnalysis, Issue } from '../analyzer/types.js';
import { getStyles } from './html-styles.js';

export function formatHtmlReport(result: AnalysisResult): string {
  return buildHtml(result);
}

export function generateHtmlReport(result: AnalysisResult, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, formatHtmlReport(result), 'utf-8');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'error': return '#e74c3c';
    case 'warning': return '#f39c12';
    case 'info': return '#3498db';
    default: return '#999';
  }
}

function severityBgColor(severity: string): string {
  switch (severity) {
    case 'error': return '#fdecea';
    case 'warning': return '#fef9e7';
    case 'info': return '#eaf2f8';
    default: return '#f5f5f5';
  }
}

function buildIssueRows(issues: Issue[]): string {
  if (issues.length === 0) {
    return '<tr><td colspan="4" class="no-data">Issue は検出されませんでした</td></tr>';
  }
  return issues.map(issue => `
    <tr class="issue-row" style="background-color: ${severityBgColor(issue.severity)}">
      <td><span class="severity-badge" style="background-color: ${severityColor(issue.severity)}">${escapeHtml(issue.severity)}</span></td>
      <td class="mono">${issue.line}:${issue.column}</td>
      <td class="mono">${escapeHtml(issue.rule)}</td>
      <td>${escapeHtml(issue.message)}</td>
    </tr>`).join('\n');
}

function buildFunctionRows(analysis: FileAnalysis): string {
  const funcs = analysis.complexity.functions;
  if (funcs.length === 0) {
    return '<tr><td colspan="4" class="no-data">関数が検出されませんでした</td></tr>';
  }
  return funcs.map(fn => {
    const isHigh = fn.complexity > 10;
    const isHighCognitive = fn.cognitiveComplexity > 15;
    const rowStyle = (isHigh || isHighCognitive) ? ' class="high-complexity"' : '';
    return `
    <tr${rowStyle}>
      <td class="mono">${escapeHtml(fn.name)}</td>
      <td class="mono">${fn.line}</td>
      <td class="mono complexity-value">${fn.complexity}${isHigh ? ' <span class="complexity-warning">!</span>' : ''}</td>
      <td class="mono complexity-value">${fn.cognitiveComplexity}${isHighCognitive ? ' <span class="complexity-warning">!</span>' : ''}</td>
    </tr>`;
  }).join('\n');
}

function buildFileSection(analysis: FileAnalysis): string {
  const issueCount = analysis.issues.length;
  const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
  const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;
  const infoCount = analysis.issues.filter(i => i.severity === 'info').length;

  const badges: string[] = [];
  if (errorCount > 0) badges.push(`<span class="severity-badge" style="background-color: #e74c3c">${errorCount} error</span>`);
  if (warningCount > 0) badges.push(`<span class="severity-badge" style="background-color: #f39c12">${warningCount} warning</span>`);
  if (infoCount > 0) badges.push(`<span class="severity-badge" style="background-color: #3498db">${infoCount} info</span>`);

  const summaryBadges = badges.length > 0 ? badges.join(' ') : '<span class="severity-badge" style="background-color: #27ae60">clean</span>';

  return `
    <details class="file-section">
      <summary class="file-header">
        <span class="file-name">${escapeHtml(analysis.file)}</span>
        <span class="file-badges">${summaryBadges}</span>
        <span class="file-complexity">Complexity: ${analysis.complexity.cyclomatic} / Cognitive: ${analysis.complexity.cognitive}</span>
      </summary>
      <div class="file-body">
        <h4>Complexity</h4>
        <table class="data-table complexity-table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Line</th>
              <th>Cyclomatic Complexity</th>
              <th>Cognitive Complexity</th>
            </tr>
          </thead>
          <tbody>
            ${buildFunctionRows(analysis)}
          </tbody>
        </table>

        <h4>Issues (${issueCount})</h4>
        <table class="data-table issue-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Location</th>
              <th>Rule</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            ${buildIssueRows(analysis.issues)}
          </tbody>
        </table>
      </div>
    </details>`;
}

function buildHtml(result: AnalysisResult): string {
  const { summary } = result;
  const maxComplexityInfo = summary.maxComplexity
    ? `${escapeHtml(summary.maxComplexity.function)} in ${escapeHtml(summary.maxComplexity.file)} (${summary.maxComplexity.complexity})`
    : 'N/A';

  const fileSections = result.files.map(f => buildFileSection(f)).join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codopsy Report</title>
  <style>${getStyles()}</style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Codopsy Report</h1>
      <p class="subtitle">Code Quality Analysis Report</p>
      <div class="meta-info">
        <span>${escapeHtml(result.timestamp)}</span>
        <span>${escapeHtml(result.targetDir)}</span>
      </div>
    </div>
  </header>

  <div class="container">
    <section>
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Files Analyzed</div>
          <div class="value">${summary.totalFiles}</div>
        </div>
        <div class="summary-card error">
          <div class="label">Total Issues</div>
          <div class="value">${summary.totalIssues}</div>
          <div class="detail">Error: ${summary.issuesBySeverity.error} / Warning: ${summary.issuesBySeverity.warning} / Info: ${summary.issuesBySeverity.info}</div>
        </div>
        <div class="summary-card complexity">
          <div class="label">Avg Complexity</div>
          <div class="value">${summary.averageComplexity.toFixed(1)}</div>
        </div>
        <div class="summary-card warning">
          <div class="label">Max Complexity</div>
          <div class="value">${summary.maxComplexity ? summary.maxComplexity.complexity : 'N/A'}</div>
          <div class="detail">${maxComplexityInfo}</div>
        </div>
      </div>
    </section>

    <section>
      <h2>File Details</h2>
      ${fileSections}
    </section>
  </div>

  <footer>
    Generated by Codopsy
  </footer>
</body>
</html>`;
}
