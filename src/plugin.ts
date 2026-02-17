import * as ts from 'typescript';
import * as path from 'path';
import { Issue, Severity } from './analyzer/types.js';
import { pathToFileURL } from 'url';

export type RuleCheckFn = (
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[],
  severity?: Severity,
) => void;

export interface RuleDefinition {
  id: string;
  description: string;
  defaultSeverity: Severity;
  check: RuleCheckFn;
}

export interface CodopsyPlugin {
  rules: RuleDefinition[];
}

function validateRuleDefinition(rule: unknown, pluginPath: string): asserts rule is RuleDefinition {
  const r = rule as Record<string, unknown>;
  if (!r.id || typeof r.id !== 'string') {
    throw new Error(`Plugin "${pluginPath}": rule missing 'id' string`);
  }
  if (!r.check || typeof r.check !== 'function') {
    throw new Error(`Plugin "${pluginPath}": rule "${r.id}" missing 'check' function`);
  }
}

function resolvePluginPath(pluginPath: string, baseDir: string): string {
  if (pluginPath.startsWith('.') || path.isAbsolute(pluginPath)) {
    return path.resolve(baseDir, pluginPath);
  }
  return pluginPath;
}

export async function loadPlugins(
  pluginPaths: string[],
  baseDir: string,
): Promise<RuleDefinition[]> {
  const rules: RuleDefinition[] = [];

  for (const pluginPath of pluginPaths) {
    const resolved = resolvePluginPath(pluginPath, baseDir);
    const importPath = resolved.startsWith('/') ? pathToFileURL(resolved).href : resolved;
    const mod = await import(importPath);
    const plugin: CodopsyPlugin = mod.default ?? mod;

    if (!plugin.rules || !Array.isArray(plugin.rules)) {
      throw new Error(`Plugin "${pluginPath}" must export a 'rules' array`);
    }

    for (const rule of plugin.rules) {
      validateRuleDefinition(rule, pluginPath);
      rules.push({
        id: rule.id,
        description: rule.description ?? rule.id,
        defaultSeverity: rule.defaultSeverity ?? 'warning',
        check: rule.check,
      });
    }
  }

  return rules;
}
