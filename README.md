# Codopsy

AST-level code quality analyzer for TypeScript and JavaScript.

Uses the TypeScript Compiler API to measure cyclomatic complexity and detect lint issues, then outputs reports in JSON or HTML. Zero config required.

[日本語](README.ja.md)

## Quick Start

```bash
npm install -g codopsy-ts

codopsy-ts analyze ./src
```

```
Analyzing ./src ...
Found 12 source file(s).

=== Analysis Summary ===
  Files analyzed: 12
  Total issues:   13
    Error:   0
    Warning: 0
    Info:    13
  Avg complexity: 3.04
  Max complexity: 9 (visit in src/analyzer/prefer-const.ts)

Report written to: codopsy-report.json
```

## Supported Files

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`, `dist/`, and `*.d.ts` are excluded automatically.

## CLI

```bash
codopsy-ts analyze [options] <dir>
```

| Option | Description | Default |
|---|---|---|
| `-f, --format <type>` | Output format: `json` or `html` | `json` |
| `-o, --output <path>` | Output file path. `-` for stdout | `codopsy-report.{format}` |
| `--max-complexity <n>` | Complexity warning threshold | `10` |
| `--fail-on-warning` | Exit with code 1 if warnings found | - |
| `--fail-on-error` | Exit with code 1 if errors found | - |

### Examples

```bash
# Generate an HTML report
codopsy-ts analyze ./src -f html -o report.html

# Pipe JSON to stdout
codopsy-ts analyze ./src -f json -o - | jq '.summary'

# Set complexity threshold to 15
codopsy-ts analyze ./src --max-complexity 15

# Fail CI on warnings
codopsy-ts analyze ./src --fail-on-warning
```

When using `-o -`, progress messages go to stderr so stdout contains only the report.

## Rules

### Cyclomatic Complexity

Measures complexity per function. Starts at 1, incremented by:

`if` / `for` / `for...in` / `for...of` / `while` / `do...while` / `case` / `? :` / `&&` / `||` / `catch`

### Lint Rules

| Rule | Severity | Description |
|---|---|---|
| `max-complexity` | warning | Function exceeds complexity threshold |
| `no-any` | warning | Usage of `any` type |
| `max-lines` | warning | File exceeds 300 lines |
| `no-empty-function` | warning | Empty function body |
| `no-nested-ternary` | warning | Nested ternary expression |
| `no-console` | info | `console.*()` call |
| `prefer-const` | info | `let` declaration that is never reassigned |

## Configuration

Place `.codopsyrc.json` in your project to customize rules. The file is searched from the target directory upward.

```json
{
  "rules": {
    "no-any": "error",
    "no-console": false,
    "max-lines": { "severity": "warning", "max": 500 },
    "max-complexity": { "severity": "error", "max": 15 }
  }
}
```

- `"error"` / `"warning"` / `"info"` — change severity
- `false` — disable the rule
- `{ "severity": "...", "max": N }` — set severity and threshold (`max-lines`, `max-complexity`)

## Output Formats

### JSON

Structured analysis data. Useful for piping to `jq` or feeding into CI pipelines.

```json
{
  "timestamp": "2026-02-14T00:00:00.000Z",
  "targetDir": "./src",
  "files": [
    {
      "file": "src/index.ts",
      "complexity": {
        "cyclomatic": 8,
        "functions": [
          { "name": "main", "line": 10, "complexity": 8 }
        ]
      },
      "issues": [
        {
          "file": "src/index.ts",
          "line": 42,
          "column": 5,
          "severity": "info",
          "rule": "no-console",
          "message": "Unexpected console statement"
        }
      ]
    }
  ],
  "summary": {
    "totalFiles": 1,
    "totalIssues": 1,
    "issuesBySeverity": { "error": 0, "warning": 0, "info": 1 },
    "averageComplexity": 8,
    "maxComplexity": { "file": "src/index.ts", "function": "main", "complexity": 8 }
  }
}
```

### HTML

Visual report viewable in a browser. Includes summary cards, per-file complexity tables, and issue listings.

## Development

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
npm run build
```

```bash
# Run during development
npm start -- analyze ./src

# Run tests
npm test

# Watch mode
npm run test:watch
```

## License

ISC
