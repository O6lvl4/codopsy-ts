import { tokenizeFile, TokenizedFile, Token } from './tokenizer.js';
import { ClonePair, CloneSeverity, DuplicationOptions, DuplicationResult } from './types.js';
import { deduplicateByFileCoverage, countDuplicatedLines } from './coverage.js';

// Double hashing to minimize false positives (~1/MOD1/MOD2 collision rate)
const BASE1 = 131;
const MOD1 = 1_000_000_007;
const BASE2 = 137;
const MOD2 = 998_244_353;

// BigInt-based modular multiplication to avoid JS float precision loss (> 2^53)
function mulmod(a: number, b: number, m: number): number {
  return Number(BigInt(a) * BigInt(b) % BigInt(m));
}

function strHash(s: string): [number, number] {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = (h1 * BASE1 + c) % MOD1;
    h2 = (h2 * BASE2 + c) % MOD2;
  }
  return [h1 + 1, h2 + 1]; // avoid 0
}

function powMod(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = mulmod(result, b, mod);
    b = mulmod(b, b, mod);
    e >>= 1;
  }
  return result;
}

// Tokens that indicate executable logic (as opposed to import/export declarations)
const LOGIC_TOKENS = new Set([
  'function', 'class', 'if', 'else', 'for', 'while', 'do',
  'switch', 'return', 'throw', 'try', 'catch', 'finally', '=>', 'new',
]);

function hasLogicTokens(tokens: Token[], start: number, end: number): boolean {
  const limit = Math.min(end, tokens.length - 1);
  for (let i = start; i <= limit; i++) {
    if (LOGIC_TOKENS.has(tokens[i].normalized)) return true;
  }
  return false;
}

function cloneSeverity(lines: number): CloneSeverity {
  if (lines >= 20) return 'error';
  if (lines >= 10) return 'warning';
  return 'info';
}

interface WindowHashEntry {
  fileIdx: number;
  tokenStart: number;
}

function buildHashMap(
  tokenizedFiles: TokenizedFile[],
  W: number,
): Map<string, WindowHashEntry[]> {
  const hashMap = new Map<string, WindowHashEntry[]>();

  for (let fi = 0; fi < tokenizedFiles.length; fi++) {
    const { tokens } = tokenizedFiles[fi];
    if (tokens.length < W) continue;

    const th1 = tokens.map((t) => strHash(t.normalized)[0]);
    const th2 = tokens.map((t) => strHash(t.normalized)[1]);

    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < W; i++) {
      h1 = (h1 * BASE1 + th1[i]) % MOD1;
      h2 = (h2 * BASE2 + th2[i]) % MOD2;
    }

    const pow1 = powMod(BASE1, W - 1, MOD1);
    const pow2 = powMod(BASE2, W - 1, MOD2);

    const addEntry = (hash: string, fileIdx: number, tokenStart: number) => {
      const list = hashMap.get(hash);
      if (list) list.push({ fileIdx, tokenStart });
      else hashMap.set(hash, [{ fileIdx, tokenStart }]);
    };

    addEntry(`${h1},${h2}`, fi, 0);

    for (let i = 1; i <= tokens.length - W; i++) {
      h1 = ((h1 - mulmod(th1[i - 1], pow1, MOD1) + MOD1) * BASE1 + th1[i + W - 1]) % MOD1;
      h2 = ((h2 - mulmod(th2[i - 1], pow2, MOD2) + MOD2) * BASE2 + th2[i + W - 1]) % MOD2;
      addEntry(`${h1},${h2}`, fi, i);
    }
  }

  return hashMap;
}

interface RawMatch {
  startA: number;
  startB: number;
}

function collectMatchesFromEntries(
  entries: WindowHashEntry[],
  W: number,
  pairMatches: Map<string, RawMatch[]>,
): void {
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.fileIdx === b.fileIdx && Math.abs(a.tokenStart - b.tokenStart) < W) continue;
      let [fiA, startA, fiB, startB] = [a.fileIdx, a.tokenStart, b.fileIdx, b.tokenStart];
      if (fiA > fiB || (fiA === fiB && startA > startB)) {
        [fiA, fiB, startA, startB] = [fiB, fiA, startB, startA];
      }
      const key = `${fiA}:${fiB}`, list = pairMatches.get(key);
      if (list) list.push({ startA, startB }); else pairMatches.set(key, [{ startA, startB }]);
    }
  }
}

