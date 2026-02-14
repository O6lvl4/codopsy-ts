<h1 align="center">Codopsy</h1>

<p align="center">
  <strong>コードを解剖する。設定不要、即座に洞察。</strong>
</p>

<p align="center">
  TypeScript & JavaScript の品質を AST レベルで解析する CLI ツール。<br>
  <b>循環的複雑度</b>と<b>認知的複雑度</b>を計測し、<b>13 の lint ルール</b>を適用。<br>
  <b>JSON / HTML / SARIF</b> でレポートを出力 &mdash; コマンド 1 つで完結。
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

---

## なぜ Codopsy？

- **設定不要** &mdash; インストールして即実行。`.eslintrc` の迷路は不要
- **2 つの複雑度指標** &mdash; 循環的複雑度 *と* 認知的複雑度（SonarSource 方式）
- **SARIF 出力** &mdash; GitHub Code Scanning に直接連携
- **Git 連携** &mdash; `--diff` で変更ファイルだけを解析
- **自己解析クリア** &mdash; Codopsy 自身が自分の解析を 0 warnings でパス

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

## 対応ファイル

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`、`dist/`、`*.d.ts`、および `.gitignore` のパターンは自動的に除外されます。

---

## CLI リファレンス

```
codopsy-ts analyze [options] <dir>
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `-f, --format <type>` | `json`、`html`、または `sarif` | `json` |
| `-o, --output <path>` | 出力先ファイルパス。`-` で stdout | `codopsy-report.{format}` |
| `--max-complexity <n>` | 循環的複雑度の閾値 | `10` |
| `--max-cognitive-complexity <n>` | 認知的複雑度の閾値 | `15` |
| `--diff <base>` | `<base>` ref からの差分ファイルのみ解析 | &mdash; |
| `--fail-on-warning` | warning があれば exit 1 | &mdash; |
| `--fail-on-error` | error があれば exit 1 | &mdash; |
| `-v, --verbose` | ファイルごとの解析結果を表示 | &mdash; |
| `-q, --quiet` | サマリーのみ表示 | &mdash; |
| `--no-color` | カラー出力を無効化 | &mdash; |

### 使用例

```bash
# HTML レポートを生成
codopsy-ts analyze ./src -f html -o report.html

# SARIF で GitHub Code Scanning に連携
codopsy-ts analyze ./src -f sarif -o results.sarif

# JSON を jq にパイプ
codopsy-ts analyze ./src -o - | jq '.summary'

# PR で変更されたファイルだけチェック
codopsy-ts analyze ./src --diff origin/main

# CI で warning があれば失敗させる
codopsy-ts analyze ./src --fail-on-warning
```

> `-o -` を使うと進捗メッセージは stderr に出力され、stdout には純粋なレポートデータだけが流れます。

---

## ルール

### 複雑度メトリクス

| メトリクス | 計測内容 |
|---|---|
| **循環的複雑度** | 関数内の分岐パス数（if / for / while / case / `&&` / `\|\|` / `? :` / catch） |
| **認知的複雑度** | 人間が感じる難しさ &mdash; ネストにペナルティ、線形フローを評価（[SonarSource 方式](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)） |

### Lint ルール

| ルール | デフォルト | 検出内容 |
|---|---|---|
| `max-complexity` | warning | 循環的複雑度が閾値を超過 |
| `max-cognitive-complexity` | warning | 認知的複雑度が閾値を超過 |
| `max-lines` | warning | ファイルが 300 行を超過 |
| `max-depth` | warning | ブロックのネストが 4 段を超過 |
| `max-params` | warning | 関数のパラメータが 4 個を超過 |
| `no-any` | warning | `any` 型の使用 |
| `no-var` | warning | `var` 宣言 |
| `eqeqeq` | warning | `===` / `!==` の代わりに `==` / `!=` を使用 |
| `no-empty-function` | warning | 空の関数（コメントのみの関数は意図的と見なし除外） |
| `no-nested-ternary` | warning | ネストした三項演算子（JSX境界内は除外） |
| `no-param-reassign` | warning | 関数パラメータへの再代入 |
| `no-console` | info | `console.*()` の呼び出し |
| `prefer-const` | info | 再代入されない `let` 宣言 |

---

## 設定

`.codopsyrc.json` をプロジェクトルート（または任意の親ディレクトリ）に配置します。上方向に自動探索されます。

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

| 値 | 効果 |
|---|---|
| `"error"` / `"warning"` / `"info"` | 重要度を変更 |
| `false` | ルールを無効化 |
| `{ "severity": "...", "max": N }` | 重要度と閾値を指定 |

---

## 出力フォーマット

### JSON

機械可読な解析データ。`jq` でフィルタしたり、ダッシュボードに送ったり、CI で後続処理に渡せます。

<details>
<summary>出力例</summary>

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

サマリーカード、ファイルごとの複雑度テーブル、Issue 一覧を含むビジュアルレポート。ブラウザで開けます。

### SARIF

[SARIF 2.1.0](https://sarifweb.azurewebsites.net/) 形式。GitHub Code Scanning、VS Code SARIF Viewer などと連携できます。

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

結果は **Security** タブにアップロードされ、PR 上でインラインに Issue が表示されます。

---

## 開発

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
```

```bash
npm start -- analyze ./src        # ローカル実行
npm test                          # 99 テスト
npm run test:watch                # Watch モード
npm run build                     # dist/ にコンパイル
```

### 自己解析

Codopsy は自分自身の解析を 0 warnings でパスします：

```bash
npm start -- analyze ./src --verbose
# 20 files, 0 errors, 0 warnings
```

---

## ライセンス

ISC
