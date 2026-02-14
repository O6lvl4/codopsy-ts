export interface Colors {
  red: (s: string) => string;
  yellow: (s: string) => string;
  blue: (s: string) => string;
  green: (s: string) => string;
  cyan: (s: string) => string;
  gray: (s: string) => string;
  bold: (s: string) => string;
  dim: (s: string) => string;
}

export function createColors(enabled: boolean): Colors {
  if (!enabled) {
    const identity = (s: string) => s;
    return {
      red: identity,
      yellow: identity,
      blue: identity,
      green: identity,
      cyan: identity,
      gray: identity,
      bold: identity,
      dim: identity,
    };
  }

  const wrap = (open: string, close: string) => (s: string) => `${open}${s}${close}`;
  const reset = '\x1b[0m';

  return {
    red: wrap('\x1b[31m', reset),
    yellow: wrap('\x1b[33m', reset),
    blue: wrap('\x1b[34m', reset),
    green: wrap('\x1b[32m', reset),
    cyan: wrap('\x1b[36m', reset),
    gray: wrap('\x1b[90m', reset),
    bold: wrap('\x1b[1m', reset),
    dim: wrap('\x1b[2m', reset),
  };
}
