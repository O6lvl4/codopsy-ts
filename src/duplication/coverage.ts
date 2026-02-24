import { ClonePair } from './types.js';

/**
 * coverage-based去重:
 * 大きいクローンを優先し、すでに「報告済み」の行範囲と80%以上重複する
 * クローンをスキップする。N個のファイルに同じコード片があっても
 * C(N,2)ペアを全部出すのでなく、代表的なものだけ残す。
 */
export function deduplicateByFileCoverage(clones: ClonePair[]): ClonePair[] {
  const coveredLines = new Map<string, Set<number>>();

  function overlapRatio(file: string, start: number, end: number): number {
    const covered = coveredLines.get(file);
    if (!covered) return 0;
    let overlap = 0;
    for (let l = start; l <= end; l++) {
      if (covered.has(l)) overlap++;
    }
    return overlap / (end - start + 1);
  }

  function markCovered(file: string, start: number, end: number): void {
    let s = coveredLines.get(file);
    if (!s) { s = new Set(); coveredLines.set(file, s); }
    for (let l = start; l <= end; l++) s.add(l);
  }

  const kept: ClonePair[] = [];

  for (const clone of clones) {
    const ratioA = overlapRatio(clone.fileA, clone.startLineA, clone.endLineA);
    const ratioB = overlapRatio(clone.fileB, clone.startLineB, clone.endLineB);

    if (ratioA >= 0.8 && ratioB >= 0.8) continue;

    kept.push(clone);
    markCovered(clone.fileA, clone.startLineA, clone.endLineA);
    markCovered(clone.fileB, clone.startLineB, clone.endLineB);
  }

  return kept;
}

export function countDuplicatedLines(clones: ClonePair[], files: string[]): number {
  const fileLinesets = new Map<string, Set<number>>();
  for (const f of files) fileLinesets.set(f, new Set());

  for (const clone of clones) {
    const setA = fileLinesets.get(clone.fileA);
    const setB = fileLinesets.get(clone.fileB);
    if (setA) for (let l = clone.startLineA; l <= clone.endLineA; l++) setA.add(l);
    if (setB) for (let l = clone.startLineB; l <= clone.endLineB; l++) setB.add(l);
  }

  let total = 0;
  for (const s of fileLinesets.values()) total += s.size;
  return total;
}
