// Small, non-eval expression evaluator used by the constrained tool DSL.
// Supported: numbers, strings, booleans, null, variables, whitelisted functions,
// arithmetic/comparison/logical operators, parentheses and ternary expressions.

const FUNCTIONS = {
  len: (value) => (Array.isArray(value) ? value.length : String(value ?? '').length),
  lower: (value) => String(value ?? '').toLowerCase(),
  upper: (value) => String(value ?? '').toUpperCase(),
  trim: (value) => String(value ?? '').trim(),
  number: (value) => Number(value),
  round: (value, digits = 0) => {
    const factor = 10 ** Number(digits);
    return Math.round(Number(value) * factor) / factor;
  },
  abs: (value) => Math.abs(Number(value)),
  min: (...values) => Math.min(...values.map(Number)),
  max: (...values) => Math.max(...values.map(Number)),
  coalesce: (...values) => values.find((value) => value !== null && value !== undefined && value !== '')
};

const BIN_PRECEDENCE = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '===': 3,
  '!==': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
  '**': 7
};

const RIGHT_ASSOC = new Set(['**']);

export class ExpressionError extends Error {
  constructor(message, position = -1) {
    super(message);
    this.name = 'ExpressionError';
    this.position = position;
  }
}

function tokenize(source) {
  if (typeof source !== 'string' || !source.trim() || source.length > 4000) {
    throw new ExpressionError('表达式为空或过长');
  }
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const startsNumber = /[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[index + 1] ?? ''));
    if (startsNumber) {
      const match = source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) throw new ExpressionError('数字格式错误', index);
      tokens.push({ type: 'number', value: Number(match[0]), position: index });
      index += match[0].length;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      let position = index + 1;
      let closed = false;
      while (position < source.length) {
        const current = source[position];
        if (current === '\\') {
          const next = source[position + 1];
          const escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'" };
          value += escapes[next] ?? next;
          position += 2;
          continue;
        }
        if (current === quote) {
          closed = true;
          position += 1;
          break;
        }
        value += current;
        position += 1;
      }
      if (!closed) throw new ExpressionError('字符串未闭合', index);
      tokens.push({ type: 'string', value, position: index });
      index = position;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      tokens.push({ type: 'identifier', value: match[0], position: index });
      index += match[0].length;
      continue;
    }
    const operators = ['===', '!==', '**', '==', '!=', '<=', '>=', '&&', '||'];
    const found = operators.find((operator) => source.startsWith(operator, index));
    if (found) {
      tokens.push({ type: 'operator', value: found, position: index });
      index += found.length;
      continue;
    }
    if ('+-*/%<>!?:(),.'.includes(char)) {
      const type = ['(', ')', ',', ':', '.'].includes(char) ? 'punct' : 'operator';
      tokens.push({ type, value: char, position: index });
      index += 1;
      continue;
    }
    throw new ExpressionError(`不支持的字符 ${char}`, index);
  }
  tokens.push({ type: 'eof', value: null, position: source.length });
  return tokens;
}

export function evaluateExpression(source, context = {}) {
  const tokens = tokenize(source);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = (value) => {
    const token = tokens[cursor];
    if (value !== undefined && token.value !== value) {
      throw new ExpressionError(`期望 ${value}，实际 ${token.value}`, token.position);
    }
    cursor += 1;
    return token;
  };

  const readVariable = (name) => {
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'null') return null;
    if (!Object.prototype.hasOwnProperty.call(context, name)) {
      throw new ExpressionError(`未知变量 ${name}`);
    }
    return context[name];
  };

  let parseExpression;

  const parsePrimary = () => {
    const token = peek();
    if (token.type === 'number') {
      consume();
      return token.value;
    }
    if (token.type === 'string') {
      consume();
      return token.value;
    }
    if (token.type === 'identifier') {
      consume();
      if (peek().type === 'punct' && peek().value === '(') {
        consume('(');
        const args = [];
        if (!(peek().type === 'punct' && peek().value === ')')) {
          while (true) {
            args.push(parseExpression());
            if (peek().type === 'punct' && peek().value === ',') {
              consume(',');
              continue;
            }
            break;
          }
        }
        consume(')');
        const fn = FUNCTIONS[token.value];
        if (!fn) throw new ExpressionError(`不支持的函数 ${token.value}`, token.position);
        try {
          return fn(...args);
        } catch (error) {
          throw new ExpressionError(`函数 ${token.value} 执行失败: ${error.message}`, token.position);
        }
      }
      let value = readVariable(token.value);
      while (peek().type === 'punct' && peek().value === '.') {
        consume('.');
        const property = consume();
        if (property.type !== 'identifier') throw new ExpressionError('点路径后必须是字段名', property.position);
        value = value === null || value === undefined ? undefined : value[property.value];
      }
      return value;
    }
    if (token.type === 'punct' && token.value === '(') {
      consume('(');
      const value = parseExpression();
      consume(')');
      return value;
    }
    throw new ExpressionError(`意外的标记 ${token.value}`, token.position);
  };

  const parseUnary = () => {
    const token = peek();
    if (token.type === 'operator' && ['!', '-', '+'].includes(token.value)) {
      consume();
      const value = parseUnary();
      if (token.value === '!') return !value;
      if (token.value === '-') return -Number(value);
      return Number(value);
    }
    return parsePrimary();
  };

  const parseBinary = (minPrecedence = 1) => {
    let left = parseUnary();
    while (true) {
      const token = peek();
      if (token.type !== 'operator') break;
      const precedence = BIN_PRECEDENCE[token.value];
      if (!precedence || precedence < minPrecedence) break;
      consume();
      const nextMin = RIGHT_ASSOC.has(token.value) ? precedence : precedence + 1;
      const right = parseBinary(nextMin);
      switch (token.value) {
        case '||': left = left || right; break;
        case '&&': left = left && right; break;
        case '==':
        case '===': left = left === right; break;
        case '!=':
        case '!==': left = left !== right; break;
        case '<': left = Number(left) < Number(right); break;
        case '<=': left = Number(left) <= Number(right); break;
        case '>': left = Number(left) > Number(right); break;
        case '>=': left = Number(left) >= Number(right); break;
        case '+': left = typeof left === 'string' || typeof right === 'string' ? String(left) + String(right) : Number(left) + Number(right); break;
        case '-': left = Number(left) - Number(right); break;
        case '*': left = Number(left) * Number(right); break;
        case '/': {
          const divisor = Number(right);
          if (divisor === 0) throw new ExpressionError('不能除以零', token.position);
          left = Number(left) / divisor;
          break;
        }
        case '%': {
          const divisor = Number(right);
          if (divisor === 0) throw new ExpressionError('不能对零取余', token.position);
          left = Number(left) % divisor;
          break;
        }
        case '**': left = Number(left) ** Number(right); break;
        default: throw new ExpressionError(`不支持的运算符 ${token.value}`, token.position);
      }
    }
    return left;
  };

  parseExpression = () => {
    const condition = parseBinary();
    if (peek().type === 'operator' && peek().value === '?') {
      consume('?');
      const whenTrue = parseExpression();
      consume(':');
      const whenFalse = parseExpression();
      return condition ? whenTrue : whenFalse;
    }
    return condition;
  };

  const result = parseExpression();
  if (peek().type !== 'eof') {
    throw new ExpressionError(`表达式尾随内容 ${peek().value}`, peek().position);
  }
  return result;
}
