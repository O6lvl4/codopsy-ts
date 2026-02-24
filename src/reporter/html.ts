import { AnalysisResult, FileAnalysis, Issue } from '../analyzer/types.js';
import { getStyles } from './html-styles.js';
import { writeReportFile } from './index.js';
import { escapeHtml, severityColor, severityBgColor, gradeColorHtml, duplicationColor } from './html-helpers.js';
import { buildDuplicationSection } from './html-duplication.js';

export function formatHtmlReport(result: AnalysisResult): string {
  return buildHtml(result);
}

export function generateHtmlReport(result: AnalysisResult, outputPath: string): void {
  writeReportFile(outputPath, formatHtmlReport(result));
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

  const hasIssues = issueCount > 0;
  const hasHighComplexity = analysis.complexity.functions.some(fn => fn.complexity > 10 || fn.cognitiveComplexity > 15);

  return `
    <details class="file-section" data-file="${escapeHtml(analysis.file)}" data-has-issues="${hasIssues}" data-has-high-complexity="${hasHighComplexity}">
      <summary class="file-header">
        <span class="file-badges">${summaryBadges}</span>
        <span class="file-name">${escapeHtml(analysis.file)}</span>
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

function buildScoreHero(result: AnalysisResult, avgComplexity: number): string {
  if (!result.score) return '';
  const { overall, grade, distribution } = result.score;
  const color = gradeColorHtml(grade);

  const distEntries = Object.entries(distribution)
    .filter(([, count]) => (count as number) > 0)
    .map(([g, count]) => `<span class="dist-chip" style="background: ${gradeColorHtml(g)}1a; color: ${gradeColorHtml(g)}">${g}: ${count}</span>`)
    .join('');

  return `
      <div class="score-hero">
        <div class="score-grade" style="background: ${color}12; border-color: ${color}">
          <div class="score-label">Quality Score</div>
          <div class="score-letter" style="color: ${color}">${grade}</div>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width: ${overall}%; background: ${color}"></div>
          </div>
          <div class="score-number">${overall}<span class="score-denominator"> / 100</span></div>
        </div>
        <div class="score-meta">
          <div class="score-meta-item">
            <span class="score-meta-label">Avg Complexity</span>
            <span class="score-meta-value">${avgComplexity.toFixed(1)}</span>
          </div>
        </div>
        <div class="score-dist">${distEntries}</div>
      </div>`;
}

function buildHtml(result: AnalysisResult): string {
  const { summary } = result;
  const maxComplexityFunc = summary.maxComplexity ? escapeHtml(summary.maxComplexity.function) : 'N/A';
  const maxComplexityPath = summary.maxComplexity ? escapeHtml(summary.maxComplexity.file) : '';
  const cleanFiles = result.files.filter(f => f.issues.length === 0).length;

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
      <div class="summary-dashboard">
        ${buildScoreHero(result, summary.averageComplexity)}
        <div class="stats-grid">
          <div class="stat-card" data-filter="all">
            <div class="stat-icon" style="background: #2980b91a; color: #2980b9">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">${summary.totalFiles}</div>
              <div class="stat-label">Files Analyzed</div>
            </div>
          </div>
          <div class="stat-card" data-filter="has-issues">
            <div class="stat-icon" style="background: #e74c3c1a; color: #e74c3c">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">${summary.totalIssues}</div>
              <div class="stat-label">Total Issues</div>
              <div class="stat-breakdown">
                ${summary.issuesBySeverity.error > 0 ? `<span class="stat-dot" style="--dot-color: #e74c3c">${summary.issuesBySeverity.error} error</span>` : ''}
                ${summary.issuesBySeverity.warning > 0 ? `<span class="stat-dot" style="--dot-color: #f39c12">${summary.issuesBySeverity.warning} warn</span>` : ''}
                ${summary.issuesBySeverity.info > 0 ? `<span class="stat-dot" style="--dot-color: #3498db">${summary.issuesBySeverity.info} info</span>` : ''}
              </div>
            </div>
          </div>
          <div class="stat-card" data-filter="clean">
            <div class="stat-icon" style="background: #27ae601a; color: #27ae60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">${cleanFiles}<span class="stat-sub"> / ${summary.totalFiles}</span></div>
              <div class="stat-label">Clean Files</div>
            </div>
          </div>
          <div class="stat-card" data-filter="max-complexity" data-target-file="${maxComplexityPath}">
            <div class="stat-icon" style="background: #f39c121a; color: #f39c12">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">${summary.maxComplexity ? summary.maxComplexity.complexity : 'N/A'}</div>
              <div class="stat-label">Max Complexity</div>
              <div class="stat-detail">${maxComplexityFunc}</div>
              <div class="stat-detail">${maxComplexityPath}</div>
            </div>
          </div>
          ${summary.duplication ? (() => {
            const pct = summary.duplication.percentage;
            const dupColor = duplicationColor(pct);
            return `
          <div class="stat-card">
            <div class="stat-icon" style="background: ${dupColor}1a; color: ${dupColor}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value" style="color: ${dupColor}">${pct.toFixed(1)}<span class="stat-sub">%</span></div>
              <div class="stat-label">Duplication</div>
              <div class="stat-breakdown"><span class="stat-dot" style="--dot-color: ${dupColor}">${summary.duplication.cloneCount} clone(s)</span></div>
            </div>
          </div>`;
          })() : ''}
        </div>
      </div>
    </section>

    ${buildDuplicationSection(result)}

    <section>
      <h2>File Details</h2>
      ${fileSections}
    </section>
  </div>

  <footer>
    Generated by Codopsy
  </footer>

  <script>
  (function() {
    var cards = document.querySelectorAll('.stat-card[data-filter]');
    var sections = document.querySelectorAll('.file-section');
    var activeCard = null;

    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var filter = card.getAttribute('data-filter');

        if (activeCard === card) {
          activeCard.classList.remove('active-filter');
          activeCard = null;
          sections.forEach(function(s) { s.style.display = ''; s.removeAttribute('open'); });
          return;
        }

        if (activeCard) activeCard.classList.remove('active-filter');
        card.classList.add('active-filter');
        activeCard = card;

        sections.forEach(function(s) {
          var show = false;
          if (filter === 'all') {
            show = true;
          } else if (filter === 'has-issues') {
            show = s.getAttribute('data-has-issues') === 'true';
          } else if (filter === 'clean') {
            show = s.getAttribute('data-has-issues') === 'false';
          } else if (filter === 'max-complexity') {
            show = s.getAttribute('data-file') === card.getAttribute('data-target-file');
          }
          s.style.display = show ? '' : 'none';
          if (show) s.setAttribute('open', '');
        });
      });
    });
  })();
  </script>
</body>
</html>`;
}
