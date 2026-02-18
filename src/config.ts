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
    'no-non-null-assertion'?: false | RuleSeverity;
    'no-debugger'?: false | RuleSeverity;
    'no-duplicate-case'?: false | RuleSeverity;
    'no-dupe-keys'?: false | RuleSeverity;
    'use-isnan'?: false | RuleSeverity;
    'no-self-assign'?: false | RuleSeverity;
    'no-template-curly-in-string'?: false | RuleSeverity;
    'no-self-compare'?: false | RuleSeverity;
    'no-cond-assign'?: false | RuleSeverity;
    'valid-typeof'?: false | RuleSeverity;
    'no-constant-condition'?: false | RuleSeverity;
    'no-param-reassign'?: false | RuleSeverity | { severity?: RuleSeverity; props?: boolean };
    'no-unused-vars'?: false | RuleSeverity;
    'no-eval'?: false | RuleSeverity;
    'no-implied-eval'?: false | RuleSeverity;
    'no-with'?: false | RuleSeverity;
    'no-void'?: false | RuleSeverity;
    'no-label'?: false | RuleSeverity;
    'no-comma-operator'?: false | RuleSeverity;
    'no-useless-catch'?: false | RuleSeverity;
    'no-useless-rename'?: false | RuleSeverity;
    'no-useless-constructor'?: false | RuleSeverity;
    'no-sparse-arrays'?: false | RuleSeverity;
    'no-prototype-builtins'?: false | RuleSeverity;
    'no-array-constructor'?: false | RuleSeverity;
    'no-throw-literal'?: false | RuleSeverity;
    'no-async-promise-executor'?: false | RuleSeverity;
    'no-loss-of-precision'?: false | RuleSeverity;
    'no-constant-binary-expression'?: false | RuleSeverity;
    'no-regex-constructor'?: false | RuleSeverity;
    'no-unreachable'?: false | RuleSeverity;
    'no-fallthrough'?: false | RuleSeverity;
    'no-unsafe-finally'?: false | RuleSeverity;
    'no-floating-promises'?: false | RuleSeverity;
    'no-misused-promises'?: false | RuleSeverity;
    'await-thenable'?: false | RuleSeverity;
    [key: string]: false | RuleSeverity | { severity?: RuleSeverity; max?: number; props?: boolean } | undefined;
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
