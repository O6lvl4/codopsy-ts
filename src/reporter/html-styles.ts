import { getLayoutStyles } from './html-styles-layout.js';
import { getComponentStyles } from './html-styles-components.js';

export function getStyles(): string {
  return getLayoutStyles() + getComponentStyles();
}
