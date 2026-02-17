import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type RuleSeverity = 'warning' | 'info' | 'error';

export interface CodopsyConfig {
  plugins?: string[];
  rules?: {
    'no-any'?: false | RuleSeverity;
    'no-console'?: false | RuleSeverity;
    'max-lines'?: false | { severity?: RuleSeverity; max?: number };
    'no-empty-function'?: false | RuleSeverity;
    'no-nested-ternary'?: false | RuleSeverity;
    'prefer-const'?: false | RuleSeverity;
    'max-complexity'?: false | { severity?: RuleSeverity; max?: number };
    'max-cognitive-complexity'?: false | { severity?: RuleSeverity; max?: number };
    'no-var'?: false | RuleSeverity;
    'eqeqeq'?: false | RuleSeverity;
    'max-depth'?: false | { severity?: RuleSeverity; max?: number };
    'max-params'?: false | { severity?: RuleSeverity; max?: number };
    'no-param-reassign'?: false | RuleSeverity;
    [key: string]: false | RuleSeverity | { severity?: RuleSeverity; max?: number } | undefined;
  };
}

const CONFIG_FILENAME = '.codopsyrc.json';

export function loadConfig(targetDir: string): CodopsyConfig {
  let dir = path.resolve(targetDir);
  const root = path.parse(dir).root;
  const home = os.homedir();

  while (true) {
    const configPath = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as CodopsyConfig;
      } catch {
        return {};
      }
    }

    if (dir === root || dir === home) {
      break;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Check home directory as last resort
  const homeConfig = path.join(home, CONFIG_FILENAME);
  if (fs.existsSync(homeConfig)) {
    try {
      const content = fs.readFileSync(homeConfig, 'utf-8');
      return JSON.parse(content) as CodopsyConfig;
    } catch {
      return {};
    }
  }

  return {};
}
