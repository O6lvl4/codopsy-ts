export function getLayoutStyles(): string {
  return `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #f0f4f8;
      color: #2c3e50;
      line-height: 1.6;
      padding: 0;
      margin: 0;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    header {
      background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%);
      color: #fff;
      padding: 32px 0;
      margin-bottom: 32px;
    }

    header .container {
      padding-top: 0;
      padding-bottom: 0;
    }

    header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    header .subtitle {
      font-size: 14px;
      opacity: 0.85;
    }

    .meta-info {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      font-size: 13px;
      opacity: 0.9;
    }

    .meta-info span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── Summary Dashboard ── */
    .summary-dashboard {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }

    .score-hero {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .score-grade {
      background: #fff;
      border-radius: 12px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 2px solid;
    }

    .score-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .score-letter {
      font-size: 64px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 12px;
    }

    .score-bar-track {
      height: 6px;
      background: #ecf0f1;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .score-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .score-number {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .score-denominator {
      font-size: 13px;
      font-weight: 400;
      color: #95a5a6;
    }

    .score-meta {
      background: #fff;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .score-meta-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .score-meta-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .score-meta-value {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
    }

    .score-dist {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dist-chip {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      white-space: nowrap;
    }

    /* ── Stat Cards ── */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .stat-card {
      background: #fff;
      border-radius: 10px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      display: flex;
      align-items: flex-start;
      gap: 14px;
      cursor: pointer;
      transition: box-shadow 0.15s, transform 0.15s;
    }

    .stat-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      transform: translateY(-1px);
    }

    .stat-card.active-filter {
      box-shadow: 0 0 0 2px #2980b9, 0 4px 12px rgba(0,0,0,0.12);
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-content {
      min-width: 0;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .stat-breakdown {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .stat-dot {
      font-size: 11px;
      font-weight: 600;
      color: var(--dot-color);
    }

    .stat-dot::before {
      content: '';
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--dot-color);
      margin-right: 4px;
      vertical-align: middle;
    }

    .stat-sub {
      font-size: 14px;
      font-weight: 400;
      color: #95a5a6;
    }

    .stat-detail {
      font-size: 11px;
      color: #95a5a6;
      margin-top: 2px;
      overflow-wrap: break-word;
      word-break: break-all;
    }`;
}