function collectMatches(
  hashMap: Map<string, WindowHashEntry[]>,
  W: number,
): Map<string, RawMatch[]> {
  const pairMatches = new Map<string, RawMatch[]>();
  for (const entries of hashMap.values()) {
    if (entries.length < 2) continue;
    collectMatchesFromEntries(entries, W, pairMatches);
  }
  return pairMatches;
}

interface MergeContext {
  tokenizedFiles: TokenizedFile[];
  W: number;
  minLines: number;
  ignoreImports: boolean;
}

function extendBlock(
  matchSet: Set<string>,
  visited: Set<string>,
  startA: number,
  startB: number,
): number {
  let length = 1;
  while (matchSet.has(`${startA + length},${startB + length}`)) {
    visited.add(`${startA + length},${startB + length}`);
    length++;
  }
  return length;
}

function mergeMatchesIntoPairs(
  key: string,
  rawMatches: RawMatch[],
  ctx: MergeContext,
): ClonePair[] {
  const { tokenizedFiles, W, minLines, ignoreImports } = ctx;
  const [fiA, fiB] = key.split(':').map(Number);
  const tokensA = tokenizedFiles[fiA].tokens;
  const tokensB = tokenizedFiles[fiB].tokens;
  const fileA = tokenizedFiles[fiA].file;
  const fileB = tokenizedFiles[fiB].file;

  const matchSet = new Set<string>(rawMatches.map((m) => `${m.startA},${m.startB}`));
  const sorted = [...rawMatches].sort((a, b) => a.startA - b.startA || a.startB - b.startB);
  const visited = new Set<string>();
  const result: ClonePair[] = [];

  for (const m of sorted) {
    const mKey = `${m.startA},${m.startB}`;
    if (visited.has(mKey)) continue;
    if (matchSet.has(`${m.startA - 1},${m.startB - 1}`)) continue;

    const length = extendBlock(matchSet, visited, m.startA, m.startB);
    visited.add(mKey);

    const endTokenA = m.startA + length - 1 + W - 1;
    const endTokenB = m.startB + length - 1 + W - 1;

    if (endTokenA >= tokensA.length || endTokenB >= tokensB.length) continue;
    if (ignoreImports && !hasLogicTokens(tokensA, m.startA, endTokenA)) continue;

    const startLineA = tokensA[m.startA].line;
    const endLineA = tokensA[endTokenA].line;
    const startLineB = tokensB[m.startB].line;
    const endLineB = tokensB[endTokenB].line;

    const linesA = endLineA - startLineA + 1;
    const linesB = endLineB - startLineB + 1;
    if (linesA < minLines && linesB < minLines) continue;

    const lines = Math.max(linesA, linesB);
    const tokenCount = length + W - 1;
    const fragmentTokens = tokensA.slice(m.startA, Math.min(m.startA + 15, endTokenA + 1));
    const fragment = fragmentTokens.map((t) => t.text).join(' ').slice(0, 200);

    result.push({
      fileA, startLineA, endLineA,
      fileB, startLineB, endLineB,
      lines, tokens: tokenCount,
      severity: cloneSeverity(lines),
      fragment,
    });
  }

  return result;
}

export function detectDuplication(
  files: string[],
  options: DuplicationOptions = {},
): DuplicationResult {
  const W = options.minTokens ?? 50;
  const minLines = options.minLines ?? 5;
  const ignoreImports = options.ignoreImports !== false;

  const tokenizedFiles = files.map((f) => tokenizeFile(f));
  const totalLines = tokenizedFiles.reduce((sum, tf) => sum + tf.totalLines, 0);

  if (totalLines === 0) {
    return { percentage: 0, totalDuplicatedLines: 0, totalLines: 0, clones: [] };
  }

  const hashMap = buildHashMap(tokenizedFiles, W);
  const pairMatchMap = collectMatches(hashMap, W);
  const ctx: MergeContext = { tokenizedFiles, W, minLines, ignoreImports };

  const allClones: ClonePair[] = [];
  for (const [key, rawMatches] of pairMatchMap) {
    allClones.push(...mergeMatchesIntoPairs(key, rawMatches, ctx));
  }

  allClones.sort((a, b) => b.lines - a.lines || b.tokens - a.tokens);

  const deduplicated = deduplicateByFileCoverage(allClones);
  const totalDuplicatedLines = countDuplicatedLines(deduplicated, files);
  const percentage = (totalDuplicatedLines / totalLines) * 100;

  return { percentage, totalDuplicatedLines, totalLines, clones: deduplicated };
}
