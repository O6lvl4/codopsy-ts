import { describe, it, expect } from 'vitest';
import { createColors } from '../../src/utils/colors.js';

describe('createColors', () => {
  it('有効時はANSIエスケープコードを付与する', () => {
    const c = createColors(true);
    const result = c.red('hello');
    expect(result).toContain('\x1b[31m');
    expect(result).toContain('hello');
    expect(result).toContain('\x1b[0m');
  });

  it('無効時はそのまま返す', () => {
    const c = createColors(false);
    expect(c.red('hello')).toBe('hello');
    expect(c.bold('test')).toBe('test');
    expect(c.cyan('path')).toBe('path');
  });

  it('すべてのカラー関数が存在する', () => {
    const c = createColors(true);
    expect(typeof c.red).toBe('function');
    expect(typeof c.yellow).toBe('function');
    expect(typeof c.blue).toBe('function');
    expect(typeof c.green).toBe('function');
    expect(typeof c.cyan).toBe('function');
    expect(typeof c.gray).toBe('function');
    expect(typeof c.bold).toBe('function');
    expect(typeof c.dim).toBe('function');
  });

  it('各カラーが異なるエスケープコードを使用する', () => {
    const c = createColors(true);
    const red = c.red('x');
    const blue = c.blue('x');
    expect(red).not.toBe(blue);
  });

  it('空文字列でもエラーにならない', () => {
    const c = createColors(true);
    expect(c.red('')).toContain('\x1b[31m');
    const cDisabled = createColors(false);
    expect(cDisabled.red('')).toBe('');
  });
});
