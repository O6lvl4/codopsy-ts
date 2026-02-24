import * as ts from 'typescript';
import * as fs from 'fs';

export interface Token {
  normalized: string;
  line: number;
  text: string;
}

export interface TokenizedFile {
  file: string;
  tokens: Token[];
  lines: string[];
  totalLines: number;
}

function buildLineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function posToLine(lineStarts: number[], pos: number): number {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

const SKIP_KINDS = new Set([
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.ShebangTrivia,
  ts.SyntaxKind.ConflictMarkerTrivia,
]);

const KIND_NORMALIZED = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.Identifier, 'I'],
  [ts.SyntaxKind.PrivateIdentifier, 'I'],
  [ts.SyntaxKind.StringLiteral, 'S'],
  [ts.SyntaxKind.NoSubstitutionTemplateLiteral, 'S'],
  [ts.SyntaxKind.NumericLiteral, 'N'],
  [ts.SyntaxKind.BigIntLiteral, 'N'],
  [ts.SyntaxKind.RegularExpressionLiteral, 'R'],
  [ts.SyntaxKind.TemplateHead, 'TH'],
  [ts.SyntaxKind.TemplateMiddle, 'TM'],
  [ts.SyntaxKind.TemplateTail, 'TT'],
]);

function normalizeKind(kind: ts.SyntaxKind, text: string): string | null {
  if (SKIP_KINDS.has(kind)) return null;
  return KIND_NORMALIZED.get(kind) ?? text;
}

export function tokenizeFile(filePath: string): TokenizedFile {
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return { file: filePath, tokens: [], lines: [], totalLines: 0 };
  }

  const lines = source.split('\n');
  const totalLines = lines.length;
  const lineStarts = buildLineStarts(source);

  const languageVariant = filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
    ? ts.LanguageVariant.JSX
    : ts.LanguageVariant.Standard;

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    languageVariant,
    source,
  );

  const tokens: Token[] = [];

  while (true) {
    const kind = scanner.scan();
    if (kind === ts.SyntaxKind.EndOfFileToken) break;

    const normalized = normalizeKind(kind, scanner.getTokenText());
    if (normalized === null) continue;

    const pos = scanner.getTokenStart();
    const line = posToLine(lineStarts, pos);

    tokens.push({ normalized, line, text: scanner.getTokenText() });
  }

  return { file: filePath, tokens, lines, totalLines };
}
