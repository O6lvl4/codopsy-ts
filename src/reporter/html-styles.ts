export function getStyles(): string {
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

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-left: 4px solid #2980b9;
    }

    .summary-card.error { border-left-color: #e74c3c; }
    .summary-card.warning { border-left-color: #f39c12; }
    .summary-card.info { border-left-color: #3498db; }
    .summary-card.complexity { border-left-color: #8e44ad; }

    .summary-card .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .summary-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .summary-card .detail {
      font-size: 12px;
      color: #95a5a6;
      margin-top: 4px;
    }

    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1a5276;
    }

    .file-section {
      background: #fff;
      border-radius: 8px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .file-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      user-select: none;
      font-size: 14px;
      transition: background-color 0.15s;
    }

    .file-header:hover {
      background-color: #f8f9fa;
    }

    .file-name {
      font-weight: 600;
      font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
      font-size: 13px;
      flex-shrink: 0;
    }

    .file-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .file-complexity {
      margin-left: auto;
      font-size: 12px;
      color: #7f8c8d;
      flex-shrink: 0;
    }

    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }

    .file-body {
      padding: 0 20px 20px;
      border-top: 1px solid #ecf0f1;
    }

    .file-body h4 {
      font-size: 14px;
      font-weight: 600;
      color: #1a5276;
      margin: 16px 0 8px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table thead th {
      text-align: left;
      padding: 8px 12px;
      background: #f0f4f8;
      font-weight: 600;
      color: #2c3e50;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #d5dbdb;
    }

    .data-table tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid #ecf0f1;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .mono {
      font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
      font-size: 12px;
    }

    .high-complexity {
      background-color: #fdecea !important;
    }

    .high-complexity .complexity-value {
      color: #e74c3c;
      font-weight: 700;
    }

    .complexity-warning {
      color: #e74c3c;
      font-weight: 700;
    }

    .no-data {
      text-align: center;
      color: #95a5a6;
      font-style: italic;
      padding: 16px 12px !important;
    }

    footer {
      text-align: center;
      padding: 32px 0;
      font-size: 12px;
      color: #95a5a6;
    }

    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr 1fr;
      }

      .meta-info {
        flex-direction: column;
        gap: 4px;
      }

      .file-header {
        flex-wrap: wrap;
      }

      .file-complexity {
        margin-left: 0;
        width: 100%;
      }

      .data-table {
        font-size: 12px;
      }

      .data-table thead th,
      .data-table tbody td {
        padding: 6px 8px;
      }
    }`;
}
