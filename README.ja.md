# Codopsy

TypeScript / JavaScript の品質を AST レベルで解析する CLI ツール。

TypeScript Compiler API を使って循環的複雑度の計測と Lint ルールの検出を行い、JSON または HTML でレポートを出力します。設定不要ですぐに使えます。

[English](README.md)

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

## 対応ファイル

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`、`dist/`、`*.d.ts` は自動的に除外されます。

## CLI

```bash
codopsy-ts analyze [options] <dir>
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `-f, --format <type>` | 出力形式 `json` / `html` | `json` |
| `-o, --output <path>` | 出力先のファイルパス。`-` で stdout | `codopsy-report.{format}` |
| `--max-complexity <n>` | 複雑度の警告閾値 | `10` |
| `--fail-on-warning` | warning があれば exit code 1 | - |
| `--fail-on-error` | error があれば exit code 1 | - |

### 使用例

```bash
# HTML レポートを生成
codopsy-ts analyze ./src -f html -o report.html

# JSON を stdout に出力（パイプに渡せる）
codopsy-ts analyze ./src -f json -o - | jq '.summary'

# 複雑度の閾値を 15 に変更
codopsy-ts analyze ./src --max-complexity 15

# CI で warning があれば失敗させる
codopsy-ts analyze ./src --fail-on-warning
```

`-o -` を指定すると、進捗メッセージは stderr に出力され、stdout にはレポートだけが流れます。

## 検出ルール

### 循環的複雑度

関数ごとに複雑度を計測します。基本値 1 に対して、以下の分岐が +1 されます。

`if` / `for` / `for...in` / `for...of` / `while` / `do...while` / `case` / `? :` / `&&` / `||` / `catch`

### Lint ルール

| ルール | 重要度 | 検出内容 |
|---|---|---|
| `max-complexity` | warning | 複雑度が閾値を超える関数 |
| `no-any` | warning | `any` 型の使用 |
| `max-lines` | warning | 300 行を超えるファイル |
| `no-empty-function` | warning | 空の関数 |
| `no-nested-ternary` | warning | ネストした三項演算子 |
| `no-console` | info | `console.*()` の呼び出し |
| `prefer-const` | info | 再代入されない `let` 宣言 |

## 設定ファイル

`.codopsyrc.json` をプロジェクトに配置するとルールをカスタマイズできます。対象ディレクトリから親ディレクトリに向かって自動的に探索されます。

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

- `"error"` / `"warning"` / `"info"` — 重要度を変更
- `false` — ルールを無効化
- `{ "severity": "...", "max": N }` — 重要度と閾値を指定（`max-lines`, `max-complexity`）

## 出力フォーマット

### JSON

解析結果を構造化データとして出力します。`jq` でフィルタしたり、CI で後続処理に渡すのに便利です。

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

ブラウザで閲覧できるビジュアルレポートを生成します。サマリーカード、ファイルごとの複雑度テーブル、Issue 一覧を含みます。

## 開発

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
npm run build
```

```bash
# 開発時の実行
npm start -- analyze ./src

# テスト
npm test

# Watch モード
npm run test:watch
```

## ライセンス

ISC
