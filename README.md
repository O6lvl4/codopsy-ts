<h1 align="center">Codopsy</h1>

<p align="center">
  <strong>Autopsy your code. Zero config, instant insight.</strong>
</p>

<p align="center">
  AST-level code quality analyzer for TypeScript & JavaScript.<br>
  Measures <b>cyclomatic</b> and <b>cognitive</b> complexity, enforces <b>13 lint rules</b>,<br>
  and outputs <b>JSON / HTML / SARIF</b> &mdash; all from a single command.
</p>

<p align="center">
  <a href="README.ja.md">日本語</a>
</p>

---

## Why Codopsy?

- **Zero config** &mdash; works out of the box, no `.eslintrc` jungle
- **Two complexity metrics** &mdash; cyclomatic *and* cognitive (SonarSource method)
- **SARIF output** &mdash; plug directly into GitHub Code Scanning
- **Git-aware** &mdash; `--diff` to analyze only changed files
- **Self-dogfooding** &mdash; Codopsy passes its own analysis with 0 warnings

---

## Quick Start

```bash
npm install -g codopsy-ts

codopsy-ts analyze ./src
```

```
Analyzing ./src ...
Found 20 source file(s).

=== Analysis Summary ===
  Files analyzed: 20
  Total issues:   0
    Error:   0
    Warning: 0
    Info:    0
  Avg complexity: 2.9
  Max complexity: 10 (checkMaxComplexity in src/index.ts)

Report written to: codopsy-report.json
```

---

## Supported Files

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`, `dist/`, `*.d.ts`, and `.gitignore` patterns are excluded automatically.

---

## CLI Reference

```
codopsy-ts analyze [options] <dir>
```

| Option | Description | Default |
|---|---|---|
| `-f, --format <type>` | `json`, `html`, or `sarif` | `json` |
| `-o, --output <path>` | Output file path. `-` for stdout | `codopsy-report.{format}` |
| `--max-complexity <n>` | Cyclomatic complexity threshold | `10` |
| `--max-cognitive-complexity <n>` | Cognitive complexity threshold | `15` |
| `--diff <base>` | Only analyze files changed from `<base>` ref | &mdash; |
| `--fail-on-warning` | Exit 1 if warnings found | &mdash; |
| `--fail-on-error` | Exit 1 if errors found | &mdash; |
| `-v, --verbose` | Show per-file results | &mdash; |
| `-q, --quiet` | Summary only | &mdash; |
| `--no-color` | Disable colors | &mdash; |

### Examples

```bash
# HTML report
codopsy-ts analyze ./src -f html -o report.html

# SARIF for GitHub Code Scanning
codopsy-ts analyze ./src -f sarif -o results.sarif

# Pipe JSON to jq
codopsy-ts analyze ./src -o - | jq '.summary'

# Only check files changed in this PR
codopsy-ts analyze ./src --diff origin/main

# Gate CI on warnings
codopsy-ts analyze ./src --fail-on-warning
```

> When using `-o -`, progress messages go to stderr so stdout is pure report data.

---

## Rules

### Complexity Metrics

| Metric | What it measures |
|---|---|
| **Cyclomatic** | Branching paths per function (if / for / while / case / `&&` / `\|\|` / `? :` / catch) |
| **Cognitive** | Human-perceived difficulty &mdash; penalizes nesting, rewards linear flow ([SonarSource method](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)) |

### Lint Rules

| Rule | Default | Description |
|---|---|---|
| `max-complexity` | warning | Cyclomatic complexity exceeds threshold |
| `max-cognitive-complexity` | warning | Cognitive complexity exceeds threshold |
| `max-lines` | warning | File exceeds 300 lines |
| `max-depth` | warning | Block nesting exceeds 4 levels |
| `max-params` | warning | Function has more than 4 parameters |
| `no-any` | warning | Usage of `any` type |
| `no-var` | warning | `var` declaration |
| `eqeqeq` | warning | `==` / `!=` instead of `===` / `!==` |
| `no-empty-function` | warning | Empty function body (comment-only bodies are considered intentional) |
| `no-nested-ternary` | warning | Nested ternary expression (JSX boundaries are excluded) |
| `no-param-reassign` | warning | Reassignment to function parameter |
| `no-console` | info | `console.*()` call |
| `prefer-const` | info | `let` that is never reassigned |

---

## Configuration

Place `.codopsyrc.json` in your project root (or any parent directory &mdash; it's searched upward).

```json
{
  "rules": {
    "no-any": "error",
    "no-console": false,
    "max-lines": { "severity": "warning", "max": 500 },
    "max-complexity": { "severity": "error", "max": 15 },
    "max-cognitive-complexity": { "severity": "warning", "max": 20 }
  }
}
```

| Value | Effect |
|---|---|
| `"error"` / `"warning"` / `"info"` | Change severity |
| `false` | Disable the rule |
| `{ "severity": "...", "max": N }` | Set severity + threshold |

---

## Output Formats

### JSON

Machine-readable analysis data. Pipe to `jq`, feed into dashboards, or post-process in CI.

<details>
<summary>Example output</summary>

```json
{
  "timestamp": "2026-02-14T12:00:00.000Z",
  "targetDir": "./src",
  "files": [
    {
      "file": "src/index.ts",
      "complexity": {
        "cyclomatic": 10,
        "cognitive": 8,
        "functions": [
          { "name": "analyzeAction", "line": 275, "complexity": 9, "cognitiveComplexity": 4 }
        ]
      },
      "issues": []
    }
  ],
  "summary": {
    "totalFiles": 20,
    "totalIssues": 0,
    "issuesBySeverity": { "error": 0, "warning": 0, "info": 0 },
    "averageComplexity": 2.9,
    "maxComplexity": { "file": "src/index.ts", "function": "checkMaxComplexity", "complexity": 10 }
  }
}
```

</details>

### HTML

Visual report with summary cards, per-file complexity breakdown, and issue listings. Open in any browser.

### SARIF

[SARIF 2.1.0](https://sarifweb.azurewebsites.net/) for integration with GitHub Code Scanning, VS Code SARIF Viewer, and other tools.

---

## GitHub Actions

```yaml
name: Codopsy
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g codopsy-ts
      - run: codopsy-ts analyze ./src --format sarif --output results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

This uploads results to the **Security** tab, showing issues inline on PRs.

---

## Development

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
```

```bash
npm start -- analyze ./src        # Run locally
npm test                          # 99 tests
npm run test:watch                # Watch mode
npm run build                     # Compile to dist/
```

### Self-analysis

Codopsy analyzes itself with 0 warnings:

```bash
npm start -- analyze ./src --verbose
# 20 files, 0 errors, 0 warnings
```

---

## License

ISC
