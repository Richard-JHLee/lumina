// ============================================================
// Lumina Language - Type Checker
// ============================================================
import { ASTNode, Program } from '../types';

export type LuminaType =
  | { kind: 'Int' }
  | { kind: 'String' }
  | { kind: 'Bool' }
  | { kind: 'Null' }
  | { kind: 'Array'; elementType: LuminaType }
  | { kind: 'Object'; properties: Map<string, LuminaType> }
  | { kind: 'Function'; params: LuminaType[]; returnType: LuminaType }
  | { kind: 'Component'; props: Map<string, LuminaType> }
  | { kind: 'Any' }
  | { kind: 'Void' };

interface TypeEnvironment {
  parent?: TypeEnvironment;
  bindings: Map<string, LuminaType>;
}

export class TypeChecker {
  private errors: string[] = [];
  private components: Map<string, { props: Map<string, LuminaType> }> = new Map();

  check(program: Program): { success: boolean; errors: string[] } {
    this.errors = [];
    const globalEnv: TypeEnvironment = { bindings: new Map() };

    // First pass: collect component and function signatures
    for (const node of program.body) {
      if (node.type === 'ComponentDecl') {
        const props = new Map<string, LuminaType>();
        for (const param of node.params) {
          props.set(param.name, this.parseTypeAnnotation(param.typeAnnotation));
        }
        this.components.set(node.name, { props });
        globalEnv.bindings.set(node.name, { kind: 'Component', props });
      } else if (node.type === 'FunctionDecl') {
        const paramTypes = node.params.map(p => this.parseTypeAnnotation(p.typeAnnotation));
        const returnType = this.parseTypeAnnotation(node.returnType);
        globalEnv.bindings.set(node.name, { kind: 'Function', params: paramTypes, returnType });
      }
    }

    // Second pass: type check bodies
    for (const node of program.body) {
      this.checkNode(node, globalEnv);
    }

    return {
      success: this.errors.length === 0,
      errors: this.errors
    };
  }

