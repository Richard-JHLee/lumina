// ============================================================
// Lumina Language - Lexer (Tokenizer)
// ============================================================
import { TokenType, Token } from '../types';

const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.Let,
  var: TokenType.Var,
  fn: TokenType.Fn,
  return: TokenType.Return,
  if: TokenType.If,
  else: TokenType.Else,
  for: TokenType.For,
  in: TokenType.In,
  component: TokenType.Component,
  state: TokenType.State,
  effect: TokenType.Effect,
  style: TokenType.Style,
  emit: TokenType.Emit,
  on: TokenType.On,
  import: TokenType.Import,
  export: TokenType.Export,
  from: TokenType.From,
  true: TokenType.True,
  false: TokenType.False,
  null: TokenType.Null,
};

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    this.tokens = [];
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.current();

      if (ch === '\n') {
        this.addToken(TokenType.Newline, '\\n');
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }

      if (ch === '/' && this.peek() === '/') { this.skipLineComment(); continue; }
      if (ch === '/' && this.peek() === '*') { this.skipBlockComment(); continue; }

      if (this.isDigit(ch)) { this.readNumber(); continue; }
      if (ch === '"') { this.readString(); continue; }
      if (ch === '`') { this.readTemplateString(); continue; }
      if (this.isAlpha(ch) || ch === '_') { this.readIdentifier(); continue; }

      // Multi-char operators
      if (this.matchTwo('|', '>')) { this.addToken(TokenType.Pipe, '|>'); this.advance(); this.advance(); continue; }
      if (this.matchTwo('=', '>')) { this.addToken(TokenType.Arrow, '=>'); this.advance(); this.advance(); continue; }
      if (this.matchTwo('=', '=')) { this.addToken(TokenType.Equals, '=='); this.advance(); this.advance(); continue; }
      if (this.matchTwo('!', '=')) { this.addToken(TokenType.NotEquals, '!='); this.advance(); this.advance(); continue; }
      if (this.matchTwo('<', '=')) { this.addToken(TokenType.LessEqual, '<='); this.advance(); this.advance(); continue; }
      if (this.matchTwo('>', '=')) { this.addToken(TokenType.GreaterEqual, '>='); this.advance(); this.advance(); continue; }
      if (this.matchTwo('&', '&')) { this.addToken(TokenType.And, '&&'); this.advance(); this.advance(); continue; }
      if (this.matchTwo('|', '|')) { this.addToken(TokenType.Or, '||'); this.advance(); this.advance(); continue; }
      if (this.matchTwo('.', '.')) { this.addToken(TokenType.DotDot, '..'); this.advance(); this.advance(); continue; }

      switch (ch) {
        case '+': this.addToken(TokenType.Plus, '+'); this.advance(); continue;
        case '-': this.addToken(TokenType.Minus, '-'); this.advance(); continue;
        case '*': this.addToken(TokenType.Star, '*'); this.advance(); continue;
        case '/': this.addToken(TokenType.Slash, '/'); this.advance(); continue;
        case '%': this.addToken(TokenType.Percent, '%'); this.advance(); continue;
        case '=': this.addToken(TokenType.Assign, '='); this.advance(); continue;
        case '<': this.addToken(TokenType.LessThan, '<'); this.advance(); continue;
        case '>': this.addToken(TokenType.GreaterThan, '>'); this.advance(); continue;
        case '!': this.addToken(TokenType.Not, '!'); this.advance(); continue;
        case '(': this.addToken(TokenType.LeftParen, '('); this.advance(); continue;
        case ')': this.addToken(TokenType.RightParen, ')'); this.advance(); continue;
        case '{': this.addToken(TokenType.LeftBrace, '{'); this.advance(); continue;
        case '}': this.addToken(TokenType.RightBrace, '}'); this.advance(); continue;
        case '[': this.addToken(TokenType.LeftBracket, '['); this.advance(); continue;
        case ']': this.addToken(TokenType.RightBracket, ']'); this.advance(); continue;
        case ',': this.addToken(TokenType.Comma, ','); this.advance(); continue;
        case ':': this.addToken(TokenType.Colon, ':'); this.advance(); continue;
        case ';': this.addToken(TokenType.Semicolon, ';'); this.advance(); continue;
        case '.': this.addToken(TokenType.Dot, '.'); this.advance(); continue;
        case '@': this.addToken(TokenType.At, '@'); this.advance(); continue;
        case '#': this.addToken(TokenType.Hash, '#'); this.advance(); continue;
        case '?': this.addToken(TokenType.Identifier, '?'); this.advance(); continue;
        default:
          throw new Error(`Unexpected character '${ch}' at line ${this.line}, column ${this.column}`);
      }
    }
    this.addToken(TokenType.EOF, '');
    return this.filterNewlines(this.tokens);
  }

  private filterNewlines(tokens: Token[]): Token[] {
    const result: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === TokenType.Newline) {
        if (result.length > 0 && result[result.length - 1].type === TokenType.Newline) continue;
        if (result.length > 0) {
          const prev = result[result.length - 1].type;
          if (prev === TokenType.LeftBrace || prev === TokenType.LeftParen || prev === TokenType.LeftBracket ||
              prev === TokenType.Comma || prev === TokenType.Semicolon) continue;
        }
        result.push(t);
      } else {
        if (result.length > 0 && result[result.length - 1].type === TokenType.Newline &&
            (t.type === TokenType.RightBrace || t.type === TokenType.RightParen || t.type === TokenType.RightBracket ||
             t.type === TokenType.Else)) {
          result.pop();
        }
        result.push(t);
      }
    }
    return result;
  }

  private current(): string { return this.source[this.pos]; }
  private peek(offset: number = 1): string { return this.source[this.pos + offset] || ''; }
  private advance(): string { const ch = this.source[this.pos]; this.pos++; this.column++; return ch; }
  private matchTwo(a: string, b: string): boolean {
    return this.pos < this.source.length - 1 && this.source[this.pos] === a && this.source[this.pos + 1] === b;
  }
  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, column: this.column });
  }
  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') { this.advance(); } else { break; }
    }
  }
  private skipLineComment(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') { this.advance(); }
  }
  private skipBlockComment(): void {
    this.advance(); this.advance();
    while (this.pos < this.source.length - 1) {
      if (this.source[this.pos] === '\n') { this.line++; this.column = 0; }
      if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') { this.advance(); this.advance(); return; }
      this.advance();
    }
    throw new Error(`Unterminated block comment at line ${this.line}`);
  }
  private readNumber(): void {
    const start = this.pos;
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) { this.advance(); }
    if (this.pos < this.source.length && this.source[this.pos] === '.' && this.isDigit(this.source[this.pos + 1])) {
      this.advance();
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) { this.advance(); }
    }
    this.addToken(TokenType.Number, this.source.slice(start, this.pos));
  }
  private readString(): void {
    this.advance();
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\') {
        this.advance();
        switch (this.source[this.pos]) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += this.source[this.pos];
        }
      } else {
        if (this.source[this.pos] === '\n') { this.line++; this.column = 0; }
        value += this.source[this.pos];
      }
      this.advance();
    }
    if (this.pos >= this.source.length) throw new Error(`Unterminated string at line ${this.line}`);
    this.advance();
    this.addToken(TokenType.String, value);
  }
  private readTemplateString(): void {
    this.advance();
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '`') {
      if (this.source[this.pos] === '\n') { this.line++; this.column = 0; }
      value += this.source[this.pos];
      this.advance();
    }
    if (this.pos >= this.source.length) throw new Error(`Unterminated template string at line ${this.line}`);
    this.advance();
    this.addToken(TokenType.String, value);
  }
  private readIdentifier(): void {
    const start = this.pos;
    while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) { this.advance(); }
    const word = this.source.slice(start, this.pos);
    const type = KEYWORDS[word] || TokenType.Identifier;
    this.addToken(type, word);
  }
  private isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  private isAlpha(ch: string): boolean { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
  private isAlphaNumeric(ch: string): boolean { return this.isAlpha(ch) || this.isDigit(ch); }
}

export default Lexer;
