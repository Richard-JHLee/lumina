#!/usr/bin/env node
// ============================================================
// Lumina CLI - Compile .lum files to HTML/JS/CSS
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../index';
import { DevServer } from '../devserver';
import { renderToString } from '../ssr';
import { Lexer } from '../lexer';
import { Parser } from '../parser';

function main() {
  const args = process.argv.slice(2);

  // SSR command
  if (args[0] === 'ssr') {
    const inputFile = args[1];
    if (!inputFile || !fs.existsSync(inputFile)) {
      console.error('Error: File not found: ' + inputFile);
      process.exit(1);
    }

    const source = fs.readFileSync(inputFile, 'utf-8');
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const componentName = args.includes('--component')
      ? args[args.indexOf('--component') + 1]
      : (ast.body.find((node: any) => node.type === 'ComponentDecl') as any)?.name;

    if (!componentName) {
      console.error('Error: No component found. Use --component <name>');
      process.exit(1);
    }

    const propsJson = args.includes('--props') ? args[args.indexOf('--props') + 1] : '{}';
    const props = JSON.parse(propsJson);

    const html = renderToString(ast, componentName, props);
    console.log(html);
    return;
  }

  // Dev Server command
  if (args[0] === 'serve' || args[0] === 'dev') {
    const port = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : 3000;
    const watch = args.includes('--watch') ? args[args.indexOf('--watch') + 1].split(',') : ['examples'];
    const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'output';

    const server = new DevServer({ port, watch, output });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      server.stop();
      process.exit(0);
    });

    server.start();
    return;
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
  Lumina Compiler v0.2.0

  Usage:
    lumina <file.lum>              Compile and output HTML
    lumina <file.lum> -o <out>     Compile and write to output file
    lumina serve                   Start dev server with hot reload
    lumina ssr <file.lum>          Render component to HTML (SSR)

  Commands:
    serve, dev                Start development server
      --port <number>         Server port (default: 3000)
      --watch <dirs>          Directories to watch (default: examples)
      --output <dir>          Output directory (default: output)

    ssr <file.lum>            Server-side rendering
      --component <name>      Component to render (default: first component)
      --props <json>          Props as JSON string (default: {})

  Compile Options:
    -o, --output <file>   Output file path (default: stdout)
    --ast                 Print AST as JSON
    --tokens              Print token list
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
