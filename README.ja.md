<h1 align="center">Codopsy</h1>

<p align="center">
  <strong>コードを解剖する。設定不要、即座に洞察。</strong>
</p>

<p align="center">
  TypeScript & JavaScript の品質を AST レベルで解析する CLI ツール。<br>
  <b>品質スコア</b>（A&ndash;F）、<b>循環的 &amp; 認知的複雑度</b>、<b>13 の lint ルール</b>、<br>
  <b>ベースライン追跡</b>、<b>ホットスポット検知</b>、<b>プラグイン対応</b><br>
  &mdash; コマンド 1 つで完結。
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

---

## なぜ Codopsy？

| | ESLint + sonarjs | Biome | oxlint | **Codopsy** |
|---|---|---|---|---|
| ゼロコンフィグ | - | 部分的 | 部分的 | **yes** |
| 循環的複雑度 | plugin | - | - | **組み込み** |
| 認知的複雑度 | plugin | - | - | **組み込み** |
| 品質スコア (A&ndash;F) | - | - | - | **組み込み** |
| ベースライン / CI ゲート | - | - | - | **組み込み** |
| ホットスポット検知 | - | - | - | **組み込み** |
| SARIF 出力 | plugin | - | - | **組み込み** |
| プラグインシステム | yes | - | - | **yes** |
| プログラマティック API | - | - | - | **yes** |

- **設定不要** &mdash; インストールして即実行。`.eslintrc` の迷路は不要
- **品質スコア** &mdash; ファイル・プロジェクト単位で A&ndash;F グレード（0&ndash;100 スケール）
- **2 つの複雑度指標** &mdash; 循環的複雑度 *と* 認知的複雑度（SonarSource 方式）
- **ベースライン追跡** &mdash; スナップショットを保存し、品質劣化で CI を落とす
- **ホットスポット検知** &mdash; 複雑度が高く変更頻度も高いファイルを特定
- **プラグインシステム** &mdash; JS/TS モジュールでカスタムルールを追加
- **SARIF 出力** &mdash; GitHub Code Scanning に直接連携
- **Git 連携** &mdash; `--diff` で変更ファイルだけを解析
- **プログラマティック API** &mdash; `import { analyze } from 'codopsy-ts'` で CLI を起動せず利用可能
- **自己解析クリア** &mdash; Codopsy 自身がグレード **A (99/100)** をパス

---

## Quick Start

```bash
npm install -g codopsy-ts

# 設定ファイル生成（任意）
codopsy-ts init

# 解析
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

## 対応ファイル

`.ts` `.tsx` `.js` `.jsx`

`node_modules/`、`dist/`、`*.d.ts`、および `.gitignore` のパターンは自動的に除外されます。

---

## CLI リファレンス

### `codopsy-ts analyze`

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
| `--save-baseline` | 現在の結果をベースラインとして保存 | &mdash; |
| `--baseline-path <path>` | ベースラインファイルのパス | `.codopsy-baseline.json` |
| `--no-degradation` | ベースラインから劣化していたら exit 1 | &mdash; |
| `--hotspots` | ホットスポット分析を表示（複雑度 x 変更頻度） | &mdash; |

### `codopsy-ts init`

```
codopsy-ts init [dir] [--force]
```

全ルールが設定された `.codopsyrc.json` を生成します。`--force` で上書き。

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

# ベースラインを保存し、劣化があれば失敗させる
codopsy-ts analyze ./src --save-baseline
codopsy-ts analyze ./src --no-degradation

# ホットスポットを表示（複雑度 x 変更頻度）
codopsy-ts analyze ./src --hotspots
```

> `-o -` を使うと進捗メッセージは stderr に出力され、stdout には純粋なレポートデータだけが流れます。

---

## 品質スコア

ファイルごと・プロジェクト全体に **0&ndash;100** のスコアと **A&ndash;F** のグレードが付与されます。

| グレード | スコア |
|---|---|
| **A** | 90&ndash;100 |
| **B** | 75&ndash;89 |
| **C** | 60&ndash;74 |
| **D** | 40&ndash;59 |
| **F** | 0&ndash;39 |

スコアは 3 つのサブスコアで構成されます：

- **複雑度** (0&ndash;40) &mdash; cyclomatic > 10、cognitive > 15 でペナルティ
- **課題** (0&ndash;40) &mdash; error: -8、warning: -3、info: -1
- **構造** (0&ndash;20) &mdash; 長すぎるファイル、深いネスト、多すぎるパラメータにペナルティ

---

## ベースライン追跡

品質メトリクスのスナップショットを保存し、劣化があれば CI を失敗させます。

```bash
# クリーンな実行後にベースラインを保存
codopsy-ts analyze ./src --save-baseline

# 以降の実行で比較し、劣化があれば失敗
codopsy-ts analyze ./src --no-degradation
```

