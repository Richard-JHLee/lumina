// ============================================================
// Lumina Language - Code Generator (Transpiler to JS/HTML/CSS)
// ============================================================
import { ASTNode, Program } from '../types';

export class CodeGenerator {
  private indent: number = 0;
  private components: Map<string, boolean> = new Map();
  private styles: Map<string, string> = new Map();
  private globalStatements: string[] = [];

  generate(program: Program): { html: string; js: string; css: string } {
    const jsChunks: string[] = [];
    const cssChunks: string[] = [];

    for (const node of program.body) {
      if (node.type === 'ComponentDecl') {
        this.components.set(node.name, true);
        jsChunks.push(this.genComponent(node));
      } else if (node.type === 'StyleDecl') {
        cssChunks.push(this.genStyleDecl(node));
      } else if (node.type === 'FunctionDecl') {
        jsChunks.push(this.genFunction(node));
      } else if (node.type === 'VariableDecl') {
        jsChunks.push(this.genVariable(node));
      } else {
        jsChunks.push(this.genStatement(node));
      }
    }

    const js = this.wrapRuntime(jsChunks.join('\n\n'));
    const css = cssChunks.join('\n\n');
    const html = this.generateHTML(js, css);

    return { html, js, css };
  }

  // ─── Component Generation ───────────────────────────────
  private genComponent(node: any): string {
    const params = node.params.map((p: any) => p.name).join(', ');
    const states: string[] = [];
    const effects: string[] = [];
    const functions: string[] = [];
    const styles: string[] = [];
    let renderBody = '';

    for (const child of node.body) {
      if (child.type === 'StateDecl') {
        states.push(this.genStateDecl(child, node.name));
      } else if (child.type === 'EffectDecl') {
        effects.push(this.genEffect(child, node.name));
      } else if (child.type === 'FunctionDecl') {
        functions.push(this.genFunction(child));
      } else if (child.type === 'StyleDecl') {
        styles.push(this.genStyleDecl(child));
      } else if (child.type === 'UIElement') {
        renderBody = this.genUIElement(child);
      } else if (child.type === 'VariableDecl') {
        functions.push(this.genVariable(child));
      } else {
        functions.push(this.genStatement(child));
      }
    }

    const defaultParams = node.params
      .filter((p: any) => p.defaultValue)
      .map((p: any) => `  ${p.name} = ${p.name} !== undefined ? ${p.name} : ${this.genExpr(p.defaultValue)};`)
      .join('\n');

    return `function ${node.name}(props) {
  const __el = document.createElement('div');
  __el.setAttribute('data-component', '${node.name}');
  const __state = {};
  let __mounted = false;

  ${node.params.map((p: any) => `let ${p.name} = props.${p.name};`).join('\n  ')}
${defaultParams}

${states.join('\n')}

${functions.join('\n\n')}

  function __render() {
    __el.innerHTML = '';
    const __fragment = document.createDocumentFragment();
    ${renderBody}
    __el.appendChild(__fragment);
    if (!__mounted) {
      __mounted = true;
${effects.join('\n')}
    }
  }

  __render();
  return __el;
}`;
  }

  private genStateDecl(node: any, componentName: string): string {
    const initVal = this.genExpr(node.value);
    return `  let ${node.name} = ${initVal};
  Object.defineProperty(__state, '${node.name}', {
    get() { return ${node.name}; },
    set(v) { ${node.name} = v; __render(); }
  });`;
  }

  private genEffect(node: any, componentName: string): string {
    const body = node.body.map((s: any) => this.genStatement(s)).join('\n');
    return `      // effect
      (function() { ${body} })();`;
  }

