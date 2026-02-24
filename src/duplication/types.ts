export type CloneSeverity = 'error' | 'warning' | 'info';

export interface ClonePair {
  fileA: string;
  startLineA: number;
  endLineA: number;
  fileB: string;
  startLineB: number;
  endLineB: number;
  lines: number;
  tokens: number;
  severity: CloneSeverity;
  fragment: string;
}

export interface DuplicationResult {
  percentage: number;
  totalDuplicatedLines: number;
  totalLines: number;
  clones: ClonePair[];
}

export interface DuplicationOptions {
  minTokens?: number;
  minLines?: number;
  /** import/export宣言のみのブロックを除外する（デフォルト: true） */
  ignoreImports?: boolean;
}