  private checkNode(node: ASTNode, env: TypeEnvironment): LuminaType {
    switch (node.type) {
      case 'Program':
        for (const stmt of node.body) {
          this.checkNode(stmt, env);
        }
        return { kind: 'Void' };

      case 'ComponentDecl': {
        const localEnv: TypeEnvironment = { parent: env, bindings: new Map() };

        // Add parameters to environment
        for (const param of node.params) {
          localEnv.bindings.set(param.name, this.parseTypeAnnotation(param.typeAnnotation));
        }

        // Check body
        for (const stmt of node.body) {
          this.checkNode(stmt, localEnv);
        }
        return { kind: 'Void' };
      }

      case 'FunctionDecl': {
        const localEnv: TypeEnvironment = { parent: env, bindings: new Map() };

        // Add parameters to environment
        for (const param of node.params) {
          localEnv.bindings.set(param.name, this.parseTypeAnnotation(param.typeAnnotation));
        }

        // Check body
        let hasReturn = false;
        for (const stmt of node.body) {
          if (stmt.type === 'ReturnStatement') {
            hasReturn = true;
            if (stmt.value) {
              const returnType = this.checkNode(stmt.value, localEnv);
              const expectedType = this.parseTypeAnnotation(node.returnType);
              if (!this.isCompatible(returnType, expectedType)) {
                this.addError(`Function ${node.name} returns ${this.typeToString(returnType)} but expected ${this.typeToString(expectedType)}`);
              }
            }
          } else {
            this.checkNode(stmt, localEnv);
          }
        }

        return { kind: 'Void' };
      }

      case 'VariableDecl': {
        const valueType = this.checkNode(node.value, env);
        const declaredType = this.parseTypeAnnotation(node.typeAnnotation);

        if (!this.isCompatible(valueType, declaredType)) {
          this.addError(`Variable ${node.name} declared as ${this.typeToString(declaredType)} but initialized with ${this.typeToString(valueType)}`);
        }

        env.bindings.set(node.name, declaredType.kind === 'Any' ? valueType : declaredType);
        return { kind: 'Void' };
      }

      case 'StateDecl': {
        const valueType = this.checkNode(node.value, env);
        const declaredType = this.parseTypeAnnotation(node.typeAnnotation);

        if (!this.isCompatible(valueType, declaredType)) {
          this.addError(`State ${node.name} declared as ${this.typeToString(declaredType)} but initialized with ${this.typeToString(valueType)}`);
        }

        env.bindings.set(node.name, declaredType.kind === 'Any' ? valueType : declaredType);
        return { kind: 'Void' };
      }

      case 'AssignExpr': {
        const targetType = this.checkNode(node.target, env);
        const valueType = this.checkNode(node.value, env);

        if (!this.isCompatible(valueType, targetType)) {
          this.addError(`Cannot assign ${this.typeToString(valueType)} to ${this.typeToString(targetType)}`);
        }

        return valueType;
      }

      case 'BinaryExpr': {
        const leftType = this.checkNode(node.left, env);
        const rightType = this.checkNode(node.right, env);

        // Arithmetic operators
        if (['+', '-', '*', '/', '%'].includes(node.operator)) {
          if (node.operator === '+') {
            // String concatenation or number addition
            if (leftType.kind === 'String' || rightType.kind === 'String') {
              return { kind: 'String' };
            }
            if (leftType.kind === 'Int' && rightType.kind === 'Int') {
              return { kind: 'Int' };
            }
          } else {
            if (leftType.kind !== 'Int' || rightType.kind !== 'Int') {
              this.addError(`Operator ${node.operator} requires Int operands`);
            }
            return { kind: 'Int' };
          }
        }

        // Comparison operators
        if (['==', '!=', '<', '>', '<=', '>='].includes(node.operator)) {
          return { kind: 'Bool' };
        }

        // Logical operators
        if (['&&', '||'].includes(node.operator)) {
          if (leftType.kind !== 'Bool' || rightType.kind !== 'Bool') {
            this.addError(`Operator ${node.operator} requires Bool operands`);
          }
          return { kind: 'Bool' };
        }

        return { kind: 'Any' };
      }

      case 'UnaryExpr': {
        const operandType = this.checkNode(node.operand, env);

        if (node.operator === '!') {
          if (operandType.kind !== 'Bool') {
            this.addError(`Operator ! requires Bool operand`);
          }
          return { kind: 'Bool' };
        }

        if (node.operator === '-') {
          if (operandType.kind !== 'Int') {
            this.addError(`Operator - requires Int operand`);
          }
          return { kind: 'Int' };
        }

        return { kind: 'Any' };
      }

      case 'CallExpr': {
        const calleeType = this.checkNode(node.callee, env);

        if (calleeType.kind === 'Function') {
          if (node.arguments.length !== calleeType.params.length) {
            this.addError(`Function expects ${calleeType.params.length} arguments but got ${node.arguments.length}`);
          }

          for (let i = 0; i < node.arguments.length && i < calleeType.params.length; i++) {
            const argType = this.checkNode(node.arguments[i], env);
            if (!this.isCompatible(argType, calleeType.params[i])) {
              this.addError(`Argument ${i + 1} expects ${this.typeToString(calleeType.params[i])} but got ${this.typeToString(argType)}`);
            }
          }

          return calleeType.returnType;
        }

        return { kind: 'Any' };
      }

      case 'MemberExpr': {
        const objectType = this.checkNode(node.object, env);

        if (objectType.kind === 'Object') {
          const propType = objectType.properties.get(node.property);
          if (propType) {
            return propType;
          }
        }

        return { kind: 'Any' };
      }

      case 'ComponentInstance': {
        const component = this.components.get(node.name);

        if (!component) {
          this.addError(`Unknown component: ${node.name}`);
          return { kind: 'Any' };
        }

        // Check props
        const providedProps = new Set(node.props.map(p => p.name));

        for (const [propName, propType] of component.props) {
          const provided = node.props.find(p => p.name === propName);
          if (provided) {
            const valueType = this.checkNode(provided.value, env);
            if (!this.isCompatible(valueType, propType)) {
              this.addError(`Component ${node.name} prop ${propName} expects ${this.typeToString(propType)} but got ${this.typeToString(valueType)}`);
            }
          }
        }

        return { kind: 'Any' };
      }

      case 'Identifier': {
        const type = this.lookup(node.name, env);
        if (!type) {
          this.addError(`Undefined variable: ${node.name}`);
          return { kind: 'Any' };
        }
        return type;
      }

      case 'NumberLiteral':
        return { kind: 'Int' };

      case 'StringLiteral':
        return { kind: 'String' };

      case 'BooleanLiteral':
        return { kind: 'Bool' };

      case 'NullLiteral':
        return { kind: 'Null' };

      case 'ArrayLiteral': {
        if (node.elements.length === 0) {
          return { kind: 'Array', elementType: { kind: 'Any' } };
        }
        const firstType = this.checkNode(node.elements[0], env);
        return { kind: 'Array', elementType: firstType };
      }

      case 'ObjectLiteral': {
        const properties = new Map<string, LuminaType>();
        for (const prop of node.properties) {
          properties.set(prop.key, this.checkNode(prop.value, env));
        }
        return { kind: 'Object', properties };
      }

      case 'IfStatement':
        const condType = this.checkNode(node.condition, env);
        if (condType.kind !== 'Bool') {
          this.addError(`If condition must be Bool but got ${this.typeToString(condType)}`);
        }
        for (const stmt of node.consequent) {
          this.checkNode(stmt, env);
        }
        if (node.alternate) {
          for (const stmt of node.alternate) {
            this.checkNode(stmt, env);
          }
        }
        return { kind: 'Void' };

      case 'ForStatement':
        // TODO: Check iterable type
        const localEnv: TypeEnvironment = { parent: env, bindings: new Map() };
        localEnv.bindings.set(node.variable, { kind: 'Any' });
        for (const stmt of node.body) {
          this.checkNode(stmt, localEnv);
        }
        return { kind: 'Void' };

      case 'ExpressionStatement':
        this.checkNode(node.expression, env);
        return { kind: 'Void' };

      case 'UIElement':
        // Check children for nested components
        for (const child of (node as any).children) {
          this.checkNode(child, env);
        }
        return { kind: 'Any' };

      case 'UIText':
        return { kind: 'Any' };

      case 'UIExpression':
        this.checkNode((node as any).expression, env);
        return { kind: 'Any' };

      default:
        return { kind: 'Any' };
    }
  }

