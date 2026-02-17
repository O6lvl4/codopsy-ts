<h1 align="center">Codopsy</h1>

<p align="center">
  <strong>Autopsy your code. Zero config, instant insight.</strong>
</p>

<p align="center">
  AST-level code quality analyzer for TypeScript & JavaScript.<br>
  <b>Quality scoring</b> (A&ndash;F), <b>cyclomatic &amp; cognitive complexity</b>, <b>13 lint rules</b>,<br>
  <b>baseline tracking</b>, <b>hotspot detection</b>, and <b>plugin support</b><br>
  &mdash; all from a single command.
</p>

<p align="center">
  <a href="README.ja.md">日本語</a>
</p>

---

## Why Codopsy?

| | ESLint + sonarjs | Biome | oxlint | **Codopsy** |
|---|---|---|---|---|
| Zero config | - | partial | partial | **yes** |
| Cyclomatic complexity | plugin | - | - | **built-in** |
| Cognitive complexity | plugin | - | - | **built-in** |
| Quality score (A&ndash;F) | - | - | - | **built-in** |
| Baseline / CI gate | - | - | - | **built-in** |
| Hotspot detection | - | - | - | **built-in** |
| SARIF output | plugin | - | - | **built-in** |
| Plugin system | yes | - | - | **yes** |
| Programmatic API | - | - | - | **yes** |

- **Zero config** &mdash; works out of the box, no `.eslintrc` jungle
- **Quality score** &mdash; A&ndash;F grade per file and project (0&ndash;100 scale)
- **Two complexity metrics** &mdash; cyclomatic *and* cognitive (SonarSource method)
- **Baseline tracking** &mdash; save a snapshot, fail CI if quality degrades
- **Hotspot detection** &mdash; find files with high complexity *and* high git churn
- **Plugin system** &mdash; add custom rules via simple JS/TS modules
- **SARIF output** &mdash; plug directly into GitHub Code Scanning
- **Git-aware** &mdash; `--diff` to analyze only changed files
- **Programmatic API** &mdash; `import { analyze } from 'codopsy-ts'` without triggering CLI
- **Self-dogfooding** &mdash; Codopsy passes its own analysis with grade **A (99/100)**

---

## Quick Start

```bash
npm install -g codopsy-ts

# Generate config (optional)
codopsy-ts init

# Analyze
codopsy-ts analyze ./src
```

```
Analyzing ./src ...
Found 28 source file(s).

=== Analysis Summary ===
  Quality Score:  A (99/100)
  Files analyzed: 28
  Total issues:   29
    Error:   0
    Warning: 0
    Info:    29
  Avg complexity: 2.8
  Max complexity: 10 (checkMaxComplexity in src/analyze.ts)

Report written to: codopsy-report.json
```

---

## Supported Files

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`, `dist/`, `*.d.ts`, and `.gitignore` patterns are excluded automatically.

---

## CLI Reference

### `codopsy-ts analyze`

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
| `--save-baseline` | Save current results as baseline | &mdash; |
| `--baseline-path <path>` | Path to baseline file | `.codopsy-baseline.json` |
| `--no-degradation` | Exit 1 if quality degrades vs baseline | &mdash; |
| `--hotspots` | Show hotspot analysis (complexity x churn) | &mdash; |

### `codopsy-ts init`

```
codopsy-ts init [dir] [--force]
```

Generate a `.codopsyrc.json` with all rules configured. Use `--force` to overwrite.

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

# Save baseline and fail on degradation
codopsy-ts analyze ./src --save-baseline
codopsy-ts analyze ./src --no-degradation

# Show hotspots (high complexity + high churn)
codopsy-ts analyze ./src --hotspots
```

> When using `-o -`, progress messages go to stderr so stdout is pure report data.

---

## Quality Score

Every file and the project as a whole receive a score from **0&ndash;100**, mapped to an **A&ndash;F** grade.

| Grade | Score |
|---|---|
| **A** | 90&ndash;100 |
| **B** | 75&ndash;89 |
| **C** | 60&ndash;74 |
| **D** | 40&ndash;59 |
| **F** | 0&ndash;39 |

The score is composed of three sub-scores:

- **Complexity** (0&ndash;40) &mdash; penalties for cyclomatic > 10, cognitive > 15
- **Issues** (0&ndash;40) &mdash; penalties per error (-8), warning (-3), info (-1)
- **Structure** (0&ndash;20) &mdash; penalties for long files, deep nesting, many params

---

## Baseline Tracking

Save a snapshot of your quality metrics, then fail CI if things get worse.

```bash
# Save baseline after a clean run
codopsy-ts analyze ./src --save-baseline

# On subsequent runs, compare and fail if degraded
codopsy-ts analyze ./src --no-degradation
```

The baseline file (`.codopsy-baseline.json`) stores per-file issue counts, complexity, and score. The comparison output shows:

```
=== Baseline Comparison ===
  Status: IMPROVED
  Score:  B → A (↑ +5)
  Issues: -3
  Improved: src/index.ts, src/utils.ts
```

---

## Hotspot Detection

Combine **complexity** with **git churn** to find the riskiest files in your codebase.

```bash
codopsy-ts analyze ./src --hotspots
```