  // ─── UI Element Generation ──────────────────────────────
  private genUIElement(node: any): string {
    const varName = '__e' + Math.random().toString(36).slice(2, 7);
    let code = `const ${varName} = document.createElement('${node.tag}');\n`;

    for (const attr of node.attributes) {
      if (attr.name.startsWith('@')) {
        // Event handler
        const event = attr.name.slice(1);
        const handler = this.genExpr(attr.value);
        code += `    ${varName}.addEventListener('${event}', function(e) { ${handler}(e); __render(); });\n`;
      } else if (attr.value) {
        const val = this.genExpr(attr.value);
        if (attr.name === 'class') {
          code += `    ${varName}.className = ${val};\n`;
        } else if (attr.name === 'style' && attr.value.type === 'ObjectLiteral') {
          code += `    Object.assign(${varName}.style, ${val});\n`;
        } else {
          code += `    ${varName}.setAttribute('${attr.name}', ${val});\n`;
        }
      } else {
        code += `    ${varName}.setAttribute('${attr.name}', '');\n`;
      }
    }

    for (const child of node.children) {
      if (child.type === 'UIText') {
        code += `    ${varName}.appendChild(document.createTextNode(${JSON.stringify(child.value)}));\n`;
      } else if (child.type === 'UIExpression') {
        const expr = this.genExpr(child.expression);
        code += `    ${varName}.appendChild(document.createTextNode(String(${expr})));\n`;
      } else if (child.type === 'UIElement') {
        const childCode = this.genUIElement(child);
        const childVar = childCode.match(/const (\w+)/)?.[1] || '';
        code += `    ${childCode}\n`;
        code += `    ${varName}.appendChild(${childVar});\n`;
      } else if (child.type === 'IfStatement') {
        code += this.genUIConditional(child, varName);
      } else if (child.type === 'ForStatement') {
        code += this.genUILoop(child, varName);
      }
    }

    code += `    __fragment.appendChild(${varName});`;
    return code;
  }

  private genUIConditional(node: any, parentVar: string): string {
    const cond = this.genExpr(node.condition);
    let code = `    if (${cond}) {\n`;
    for (const child of node.consequent) {
      if (child.type === 'UIElement') {
        const childCode = this.genUIElement(child);
        const childVar = childCode.match(/const (\w+)/)?.[1] || '';
        code += `      ${childCode}\n`;
        code += `      ${parentVar}.appendChild(${childVar});\n`;
      } else if (child.type === 'UIExpression') {
        code += `      ${parentVar}.appendChild(document.createTextNode(String(${this.genExpr(child.expression)})));\n`;
      } else if (child.type === 'UIText') {
        code += `      ${parentVar}.appendChild(document.createTextNode(${JSON.stringify(child.value)}));\n`;
      }
    }
    code += `    }`;
    if (node.alternate) {
      code += ` else {\n`;
      for (const child of node.alternate) {
        if (child.type === 'UIElement') {
          const childCode = this.genUIElement(child);
          const childVar = childCode.match(/const (\w+)/)?.[1] || '';
          code += `      ${childCode}\n`;
          code += `      ${parentVar}.appendChild(${childVar});\n`;
        } else if (child.type === 'UIText') {
          code += `      ${parentVar}.appendChild(document.createTextNode(${JSON.stringify(child.value)}));\n`;
        }
      }
      code += `    }`;
    }
    code += '\n';
    return code;
  }

  private genUILoop(node: any, parentVar: string): string {
    const iter = this.genExpr(node.iterable);
    let code = `    for (const ${node.variable} of ${iter}) {\n`;
    for (const child of node.body) {
      if (child.type === 'UIElement') {
        const childCode = this.genUIElement(child);
        const childVar = childCode.match(/const (\w+)/)?.[1] || '';
        code += `      ${childCode}\n`;
        code += `      ${parentVar}.appendChild(${childVar});\n`;
      } else if (child.type === 'UIExpression') {
        code += `      ${parentVar}.appendChild(document.createTextNode(String(${this.genExpr(child.expression)})));\n`;
      }
    }
    code += `    }\n`;
    return code;
  }

  // ─── Statement Generation ──────────────────────────────
  private genStatement(node: ASTNode): string {
    switch (node.type) {
      case 'VariableDecl': return this.genVariable(node);
      case 'FunctionDecl': return this.genFunction(node);
      case 'ReturnStatement': return node.value ? `return ${this.genExpr(node.value)};` : 'return;';
      case 'IfStatement': return this.genIf(node);
      case 'ForStatement': return this.genForStatement(node);
      case 'ExpressionStatement': return this.genExpr(node.expression) + ';';
      case 'BlockStatement': return '{\n' + (node as any).body.map((s: any) => this.genStatement(s)).join('\n') + '\n}';
      default: return this.genExpr(node) + ';';
    }
  }

  private genVariable(node: any): string {
    const keyword = node.mutable ? 'let' : 'const';
    return `${keyword} ${node.name} = ${this.genExpr(node.value)};`;
  }

  private genFunction(node: any): string {
    const params = node.params.map((p: any) => {
      if (p.defaultValue) return `${p.name} = ${this.genExpr(p.defaultValue)}`;
      return p.name;
    }).join(', ');
    const body = node.body.map((s: any) => '    ' + this.genStatement(s)).join('\n');
    return `  function ${node.name}(${params}) {\n${body}\n  }`;
  }

