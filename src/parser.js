import { DEFAULT_SETTINGS } from './constants.js';
import { codeFrame } from './util.js';

const encoder = new TextEncoder();

export function parseJson(input, options = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...options };
  const bytes = encoder.encode(input).length;
  if (bytes > merged.maxInputBytes) {
    const error = new Error(
      `Input exceeds maximum size of ${Math.round(merged.maxInputBytes / (1024 * 1024))} MB`
    );
    error.name = 'InputLimitError';
    error.line = 0;
    error.column = 0;
    error.snippet = '';
    throw error;
  }

  const preprocessed = merged.lenient ? preprocessLenient(input) : { text: input, lenientApplied: false };

  try {
    const parser = new JsonParser(preprocessed.text, {
      duplicatePolicy: merged.duplicatePolicy,
      maxDepth: merged.maxDepth
    });
    const value = parser.parse();
    return {
      value,
      warnings: {
        lenientApplied: Boolean(preprocessed.lenientApplied),
        duplicates: parser.duplicates
      },
      meta: {
        bytes,
        depth: parser.maxDepth
      }
    };
  } catch (error) {
    if (typeof error.index === 'number') {
      const loc = positionFromIndex(input, error.index);
      error.line = loc.line;
      error.column = loc.column;
      error.snippet = codeFrame(input, loc.line, loc.column);
    }
    throw error;
  }
}

class JsonParser {
  constructor(text, options) {
    this.text = text;
    this.length = text.length;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.options = options;
    this.maxDepth = 0;
    this.duplicates = [];
  }

  parse() {
    this.skipWhitespace();
    const value = this.parseValue(1);
    this.skipWhitespace();
    if (!this.isAtEnd()) {
      throw this.error('Unexpected text after JSON value', this.pos);
    }
    return value;
  }

  parseValue(depth) {
    this.ensureDepth(depth);
    this.maxDepth = Math.max(this.maxDepth, depth);
    const char = this.peek();
    if (char === '"') {
      return this.parseString();
    }
    if (char === '{') {
      return this.parseObject(depth);
    }
    if (char === '[') {
      return this.parseArray(depth);
    }
    if (char === 't') {
      return this.consumeLiteral('true', true);
    }
    if (char === 'f') {
      return this.consumeLiteral('false', false);
    }
    if (char === 'n') {
      return this.consumeLiteral('null', null);
    }
    if (char === '-' || isDigit(char)) {
      return this.parseNumber();
    }
    throw this.error(`Unexpected token '${char || ''}'`, this.pos);
  }

