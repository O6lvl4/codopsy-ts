export function getComponentStyles(): string {
  return `
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
      min-width: 0;
      overflow-wrap: break-word;
      word-break: break-all;
    }

    .file-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      flex-shrink: 0;
      order: -1;
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

    @media (max-width: 768px) {
      .summary-dashboard {
        grid-template-columns: 1fr;
      }

      .score-grade {
        padding: 20px;
      }

      .score-letter {
        font-size: 48px;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 600px) {
      .meta-info {
        flex-direction: column;
        gap: 4px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
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
    }

    .dup-summary {
      margin-bottom: 20px;
    }

    .dup-stat-bar {
      background: #fff;
      border: 1px solid #e1e8ef;
      border-radius: 10px;
      padding: 16px 20px;
    }

    .dup-bar-label {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }

    .dup-pct {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
    }

    .dup-bar-sub {
      font-size: 0.85rem;
      color: #7f8c8d;
    }

    .dup-bar-track {
      height: 8px;
      background: #ecf0f1;
      border-radius: 4px;
      overflow: hidden;
    }

    .dup-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .dup-table td {
      vertical-align: top;
    }

    .dup-line {
      font-size: 0.75rem;
      color: #7f8c8d;
    }

    .dup-fragment {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
      font-size: 0.78rem;
      color: #555;
      background: #f7f9fc;
      padding: 2px 6px;
      border-radius: 4px;
    }`;
}
