// ============================================================
// Lumina Language - Parser (AST Generator)
// ============================================================
import { TokenType, Token, ASTNode, Program, Param, UIAttribute } from '../types';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: 'Program', body };
  }

  // ─── Statements ─────────────────────────────────────────
  private parseStatement(): ASTNode {
    switch (this.current().type) {
      case TokenType.Import: return this.parseImport();
      case TokenType.Export: return this.parseExport();
      case TokenType.Component: return this.parseComponent();
      case TokenType.Fn: return this.parseFunction();
      case TokenType.Let: return this.parseVariable(false);
      case TokenType.Var: return this.parseVariable(true);
      case TokenType.State: return this.parseState();
      case TokenType.Effect: return this.parseEffect();
      case TokenType.Style: return this.parseStyleDecl();
      case TokenType.Return: return this.parseReturn();
      case TokenType.If: return this.parseIf();
      case TokenType.For: return this.parseFor();
      default:
        if (this.isUIElement()) return this.parseUIElement();
        return this.parseExpressionStatement();
    }
  }

  // import { Button, Card } from "./components.lum"
  private parseImport(): ASTNode {
    this.expect(TokenType.Import);
    this.expect(TokenType.LeftBrace);

    const specifiers: string[] = [];
    while (!this.check(TokenType.RightBrace)) {
      specifiers.push(this.expect(TokenType.Identifier).value);
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
    }

    this.expect(TokenType.RightBrace);
    this.expect(TokenType.From);
    const source = this.expect(TokenType.String).value;
    this.skipTerminator();

    return { type: 'ImportDecl', specifiers, source };
  }

  // export component Button() { ... }
  private parseExport(): ASTNode {
    this.expect(TokenType.Export);
    const declaration = this.parseStatement();
    return { type: 'ExportDecl', declaration };
  }

  private parseComponent(): ASTNode {
    this.expect(TokenType.Component);
    const name = this.expect(TokenType.Identifier).value;
    let params: Param[] = [];
    if (this.match(TokenType.LeftParen)) {
      params = this.parseParams();
      this.expect(TokenType.RightParen);
    }
    this.expect(TokenType.LeftBrace);
    const body = this.parseBlock();
    this.expect(TokenType.RightBrace);
    return { type: 'ComponentDecl', name, params, body };
  }

  private parseFunction(): ASTNode {
    this.expect(TokenType.Fn);
    const name = this.expect(TokenType.Identifier).value;
    this.expect(TokenType.LeftParen);
    const params = this.parseParams();
    this.expect(TokenType.RightParen);
    let returnType: string | undefined;
    if (this.check(TokenType.Minus)) {
      const saved = this.pos;
      this.advance();
      if (this.check(TokenType.GreaterThan)) {
        this.advance();
        returnType = this.expect(TokenType.Identifier).value;
      } else {
        this.pos = saved;
      }
    }
    this.expect(TokenType.LeftBrace);
    const body = this.parseBlock();
    this.expect(TokenType.RightBrace);
    return { type: 'FunctionDecl', name, params, returnType, body };
  }

  private parseVariable(mutable: boolean): ASTNode {
    this.advance(); // let or var
    const name = this.expect(TokenType.Identifier).value;
    let typeAnnotation: string | undefined;
    if (this.match(TokenType.Colon)) {
      typeAnnotation = this.expect(TokenType.Identifier).value;
    }
    this.expect(TokenType.Assign);
    const value = this.parseExpression();
    this.skipTerminator();
    return { type: 'VariableDecl', name, mutable, typeAnnotation, value };
  }

  private parseState(): ASTNode {
    this.expect(TokenType.State);
    const name = this.expect(TokenType.Identifier).value;
    let typeAnnotation: string | undefined;
    if (this.match(TokenType.Colon)) {
      typeAnnotation = this.expect(TokenType.Identifier).value;
    }
    this.expect(TokenType.Assign);
    const value = this.parseExpression();
    this.skipTerminator();
    return { type: 'StateDecl', name, typeAnnotation, value };
  }

  private parseEffect(): ASTNode {
    this.expect(TokenType.Effect);
    let dependencies: string[] = [];
    if (this.match(TokenType.LeftParen)) {
      while (!this.check(TokenType.RightParen)) {
        dependencies.push(this.expect(TokenType.Identifier).value);
        if (!this.match(TokenType.Comma)) break;
      }
      this.expect(TokenType.RightParen);
    }
    this.expect(TokenType.LeftBrace);
    const body = this.parseBlock();
    this.expect(TokenType.RightBrace);
    return { type: 'EffectDecl', dependencies, body };
  }

  private parseStyleDecl(): ASTNode {
    this.expect(TokenType.Style);
    let name: string | undefined;
    if (this.check(TokenType.Identifier)) {
      name = this.advance().value;
    }
    this.expect(TokenType.LeftBrace);
    this.skipNewlines();
    const properties: { key: string; value: ASTNode }[] = [];
    while (!this.check(TokenType.RightBrace)) {
      // support camelCase property names
      let key = this.expect(TokenType.Identifier).value;
      this.expect(TokenType.Colon);
      const value = this.parseExpression();
      properties.push({ key, value });
      this.match(TokenType.Comma) || this.match(TokenType.Semicolon);
      this.skipNewlines();
    }
    this.expect(TokenType.RightBrace);
    return { type: 'StyleDecl', name, properties };
  }

  private parseReturn(): ASTNode {
    this.expect(TokenType.Return);
    let value: ASTNode | undefined;
    if (!this.check(TokenType.Newline) && !this.check(TokenType.RightBrace) &&
        !this.check(TokenType.Semicolon) && !this.isAtEnd()) {
      value = this.parseExpression();
    }
    this.skipTerminator();
    return { type: 'ReturnStatement', value };
  }

  private parseIf(): ASTNode {
    this.expect(TokenType.If);
    const condition = this.parseExpression();
    this.expect(TokenType.LeftBrace);
    const consequent = this.parseBlock();
    this.expect(TokenType.RightBrace);
    let alternate: ASTNode[] | undefined;
    this.skipNewlines();
    if (this.match(TokenType.Else)) {
      if (this.check(TokenType.If)) {
        alternate = [this.parseIf()];
      } else {
        this.expect(TokenType.LeftBrace);
        alternate = this.parseBlock();
        this.expect(TokenType.RightBrace);
      }
    }
    return { type: 'IfStatement', condition, consequent, alternate };
  }

  private parseFor(): ASTNode {
    this.expect(TokenType.For);
    const variable = this.expect(TokenType.Identifier).value;
    this.expect(TokenType.In);
    const iterable = this.parseExpression();
    this.expect(TokenType.LeftBrace);
    const body = this.parseBlock();
    this.expect(TokenType.RightBrace);
    return { type: 'ForStatement', variable, iterable, body };
  }

  private parseExpressionStatement(): ASTNode {
    const expr = this.parseExpression();
    this.skipTerminator();
    return { type: 'ExpressionStatement', expression: expr };
  }

  // ─── UI Parsing ─────────────────────────────────────────
  private isUIElement(): boolean {
    if (!this.check(TokenType.LessThan)) return false;
    const next = this.tokens[this.pos + 1];
    if (!next) return false;
    // HTML tags and Component names are always identifiers (div, span, Button, etc.)
    if (next.type === TokenType.Identifier && /^[a-zA-Z]/.test(next.value)) return true;
    return false;
  }

  private parseUIElement(): ASTNode {
    this.expect(TokenType.LessThan);
    const tag = this.expect(TokenType.Identifier).value;

    // Check if this is a component (starts with uppercase)
    const isComponent = /^[A-Z]/.test(tag);

    const attributes: UIAttribute[] = [];
    const props: { name: string; value: ASTNode }[] = [];
    this.skipNewlines();

    while (!this.check(TokenType.GreaterThan) && !this.check(TokenType.Slash) && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.GreaterThan) || this.check(TokenType.Slash)) break;

      let attrName = '';
      if (this.match(TokenType.At)) {
        attrName = '@' + this.expectIdentifierOrKeyword();
      } else {
        attrName = this.expectIdentifierOrKeyword();
        while (this.match(TokenType.Minus)) {
          attrName += '-' + this.expectIdentifierOrKeyword();
        }
      }

      let attrValue: ASTNode | null = null;
      if (this.match(TokenType.Assign)) {
        if (this.check(TokenType.LeftBrace)) {
          this.advance();
          attrValue = this.parseExpression();
          this.expect(TokenType.RightBrace);
        } else if (this.check(TokenType.String)) {
          attrValue = { type: 'StringLiteral', value: this.advance().value };
        } else {
          attrValue = this.parseExpression();
        }
      }

      // For components, store as props; for HTML elements, as attributes
      if (isComponent && attrValue !== null) {
        props.push({ name: attrName, value: attrValue });
      } else {
        attributes.push({ name: attrName, value: attrValue });
      }
      this.skipNewlines();
    }

    // Self-closing?
    if (this.match(TokenType.Slash)) {
      this.expect(TokenType.GreaterThan);
      if (isComponent) {
        return { type: 'ComponentInstance', name: tag, props, children: [], selfClosing: true };
      }
      return { type: 'UIElement', tag, attributes, children: [], selfClosing: true };
    }

    this.expect(TokenType.GreaterThan);

    // Parse children
    const children: ASTNode[] = [];
    while (!this.isClosingTag()) {
      this.skipNewlines();
      if (this.isClosingTag()) break;

      if (this.check(TokenType.LeftBrace)) {
        this.advance();
        this.skipNewlines();
        if (this.check(TokenType.If)) {
          const ifNode = this.parseIf();
          children.push(ifNode);
        } else if (this.check(TokenType.For)) {
          const forNode = this.parseFor();
          children.push(forNode);
        } else {
          const expr = this.parseExpression();
          children.push({ type: 'UIExpression', expression: expr });
        }
        this.expect(TokenType.RightBrace);
      } else if (this.isUIElement()) {
        children.push(this.parseUIElement());
      } else if (this.check(TokenType.String)) {
        children.push({ type: 'UIText', value: this.advance().value });
      } else if (this.check(TokenType.Identifier) || this.check(TokenType.Number)) {
        let text = this.advance().value;
        while ((this.check(TokenType.Identifier) || this.check(TokenType.Number) ||
               this.check(TokenType.Dot) || this.check(TokenType.Comma) ||
               this.check(TokenType.Colon) || this.check(TokenType.Not)) &&
               !this.isClosingTag()) {
          text += ' ' + this.advance().value;
        }
        children.push({ type: 'UIText', value: text });
      } else {
        break;
      }
    }

    // Closing tag </tag>
    this.expect(TokenType.LessThan);
    this.expect(TokenType.Slash);
    const closingTag = this.expect(TokenType.Identifier).value;
    if (closingTag !== tag) {
      throw this.error('Expected closing tag </' + tag + '>, got </' + closingTag + '>');
    }
    this.expect(TokenType.GreaterThan);

    if (isComponent) {
      return { type: 'ComponentInstance', name: tag, props, children, selfClosing: false };
    }
    return { type: 'UIElement', tag, attributes, children, selfClosing: false };
  }

  private isClosingTag(): boolean {
    return this.check(TokenType.LessThan) &&
           this.pos + 1 < this.tokens.length &&
           this.tokens[this.pos + 1].type === TokenType.Slash;
  }

  // ─── Expressions ────────────────────────────────────────
  private parseExpression(): ASTNode {
    return this.parsePipe();
  }

  private parsePipe(): ASTNode {
    let left = this.parseAssignment();
    while (this.match(TokenType.Pipe)) {
      const right = this.parseAssignment();
      left = { type: 'PipeExpr', left, right };
    }
    return left;
  }

  private parseAssignment(): ASTNode {
    const left = this.parseTernary();
    if (this.match(TokenType.Assign)) {
      const value = this.parseAssignment();
      return { type: 'AssignExpr', target: left, value };
    }
    return left;
  }

  private parseTernary(): ASTNode {
    let condition = this.parseOr();
    if (this.check(TokenType.Identifier) && this.current().value === '?') {
      this.advance();
      const consequent = this.parseExpression();
      this.expect(TokenType.Colon);
      const alternate = this.parseExpression();
      return { type: 'ConditionalExpr', condition, consequent, alternate };
    }
    return condition;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.match(TokenType.Or)) {
      left = { type: 'BinaryExpr', operator: '||', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.match(TokenType.And)) {
      left = { type: 'BinaryExpr', operator: '&&', left, right: this.parseEquality() };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.check(TokenType.Equals) || this.check(TokenType.NotEquals)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpr', operator: op, left, right: this.parseComparison() };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddition();
    while ((this.check(TokenType.LessThan) && !this.isUIElement()) ||
           this.check(TokenType.GreaterThan) ||
           this.check(TokenType.LessEqual) ||
           this.check(TokenType.GreaterEqual)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpr', operator: op, left, right: this.parseAddition() };
    }
    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    while (this.check(TokenType.Plus) || this.check(TokenType.Minus)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpr', operator: op, left, right: this.parseMultiplication() };
    }
    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();
    while (this.check(TokenType.Star) || this.check(TokenType.Slash) || this.check(TokenType.Percent)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpr', operator: op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.check(TokenType.Not) || this.check(TokenType.Minus)) {
      const op = this.advance().value;
      return { type: 'UnaryExpr', operator: op, operand: this.parseUnary() };
    }
    return this.parseCallAndMember();
  }

  private parseCallAndMember(): ASTNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match(TokenType.LeftParen)) {
        const args: ASTNode[] = [];
        this.skipNewlines();
        while (!this.check(TokenType.RightParen)) {
          args.push(this.parseExpression());
          if (!this.match(TokenType.Comma)) break;
          this.skipNewlines();
        }
        this.expect(TokenType.RightParen);
        expr = { type: 'CallExpr', callee: expr, arguments: args };
      } else if (this.match(TokenType.Dot)) {
        const prop = this.expect(TokenType.Identifier).value;
        expr = { type: 'MemberExpr', object: expr, property: prop, computed: false };
      } else if (this.match(TokenType.LeftBracket)) {
        const index = this.parseExpression();
        this.expect(TokenType.RightBracket);
        expr = { type: 'MemberExpr', object: expr, property: '', computed: true };
        (expr as any).index = index;
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ASTNode {
    // Arrow function: (params) => body
    if (this.check(TokenType.LeftParen) && this.isArrowFunction()) {
      return this.parseArrowFunction();
    }

    // Grouped expression
    if (this.match(TokenType.LeftParen)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RightParen);
      return expr;
    }

    // Array literal
    if (this.match(TokenType.LeftBracket)) {
      const elements: ASTNode[] = [];
      this.skipNewlines();
      while (!this.check(TokenType.RightBracket)) {
        elements.push(this.parseExpression());
        this.match(TokenType.Comma);
        this.skipNewlines();
      }
      this.expect(TokenType.RightBracket);
      return { type: 'ArrayLiteral', elements };
    }

    // Object literal
    if (this.check(TokenType.LeftBrace) && this.isObjectLiteral()) {
      this.advance();
      const properties: { key: string; value: ASTNode }[] = [];
      this.skipNewlines();
      while (!this.check(TokenType.RightBrace)) {
        const key = this.expect(TokenType.Identifier).value;
        this.expect(TokenType.Colon);
        const value = this.parseExpression();
        properties.push({ key, value });
        this.match(TokenType.Comma);
        this.skipNewlines();
      }
      this.expect(TokenType.RightBrace);
      return { type: 'ObjectLiteral', properties };
    }

    // Number
    if (this.check(TokenType.Number)) {
      return { type: 'NumberLiteral', value: parseFloat(this.advance().value) };
    }

    // String
    if (this.check(TokenType.String)) {
      return { type: 'StringLiteral', value: this.advance().value };
    }

    // Boolean
    if (this.check(TokenType.True)) { this.advance(); return { type: 'BooleanLiteral', value: true }; }
    if (this.check(TokenType.False)) { this.advance(); return { type: 'BooleanLiteral', value: false }; }

    // Null
    if (this.match(TokenType.Null)) { return { type: 'NullLiteral' }; }

    // Identifier or single-param arrow
    if (this.check(TokenType.Identifier)) {
      const name = this.advance().value;
      if (this.check(TokenType.Arrow)) {
        this.advance();
        if (this.check(TokenType.LeftBrace)) {
          this.advance();
          const body = this.parseBlock();
          this.expect(TokenType.RightBrace);
          return { type: 'ArrowFunction', params: [{ name }], body };
        }
        const bodyExpr = this.parseExpression();
        return { type: 'ArrowFunction', params: [{ name }], body: bodyExpr };
      }
      return { type: 'Identifier', name };
    }

    throw this.error('Unexpected token: ' + this.current().type + ' (' + this.current().value + ')');
  }

  // ─── Helpers ────────────────────────────────────────────
  private isArrowFunction(): boolean {
    let depth = 0;
    let i = this.pos;
    while (i < this.tokens.length) {
      if (this.tokens[i].type === TokenType.LeftParen) depth++;
      if (this.tokens[i].type === TokenType.RightParen) depth--;
      if (depth === 0) {
        return i + 1 < this.tokens.length && this.tokens[i + 1].type === TokenType.Arrow;
      }
      i++;
    }
    return false;
  }

  private parseArrowFunction(): ASTNode {
    this.expect(TokenType.LeftParen);
    const params = this.parseParams();
    this.expect(TokenType.RightParen);
    this.expect(TokenType.Arrow);
    if (this.check(TokenType.LeftBrace)) {
      this.advance();
      const body = this.parseBlock();
      this.expect(TokenType.RightBrace);
      return { type: 'ArrowFunction', params, body };
    }
    const bodyExpr = this.parseExpression();
    return { type: 'ArrowFunction', params, body: bodyExpr };
  }

  private isObjectLiteral(): boolean {
    let i = this.pos + 1;
    while (i < this.tokens.length && this.tokens[i].type === TokenType.Newline) i++;
    if (i + 1 < this.tokens.length &&
        this.tokens[i].type === TokenType.Identifier &&
        this.tokens[i + 1].type === TokenType.Colon) {
      return true;
    }
    return false;
  }

  private parseParams(): Param[] {
    const params: Param[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.RightParen)) {
      const name = this.expect(TokenType.Identifier).value;
      let typeAnnotation: string | undefined;
      let defaultValue: ASTNode | undefined;
      if (this.match(TokenType.Colon)) {
        typeAnnotation = this.expect(TokenType.Identifier).value;
      }
      if (this.match(TokenType.Assign)) {
        defaultValue = this.parseExpression();
      }
      params.push({ name, typeAnnotation, defaultValue });
      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
    }
    return params;
  }

  private parseBlock(): ASTNode[] {
    const statements: ASTNode[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
      this.skipNewlines();
    }
    return statements;
  }

  private current(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private check(type: TokenType): boolean { return !this.isAtEnd() && this.current().type === type; }
  private match(type: TokenType): boolean {
    if (this.check(type)) { this.advance(); return true; }
    return false;
  }
  private expect(type: TokenType): Token {
    if (this.check(type)) return this.advance();
    const cur = this.current();
    throw this.error('Expected ' + type + ', got ' + cur.type + ' (' + cur.value + ')');
  }
  // In UI attribute context, keywords like 'style', 'for', 'class' should be valid names
  private isIdentifierLike(): boolean {
    if (this.isAtEnd()) return false;
    const t = this.current().type;
    return t === TokenType.Identifier || t === TokenType.Style || t === TokenType.For ||
           t === TokenType.In || t === TokenType.On || t === TokenType.State ||
           t === TokenType.Let || t === TokenType.Var || t === TokenType.If ||
           t === TokenType.Else || t === TokenType.Return || t === TokenType.True ||
           t === TokenType.False || t === TokenType.Null || t === TokenType.Fn ||
           t === TokenType.Component || t === TokenType.Effect || t === TokenType.Import ||
           t === TokenType.Export || t === TokenType.From || t === TokenType.Emit;
  }
  private expectIdentifierOrKeyword(): string {
    if (this.isIdentifierLike()) return this.advance().value;
    const cur = this.current();
    throw this.error('Expected identifier, got ' + cur.type + ' (' + cur.value + ')');
  }
  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.current().type === TokenType.EOF;
  }
  private skipNewlines(): void {
    while (this.check(TokenType.Newline) || this.check(TokenType.Semicolon)) { this.advance(); }
  }
  private skipTerminator(): void {
    this.match(TokenType.Newline) || this.match(TokenType.Semicolon);
  }
  private error(msg: string): Error {
    const t = this.tokens[Math.min(this.pos, this.tokens.length - 1)];
    return new Error('[Parse Error] ' + msg + ' at line ' + t.line + ', col ' + t.column);
  }
}

export default Parser;
