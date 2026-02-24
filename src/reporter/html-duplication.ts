import { AnalysisResult } from '../analyzer/types.js';
import { ClonePair } from '../duplication/types.js';
import { escapeHtml, severityColor, duplicationColor } from './html-helpers.js';

function buildCloneRow(clone: ClonePair): string {
  const sevColor = severityColor(clone.severity);
  return `
    <tr>
      <td><span class="severity-badge" style="background-color: ${sevColor}">${escapeHtml(clone.severity)}</span></td>
      <td class="mono">${escapeHtml(clone.fileA)}<br><span class="dup-line">L${clone.startLineA}–${clone.endLineA}</span></td>
      <td class="mono">${escapeHtml(clone.fileB)}<br><span class="dup-line">L${clone.startLineB}–${clone.endLineB}</span></td>
      <td class="mono">${clone.lines}</td>
      <td class="mono">${clone.tokens}</td>
      <td><code class="dup-fragment">${escapeHtml(clone.fragment)}</code></td>
    </tr>`;
}

export function buildDuplicationSection(result: AnalysisResult): string {
  if (!result.duplication) return '';
  const { percentage, totalDuplicatedLines, totalLines, clones } = result.duplication;
  const pctFixed = percentage.toFixed(1);
  const barColor = duplicationColor(percentage);

  const cloneRows = clones.length > 0
    ? clones.map((c) => buildCloneRow(c)).join('\n')
    : '<tr><td colspan="5" class="no-data">重複コードは検出されませんでした</td></tr>';

  return `
    <section>
      <h2>Duplication</h2>
      <div class="dup-summary">
        <div class="dup-stat-bar">
          <div class="dup-bar-label">
            <span class="dup-pct" style="color: ${barColor}">${pctFixed}%</span>
            <span class="dup-bar-sub">${totalDuplicatedLines} / ${totalLines} lines duplicated &nbsp;·&nbsp; ${clones.length} clone pair(s)</span>
          </div>
          <div class="dup-bar-track">
            <div class="dup-bar-fill" style="width: ${Math.min(percentage, 100).toFixed(1)}%; background: ${barColor}"></div>
          </div>
        </div>
      </div>
      <table class="data-table dup-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>File A</th>
            <th>File B</th>
            <th>Lines</th>
            <th>Tokens</th>
            <th>Fragment</th>
          </tr>
        </thead>
        <tbody>
          ${cloneRows}
        </tbody>
      </table>
    </section>`;
}
