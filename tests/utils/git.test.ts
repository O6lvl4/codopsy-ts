import { describe, it, expect } from 'vitest';
import { isGitRepository, getChangedFiles } from '../../src/utils/git.js';
import * as path from 'path';
import * as os from 'os';

describe('git utils', () => {
  it('isGitRepository: gitリポジトリ内でtrueを返す', () => {
    const projectRoot = path.resolve(import.meta.dirname, '../..');
    const result = isGitRepository(projectRoot);
    expect(result).toBe(true);
  });

  it('isGitRepository: gitリポジトリ外でfalseを返す', () => {
    const result = isGitRepository(os.tmpdir());
    expect(result).toBe(false);
  });

  it('getChangedFiles: 存在しないbaseでは空配列を返す', () => {
    const files = getChangedFiles(os.tmpdir(), 'nonexistent-branch-xyz');
    expect(files).toEqual([]);
  });
});
