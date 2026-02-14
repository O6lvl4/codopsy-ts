import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Check if the given directory is inside a git repository.
 */
export function isGitRepository(dir: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dir,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of changed files (added, modified, renamed) compared to a base ref.
 * Returns absolute paths.
 */
export function getChangedFiles(dir: string, base: string): string[] {
  try {
    const mergeBase = execSync(`git merge-base ${base} HEAD`, {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    const output = execSync(
      `git diff --name-only --diff-filter=ACMR ${mergeBase}`,
      {
        cwd: dir,
        stdio: 'pipe',
        encoding: 'utf-8',
      },
    );

    const repoRoot = execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((file) => path.resolve(repoRoot, file));
  } catch {
    return [];
  }
}
