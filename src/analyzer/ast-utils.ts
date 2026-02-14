import * as ts from 'typescript';

export function getMethodName(node: ts.MethodDeclaration): string {
  if (ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  if (ts.isComputedPropertyName(node.name)) {
    return '[computed]';
  }
  return node.name.getText();
}

export function getArrowOrExpressionName(node: ts.ArrowFunction | ts.FunctionExpression): string {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isFunctionExpression(node) && node.name) {
    return node.name.text;
  }
  return '(anonymous)';
}

export function getAccessorName(node: ts.GetAccessorDeclaration | ts.SetAccessorDeclaration): string {
  const prefix = ts.isGetAccessorDeclaration(node) ? 'get ' : 'set ';
  if (ts.isIdentifier(node.name)) {
    return prefix + node.name.text;
  }
  return prefix + node.name.getText();
}

export function getFunctionName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node)) {
    return node.name?.text ?? '(anonymous)';
  }
  if (ts.isMethodDeclaration(node)) {
    return getMethodName(node);
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return getArrowOrExpressionName(node);
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return getAccessorName(node);
  }
  if (ts.isConstructorDeclaration(node)) {
    return 'constructor';
  }
  return '(anonymous)';
}

export function isFunctionNode(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}