ベースラインファイル（`.codopsy-baseline.json`）にはファイルごとの課題数・複雑度・スコアが保存されます。比較結果：

```
=== Baseline Comparison ===
  Status: IMPROVED
  Score:  B → A (↑ +5)
  Issues: -3
  Improved: src/index.ts, src/utils.ts
```

---

## ホットスポット検知

**複雑度** と **git の変更頻度** を組み合わせ、最もリスクの高いファイルを特定します。

```bash
codopsy-ts analyze ./src --hotspots
```

```
=== Hotspot Analysis (last 6 months) ===
  HIGH   src/analyzer/linter.ts (42 commits, 3 authors, complexity: 9)
  MEDIUM src/index.ts (28 commits, 2 authors, complexity: 7)
  LOW    src/utils/file.ts (5 commits, 1 authors, complexity: 4)
```

リスクレベル: **HIGH**（スコア > 100）、**MEDIUM**（スコア > 30）、**LOW**（スコア <= 30）

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
| `no-nested-ternary` | warning | ネストした三項演算子（JSX 境界内は除外） |
| `no-param-reassign` | warning | 関数パラメータへの再代入 |
| `no-console` | info | `console.*()` の呼び出し |
| `prefer-const` | info | 再代入されない `let` 宣言 |

---

## 設定

`codopsy-ts init` で設定ファイルを生成するか、`.codopsyrc.json` をプロジェクトルートに手動作成します（上方向に自動探索）。

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

| 値 | 効果 |
|---|---|
| `"error"` / `"warning"` / `"info"` | 重要度を変更 |
| `false` | ルールを無効化 |
| `{ "severity": "...", "max": N }` | 重要度と閾値を指定 |

---

## プラグインシステム

JS/TS モジュールでカスタムルールを作成できます。プラグインは `rules` 配列をエクスポートします：

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

`.codopsyrc.json` に登録：

```json
{
  "plugins": ["./my-plugin.js"],
  "rules": {
    "no-todo-comments": "warning"
  }
}
```

プラグインルールも組み込みルールと同様に重要度の変更や無効化が可能です。

---

## プログラマティック API

CLI を起動せずライブラリとして使用できます：

```ts
import { analyze } from 'codopsy-ts';

const result = await analyze({ targetDir: './src' });
console.log(result.score);  // { overall: 99, grade: 'A', distribution: { A: 25, B: 3, ... } }
console.log(result.summary.totalIssues);
```

### エクスポート一覧

```ts
import {
  // ハイレベル
  analyze,

  // ローレベル
  analyzeFile,
  analyzeComplexity,
  lintFile,

  // 設定
  loadConfig,

  // レポート
  formatReport,
  generateReport,

  // スコアリング
  calculateFileScore,
  calculateProjectScore,

  // ファイル
  findSourceFiles,

  // プラグイン
  loadPlugins,
} from 'codopsy-ts';
```

---

## 出力フォーマット

### JSON

機械可読な解析データ。`jq` でフィルタしたり、ダッシュボードに送ったり、CI で後続処理に渡せます。

<details>
<summary>出力例</summary>

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

品質スコアカード、グレード分布、ファイルごとの複雑度テーブル、Issue 一覧を含むビジュアルレポート。ブラウザで開けます。

### SARIF

[SARIF 2.1.0](https://sarifweb.azurewebsites.net/) 形式。GitHub Code Scanning、VS Code SARIF Viewer などと連携できます。

---

## GitHub Actions

### Action を使う方法（推奨）

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

SARIF は自動的に **Security** タブにアップロードされます。

### Action の入力パラメータ

| パラメータ | 説明 | デフォルト |
|---|---|---|
| `directory` | 解析対象ディレクトリ | `./src` |
| `format` | 出力形式 | `sarif` |
| `max-complexity` | 循環的複雑度の閾値 | `10` |
| `max-cognitive-complexity` | 認知的複雑度の閾値 | `15` |
| `fail-on-warning` | warning で失敗 | `false` |
| `fail-on-error` | error で失敗 | `true` |
| `upload-sarif` | Code Scanning に SARIF アップロード | `true` |

### 手動セットアップ

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

## 開発

```bash
git clone https://github.com/O6lvl4/codopsy-ts.git
cd codopsy-ts
npm install
```

```bash
npm start -- analyze ./src        # ローカル実行
npm test                          # 138 テスト
npm run test:watch                # Watch モード
npm run build                     # dist/ にコンパイル
```

### 自己解析

Codopsy は自分自身をグレード A、0 warnings で解析パスします：

```bash
npm start -- analyze ./src --verbose
# 28 files, Quality Score: A (99/100), 0 warnings
```

---

## ライセンス

ISC