  private lookup(name: string, env: TypeEnvironment): LuminaType | undefined {
    if (env.bindings.has(name)) {
      return env.bindings.get(name);
    }
    if (env.parent) {
      return this.lookup(name, env.parent);
    }
    return undefined;
  }

  private parseTypeAnnotation(annotation?: string): LuminaType {
    if (!annotation) return { kind: 'Any' };

    switch (annotation) {
      case 'Int': return { kind: 'Int' };
      case 'String': return { kind: 'String' };
      case 'Bool': return { kind: 'Bool' };
      case 'Void': return { kind: 'Void' };
      default:
        // TODO: Parse complex types like Array<Int>, etc.
        return { kind: 'Any' };
    }
  }

  private isCompatible(actual: LuminaType, expected: LuminaType): boolean {
    if (expected.kind === 'Any' || actual.kind === 'Any') return true;
    if (expected.kind === 'Void' || actual.kind === 'Void') return true;

    if (actual.kind === expected.kind) {
      if (actual.kind === 'Array' && expected.kind === 'Array') {
        return this.isCompatible(actual.elementType, expected.elementType);
      }
      return true;
    }

    return false;
  }

  private typeToString(type: LuminaType): string {
    switch (type.kind) {
      case 'Int': return 'Int';
      case 'String': return 'String';
      case 'Bool': return 'Bool';
      case 'Null': return 'Null';
      case 'Void': return 'Void';
      case 'Any': return 'Any';
      case 'Array': return `Array<${this.typeToString(type.elementType)}>`;
      case 'Object': return 'Object';
      case 'Function': return 'Function';
      case 'Component': return 'Component';
    }
  }

  private addError(message: string): void {
    this.errors.push(`[Type Error] ${message}`);
  }
}

export default TypeChecker;
