// ============================================================
// Lumina Language - Core Type Definitions
// ============================================================

// ─── Token Types ────────────────────────────────────────────
export enum TokenType {
  // Literals
  Number = 'Number',
  String = 'String',
  Boolean = 'Boolean',
  Identifier = 'Identifier',

  // Keywords
  Let = 'let',
  Var = 'var',
  Fn = 'fn',
  Return = 'return',
  If = 'if',
  Else = 'else',
  For = 'for',
  In = 'in',
  Component = 'component',
  State = 'state',
  Effect = 'effect',
  Style = 'style',
  Emit = 'emit',
  On = 'on',
  Import = 'import',
  Export = 'export',
  From = 'from',
  True = 'true',
  False = 'false',
  Null = 'null',

  // Operators
  Plus = '+',
  Minus = '-',
  Star = '*',
  Slash = '/',
  Percent = '%',
  Assign = '=',
  Equals = '==',
  NotEquals = '!=',
  LessThan = '<',
  GreaterThan = '>',
  LessEqual = '<=',
  GreaterEqual = '>=',
  And = '&&',
  Or = '||',
  Not = '!',
  Arrow = '=>',
  Dot = '.',
  DotDot = '..',
  Pipe = '|>',

  // Delimiters
  LeftParen = '(',
  RightParen = ')',
  LeftBrace = '{',
  RightBrace = '}',
  LeftBracket = '[',
  RightBracket = ']',
  Comma = ',',
  Colon = ':',
  Semicolon = ';',
  At = '@',
  Hash = '#',

  // Special
  Interpolation = '${',
  EOF = 'EOF',
  Newline = 'Newline',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ─── AST Node Types ─────────────────────────────────────────
export type ASTNode =
  | Program
  | ComponentDecl
  | FunctionDecl
  | VariableDecl
  | StateDecl
  | EffectDecl
  | StyleDecl
  | ReturnStatement
  | IfStatement
  | ForStatement
  | ExpressionStatement
  | BlockStatement
  | UIElement
  | UIText
  | UIExpression
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | MemberExpr
  | AssignExpr
  | ArrowFunction
  | ArrayLiteral
  | ObjectLiteral
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | TemplateLiteral
  | EventHandler
  | ConditionalExpr
  | PipeExpr
  | ImportDecl
  | ExportDecl
  | ComponentInstance;

export interface Program {
  type: 'Program';
  body: ASTNode[];
}

// component Counter(initial: Int) { ... }
export interface ComponentDecl {
  type: 'ComponentDecl';
  name: string;
  params: Param[];
  body: ASTNode[];
}

export interface Param {
  name: string;
  typeAnnotation?: string;
  defaultValue?: ASTNode;
}

// fn add(a: Int, b: Int) -> Int { ... }
export interface FunctionDecl {
  type: 'FunctionDecl';
  name: string;
  params: Param[];
  returnType?: string;
  body: ASTNode[];
}

// let x = 10   or   var y = "hello"
export interface VariableDecl {
  type: 'VariableDecl';
  name: string;
  mutable: boolean;
  typeAnnotation?: string;
  value: ASTNode;
}

// state count = 0
export interface StateDecl {
  type: 'StateDecl';
  name: string;
  typeAnnotation?: string;
  value: ASTNode;
}

// effect { ... }  or  effect(deps) { ... }
export interface EffectDecl {
  type: 'EffectDecl';
  dependencies: string[];
  body: ASTNode[];
}

// style { color: "red", padding: 16 }
export interface StyleDecl {
  type: 'StyleDecl';
  name?: string;
  properties: StyleProperty[];
}

export interface StyleProperty {
  key: string;
  value: ASTNode;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  value?: ASTNode;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  consequent: ASTNode[];
  alternate?: ASTNode[];
}

export interface ForStatement {
  type: 'ForStatement';
  variable: string;
  iterable: ASTNode;
  body: ASTNode[];
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: ASTNode;
}

export interface BlockStatement {
  type: 'BlockStatement';
  body: ASTNode[];
}

// ─── UI Nodes ───────────────────────────────────────────────
// <div class="container"> ... </div>
export interface UIElement {
  type: 'UIElement';
  tag: string;
  attributes: UIAttribute[];
  children: ASTNode[];
  selfClosing: boolean;
}

export interface UIAttribute {
  name: string;
  value: ASTNode | null;  // null for boolean attrs like `disabled`
}

export interface UIText {
  type: 'UIText';
  value: string;
}

export interface UIExpression {
  type: 'UIExpression';
  expression: ASTNode;
}

export interface EventHandler {
  type: 'EventHandler';
  event: string;
  handler: ASTNode;
}

// ─── Expressions ────────────────────────────────────────────
export interface BinaryExpr {
  type: 'BinaryExpr';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpr {
  type: 'UnaryExpr';
  operator: string;
  operand: ASTNode;
}

export interface CallExpr {
  type: 'CallExpr';
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface MemberExpr {
  type: 'MemberExpr';
  object: ASTNode;
  property: string;
  computed: boolean;
}

export interface AssignExpr {
  type: 'AssignExpr';
  target: ASTNode;
  value: ASTNode;
}

export interface ArrowFunction {
  type: 'ArrowFunction';
  params: Param[];
  body: ASTNode[] | ASTNode;
}

export interface ArrayLiteral {
  type: 'ArrayLiteral';
  elements: ASTNode[];
}

export interface ObjectLiteral {
  type: 'ObjectLiteral';
  properties: { key: string; value: ASTNode }[];
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral {
  type: 'NullLiteral';
}

export interface TemplateLiteral {
  type: 'TemplateLiteral';
  parts: (string | ASTNode)[];
}

export interface ConditionalExpr {
  type: 'ConditionalExpr';
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface PipeExpr {
  type: 'PipeExpr';
  left: ASTNode;
  right: ASTNode;
}

// ─── Module System ──────────────────────────────────────────
// import { Button, Card } from "./components.lum"
export interface ImportDecl {
  type: 'ImportDecl';
  specifiers: string[];  // ["Button", "Card"]
  source: string;        // "./components.lum"
}

// export { Button, Card }
export interface ExportDecl {
  type: 'ExportDecl';
  specifiers: string[];  // ["Button", "Card"]
}

// <Button text="Click me" @click={handleClick} />
export interface ComponentInstance {
  type: 'ComponentInstance';
  name: string;
  props: { name: string; value: ASTNode }[];
  children: ASTNode[];
  selfClosing: boolean;
}