  parseObject(depth) {
    this.expect('{');
    this.skipWhitespace();
    const obj = Object.create(null);
    const keys = new Map();
    if (this.peek() === '}') {
      this.advance();
      return obj;
    }
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      const keyStart = this.pos;
      if (this.peek() !== '"') {
        throw this.error('Expected string key', this.pos);
      }
      const key = this.parseString();
      const location = positionFromIndex(this.text, keyStart);
      this.skipWhitespace();
      this.expect(':');
      this.skipWhitespace();
      const value = this.parseValue(depth + 1);
      if (keys.has(key)) {
        const duplicateInfo = {
          key,
          line: location.line,
          column: location.column
        };
        this.duplicates.push(duplicateInfo);
        if (this.options.duplicatePolicy === 'error') {
          const duplicateError = this.error(`Duplicate key \"${key}\"`, keyStart);
          throw duplicateError;
        }
        if (this.options.duplicatePolicy === 'last') {
          obj[key] = value;
        }
        // if policy is 'first', ignore new value
      } else {
        keys.set(key, true);
        obj[key] = value;
      }
      this.skipWhitespace();
      const char = this.peek();
      if (char === ',') {
        this.advance();
        this.skipWhitespace();
        if (this.peek() === '}' || this.peek() === ']') {
          throw this.error('Trailing comma not allowed in strict JSON', this.pos - 1);
        }
        continue;
      }
      if (char === '}') {
        this.advance();
        break;
      }
      throw this.error("Expected ',' or '}' in object", this.pos);
    }
    return obj;
  }

  parseArray(depth) {
    this.expect('[');
    this.skipWhitespace();
    const arr = [];
    if (this.peek() === ']') {
      this.advance();
      return arr;
    }
    let index = 0;
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      const value = this.parseValue(depth + 1);
      arr.push(value);
      this.skipWhitespace();
      const char = this.peek();
      if (char === ',') {
        this.advance();
        this.skipWhitespace();
        if (this.peek() === ']' || this.peek() === '}') {
          throw this.error('Trailing comma not allowed in strict JSON', this.pos - 1);
        }
        index += 1;
        continue;
      }
      if (char === ']') {
        this.advance();
        break;
      }
      throw this.error("Expected ',' or ']' in array", this.pos);
    }
    return arr;
  }

  parseString() {
    this.expect('"');
    let result = '';
    while (!this.isAtEnd()) {
      const char = this.advance();
      if (char === '"') {
        return result;
      }
      if (char === '\\') {
        const escape = this.advance();
        if (escape === '"') {
          result += '"';
        } else if (escape === '\\') {
          result += '\\';
        } else if (escape === '/') {
          result += '/';
        } else if (escape === 'b') {
          result += '\b';
        } else if (escape === 'f') {
          result += '\f';
        } else if (escape === 'n') {
          result += '\n';
        } else if (escape === 'r') {
          result += '\r';
        } else if (escape === 't') {
          result += '\t';
        } else if (escape === 'u') {
          const hex = this.text.slice(this.pos, this.pos + 4);
          if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
            throw this.error('Invalid Unicode escape sequence', this.pos);
          }
          result += String.fromCharCode(parseInt(hex, 16));
          this.pos += 4;
          this.column += 4;
        } else {
          throw this.error(`Invalid escape character '${escape}'`, this.pos - 1);
        }
      } else if (char === '\n' || char === '\r') {
        throw this.error('Unexpected line break in string', this.pos - 1);
      } else {
        result += char;
      }
    }
    throw this.error('Unterminated string', this.pos);
  }

  parseNumber() {
    const start = this.pos;
    let char = this.peek();
    if (char === '-') {
      this.advance();
    }
    if (this.peek() === '0') {
      this.advance();
      if (isDigit(this.peek())) {
        throw this.error('Leading zeros are not allowed', this.pos);
      }
    } else {
      this.consumeDigits();
    }
    if (this.peek() === '.') {
      this.advance();
      if (!isDigit(this.peek())) {
        throw this.error('Expected digit after decimal point', this.pos);
      }
      this.consumeDigits();
    }
    char = this.peek();
    if (char === 'e' || char === 'E') {
      this.advance();
      const sign = this.peek();
      if (sign === '+' || sign === '-') {
        this.advance();
      }
      if (!isDigit(this.peek())) {
        throw this.error('Expected digit in exponent', this.pos);
      }
      this.consumeDigits();
    }
    const substr = this.text.slice(start, this.pos);
    const number = Number(substr);
    if (!Number.isFinite(number)) {
      throw this.error('Invalid number', start);
    }
    return number;
  }

  consumeLiteral(expected, value) {
    if (this.text.slice(this.pos, this.pos + expected.length) !== expected) {
      throw this.error(`Expected '${expected}'`, this.pos);
    }
    this.pos += expected.length;
    this.column += expected.length;
    return value;
  }

  consumeDigits() {
    while (isDigit(this.peek())) {
      this.advance();
    }
  }

  expect(char) {
    if (this.peek() !== char) {
      throw this.error(`Expected '${char}'`, this.pos);
    }
    this.advance();
  }

  advance() {
    if (this.isAtEnd()) {
      return '\0';
    }
    const char = this.text[this.pos++];
    if (char === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return char;
  }

  peek() {
    if (this.isAtEnd()) {
      return '\0';
    }
    return this.text[this.pos];
  }

  skipWhitespace() {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
        this.advance();
      } else {
        break;
      }
    }
  }

  isAtEnd() {
    return this.pos >= this.length;
  }

  ensureDepth(depth) {
    if (depth > this.options.maxDepth) {
      const error = this.error('Maximum depth exceeded', this.pos);
      error.name = 'DepthLimitError';
      throw error;
    }
  }

  error(message, index) {
    const err = new Error(message);
    err.name = 'JSONParseError';
    err.index = typeof index === 'number' ? index : this.pos;
    return err;
  }
}

function preprocessLenient(input) {
  const chars = Array.from(input);
  const length = chars.length;
  let lenientApplied = false;
  let inString = false;
  let escape = false;

  for (let i = 0; i < length; i += 1) {
    const char = chars[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    const next = chars[i + 1];
    if (char === '/' && next === '/') {
      lenientApplied = true;
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < length && chars[i] !== '\n') {
        chars[i] = ' ';
        i += 1;
      }
      i -= 1;
      continue;
    }
    if (char === '/' && next === '*') {
      lenientApplied = true;
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < length - 1) {
        if (chars[i] === '*' && chars[i + 1] === '/') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
          break;
        }
        if (chars[i] !== '\n') {
          chars[i] = ' ';
        }
        i += 1;
      }
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (j < length && /\s/.test(chars[j])) {
        j += 1;
      }
      const closer = chars[j];
      if (closer === '}' || closer === ']') {
        chars[i] = ' ';
        lenientApplied = true;
      }
    }
  }

  return {
    text: chars.join(''),
    lenientApplied
  };
}

function positionFromIndex(text, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}
