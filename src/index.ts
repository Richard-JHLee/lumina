// ============================================================
// Lumina Language - Main Entry Point
// ============================================================
export { Lexer } from './lexer';
export { Parser } from './parser';
export { CodeGenerator } from './codegen';

import { Lexer } from './lexer';
import { Parser } from './parser';
import { CodeGenerator } from './codegen';

export function compile(source: string): { html: string; js: string; css: string } {
  // 1. Tokenize
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  // 2. Parse
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3. Generate
  const codegen = new CodeGenerator();
  const output = codegen.generate(ast);

  return output;
}

export default compile;
