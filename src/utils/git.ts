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

/**
 * Get per-file commit and author counts within a time period.
 * Returns a map of relative file path -> { commits, authors }.
 */
export function getFileChurnStats(
  dir: string,
  since: string,
): Map<string, { commits: number; authors: number }> {
  const stats = new Map<string, { commits: Set<string>; authors: Set<string> }>();

  try {
    const output = execSync(
      `git log --since="${since}" --format="%H %aN" --name-only`,
      { cwd: dir, stdio: 'pipe', encoding: 'utf-8' },
    );

    let currentHash = '';
    let currentAuthor = '';

    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      const headerMatch = trimmed.match(/^([a-f0-9]{40}) (.+)$/);
      if (headerMatch) {
        currentHash = headerMatch[1];
        currentAuthor = headerMatch[2];
        continue;
      }

      // This is a file path
      if (!stats.has(trimmed)) {
        stats.set(trimmed, { commits: new Set(), authors: new Set() });
      }
      const entry = stats.get(trimmed)!;
      entry.commits.add(currentHash);
      entry.authors.add(currentAuthor);
    }
  } catch {
    return new Map();
  }

  const result = new Map<string, { commits: number; authors: number }>();
  for (const [file, data] of stats) {
    result.set(file, { commits: data.commits.size, authors: data.authors.size });
  }
  return result;
}
