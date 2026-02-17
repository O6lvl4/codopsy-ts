import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { initAction } from '../../src/commands/init.js';

const tmpDir = path.join(os.tmpdir(), 'codopsy-init-test-' + Date.now());

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('init command', () => {
  it('creates .codopsyrc.json with default config', () => {
    initAction(tmpDir, {});
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content).toHaveProperty('rules');
    expect(content.rules['no-any']).toBe('warning');
    expect(content.rules['max-complexity']).toEqual({ severity: 'warning', max: 10 });
  });

  it('does not overwrite without --force', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, '{"rules":{}}');

    initAction(tmpDir, {});
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toBe('{"rules":{}}');
  });

  it('overwrites with --force', () => {
    const configPath = path.join(tmpDir, '.codopsyrc.json');
    fs.writeFileSync(configPath, '{"rules":{}}');

    initAction(tmpDir, { force: true });
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.rules['no-any']).toBe('warning');
  });
});
