import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { findTypeScriptFiles } from '../../src/utils/file.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('findTypeScriptFiles', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-file-test');

  beforeAll(() => {
    fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'b.tsx'), '');
    fs.writeFileSync(path.join(tmpDir, 'c.js'), '');
    fs.writeFileSync(path.join(tmpDir, 'sub', 'd.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'e.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'types.d.ts'), '');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('.ts/.tsx ファイルを見つける', async () => {
    const files = await findTypeScriptFiles(tmpDir);
    const names = files.map(f => path.basename(f));
    expect(names).toContain('a.ts');
    expect(names).toContain('b.tsx');
  });

  it('サブディレクトリも探索する', async () => {
    const files = await findTypeScriptFiles(tmpDir);
    const names = files.map(f => path.basename(f));
    expect(names).toContain('d.ts');
  });

  it('node_modules は除外する', async () => {
    const files = await findTypeScriptFiles(tmpDir);
    const names = files.map(f => path.basename(f));
    expect(names).not.toContain('e.ts');
  });

  it('.d.ts は除外する', async () => {
    const files = await findTypeScriptFiles(tmpDir);
    const names = files.map(f => path.basename(f));
    expect(names).not.toContain('types.d.ts');
  });
});
