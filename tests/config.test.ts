import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../src/config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('loadConfig', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-config-test');
  const subDir = path.join(tmpDir, 'sub', 'deep');

  beforeAll(() => {
    fs.mkdirSync(subDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('設定ファイルがなければ空オブジェクトを返す', () => {
    const config = loadConfig(subDir);
    expect(config).toEqual({});
  });

  it('設定ファイルを読み込む', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, JSON.stringify({ rules: { 'no-any': false } }));
    const config = loadConfig(tmpDir);
    expect(config.rules?.['no-any']).toBe(false);
    fs.unlinkSync(configPath);
  });

  it('親ディレクトリの設定ファイルを検索する', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, JSON.stringify({ rules: { 'no-console': 'error' } }));
    const config = loadConfig(subDir);
    expect(config.rules?.['no-console']).toBe('error');
    fs.unlinkSync(configPath);
  });

  it('不正なJSONファイルでは空オブジェクトを返す', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, 'not valid json {{{');
    const config = loadConfig(tmpDir);
    expect(config).toEqual({});
    fs.unlinkSync(configPath);
  });

  it('複数のルール設定を読み込む', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, JSON.stringify({
      rules: {
        'no-any': 'error',
        'max-lines': { severity: 'warning', max: 500 },
        'no-console': false,
      },
    }));
    const config = loadConfig(tmpDir);
    expect(config.rules?.['no-any']).toBe('error');
    expect(config.rules?.['max-lines']).toEqual({ severity: 'warning', max: 500 });
    expect(config.rules?.['no-console']).toBe(false);
    fs.unlinkSync(configPath);
  });
});
