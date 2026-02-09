#!/usr/bin/env node
// ============================================================
// Lumina CLI - Compile .lum files to HTML/JS/CSS
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../index';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
  Lumina Compiler v0.1.0

  Usage:
    lumina <file.lum>              Compile and output HTML
    lumina <file.lum> -o <out>     Compile and write to output file
    lumina <file.lum> --ast        Print AST (debug)
    lumina <file.lum> --tokens     Print tokens (debug)

  Options:
    -o, --output <file>   Output file path (default: stdout)
    --ast                 Print AST as JSON
    --tokens              Print token list
    --typecheck           Run type checker (errors will prevent compilation)
    --js-only             Output only JavaScript
    --css-only            Output only CSS
    -h, --help            Show this help
    `);
    process.exit(0);
  }

  const inputFile = args[0];
  if (!fs.existsSync(inputFile)) {
    console.error('Error: File not found: ' + inputFile);
    process.exit(1);
  }

  const source = fs.readFileSync(inputFile, 'utf-8');

  // Debug: tokens
  if (args.includes('--tokens')) {
    const { Lexer } = require('../lexer');
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    console.log(JSON.stringify(tokens, null, 2));
    return;
  }

  // Debug: AST
  if (args.includes('--ast')) {
    const { Lexer } = require('../lexer');
    const { Parser } = require('../parser');
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(JSON.stringify(ast, null, 2));
    return;
  }

  try {
    // Type checking
    if (args.includes('--typecheck')) {
      const { Lexer } = require('../lexer');
      const { Parser } = require('../parser');
      const { TypeChecker } = require('../typechecker');

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const checker = new TypeChecker();
      const typeResult = checker.check(ast);

      if (!typeResult.success) {
        console.error('Type checking failed:');
        for (const error of typeResult.errors) {
          console.error('  ' + error);
        }
        process.exit(1);
      }

      console.log('✓ Type checking passed');
    }

    const result = compile(source);

    // Determine output
    const outIdx = args.indexOf('-o') !== -1 ? args.indexOf('-o') : args.indexOf('--output');
    let output = result.html;

    if (args.includes('--js-only')) output = result.js;
    if (args.includes('--css-only')) output = result.css;

    if (outIdx !== -1 && args[outIdx + 1]) {
      const outPath = args[outIdx + 1];
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, output, 'utf-8');
      console.log('Compiled: ' + inputFile + ' -> ' + outPath);
    } else {
      process.stdout.write(output);
    }
  } catch (err: any) {
    console.error('Compilation Error: ' + err.message);
    process.exit(1);
  }
}

main();