  private genIf(node: any): string {
    const cond = this.genExpr(node.condition);
    const body = node.consequent.map((s: any) => this.genStatement(s)).join('\n');
    let code = `if (${cond}) {\n${body}\n}`;
    if (node.alternate) {
      const altBody = node.alternate.map((s: any) => this.genStatement(s)).join('\n');
      code += ` else {\n${altBody}\n}`;
    }
    return code;
  }

  private genForStatement(node: any): string {
    const iter = this.genExpr(node.iterable);
    const body = node.body.map((s: any) => this.genStatement(s)).join('\n');
    return `for (const ${node.variable} of ${iter}) {\n${body}\n}`;
  }

  // ─── Expression Generation ─────────────────────────────
  private genExpr(node: ASTNode): string {
    switch (node.type) {
      case 'NumberLiteral': return String((node as any).value);
      case 'StringLiteral': return JSON.stringify((node as any).value);
      case 'BooleanLiteral': return String((node as any).value);
      case 'NullLiteral': return 'null';
      case 'Identifier': return (node as any).name;
      case 'BinaryExpr':
        return `(${this.genExpr((node as any).left)} ${(node as any).operator} ${this.genExpr((node as any).right)})`;
      case 'UnaryExpr':
        return `${(node as any).operator}${this.genExpr((node as any).operand)}`;
      case 'CallExpr':
        const callee = this.genExpr((node as any).callee);
        const args = (node as any).arguments.map((a: any) => this.genExpr(a)).join(', ');
        // If calling a known component, wrap in component call
        if (this.components.has(callee)) {
          return `${callee}({${args}})`;
        }
        return `${callee}(${args})`;
      case 'MemberExpr':
        if ((node as any).computed) {
          return `${this.genExpr((node as any).object)}[${this.genExpr((node as any).index)}]`;
        }
        return `${this.genExpr((node as any).object)}.${(node as any).property}`;
      case 'AssignExpr':
        return `${this.genExpr((node as any).target)} = ${this.genExpr((node as any).value)}`;
      case 'ArrowFunction': {
        const params = (node as any).params.map((p: any) => p.name).join(', ');
        if (Array.isArray((node as any).body)) {
          const body = (node as any).body.map((s: any) => this.genStatement(s)).join('\n');
          return `(${params}) => {\n${body}\n}`;
        }
        return `(${params}) => ${this.genExpr((node as any).body)}`;
      }
      case 'ArrayLiteral':
        return '[' + (node as any).elements.map((e: any) => this.genExpr(e)).join(', ') + ']';
      case 'ObjectLiteral':
        return '{' + (node as any).properties.map((p: any) => `${p.key}: ${this.genExpr(p.value)}`).join(', ') + '}';
      case 'ConditionalExpr':
        return `(${this.genExpr((node as any).condition)} ? ${this.genExpr((node as any).consequent)} : ${this.genExpr((node as any).alternate)})`;
      case 'PipeExpr':
        return `${this.genExpr((node as any).right)}(${this.genExpr((node as any).left)})`;
      case 'TemplateLiteral':
        return '`' + (node as any).parts.map((p: any) =>
          typeof p === 'string' ? p : '${' + this.genExpr(p) + '}'
        ).join('') + '`';
      default:
        return '/* unknown: ' + node.type + ' */';
    }
  }

  // ─── Style Generation ──────────────────────────────────
  private genStyleDecl(node: any): string {
    const name = node.name || 'default';
    const props = node.properties.map((p: any) => {
      const key = this.camelToKebab(p.key);
      const val = this.genStyleValue(p.value);
      return `  ${key}: ${val};`;
    }).join('\n');
    const className = 'lumina-' + name;
    this.styles.set(name, className);
    return `.${className} {\n${props}\n}`;
  }

  private genStyleValue(node: ASTNode): string {
    if (node.type === 'NumberLiteral') return (node as any).value + 'px';
    if (node.type === 'StringLiteral') return (node as any).value;
    return this.genExpr(node);
  }

  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  // ─── HTML Wrapper ──────────────────────────────────────
  private generateHTML(js: string, css: string): string {
    // Find the first component to auto-mount
    const firstComponent = Array.from(this.components.keys())[0] || '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumina App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
${css ? css.split('\n').map(l => '    ' + l).join('\n') : ''}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${js}

// Auto-mount
${firstComponent ? `document.getElementById('app').appendChild(${firstComponent}({}));` : ''}
  </script>
</body>
</html>`;
  }

  private wrapRuntime(js: string): string {
    return `// Lumina Runtime v0.1
// Generated by Lumina Transpiler

${js}`;
  }
}

export default CodeGenerator;
