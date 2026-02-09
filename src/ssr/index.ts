// ============================================================
// Lumina Language - Server-Side Rendering (SSR)
// ============================================================
import { ASTNode, Program } from '../types';

export interface SSROptions {
  props?: Record<string, any>;
}

export class SSRRenderer {
  private components: Map<string, any> = new Map();

  render(program: Program, componentName: string, options: SSROptions = {}): string {
    const props = options.props || {};

    // Find the component
    const componentNode = program.body.find(
      (node: any) => node.type === 'ComponentDecl' && node.name === componentName
    );

    if (!componentNode) {
      throw new Error(`Component not found: ${componentName}`);
    }

    // Render component to HTML string
    return this.renderComponent(componentNode as any, props);
  }

  private renderComponent(node: any, props: Record<string, any>): string {
    // Extract component body
    const uiElement = node.body.find((child: any) => child.type === 'UIElement');

    if (!uiElement) {
      return '';
    }

    return this.renderUIElement(uiElement, props);
  }

  private renderUIElement(node: any, props: Record<string, any>): string {
    const tag = node.tag;
    const attributes: string[] = [];

    // Render attributes
    for (const attr of node.attributes || []) {
      if (attr.name.startsWith('@')) {
        // Skip event handlers in SSR
        continue;
      }

      if (attr.value) {
        const value = this.evaluateExpression(attr.value, props);
        if (attr.name === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([key, val]) => `${this.camelToKebab(key)}:${val}`)
            .join(';');
          attributes.push(`style="${styleStr}"`);
        } else {
          attributes.push(`${attr.name}="${this.escapeHtml(String(value))}"`);
        }
      } else {
        attributes.push(attr.name);
      }
    }

    const attrsStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    // Self-closing tags
    if (node.selfClosing) {
      return `<${tag}${attrsStr} />`;
    }

    // Render children
    const childrenHtml = node.children
      .map((child: any) => this.renderChild(child, props))
      .join('');

    return `<${tag}${attrsStr}>${childrenHtml}</${tag}>`;
  }

  private renderChild(node: any, props: Record<string, any>): string {
    switch (node.type) {
      case 'UIText':
        return this.escapeHtml(node.value);

      case 'UIExpression':
        const value = this.evaluateExpression(node.expression, props);
        return this.escapeHtml(String(value));

      case 'UIElement':
        return this.renderUIElement(node, props);

      case 'IfStatement':
        const condition = this.evaluateExpression(node.condition, props);
        if (condition) {
          return node.consequent
            .map((child: any) => this.renderChild(child, props))
            .join('');
        } else if (node.alternate) {
          return node.alternate
            .map((child: any) => this.renderChild(child, props))
            .join('');
        }
        return '';

      case 'ForStatement':
        const iterable = this.evaluateExpression(node.iterable, props);
        if (!Array.isArray(iterable)) return '';

        return iterable
          .map((item: any) => {
            const childProps = { ...props, [node.variable]: item };
            return node.body
              .map((child: any) => this.renderChild(child, childProps))
              .join('');
          })
          .join('');

      default:
        return '';
    }
  }

  private evaluateExpression(expr: any, props: Record<string, any>): any {
    switch (expr.type) {
      case 'Identifier':
        return props[expr.name] !== undefined ? props[expr.name] : expr.name;

      case 'NumberLiteral':
        return expr.value;

      case 'StringLiteral':
        return expr.value;

      case 'BooleanLiteral':
        return expr.value;

      case 'ArrayLiteral':
        return expr.elements.map((el: any) => this.evaluateExpression(el, props));

      case 'ObjectLiteral':
        const obj: Record<string, any> = {};
        for (const prop of expr.properties) {
          obj[prop.key] = this.evaluateExpression(prop.value, props);
        }
        return obj;

      case 'BinaryExpr':
        const left = this.evaluateExpression(expr.left, props);
        const right = this.evaluateExpression(expr.right, props);
        return this.evaluateBinaryOp(left, expr.operator, right);

      case 'MemberExpr':
        const object = this.evaluateExpression(expr.object, props);
        if (object && typeof object === 'object') {
          return object[expr.property];
        }
        return undefined;

      case 'ConditionalExpr':
        const cond = this.evaluateExpression(expr.condition, props);
        return cond
          ? this.evaluateExpression(expr.consequent, props)
          : this.evaluateExpression(expr.alternate, props);

      default:
        return '';
    }
  }

  private evaluateBinaryOp(left: any, op: string, right: any): any {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: return null;
    }
  }

  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

export function renderToString(
  program: Program,
  componentName: string,
  props?: Record<string, any>
): string {
  const renderer = new SSRRenderer();
  return renderer.render(program, componentName, { props });
}

export default SSRRenderer;
