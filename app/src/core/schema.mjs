const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array']);

export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

function humanType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

export function validateSchema(schema) {
  const errors = [];
  if (!schema || schema.type !== 'object' || typeof schema.properties !== 'object' || schema.properties === null) {
    return { ok: false, errors: ['inputs.schema 必须是 type=object 且包含 properties 的 JSON Schema'] };
  }
  const required = schema.required ?? [];
  if (!Array.isArray(required)) errors.push('required 必须是数组');
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) errors.push(`字段名 ${key} 只能包含字母、数字和下划线`);
    if (!property || typeof property !== 'object') {
      errors.push(`字段 ${key} 的 Schema 无效`);
      continue;
    }
    if (!TYPES.has(property.type)) errors.push(`字段 ${key} 使用了不支持的 type: ${property.type}`);
    if (property.enum && !Array.isArray(property.enum)) errors.push(`字段 ${key} 的 enum 必须是数组`);
    if (property.maxLength && property.maxLength > 200000) errors.push(`字段 ${key} 的 maxLength 不能超过 200000`);
  }
  for (const key of required) {
    if (!schema.properties[key]) errors.push(`必填字段 ${key} 未在 properties 中定义`);
  }
  return { ok: errors.length === 0, errors };
}

function coerceValue(key, property, value) {
  if (value === undefined || value === null || value === '') {
    if (property.default !== undefined) return { value: property.default };
    return { value: undefined };
  }
  switch (property.type) {
    case 'number':
    case 'integer': {
      const number = typeof value === 'number' ? value : Number(String(value).trim());
      if (!Number.isFinite(number)) return { error: `${property.title ?? key} 必须是数字` };
      if (property.type === 'integer' && !Number.isInteger(number)) return { error: `${property.title ?? key} 必须是整数` };
      return { value: number };
    }
    case 'boolean': {
      if (typeof value === 'boolean') return { value };
      if (['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())) return { value: true };
      if (['false', '0', 'no', 'off'].includes(String(value).toLowerCase())) return { value: false };
      return { error: `${property.title ?? key} 必须是布尔值` };
    }
    case 'array': {
      if (Array.isArray(value)) return { value };
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return { value: parsed };
        } catch {
          // fall through
        }
      }
      return { error: `${property.title ?? key} 必须是数组` };
    }
    case 'string':
    default: {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        return { error: `${property.title ?? key} 必须是文本` };
      }
      return { value: String(value) };
    }
  }
}

export function validateInputs(schema, rawInputs = {}) {
  const schemaCheck = validateSchema(schema);
  if (!schemaCheck.ok) return { ok: false, errors: schemaCheck.errors, values: {} };
  const errors = [];
  const values = {};
  const required = new Set(schema.required ?? []);

  for (const [key, property] of Object.entries(schema.properties)) {
    const raw = Object.prototype.hasOwnProperty.call(rawInputs ?? {}, key) ? rawInputs[key] : undefined;
    const coerced = coerceValue(key, property, raw);
    if (coerced.error) {
      errors.push(coerced.error);
      continue;
    }
    const value = coerced.value;
    if (value === undefined || (typeof value === 'string' && value.trim() === '' && property.type !== 'string')) {
      if (required.has(key)) errors.push(`缺少必填参数：${property.title ?? key}`);
      continue;
    }
    if (property.type === 'string') {
      if (required.has(key) && value.trim() === '') {
        errors.push(`缺少必填参数：${property.title ?? key}`);
        continue;
      }
      if (property.minLength !== undefined && value.length < property.minLength) {
        errors.push(`${property.title ?? key} 至少需要 ${property.minLength} 个字符`);
      }
      if (property.maxLength !== undefined && value.length > property.maxLength) {
        errors.push(`${property.title ?? key} 不能超过 ${property.maxLength} 个字符`);
      }
      if (property.pattern) {
        try {
          if (!new RegExp(property.pattern).test(value)) errors.push(`${property.title ?? key} 格式不正确`);
        } catch {
          errors.push(`${property.title ?? key} 的格式规则无效`);
        }
      }
    }
    if ((property.type === 'number' || property.type === 'integer')) {
      if (property.minimum !== undefined && value < property.minimum) errors.push(`${property.title ?? key} 不能小于 ${property.minimum}`);
      if (property.maximum !== undefined && value > property.maximum) errors.push(`${property.title ?? key} 不能大于 ${property.maximum}`);
    }
    if (property.type === 'array') {
      if (property.maxItems !== undefined && value.length > property.maxItems) errors.push(`${property.title ?? key} 最多 ${property.maxItems} 项`);
      if (property.minItems !== undefined && value.length < property.minItems) errors.push(`${property.title ?? key} 至少 ${property.minItems} 项`);
    }
    if (property.enum && !property.enum.some((item) => item === value)) {
      errors.push(`${property.title ?? key} 必须是 ${property.enum.join(' / ')} 之一`);
    }
    values[key] = value;
  }

  return { ok: errors.length === 0, errors, values };
}

export { humanType };
