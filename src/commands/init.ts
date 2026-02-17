import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CONFIG = {
  rules: {
    'no-any': 'warning',
    'no-console': 'info',
    'no-var': 'warning',
    'eqeqeq': 'warning',
    'no-empty-function': 'warning',
    'no-nested-ternary': 'warning',
    'no-param-reassign': 'warning',
    'prefer-const': 'info',
    'max-complexity': { severity: 'warning', max: 10 },
    'max-cognitive-complexity': { severity: 'warning', max: 15 },
    'max-lines': { severity: 'warning', max: 300 },
    'max-depth': { severity: 'warning', max: 4 },
    'max-params': { severity: 'warning', max: 4 },
  },
};

export function initAction(dir: string, options: { force?: boolean }): void {
  const targetDir = path.resolve(dir || '.');
  const configPath = path.join(targetDir, '.codopsyrc.json');

  if (fs.existsSync(configPath) && !options.force) {
    console.log(`.codopsyrc.json already exists at ${configPath}`);
    console.log('Use --force to overwrite.');
    return;
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
  console.log(`Created ${configPath}`);
}