```
=== Hotspot Analysis (last 6 months) ===
  HIGH   src/analyzer/linter.ts (42 commits, 3 authors, complexity: 9)
  MEDIUM src/index.ts (28 commits, 2 authors, complexity: 7)
  LOW    src/utils/file.ts (5 commits, 1 authors, complexity: 4)
```

Risk levels: **HIGH** (score > 100), **MEDIUM** (score > 30), **LOW** (score <= 30).

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

Generate a config file with `codopsy-ts init`, or create `.codopsyrc.json` manually in your project root (searched upward).

```json
{
  "rules": {
    "no-any": "error",
    "no-console": false,
    "max-lines": { "severity": "warning", "max": 500 },
    "max-complexity": { "severity": "error", "max": 15 },
    "max-cognitive-complexity": { "severity": "warning", "max": 20 }
  },
  "plugins": ["./my-plugin.js"]
}
```

| Value | Effect |
|---|---|
| `"error"` / `"warning"` / `"info"` | Change severity |
| `false` | Disable the rule |
| `{ "severity": "...", "max": N }` | Set severity + threshold |

---

## Plugin System

Create custom rules as JS/TS modules. A plugin exports a `rules` array:

```js
// my-plugin.js
export default {
  rules: [
    {
      id: 'no-todo-comments',
      description: 'Disallow TODO comments',
      defaultSeverity: 'info',
      check(sourceFile, filePath, issues) {
        const text = sourceFile.getFullText();
        const regex = /\/\/\s*TODO/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(match.index);
          issues.push({
            file: filePath,
            line: line + 1,
            column: 1,
            severity: 'info',
            rule: 'no-todo-comments',
            message: 'TODO comment found',
          });
        }
      },
    },
  ],
};
```

Register in `.codopsyrc.json`:

```json
{
  "plugins": ["./my-plugin.js"],
  "rules": {
    "no-todo-comments": "warning"
  }
}
```

Plugin rules can be configured (change severity or disable) just like built-in rules.

---

## Programmatic API

Use Codopsy as a library without triggering the CLI:

```ts
import { analyze } from 'codopsy-ts';

const result = await analyze({ targetDir: './src' });
console.log(result.score);  // { overall: 99, grade: 'A', distribution: { A: 25, B: 3, ... } }
console.log(result.summary.totalIssues);
```

### Available exports

```ts
import {
  // High-level
  analyze,

  // Low-level
  analyzeFile,
  analyzeComplexity,
  lintFile,

  // Config
  loadConfig,

  // Report
  formatReport,
  generateReport,

  // Scoring
  calculateFileScore,
  calculateProjectScore,

  // Files
  findSourceFiles,

  // Plugins
  loadPlugins,
} from 'codopsy-ts';
```

---

## Output Formats

### JSON

Machine-readable analysis data. Pipe to `jq`, feed into dashboards, or post-process in CI.

<details>
<summary>Example output</summary>

```json
{
  "timestamp": "2026-02-17T12:00:00.000Z",
  "targetDir": "./src",
  "score": {
    "overall": 99,
    "grade": "A",
    "distribution": { "A": 25, "B": 3 }
  },
  "files": [
    {
      "file": "src/analyze.ts",
      "complexity": {
        "cyclomatic": 10,
        "cognitive": 8,
        "functions": [
          { "name": "checkMaxComplexity", "line": 74, "complexity": 10, "cognitiveComplexity": 8 }
        ]
      },
      "issues": [],
      "score": { "score": 95, "grade": "A" }
    }
  ],
  "summary": {
    "totalFiles": 28,
    "totalIssues": 29,
    "issuesBySeverity": { "error": 0, "warning": 0, "info": 29 },
    "averageComplexity": 2.8,
    "maxComplexity": { "file": "src/analyze.ts", "function": "checkMaxComplexity", "complexity": 10 }
  }
}
```

</details>

### HTML

Visual report with quality score card, grade distribution, per-file complexity breakdown, and issue listings. Open in any browser.

### SARIF

[SARIF 2.1.0](https://sarifweb.azurewebsites.net/) for integration with GitHub Code Scanning, VS Code SARIF Viewer, and other tools.

---

## GitHub Actions

### Using the Action (recommended)

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
      - uses: O6lvl4/codopsy-ts@v1
        with:
          directory: ./src
```

SARIF results are automatically uploaded to the **Security** tab.

### Action inputs

| Input | Description | Default |
|---|---|---|
| `directory` | Directory to analyze | `./src` |
| `format` | Output format | `sarif` |
| `max-complexity` | Cyclomatic threshold | `10` |
| `max-cognitive-complexity` | Cognitive threshold | `15` |
| `fail-on-warning` | Fail on warnings | `false` |
| `fail-on-error` | Fail on errors | `true` |
| `upload-sarif` | Upload SARIF to Code Scanning | `true` |

### Manual setup

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

---

## Development

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
```

```bash
npm start -- analyze ./src        # Run locally
npm test                          # 138 tests
npm run test:watch                # Watch mode
npm run build                     # Compile to dist/
```

### Self-analysis

Codopsy analyzes itself with grade A and 0 warnings:

```bash
npm start -- analyze ./src --verbose
# 28 files, Quality Score: A (99/100), 0 warnings
```

---

## License

ISC
