export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'error': return '#e74c3c';
    case 'warning': return '#f39c12';
    case 'info': return '#3498db';
    default: return '#999';
  }
}

export function severityBgColor(severity: string): string {
  switch (severity) {
    case 'error': return '#fdecea';
    case 'warning': return '#fef9e7';
    case 'info': return '#eaf2f8';
    default: return '#f5f5f5';
  }
}

export function gradeColorHtml(grade: string): string {
  switch (grade) {
    case 'A': return '#27ae60';
    case 'B': return '#2ecc71';
    case 'C': return '#f39c12';
    case 'D': return '#e67e22';
    case 'F': return '#e74c3c';
    default: return '#999';
  }
}

export function duplicationColor(pct: number): string {
  if (pct < 3) return '#27ae60';
  if (pct < 10) return '#f39c12';
  return '#e74c3c';
}
