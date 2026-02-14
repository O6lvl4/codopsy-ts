import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function parseGitignoreLines(content: string): string[] {
  return content.split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.endsWith('/') ? `**/${line}**` : `**/${line}`);
}

function loadGitignorePatterns(dir: string): string[] {
  const patterns: string[] = [];
  let current = dir;
  while (true) {
    const gitignorePath = path.join(current, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      patterns.push(...parseGitignoreLines(fs.readFileSync(gitignorePath, 'utf-8')));
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return patterns;
}

export async function findSourceFiles(targetDir: string): Promise<string[]> {
  const gitignorePatterns = loadGitignorePatterns(targetDir);
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: targetDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', ...gitignorePatterns],
  });
  return files.sort();
}

export function getScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** @deprecated Use findSourceFiles instead */
export const findTypeScriptFiles = findSourceFiles;
